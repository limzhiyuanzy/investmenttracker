/* Quiet Banking durable financial snapshot v1. No network or localStorage. */
(function(root){
'use strict';
const DB_NAME='quietbanking.financial-records',DB_VERSION=1,STORE='snapshots',KEY='financial',MAX_CHARS=2000000;
const TYPES=['Stock','Savings bond','Treasury bill','ILP','Bank account','Cash portfolio'];
function check(ok,message){if(!ok)throw Error('Invalid financial snapshot: '+message);}
function object(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function keys(x,allowed,required=allowed){check(object(x),'object required');for(const k of Object.keys(x))check(allowed.includes(k),'unknown field '+k);for(const k of required)check(x[k]!==undefined,'missing '+k);}
function str(x,max=4096){check(typeof x==='string'&&x.length>0&&x.length<=max,'bounded string required');}
function id(x){check(typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x),'invalid ID');}
function date(x,future=false){check(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&x>='2000-01-01'&&(future||x<='2026-06-30')&&Number.isFinite(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x,'invalid real date');}
function finite(x,min=0){check(typeof x==='number'&&Number.isFinite(x)&&x>=min,'finite number required');}
function integer(x,min=0){check(Number.isSafeInteger(x)&&x>=min,'safe integer required');}
function array(x,max){check(Array.isArray(x)&&x.length<=max,'bounded collection required');for(let i=0;i<x.length;i++)check(Object.prototype.hasOwnProperty.call(x,i),'dense collection required');}
function enumeration(x,values){check(values.includes(x),'unsupported enum '+x);}
function history(x){array(x,2000);x.forEach(v=>str(v));}
function walk(x,depth=0,budget={n:0,chars:0}){
 check(depth<=14&&++budget.n<=150000,'recursive payload limit');
 if(x===undefined)return; // optional own properties created by the existing v0.21 records
 if(typeof x==='number')check(Number.isFinite(x),'nested nonfinite number');
 else if(typeof x==='string'){budget.chars+=x.length;check(x.length<=16384&&budget.chars<=MAX_CHARS,'string payload limit');}
 else if(typeof x==='object'&&x!==null){if(Array.isArray(x)){array(x,20000);for(const v of x)walk(v,depth+1,budget);}else{check(Object.getPrototypeOf(x)===null||(Object.prototype.toString.call(x)==='[object Object]'&&Object.getPrototypeOf(Object.getPrototypeOf(x))===null),'plain data required');for(const k of Object.keys(x)){check(!['__proto__','constructor','prototype'].includes(k),'unsafe key');walk(x[k],depth+1,budget);}}}
 else check(typeof x==='boolean'||x===null,'unsupported value');
}
function validate(s){
 walk(s);keys(s,['version','revision','trackingStart','nextId','holdings','entries','reviews']);check(s.version===1,'unsupported version');integer(s.revision);integer(s.nextId,1);date(s.trackingStart);array(s.holdings,256);array(s.entries,20000);array(s.reviews,1000);
 check(JSON.stringify(s).length<=MAX_CHARS,'serialized payload limit');
 const hs=new Map(),es=new Map();let highest=0;
 function unique(map,x){id(x.id);check(!map.has(x.id),'duplicate ID');map.set(x.id,x);const m=/^(?:transaction-|holding|final)(\d+)$/.exec(x.id);if(m){const n=Number(m[1]);integer(n,1);highest=Math.max(highest,n);}}
 for(const h of s.holdings)unique(hs,h);
 for(const t of s.entries){unique(es,t);check(!hs.has(t.id),'cross-record ID collision');}
 check(s.nextId>highest,'nextId already used');
 function coverage(ids,h,when){array(ids,20000);const seen=new Set();for(const ref of ids){id(ref);const t=es.get(ref);check(t&&t.holding===h.id&&t.date<=when&&!seen.has(ref),'invalid covered entry reference');seen.add(ref);}}
 function measurement(v,h,opening=false){
  keys(v,['date','value','units','price','fx','boundary','source','nativeValue','includedEntryIds'],['date','value','fx','boundary','source']);date(v.date);finite(v.value);finite(v.fx,Number.MIN_VALUE);str(v.source);enumeration(v.boundary,['BOD','EOD']);
  if(opening)check(v.boundary==='BOD'&&v.date===h.tracking,'opening boundary');
  if(v.boundary==='BOD')check(v.date===h.tracking,'BOD measurement must use opening date');
  if(v.source==='manual closure')check(h.closed&&v.date===h.closedDate&&v.value===0&&(h.type!=='Stock'||v.units===0),'closure measurement branch');
  check(v.date>=h.tracking,'measurement before opening');
  if(v.units!==undefined)finite(v.units);if(v.price!==undefined)finite(v.price);if(v.nativeValue!==undefined)finite(v.nativeValue);
  if(h.type==='Stock'){finite(v.units);if(v.source!=='manual closure')finite(v.price);check(Number.isFinite(v.units*(v.price??0)*v.fx),'nonfinite stock measurement');}
  if(h.type==='Bank account'&&(opening||v.boundary==='EOD')&&v.source!=='manual closure'){finite(v.nativeValue);if(!opening)coverage(v.includedEntryIds,h,v.date);}
  if(v.includedEntryIds!==undefined)coverage(v.includedEntryIds,h,v.date);
 }
 function policy(p,future=false){keys(p,future?['effective','premium','frequency','end']:['start','premium','frequency','end','future'],future?['effective','premium','frequency','end']:['start','premium','frequency','end']);date(future?p.effective:p.start,future);if(future)check(p.effective>'2026-06-30','future schedule boundary');finite(p.premium,Number.MIN_VALUE);enumeration(p.frequency,['Monthly','Quarterly','Annually']);check(typeof p.end==='string','policy end');if(p.end){date(p.end,true);check(p.end>=(future?p.effective:p.start),'schedule end before start');}if(p.future)policy(p.future,true);}
 for(const h of s.holdings){
  keys(h,['id','name','provider','type','currency','tracking','value','valueDate','units','unitsDate','price','fx','closed','closedDate','history','valuations','revision','openingFX','opening','quantityConfirmations','policy'],['id','name','provider','type','currency','tracking','value','valueDate','fx','closed','history','valuations','revision','openingFX','opening']);str(h.name,80);str(h.provider,80);enumeration(h.type,TYPES);enumeration(h.currency,['SGD','USD']);date(h.tracking);date(h.valueDate);check(h.tracking>=s.trackingStart&&h.valueDate>=h.tracking,'holding date order');finite(h.value);finite(h.fx,Number.MIN_VALUE);finite(h.openingFX,Number.MIN_VALUE);integer(h.revision);check(typeof h.closed==='boolean','closed boolean');history(h.history);measurement(h.opening,h,true);array(h.valuations,5000);check(h.valuations.length>0,'missing valuations');h.valuations.forEach(v=>measurement(v,h));
  if(h.type==='Stock'){finite(h.units);finite(h.price);date(h.unitsDate);check(h.unitsDate>=h.tracking,'quantity date order');array(h.quantityConfirmations,5000);check(h.quantityConfirmations.length>0,'missing stock confirmations');for(const q of h.quantityConfirmations){keys(q,['date','units','source','includedEntryIds']);date(q.date);check(q.date>=h.tracking,'quantity before opening');finite(q.units);str(q.source);coverage(q.includedEntryIds,h,q.date);}}
  else check(h.units===undefined&&h.unitsDate===undefined&&h.price===undefined&&h.quantityConfirmations===undefined,'nonstock quantity fields');
  if(h.type==='ILP'){policy(h.policy);check(h.policy.start<=h.tracking,'policy after opening');}else check(h.policy===undefined,'policy on nonpolicy');
  if(h.closed){date(h.closedDate);const finals=s.entries.filter(t=>t.holding===h.id&&t.final===true);check(h.closedDate>=h.tracking&&h.valueDate===h.closedDate&&h.value===0&&(h.type!=='Stock'||h.units===0)&&finals.length===1&&finals[0].active===true&&finals[0].date===h.closedDate&&h.valuations.some(v=>v.source==='manual closure'&&v.date===h.closedDate&&v.value===0),'closed residual, final proceeds or boundary');}else check(h.closedDate===undefined,'open holding closure date');
 }
 for(const t of s.entries){
  keys(t,['id','holding','kind','date','amount','quantity','price','fee','source','currency','fx','active','history','treatment','reinvestedUnits','due','final'],['id','holding','kind','date','amount','source','currency','fx','active','history']);id(t.holding);const h=hs.get(t.holding);check(h,'unknown holding reference');date(t.date);finite(t.amount);finite(t.fx,Number.MIN_VALUE);check(Number.isFinite(t.amount*t.fx),'nonfinite converted amount');enumeration(t.currency,['SGD','USD']);check(t.currency===h.currency,'entry currency');enumeration(t.source,['manual','auto']);check(typeof t.active==='boolean','entry active boolean');history(t.history);
  const allowed=h.type==='Stock'?['Buy','Sell','Dividend']:h.type==='ILP'?['Premium','Additional premium']:h.type==='Bank account'?['Deposit','Withdrawal','Interest']:h.type==='Cash portfolio'?['Contribution','Withdrawal','Payout']:['Contribution','Coupon / payout','Redemption / maturity'];enumeration(t.kind,[...allowed,'Final proceeds']);
  check(t.date>=(t.source==='auto'?h.policy?.start:h.tracking),'entry before boundary');
  if(t.source==='auto'){check(h.type==='ILP'&&t.kind==='Premium','auto premium branch');date(t.due);check(t.due>=h.policy.start&&t.id==='premium-'+h.id+'-'+t.due,'premium due / occurrence identity');}else check(t.due===undefined,'manual due identity');
  if(['Buy','Sell'].includes(t.kind)){finite(t.quantity,Number.MIN_VALUE);finite(t.price,Number.MIN_VALUE);finite(t.fee);check(Number.isFinite(t.quantity*t.price),'trade overflow');}else check(t.quantity===undefined&&t.price===undefined&&t.fee===undefined,'nontrade quantity');
  if(['Dividend','Payout','Coupon / payout'].includes(t.kind)){enumeration(t.treatment,['paid-out','reinvested']);if(t.treatment==='reinvested'&&h.type==='Stock')finite(t.reinvestedUnits,Number.MIN_VALUE);else check(t.reinvestedUnits===undefined,'unexpected reinvested units');}else check(t.treatment===undefined&&t.reinvestedUnits===undefined,'unexpected treatment');
  if(t.final!==undefined)check(typeof t.final==='boolean','final boolean');if(t.kind==='Final proceeds')check(t.final===true,'final proceeds branch');
  if(t.final===true){check(['Final proceeds','Sell','Withdrawal','Redemption / maturity'].includes(t.kind),'final proceeds kind');check(h.closed&&t.active===true&&t.date===h.closedDate,'final proceeds closed holding, active or date');}
 }
 for(const r of s.reviews){keys(r,['date','holdings','snapshots','source']);date(r.date);str(r.source);array(r.holdings,256);check(object(r.snapshots),'review snapshots');const seen=new Set();for(const ref of r.holdings){id(ref);check(hs.has(ref)&&!seen.has(ref),'review holding reference');seen.add(ref);measurement(r.snapshots[ref],hs.get(ref));}check(Object.keys(r.snapshots).length===seen.size&&Object.keys(r.snapshots).every(k=>seen.has(k)),'review snapshot members');}
 return s;
}
function clone(s){return JSON.parse(JSON.stringify(s));}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function hydrate(s){validate(s);for(const h of s.holdings){h.valuations.forEach(freeze);h.quantityConfirmations?.forEach(freeze);}s.reviews.forEach(freeze);return s;}
function create({indexedDB,protocol}={}){
 let connection=null,queue=Promise.resolve(),invalidated=false;
 function open(){if(protocol!=='http:'&&protocol!=='https:')return Promise.reject(Error('Unsupported storage context. Use a stable HTTP(S) origin; file: saves are blocked.'));if(!indexedDB)return Promise.reject(Error('Native IndexedDB unsupported or unavailable.'));if(invalidated)return Promise.reject(Error('Database connection changed. Reload before saving.'));if(connection)return connection;connection=new Promise((resolve,reject)=>{let req;try{req=indexedDB.open(DB_NAME,DB_VERSION);}catch(e){reject(e);return;}req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};req.onerror=()=>reject(req.error||Error('IndexedDB open failed'));req.onblocked=()=>reject(Error('IndexedDB upgrade blocked. Close other app tabs and reload.'));req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{invalidated=true;db.close();};resolve(db);};});return connection;}
 function transaction(db){try{return db.transaction(STORE,'readwrite',{durability:'strict'});}catch(e){if(e?.name!=='TypeError'||!/options?|durability|too many arguments|overload|signature|3 arguments/i.test(e.message||''))throw e;return db.transaction(STORE,'readwrite');}}
 function atomic(seed,expected){return open().then(db=>new Promise((resolve,reject)=>{
  let tx,result,failure;try{tx=transaction(db);}catch(e){reject(e);return;}
  // All validation/cloning/freezing finishes before put; completion only publishes.
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure||tx.error||Error('IndexedDB transaction aborted'));tx.onerror=()=>{};
  const abort=e=>{failure=e;try{tx.abort();}catch(_){reject(e);}};
  // get() returns undefined for both a missing key and a present undefined value.
  // Queue count and get in this same readwrite transaction; only count zero is absence.
  let req,presence;try{const store=tx.objectStore(STORE);presence=store.count(KEY);req=store.get(KEY);}catch(e){abort(e);return;}
  presence.onerror=()=>abort(presence.error||Error('Financial records presence read failed'));
  req.onerror=()=>abort(req.error||Error('Financial records read failed'));
  req.onsuccess=()=>{try{
   const stored=req.result;
   if(presence.result===0){check(expected===undefined,'financial snapshot disappeared; reload required');result=hydrate(clone(validate(seed)));tx.objectStore(STORE).put(result,KEY);}
   else {validate(stored);if(expected===undefined)result=hydrate(clone(stored));else{if(stored.revision!==expected)throw Error('Revision conflict: another tab saved newer records. Reload before saving; your draft is session-only.');check(expected<Number.MAX_SAFE_INTEGER,'revision exhausted');result=hydrate(clone(validate({...seed,revision:expected+1})));tx.objectStore(STORE).put(result,KEY);}}
  }catch(e){abort(e);}};
 }));}
 function serialized(fn){const p=queue.then(fn);queue=p.catch(()=>{});return p;}
 return {load:seed=>serialized(()=>atomic(seed)),commit:(snapshot,expected)=>serialized(()=>{validate(snapshot);integer(expected);return atomic(snapshot,expected);})};
}
const api={DB_NAME,DB_VERSION,STORE,KEY,MAX_CHARS,validate,hydrate,clone,create};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DurableRecords=api;
})(typeof window==='object'?window:globalThis);
