// Storage lifecycle integration. Forms retain raw session drafts; only committed snapshots persist.
const DurableRecords=window.DurableRecords;
const durableState={phase:'loading',revision:0,pending:false,operation:null};
$('#chrome').hidden=true;
const financialStore=DurableRecords.create({indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,protocol:typeof location==='undefined'?'':location.protocol});
function financialSnapshot(){return {version:1,revision:durableState.revision,trackingStart,nextId,holdings,entries,reviews};}
function storageStatus(message){const host=$('#durable-status');if(host)host.textContent=message;}
function freezeFinancial(){DurableRecords.hydrate(financialSnapshot());}
function restoreFinancial(saved,refs){
 const s=DurableRecords.hydrate(DurableRecords.clone(saved));
 function restore(target,items,original){const restored=items.map((item,i)=>{const ref=original[i];if(ref&&!Object.isFrozen(ref)){for(const key of Object.keys(ref))delete ref[key];Object.assign(ref,item);return ref;}return item;});target.splice(0,target.length,...restored);}
 restore(holdings,s.holdings,refs.holdings);restore(entries,s.entries,refs.entries);reviews.splice(0,reviews.length,...s.reviews);trackingStart=s.trackingStart;nextId=s.nextId;
}
function savedDisplayFailed(error){durableState.phase='saved-display-failed';storageStatus('Saved local records; display refresh failed. Do not resubmit. Reload safely to display committed records. '+error.message);}
function durableHandler(action){let consumed=false;return async function(...args){
 args[0]?.preventDefault?.();if(consumed)return;
 if(durableState.phase!=='ready'){storageStatus(durableState.phase==='saved-display-failed'?'Saved local records; display failed. Do not resubmit. Reload safely.':'Financial saves blocked: records have not loaded safely. Reload on the same stable origin; do not clear browser data.');return;}
 if(durableState.pending)return;
 const before=DurableRecords.clone(financialSnapshot()),refs={holdings:holdings.slice(),entries:entries.slice()},op={committed:false,error:null};
 durableState.pending=true;durableState.operation=op;$('#durable-app').inert=true;$('#modal').inert=true;storageStatus('Saving local records… Keep this page open.');
 try{return await action.apply(this,args);}catch(error){op.error=error;if(op.committed)savedDisplayFailed(error);else storageStatus('Not saved. '+error.message+' Your draft is still session-only; retry deliberately.');}
 finally{
  if(!op.committed)restoreFinancial(before,refs);else consumed=true;
  durableState.pending=false;durableState.operation=null;$('#durable-app').inert=false;$('#modal').inert=false;
  if(durableState.phase==='ready')storageStatus(op.committed?'Saved local records in this browser. Plain local records, not an encrypted vault or backup. Unsaved drafts remain session-only.':op.error?'Not saved. '+op.error.message+' Draft retained; retry deliberately.':'No financial changes saved. Drafts remain session-only.');
 }
};}
async function durableCommit(){
 const op=durableState.operation;if(!op||op.committed)throw Error('Financial commit outside an active save');
 try{const result=await financialStore.commit(financialSnapshot(),durableState.revision);durableState.revision=result.revision;op.committed=true;freezeFinancial();storageStatus('Saved local records. Drafts are session-only; this is not a backup.');}
 catch(error){op.error=error;if(/revision conflict|disappeared|connection changed/i.test(error.message)){durableState.phase='blocked';storageStatus('Saving blocked: '+error.message+' Do not clear browser data.');}throw error;}
}
const originalFormError=formError;
formError=function(id,error){const op=durableState.operation;if(op){op.error=error;if(op.committed)savedDisplayFailed(error);}const host=$('#'+id);if(host)originalFormError(id,error);else if(op?.committed)savedDisplayFailed(error);else storageStatus('Not saved. '+error.message);};
// Pending saves cannot be navigated away from, cancelled, or submitted twice.
if(document.addEventListener){for(const type of ['click','submit','input','change'])document.addEventListener(type,event=>{if(durableState.pending){event.preventDefault();event.stopImmediatePropagation();}},true);}
$('#modal').addEventListener('cancel',event=>{if(durableState.pending)event.preventDefault();});
async function initializeDurable(){
 try{
  const s=await financialStore.load(financialSnapshot());
  holdings.splice(0,holdings.length,...s.holdings);entries.splice(0,entries.length,...s.entries);reviews.splice(0,reviews.length,...s.reviews);trackingStart=s.trackingStart;nextId=s.nextId;durableState.revision=s.revision;
  viewPreferences=loadViewPreferences();refresh();go('portfolio');durableState.phase='ready';
  $('#durable-app').hidden=false;$('#durable-app').inert=false;
  storageStatus('Local records loaded. Committed saves use IndexedDB on this stable origin. Plain local records, not an encrypted vault or backup. Unsaved drafts are session-only. Browser-data clearing or eviction can remove records.');
 }catch(error){durableState.phase='blocked';storageStatus('Financial records blocked: '+error.message+' Existing saved records have not been replaced. Reopen on the same stable HTTP(S) origin or seek recovery support; do not clear browser data.');}
}
window.durableReady=initializeDurable();
