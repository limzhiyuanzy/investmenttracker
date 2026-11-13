'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {environment,config,scope}=require('./portable.test.cjs');
for(const mode of ['hash','status','mime','redirect','offline','hang'])test('reject '+mode+' without publishing partial replacement',async()=>{
 const e=environment();await e.command('REPAIR_STATIC');const before=await (await e.read()).text();e.mode=mode;
 const start=Date.now();const result=await e.command('REPAIR_STATIC');assert.equal(result.state,'failed');assert.ok(Date.now()-start<6500);
 assert.equal((await e.command('GET_STATUS')).state,'complete');assert.equal(await(await e.read()).text(),before);
});
test('quota failure retains usable set and restart ignores unmarked partial',async()=>{
 const e=environment();await e.command('REPAIR_STATIC');const before=await(await e.read()).text();e.writeFail=true;
 assert.equal((await e.command('REPAIR_STATIC')).state,'failed');e.writeFail=false;
 // Simulate termination after one staged write, before publication.
 const own=[...e.map.keys()][0];const partial=await e.caches.open(own.replace(/[^:]+$/,'ffffffff-ffff-4fff-8fff-ffffffffffff'));
 await partial.put(new URL(config.assets[0].path,scope).href,new Response('partial'));
 e.launch();assert.equal((await e.command('GET_STATUS')).state,'complete');assert.equal(await(await e.read()).text(),before);
 await e.command('REPAIR_STATIC');assert.ok(e.map.size<=2);
});
test('two-client repair coalesces and repeat calls bound owned stages only',async()=>{
 const e=environment();await e.caches.open('unrelated-app');await e.caches.open('quietbanking:pwa:v029:another-build:installing');
 const [a,b]=await Promise.all([e.command('REPAIR_STATIC'),e.command('REPAIR_STATIC',{id:'second'})]);assert.equal(a.state,'complete');assert.equal(b.state,'complete');assert.equal(e.fetches,5);
 for(let n=0;n<4;n++)await e.command('REPAIR_STATIC');assert.ok(e.map.size<=4);assert.ok(e.map.has('unrelated-app'));assert.ok(e.map.has('quietbanking:pwa:v029:another-build:installing'));
});
test('foreign, missing and malformed source requests are not admitted',async()=>{
 const e=environment();assert.equal(await e.command('REPAIR_STATIC',null),undefined);assert.equal(await e.command('ERASE_RECORDS'),undefined);assert.equal(e.fetches,0);
 let reply;await e.event('message',{source:{id:'client'},data:{type:'REPAIR_STATIC',url:'http://evil/'},ports:[{postMessage:r=>reply=r}]});assert.equal(reply,undefined);assert.equal(e.fetches,0);
});
test('missing or corrupt served asset invalidates readiness and repair restores complete shell',async()=>{
 const e=environment();await e.command('REPAIR_STATIC');
 for(const c of e.map.values())await c.delete(scope+'index.html');
 assert.equal((await e.command('GET_STATUS')).state,'failed');assert.equal((await e.read()).type,'error');
 assert.equal((await e.command('REPAIR_STATIC')).state,'complete');assert.equal((await e.read()).status,200);
 for(const c of e.map.values())if(await c.match(scope+'index.html'))await c.put(scope+'index.html',new Response('corrupt',{headers:{'content-type':'text/html'}}));
 assert.equal((await e.command('GET_STATUS')).state,'failed');assert.equal((await e.command('REPAIR_STATIC')).state,'complete');
});
for(const [label,field,point,ready] of [['first-write','holdBefore',1,false],['partial-write','holdBefore',3,false],['pre-marker','holdBefore',6,false],['committed-unacknowledged','holdAfter',6,true]])test('worker restart after '+label+' reconciles eligibility',async()=>{
 const e=environment();e[field]=point;
 // The abandoned promise models a terminated worker; it is never resumed.
 void e.command('REPAIR_STATIC');
 for(let n=0;n<100&&!e.held;n++)await new Promise(r=>setTimeout(r,2));
 assert.equal(e.held,true);e.launch();
 assert.equal((await e.command('GET_STATUS')).state,ready?'complete':'failed');
 assert.equal((await e.read()).status,ready?200:0);
 e[field]=null;assert.equal((await e.command('REPAIR_STATIC')).state,'complete');assert.ok(e.map.size<=2);
});
test('foreign scope and nonwindow sources rejected without network',async()=>{
 const e=environment();
 for(const url of ['http://evil/bank/index.html','http://localhost/other/index.html']){e.clientURL=url;assert.equal(await e.command('REPAIR_STATIC'),undefined);}
 e.clientURL=scope+'index.html';e.clientType='worker';assert.equal(await e.command('REPAIR_STATIC'),undefined);assert.equal(e.fetches,0);
});
test('failed first install leaves no eligible partial cache',async()=>{
 const e=environment();e.mode='hash';await assert.rejects(e.event('install'),/Static install failed/);assert.equal((await e.command('GET_STATUS')).state,'failed');assert.equal((await e.read()).type,'error');
});

