"""Private browser collections backed by Postgres; credentials stay server-side."""
from __future__ import annotations
from contextlib import contextmanager
from datetime import datetime,timezone
import hashlib
import os
import secrets
import re
from threading import Lock
from typing import Literal
from uuid import UUID,uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from fastapi import APIRouter,HTTPException,Request,Response,Depends
from pydantic import BaseModel,ConfigDict,Field,field_validator,model_validator
from app.cool_finds import Intake,platform as source_platform

router=APIRouter(prefix='/api/saved-places',tags=['Saved Places'])
COOKIE='boundless_collection'
MAX_PLACES=200
_pool=None
_pool_lock=Lock()
COLUMNS='id, source_url, platform, place_id, label, notes, visited, mode, saved_at'

class SavedDraft(BaseModel):
    model_config=ConfigDict(extra='forbid',populate_by_name=True)
    source_url:str=Field(alias='sourceUrl',min_length=1,max_length=2048)
    platform:Literal['youtube','tiktok']
    place_id:str|None=Field(default=None,alias='placeId',max_length=256,pattern=r'^[A-Za-z0-9_-]+$')
    label:str=Field(min_length=1,max_length=120)
    notes:str=Field(default='',max_length=1000)
    mode:Literal['demo','live','unresolved']

    @field_validator('source_url')
    @classmethod
    def valid_source(cls,value):return Intake.valid_url(value)

    @field_validator('label','notes')
    @classmethod
    def trim(cls,value):
        value=value.strip()
        return value

    @model_validator(mode='after')
    def coherent(self):
        if not self.label:raise ValueError('Label cannot be blank')
        if source_platform(self.source_url)!=self.platform:raise ValueError('Source platform does not match the video URL')
        if (self.place_id is None)!=(self.mode=='unresolved'):raise ValueError('Unresolved ideas must not claim a place identity')
        return self

class SavedImport(SavedDraft):
    id:UUID
    visited:bool=False
    saved_at:datetime=Field(alias='savedAt')

    @field_validator('saved_at')
    @classmethod
    def zoned(cls,value):
        if value.tzinfo is None:raise ValueError('savedAt must include a timezone')
        return value

class ImportBatch(BaseModel):
    model_config=ConfigDict(extra='forbid')
    places:list[SavedImport]=Field(max_length=MAX_PLACES)

class SavedEdit(BaseModel):
    model_config=ConfigDict(extra='forbid')
    label:str=Field(min_length=1,max_length=120)
    notes:str=Field(max_length=1000)
    visited:bool

    @field_validator('label')
    @classmethod
    def nonblank(cls,value):
        if not value.strip():raise ValueError('Label cannot be blank')
        return value.strip()


def source_key(draft):
    return hashlib.sha256((draft.source_url+'\0'+(draft.place_id or '')).encode()).hexdigest()


def serialize(row):
    return {'id':str(row['id']),'sourceUrl':row['source_url'],'platform':row['platform'],'placeId':row['place_id'],
            'label':row['label'],'notes':row['notes'],'visited':row['visited'],'mode':row['mode'],'savedAt':row['saved_at'].isoformat()}


def get_pool():
    global _pool
    url=os.getenv('DATABASE_URL','')
    if not url:raise HTTPException(503,'Saved Places database is not configured. Existing browser saves are kept.')
    with _pool_lock:
        if _pool is None or _pool.closed:
            _pool=ConnectionPool(url,min_size=0,max_size=5,timeout=10,max_waiting=20,open=True,
                kwargs={'connect_timeout':8,'prepare_threshold':None,'row_factory':dict_row},
                name='saved-places')
    return _pool


def close_pool():
    global _pool
    with _pool_lock:
        if _pool is not None:_pool.close();_pool=None


@contextmanager
def connection():
    try:
        with get_pool().connection() as conn:
            # Bounded SQL execution; SET LOCAL is scoped to this transaction even through PgBouncer.
            conn.execute("SET LOCAL statement_timeout = '8000ms'")
            yield conn
    except psycopg.Error:
        raise HTTPException(503,'Saved Places is temporarily unavailable. No browser saves have been removed.') from None


