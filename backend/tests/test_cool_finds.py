"""Offline Cool Finds tests; no keys or network needed."""
import asyncio
from datetime import datetime,timedelta,timezone
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient
from app import main
from app import cool_finds as finds

URL='https://www.tiktok.com/@creator/video/123456789'
@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main,'DEMO',True)
    return TestClient(main.app)

def query(**changes):
    return dict(time=(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat(),budget='$$',lat=42.355,lng=-71.062,max_walk_min=20,**changes)

def intake(client,hint=''):
    r=client.post('/api/cool-finds/intake',json={'source_url':URL,'venue_hint':hint})
    assert r.status_code==200
    return r.json()

def selected(data):
    return dict(source_url=data['source_url'],place_id=data['candidates'][0]['place_id'],confirmation_token=data['confirmation_token'],confirmed=True)

def test_save_closed_place_without_outing_query(client):
    data=intake(client,'Union Oyster House')
    assert data['source_status']=='demo'
    r=client.post('/api/cool-finds/select',json=selected(data))
    assert r.status_code==200
    assert r.json()['confirmation_status']=='user_confirmed'
    assert 'address' not in r.json()
    # Saving identity remains possible when tonight's hours/budget fail.
    r=client.post('/api/cool-finds/plan',json={**selected(data),'query':query()})
    assert r.status_code==200
    assert r.json()['checks']['hours']=='closed'
    assert r.json()['eligible'] is False


def test_confirm_and_refresh_rehydrate_with_new_token(client):
    data=intake(client,'Pho Pasteur')
    assert client.post('/api/cool-finds/select',json=selected(data)).status_code==200
    r=client.post('/api/cool-finds/refresh',json={'source_url':URL,'place_id':data['candidates'][0]['place_id']})
    assert r.status_code==200
    fresh=r.json()
    assert fresh['candidates'][0]['name']=='Pho Pasteur'
    r=client.post('/api/cool-finds/plan',json={**selected(fresh),'query':query()})
    assert r.status_code==200 and r.json()['eligible']
    assert r.json()['route']['maps_uri'] is None

@pytest.mark.parametrize('change',[{'confirmed':False},{'place_id':'not-offered'},{'confirmation_token':'tampered'},{'source_url':'https://youtube.com/shorts/abcdefghijk'}])
def test_tampered_selection_rejected(client,change):
    data=intake(client)
    assert client.post('/api/cool-finds/select',json={**selected(data),**change}).status_code in {409,422}


def test_expired_tokens(monkeypatch):
    monkeypatch.setattr(finds.time,'time',lambda:0)
    token=finds.issue_token(URL,['place'])
    monkeypatch.setattr(finds.time,'time',lambda:1000)
    with pytest.raises(ValueError):finds.verify_token(token,URL,'place')

@pytest.mark.parametrize('url',['file:///secret','https://user:pass@tiktok.com/video/1','https://tiktok.com:123/a','not a URL'])
def test_invalid_url(client,url):
    assert client.post('/api/cool-finds/intake',json={'source_url':url}).status_code==422


def test_host_spoof_no_fetch(client,monkeypatch):
    fake=AsyncMock(side_effect=AssertionError('Unexpected network'))
    monkeypatch.setattr(main,'request_json',fake)
    for url in ['https://tiktok.com.evil.example/video/1','https://127.0.0.1/private','https://instagram.com/p/abc']:
        r=client.post('/api/cool-finds/intake',json={'source_url':url})
        assert r.status_code==200 and not r.json()['candidates']
    assert fake.await_count==0


def test_missing_metadata_with_user_clue_still_searches(monkeypatch):
    monkeypatch.setenv('GOOGLE_MAPS_API_KEY','test')
    calls=[]
    async def request(source,url,params=None,**kwargs):
        calls.append((source,url,kwargs))
        if source=='tiktok':return None
        return {'places':[{'id':'ChIJ123','displayName':{'text':'Pho Pasteur'},'location':{'latitude':42.35,'longitude':-71.06},'formattedAddress':'Boston','attributions':[{'provider':'Example'}]}]}
    d=asyncio.run(finds.resolve(finds.Intake(source_url=URL,venue_hint='Pho Pasteur'),request,False,[]))
    assert len(d['candidates'])==1 and d['metadata'] is None
    assert d['candidates'][0]['attribution']['providers'][0]['provider']=='Example'
    assert calls[1][1]=='https://places.googleapis.com/v1/places:searchText'


def test_short_link_not_fetched_but_hint_searches(monkeypatch):
    monkeypatch.setenv('GOOGLE_MAPS_API_KEY','test')
    fake=AsyncMock(return_value={'places':[]})
    asyncio.run(finds.resolve(finds.Intake(source_url='https://vm.tiktok.com/short',venue_hint='Cafe'),fake,False,[]))
    assert fake.await_count==1 and fake.call_args.args[0]=='google_places'


def test_youtube_official_metadata(monkeypatch):
    monkeypatch.setenv('YOUTUBE_API_KEY','test')
    monkeypatch.delenv('GEMINI_API_KEY',raising=False)
    fake=AsyncMock(return_value={'items':[{'snippet':{'title':'Boston walk','channelTitle':'Creator','publishedAt':'2026-01-01T00:00:00Z'}}]})
    d=asyncio.run(finds.resolve(finds.Intake(source_url='https://youtube.com/shorts/abcdefghijk'),fake,False,[]))
    assert fake.call_args.args[1]=='https://www.googleapis.com/youtube/v3/videos'
    assert d['metadata']['creator']=='Creator' and d['candidates']==[]


def test_gemini_extracts_explicit_name_only(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY','test');monkeypatch.setenv('GEMINI_MODEL','test-model');monkeypatch.setenv('GOOGLE_MAPS_API_KEY','test')
    for extracted,searches in [('Pho Pasteur',1),('Invented Restaurant',0)]:
        calls=[]
        async def request(source,url,*args,**kwargs):
            calls.append(source)
            if source=='tiktok':return {'title':'Pho Pasteur in Chinatown','html':'<script>never render</script>'}
            if source=='gemini':return {'candidates':[{'content':{'parts':[{'text':'{"venue_name":"'+extracted+'"}'}]}}]}
            return {'places':[]}
        d=asyncio.run(finds.resolve(finds.Intake(source_url=URL),request,False,[]))
        assert calls.count('google_places')==searches
        assert 'html' not in str(d)


def test_provider_content_never_enters_disk_cache(monkeypatch):
    import httpx
    monkeypatch.setattr(main,'DEMO',False)
    fake=AsyncMock(return_value=httpx.Response(200,json={'ok':True},request=httpx.Request('GET','https://example.com')))
    monkeypatch.setattr(httpx.AsyncClient,'request',fake)
    def forbidden(*args,**kwargs):raise AssertionError('Private/provider content must not hit the cache')
    monkeypatch.setattr(main,'cache_get',forbidden)
    monkeypatch.setattr(main,'cache_put',forbidden)
    for source in ['google_places','tiktok','youtube','gemini']:
        assert asyncio.run(main.request_json(source,'https://example.com/official'))=={'ok':True}


def test_live_refresh_failure_and_demo_mode_boundary(client,monkeypatch):
    monkeypatch.setattr(main,'DEMO',False)
    monkeypatch.delenv('GOOGLE_MAPS_API_KEY',raising=False)
    r=client.post('/api/cool-finds/refresh',json={'source_url':URL,'place_id':'ChIJ123'})
    assert r.status_code==503
    r=client.post('/api/cool-finds/refresh',json={'source_url':URL,'place_id':'demo-noodle'})
    assert r.status_code==409


def test_unknown_hours_or_price_never_pass_outing(client,monkeypatch):
    data=intake(client,'Pho Pasteur')
    monkeypatch.setattr(main,'find_details',AsyncMock(return_value={**main.FIXTURES[3],'price_level':None,'open_hours':{'status_at_requested_time':'unknown'}}))
    r=client.post('/api/cool-finds/plan',json={**selected(data),'query':query()})
    assert r.status_code==200
    assert r.json()['eligible'] is False
    assert r.json()['checks']['within_budget'] is None
    assert r.json()['checks']['hours']=='unknown'
