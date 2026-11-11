'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {app:rawApp,inputs}=require('./harness.cjs'); const {fakeIDB}=require('./fake-idb.cjs'); async function app(html,opts={}){const a=rawApp(html,{...opts,indexedDB:fakeIDB()});A.ok(a.ready,'missing durable startup');await a.ready;A.equal(a.run('durableState.phase'),'ready');return a;} const submit=f=>f({preventDefault(){}});
const html=fs.readFileSync(process.env.DLR_APP||path.join(__dirname,'../../design/prototypes/quiet-banking-app-v0.25.html'),'utf8');
async function setup(kind='Buy',id='usd'){
 const a=await app(html,{detachTransactionFields:true});a.run(`transactionDialog('${id}')`);
 inputs(a,{'tx-kind':kind});a.run("$('#tx-kind').onchange()");
 inputs(a,{'tx-date':'2026-06-30',...(['Buy','Sell'].includes(kind)?{'tx-quantity':'1','tx-price':'1','tx-fee':'0'}:{'tx-amount':'1'}),...(id==='usd'?{'tx-fx':'1.4'}:{'tx-actual-balance':''})});
 if(kind==='Dividend'){inputs(a,{'tx-treatment':'reinvested'});a.run('reinvestmentFields()');inputs(a,{'tx-reinvested-units':'1'});}
 return a;
}
const cases=[['Deposit','savings','tx-amount','0.01'],['Buy','usd','tx-quantity','0.000001'],['Buy','usd','tx-price','0.000001'],['Buy','usd','tx-fee','0'],['Buy','usd','tx-fx','0.000001'],['Dividend','usd','tx-amount','0.01'],['Dividend','usd','tx-reinvested-units','0.000001'],['Sell','usd','tx-quantity','0.000001'],['Sell','usd','tx-price','0.000001'],['Sell','usd','tx-fee','0'],['Sell','usd','tx-fx','0.000001']];
for(const [kind,id,key,min]of cases){
 for(const raw of [min==='0'?'-0.01':String(Number(min)/10),'',' ','\t','invalid'])test(`reject ${kind} ${key} ${JSON.stringify(raw)} before records or IDs mutate`,async()=>{
  const a=await setup(kind,id);inputs(a,{[key]:raw});const before=JSON.stringify(a.state),next=a.run('nextId');await submit(a.node('#transaction-form').onsubmit);
  A.equal(JSON.stringify(a.state),before,'financial nonmutation');A.equal(a.run('nextId'),next,'ID nonmutation');A.match(a.node('#tx-error').textContent,/finite|positive|non-negative|minimum|required/i);
  A.equal(a.node('#'+key).value,raw);a.run('captureTransaction()');A.equal(a.run(`transactionDrafts.get('${id}')['${key}']`),raw);
 });
 test(`accept retained minimum ${kind} ${key} ${min}`,async()=>{const a=await setup(kind,id),n=a.state.entries.length;inputs(a,{[key]:min});await submit(a.node('#transaction-form').onsubmit);A.equal(a.state.entries.length,n+1,a.node('#tx-error').textContent);A.equal(a.run('txSession.committed'),true);});
}
for(const kind of ['Buy','Sell'])test(`${kind} admits minimum quantity times minimum price without imposing cash amount minimum`,async()=>{const a=await setup(kind),n=a.state.entries.length;inputs(a,{'tx-quantity':' 0.000001 ','tx-price':'0.000001','tx-fee':'0'});await submit(a.node('#transaction-form').onsubmit);A.equal(a.state.entries.length,n+1,a.node('#tx-error').textContent);A.equal(a.state.entries.at(-1).amount,1e-12);});
for(const raw of ['0.00000001',' 0 '])test(`optional actual balance accepts ${JSON.stringify(raw)} without new limits`,async()=>{const a=await setup('Deposit','savings');inputs(a,{'tx-actual-balance':raw});await submit(a.node('#transaction-form').onsubmit);A.equal(a.run('txSession.committed'),true);});
for(const raw of ['',' ','\t','0'])test(`optional balance ${JSON.stringify(raw)} retains blank versus zero semantics`,async()=>{const a=await setup('Deposit','savings'),h=a.state.holdings.find(h=>h.id==='savings'),n=h.valuations.length;inputs(a,{'tx-actual-balance':raw});await submit(a.node('#transaction-form').onsubmit);A.equal(a.run('txSession.committed'),true);A.equal(h.valuations.length,n+(raw==='0'?1:0));if(raw==='0')A.equal(h.valuations.at(-1).nativeValue,0);});
for(const raw of ['-0.01','invalid'])test(`reject optional actual balance ${raw} atomically`,async()=>{const a=await setup('Deposit','savings');inputs(a,{'tx-actual-balance':raw});const before=JSON.stringify(a.state),next=a.run('nextId');await submit(a.node('#transaction-form').onsubmit);A.equal(JSON.stringify(a.state),before);A.equal(a.run('nextId'),next);A.match(a.node('#tx-error').textContent,/finite non-negative actual balance/);});
for(const committed of [false,true])test(`queued A close cannot consume open B (${committed?'saved':'draft'} A)`,async()=>{
 const a=await app(html,{detachTransactionFields:true});a.run("go('transactions')");inputs(a,{'transaction-filter':'usd','source-filter':'manual'});a.window.scrollY=450;
 a.run("$('#modal').close=function(){this.open=false};transactionDialog('savings')");inputs(a,{'tx-amount':'12.3400'});
 if(committed)await submit(a.node('#transaction-form').onsubmit);
 a.run("closeModal();detail('usd');transactionDialog('usd')");inputs(a,{'tx-quantity':'2.5000','tx-price':'123.4500','tx-fee':'0'});a.run('captureTransaction()');
 const before=JSON.stringify(a.state),next=a.run('nextId');for(const f of a.node('#modal').listeners.close||[])f();
 A.equal(a.node('#modal').open,true);A.equal(a.run('txSession?.id'),'usd','B session remains live');A.equal(a.run('txSession.origin.page'),'holding-detail');
 inputs(a,{'tx-holding':'savings'});a.run("$('#tx-holding').onchange()");inputs(a,{'tx-holding':'usd'});a.run("$('#tx-holding').onchange()");A.equal(a.node('#tx-quantity').value,'2.5000');A.equal(a.node('#tx-price').value,'123.4500');
 A.equal(JSON.stringify(a.state),before);A.equal(a.run('nextId'),next);a.run('closeModal()');for(const f of a.node('#modal').listeners.close||[])f();A.equal(a.run('txSession'),null);A.equal(a.run('currentPage'),'holding-detail');A.equal(a.run('selectedHolding'),'usd');
});
