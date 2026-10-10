import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectServerPages} from '../src/workflow-stage/paging';
const rows=(n:number)=>Array.from({length:n},(_,i)=>({id:String(i).padStart(6,'0')}));
function source(data:{id:string}[],calls:string[]){return async(after:string|undefined,size:number)=>{calls.push(after??'first');return data.filter(r=>after===undefined||r.id>after).slice(0,size);};}
for(const n of [0,499,500,501,1000,1251,10000])test('complete source with '+n+' records',async()=>{const calls:string[]=[];const result=await collectServerPages(source(rows(n),calls),()=>{});assert.equal(result.length,n);assert.deepEqual(result,rows(n));assert.equal(calls.length,Math.floor(n/500)+1);});
test('ceiling never returns truncated aggregate',async()=>{await assert.rejects(collectServerPages(source(rows(10001),[]),()=>{}),/exceeds 10000/);});
test('account changes during server read stop the load',async()=>{let switched=false;await assert.rejects(collectServerPages(async()=>{switched=true;return rows(1);},()=>{if(switched)throw Error('Account changed');}),/Account changed/);});
test('later page failure never returns earlier page',async()=>{let i=0;await assert.rejects(collectServerPages(async()=>{if(i++)throw Error('offline');return rows(500);},()=>{}),/offline/);});
test('repeated cursor or duplicate stops',async()=>{await assert.rejects(collectServerPages(async()=>rows(500),()=>{}),/paging changed/);});
test('unordered page stops',async()=>{await assert.rejects(collectServerPages(async()=>[{id:'b'},{id:'a'}],()=>{}),/paging changed/);});
test('zero page size rejected',async()=>{await assert.rejects(collectServerPages(async()=>[],()=>{},0),/bounds/);});
