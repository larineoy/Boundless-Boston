import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/savedPlaceStore.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {upsertSaved,parseSaved,sourcePlatform}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const draft={sourceUrl:'https://youtube.com/shorts/abcdefghijk',platform:'youtube',placeId:'place-1',label:'My noodle spot',notes:'Try with friends',mode:'live'};
test('saved place survives serialization and strips provider content',()=>{
 const places=upsertSaved([],{...draft,address:'Restricted provider address',rating:5,confirmation_token:'secret'},'id-1','2026-11-21T18:00:00Z');
 const restored=parseSaved(JSON.stringify(places));assert.equal(restored[0].label,draft.label);assert.equal(restored[0].placeId,'place-1');assert.equal(restored[0].address,undefined);assert.equal(restored[0].confirmation_token,undefined);
});
test('duplicate save updates notes without losing visit status or saved date',()=>{
 const first=upsertSaved([],draft,'first','2026-11-21T18:00:00Z');first[0].visited=true;
 const next=upsertSaved(first,{...draft,notes:'New note'},'second','2026-12-01T00:00:00Z');assert.equal(next.length,1);assert.equal(next[0].id,'first');assert.equal(next[0].visited,true);assert.equal(next[0].savedAt,first[0].savedAt);
});
test('unresolved ideas retain no false place identity',()=>{const places=upsertSaved([],{...draft,placeId:null,mode:'unresolved'},'idea','2026-11-21T18:00:00Z');assert.equal(parseSaved(JSON.stringify(places))[0].placeId,null)});
test('host spoofing and script links rejected',()=>{for(const url of ['javascript:alert(1)','https://youtube.com.evil.example/a','https://user:pass@tiktok.com/a'])assert.equal(sourcePlatform(url),null);assert.throws(()=>upsertSaved([],{...draft,sourceUrl:'https://evil.example'},'id','now'))});
test('invalid storage is detected instead of overwritten',()=>{assert.throws(()=>parseSaved('broken'));assert.throws(()=>parseSaved('{}'))});
test('empty labels rejected and collection size bounded',()=>{assert.throws(()=>upsertSaved([],{...draft,label:'  '},'id','now'));const places=Array.from({length:200},(_,i)=>({...draft,id:String(i),placeId:String(i)}));assert.throws(()=>upsertSaved(places,draft,'full','now'))});
