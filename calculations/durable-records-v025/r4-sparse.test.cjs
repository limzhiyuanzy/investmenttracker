'use strict';
// Production module + faithful fault adapter. Native Chromium proof is separate.
const test=process.argv[2]?()=>{}:require('node:test').test,A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const M=require('./store.cjs'),{fakeIDB}=require('./fake-idb.cjs'),{app}=require('./harness.cjs');
const source=fs.readFileSync(path.join(__dirname,'store.cjs'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../../design/prototypes/quiet-banking-app-v0.25.html'),'utf8');
const seed=()=>JSON.parse(app(fs.readFileSync(path.join(__dirname,'../../design/prototypes/quiet-banking-app-v0.21.html'),'utf8')).run('JSON.stringify({version:1,revision:0,trackingStart,nextId,holdings,entries,reviews})'));
const cases={
 'holding history':s=>s.holdings[0].history=Array(1),
 'entry history':s=>s.entries[0].history=Array(1),
 holdings:s=>delete s.holdings[0],entries:s=>delete s.entries[0],reviews:s=>delete s.reviews[0],
 valuations:s=>delete s.holdings[0].valuations[0],
 'bank covered IDs':s=>s.holdings.find(h=>h.type==='Bank account').valuations[0].includedEntryIds=Array(1),
 'stock quantity confirmations':s=>delete s.holdings[0].quantityConfirmations[0],
 'stock covered IDs':s=>s.holdings[0].quantityConfirmations[0].includedEntryIds=Array(1),
 'review holdings':s=>delete s.reviews[0].holdings[0]
};
for(const [name,mutate] of Object.entries(cases))test('reject sparse '+name+' at dense collection boundary',()=>{const s=seed();M.validate(s);mutate(s);A.throws(()=>M.validate(s),/dense collection required/);});
test('inherited array index is not an own dense element',()=>{const s=seed(),a=Array(1);Object.setPrototypeOf(a,Object.assign(Object.create(Array.prototype),{0:'inherited'}));s.holdings[0].history=a;A.throws(()=>M.validate(s),/dense collection required/);});
test('dense records and empty arrays preserve optional undefined object fields',()=>{const s=seed();s.holdings[0].history=[];s.holdings[0].closedDate=undefined;M.validate(s);M.validate({version:1,revision:0,trackingStart:'2025-01-01',nextId:1,holdings:[],entries:[],reviews:[]});});
// Each bounded child records pending settlement and uncaught completion errors,
// without allowing the rejected R3 completion exception to kill/hang node:test.
async function probe(mode){
 const errors=[];process.on('uncaughtException',e=>errors.push(e.message));
 if(mode==='app-sparse'){const s=seed();s.holdings[0].history=Array(1);const db=fakeIDB(s),a=app(html,{indexedDB:db});const state=await Promise.race([a.ready.then(()=>'settled'),new Promise(r=>setTimeout(()=>r('pending'),120))]);return {state,phase:a.run('durableState.phase'),status:a.node('#durable-status').textContent,appHidden:a.node('#durable-app').hidden,dockHidden:a.node('#chrome').hidden,revision:db.backend.value.revision,sparsePreserved:!Object.hasOwn(db.backend.value.holdings[0].history,0),errors};}
 const c=vm.createContext({module:{exports:{}}});vm.runInContext(source,c);const N=c.module.exports;
 const s=seed(),db=fakeIDB(),store=N.create({indexedDB:db,protocol:'http:'});let initial;
 if(mode!=='freeze-init')initial=await store.load(s);
 if(mode==='completion-no-hydration'){db.backend.hold=true;const pending=store.commit(initial,0);for(let i=0;i<100&&!db.backend.release;i++)await new Promise(r=>setImmediate(r));if(!db.backend.release)throw Error('R4 harness did not reach held completion');let freezeCalls=0;c.fault=()=>{freezeCalls++;throw Error('R4 post-preparation freeze fault');};vm.runInContext('Object.freeze=fault',c);db.backend.release();const outcome=await Promise.race([pending.then(v=>({status:'resolved',revision:v.revision,frozen:Object.isFrozen(v.holdings[0].valuations[0])}),e=>({status:'rejected',error:e.message})),new Promise(r=>setTimeout(()=>r({status:'pending'}),120))]);return {outcome,freezeCalls,errors,revision:db.backend.value.revision};}
 const before=structuredClone(db.backend.value);let candidate=initial||s,operation;
 if(mode==='sparse-commit'){candidate.holdings[0].history=Array(1);operation=()=>store.commit(candidate,0);}
 if(mode==='sparse-load'){db.backend.value.holdings[0].history=Array(1);operation=()=>store.load(s);}
 if(mode.startsWith('serialized-')){
  // Programmatic custom serialization fault: original validates, JSON clone does not.
  candidate=seed();candidate.holdings[0].history.toJSON=()=>[null];N.validate(candidate);
  operation=()=>store.commit(candidate,0);
 }
 let freezeCalls=0;
 if(mode.startsWith('freeze-')){c.fault=()=>{freezeCalls++;throw Error('R4 programmatic freeze preparation fault');};vm.runInContext('globalThis.originalFreeze=Object.freeze;Object.freeze=fault',c);operation=()=>mode==='freeze-commit'?store.commit(initial,0):store.load(s);}
 let active=db;
 // For initialization representation test use a truly absent backend.
 if(mode==='serialized-init'){active=fakeIDB();operation=()=>N.create({indexedDB:active,protocol:'http:'}).load(candidate);}
 const start=active.backend.transactions.length;
 const outcome=await Promise.race([Promise.resolve().then(operation).then(value=>({status:'resolved',revision:value.revision}),e=>({status:'rejected',error:e.message})),new Promise(r=>setTimeout(()=>r({status:'pending'}),120))]);
 const after=active.backend.value;
 const out={mode,outcome,errors,freezeCalls,present:active.backend.present,revision:after?.revision,history:after?.holdings[0]?.history,sparsePreserved:after?.holdings[0]?.history?.length===1&&!Object.hasOwn(after.holdings[0].history,0),staged:active.backend.transactions.slice(start).some(t=>t.hasStaged),unchanged:JSON.stringify(after)===JSON.stringify(before)};
 if(mode.startsWith('freeze-')&&outcome.status!=='pending'){vm.runInContext('Object.freeze=originalFreeze',c);out.retryRevision=(await store.load(s)).revision;}
 return out;
}
function child(mode){const r=spawnSync(process.execPath,[__filename,mode],{encoding:'utf8',timeout:4000});A.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);console.log('R4 BOUNDED PROBE',JSON.stringify(out));return out;}
for(const mode of ['sparse-commit','sparse-load','serialized-commit','serialized-init','freeze-commit','freeze-load','freeze-init'])test(mode+' rejects before publication and never strands completion',()=>{const r=child(mode);A.equal(r.outcome.status,'rejected');if(mode.startsWith('freeze-')){A.match(r.outcome.error,/R4 programmatic freeze preparation fault/);A.ok(r.freezeCalls>0);A.equal(r.retryRevision,0);}else A.match(r.outcome.error,/Invalid financial snapshot/);A.equal(r.staged,false);A.equal(r.errors.length,0);if(mode.endsWith('init'))A.equal(r.present,false);else A.equal(r.revision,0);if(mode==='sparse-load')A.equal(r.sparsePreserved,true);if(mode==='sparse-commit'||mode==='freeze-commit'||mode==='freeze-load')A.equal(r.unchanged,true);});
test('actual candidate malformed sparse startup settles visibly blocked with records unchanged',()=>{const r=child('app-sparse');A.equal(r.state,'settled');A.equal(r.phase,'blocked');A.match(r.status,/blocked/i);A.equal(r.appHidden,true);A.equal(r.dockHidden,true);A.equal(r.revision,0);A.equal(r.sparsePreserved,true);A.equal(r.errors.length,0);});
test('dense own undefined history element remains invalid rather than optional data',()=>{const s=seed();s.holdings[0].history=[undefined];A.throws(()=>M.validate(s),/bounded string required/);});
test('completion only publishes an already hydrated result without postcommit freeze',()=>{const r=child('completion-no-hydration');A.equal(r.outcome.status,'resolved');A.equal(r.outcome.revision,1);A.equal(r.outcome.frozen,true);A.equal(r.revision,1);A.equal(r.freezeCalls,0);A.deepEqual(r.errors,[]);});
if(process.argv[2]){probe(process.argv[2]).then(out=>{process.stdout.write(JSON.stringify(out));process.exit(0);},e=>{console.error(e);process.exit(2);});}
