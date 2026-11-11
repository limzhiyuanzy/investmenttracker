'use strict';
// Deterministic native-shaped fault adapter. NOT native database evidence.
function fakeIDB(initial){
 const backend={present:arguments.length>0,value:structuredClone(initial),fail:null,hold:false,optionsError:null,transactions:[],opens:[],queue:[],running:false};
 function pump(){if(backend.running||!backend.queue.length)return;backend.running=true;const job=backend.queue.shift();setImmediate(job);}
 const db={objectStoreNames:{contains:()=>true},createObjectStore(){},close(){},transaction(name,mode,options){
  if(options&&backend.optionsError)throw backend.optionsError;
  const tx={mode,options,error:null,aborted:false,requests:[],abort(){this.aborted=true;this.error??=Error('AbortError');},objectStore(){return {get(){const r={};tx.requests.push(()=>{r.result=structuredClone(tx.hasStaged?tx.staged:backend.value);r.onsuccess?.();});return r;},count(){const r={};tx.requests.push(()=>{r.result=tx.hasStaged||backend.present?1:0;r.onsuccess?.();});return r;},put(v){const r={};tx.requests.push(()=>{tx.staged=structuredClone(v);tx.hasStaged=true;r.onsuccess?.();});return r;}};}};
  backend.transactions.push(tx);backend.queue.push(()=>{const tick=()=>{if(tx.aborted)return finish();const f=tx.requests.shift();if(f){try{f();}catch(e){tx.error=e;tx.aborted=true;}return setImmediate(tick);}if(backend.hold){backend.release=()=>{backend.hold=false;setImmediate(tick);};return;}if(backend.fail){tx.error=backend.fail;backend.fail=null;tx.aborted=true;}finish();};function finish(){if(tx.aborted)tx.onabort?.();else{if(tx.hasStaged){backend.value=tx.staged;backend.present=true;}tx.oncomplete?.();}backend.running=false;pump();}tick();});pump();return tx;
 }};
 return {backend,open(name,version){backend.opens.push({name,version});const r={};setImmediate(()=>{r.result=db;r.onsuccess?.();});return r;}};
}
module.exports={fakeIDB};