def collection_owner(request:Request,response:Response):
    if request.method!='GET' and request.headers.get('X-Saved-Places')!='1':
        raise HTTPException(403,'Saved Places requests require the app request header')
    token=request.cookies.get(COOKIE,'')
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}',token):
        if request.method!='GET':raise HTTPException(401,'Refresh Saved Places to establish your private collection first')
        token=secrets.token_urlsafe(32)
    secure=os.getenv('SAVED_PLACES_COOKIE_SECURE','auto')
    is_secure=secure=='true' or (secure=='auto' and request.url.hostname not in {'localhost','127.0.0.1','testserver'})
    response.set_cookie(COOKIE,token,httponly=True,secure=is_secure,samesite='lax',max_age=60*60*24*365,path='/api/saved-places')
    response.headers['Cache-Control']='private, no-store'
    response.headers['Vary']='Cookie'
    return hashlib.sha256(token.encode()).hexdigest()


def lock_collection(conn,owner):
    conn.execute('INSERT INTO boundless.saved_collections(owner_key) VALUES (%s) ON CONFLICT DO NOTHING',(owner,))
    conn.execute('SELECT owner_key FROM boundless.saved_collections WHERE owner_key=%s FOR UPDATE',(owner,))


def rows(conn,owner):
    return [serialize(r) for r in conn.execute(f'SELECT {COLUMNS} FROM boundless.saved_places WHERE owner_key=%s ORDER BY saved_at DESC,id LIMIT 200',(owner,)).fetchall()]


def capacity(conn,owner,new_keys):
    existing={r['source_key'] for r in conn.execute('SELECT source_key FROM boundless.saved_places WHERE owner_key=%s',(owner,)).fetchall()}
    if len(existing|set(new_keys))>MAX_PLACES:raise HTTPException(409,'Your collection is full (200 places). Remove a place before adding another.')


def insert(conn,owner,draft,*,importing=False):
    key=source_key(draft)
    conflict='DO NOTHING' if importing else 'DO UPDATE SET label=EXCLUDED.label,notes=EXCLUDED.notes,mode=EXCLUDED.mode,updated_at=now()'
    ident=uuid4() # Never trust a client-global ID as a primary key shared by other collections.
    saved_at=draft.saved_at if importing else datetime.now(timezone.utc)
    visited=draft.visited if importing else False
    conn.execute(f'''INSERT INTO boundless.saved_places
      (id,owner_key,source_key,source_url,platform,place_id,label,notes,visited,mode,saved_at)
      VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
      ON CONFLICT (owner_key,source_key) {conflict}''',
      (ident,owner,key,draft.source_url,draft.platform,draft.place_id,draft.label,draft.notes,visited,draft.mode,saved_at))


@router.get('')
def list_places(owner:str=Depends(collection_owner)):
    with connection() as conn:
        lock_collection(conn,owner)
        return {'places':rows(conn,owner),'storage':'postgres'}

@router.post('')
def save_place(draft:SavedDraft,owner:str=Depends(collection_owner)):
    with connection() as conn:
        lock_collection(conn,owner)
        capacity(conn,owner,[source_key(draft)])
        insert(conn,owner,draft)
        return {'places':rows(conn,owner),'storage':'postgres'}

@router.post('/import')
def import_places(batch:ImportBatch,owner:str=Depends(collection_owner)):
    with connection() as conn:
        lock_collection(conn,owner)
        capacity(conn,owner,[source_key(d) for d in batch.places])
        for draft in batch.places:insert(conn,owner,draft,importing=True)
        return {'places':rows(conn,owner),'storage':'postgres','imported':len(batch.places)}

@router.patch('/{place_id}')
def edit_place(place_id:UUID,edit:SavedEdit,owner:str=Depends(collection_owner)):
    with connection() as conn:
        lock_collection(conn,owner)
        row=conn.execute('UPDATE boundless.saved_places SET label=%s,notes=%s,visited=%s,updated_at=now() WHERE id=%s AND owner_key=%s RETURNING id',(edit.label,edit.notes,edit.visited,place_id,owner)).fetchone()
        if row is None:raise HTTPException(404,'Saved place not found')
        return {'places':rows(conn,owner),'storage':'postgres'}

@router.delete('/{place_id}')
def remove_place(place_id:UUID,owner:str=Depends(collection_owner)):
    with connection() as conn:
        lock_collection(conn,owner)
        row=conn.execute('DELETE FROM boundless.saved_places WHERE id=%s AND owner_key=%s RETURNING id',(place_id,owner)).fetchone()
        if row is None:raise HTTPException(404,'Saved place not found')
        return {'places':rows(conn,owner),'storage':'postgres'}
