"""Deterministic v0.28 derivation from locked v0.27; owned outputs only."""
import argparse,pathlib,hashlib,json,re,difflib,os
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parents[1];OLD=ROOT/'calculations/backup-v027';DUR=ROOT/'calculations/durable-records-v025';PWA=ROOT/'calculations/pwa-v026'
def sha(b):return hashlib.sha256(b).hexdigest()
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':'))
def change(s,a,b):
 assert s.count(a)==1,(a[:120],s.count(a));return s.replace(a,b)
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--tag',required=True);args=p.parse_args();out=args.output.resolve();assert out==ROOT/'app/quiet-banking-v0.28' or out.is_relative_to(HERE) or out.is_relative_to(pathlib.Path(os.environ['TMPDIR']).resolve())
 base=(ROOT/'app/quiet-banking-v0.27/index.html').read_bytes();assert sha(base)=='1dd20b86620c2a25283697aa0179587386b2ab751a7bb655aa93778c78b58aea';html=base.decode();policy=(HERE/'date-policy.cjs').read_text()
 store=(DUR/'store.cjs').read_text();newstore=change(store,"&&(future||x<='2026-06-30')","&&x<='9999-12-31'")
 newstore=change(newstore,'function atomic(seed,expected){','function atomic(seed,expected,guard=()=>{}){')
 newstore=change(newstore,'result=hydrate(clone(validate({...seed,revision:expected+1})));tx.objectStore(STORE).put(result,KEY);','result=hydrate(clone(validate({...seed,revision:expected+1})));guard(result,stored);tx.objectStore(STORE).put(result,KEY);')
 newstore=change(newstore,'commit:(snapshot,expected)=>serialized(()=>{validate(snapshot);integer(expected);return atomic(snapshot,expected);})','commit:(snapshot,expected,guard=()=>{})=>serialized(()=>{validate(snapshot);integer(expected);return atomic(snapshot,expected,guard);})')
 (HERE/'store.cjs').write_text(newstore);html=change(html,store,newstore)
 for name in ['crypto.cjs','storage.cjs']:
  source=(OLD/name).read_text();new=source.replace("require('../durable-records-v025/store.cjs')","require('./store.cjs')")
  if name=='storage.cjs':new=change(new,'commit:async(snapshot,expected)=>{await read();return base.commit(snapshot,expected);}','commit:async(snapshot,expected,guard=()=>{})=>{await read();return base.commit(snapshot,expected,guard);}')
  (HERE/name).write_text(new);html=change(html,source,new)
 engine=re.search(r'<script id="cashflow-engine">([\s\S]*?)</script>',html)[1];old_schedule=re.search(r'function schedule\(start,end,months\)\{[^\n]+',engine)[0];newengine=change(engine,old_schedule,(HERE/'engine-schedule.js').read_text().rstrip());(HERE/'cashflow-engine.cjs').write_text(newengine);html=change(html,engine,newengine)
 html=change(html,'<script id="cashflow-engine">','<script>\n'+policy+'\n</script>\n<script id="cashflow-engine">')
 html=change(html,"const CUTOFF = '2026-06-30';","const DatePolicy=window.DatePolicy;\nlet formDateContext=DatePolicy.context();\nlet setupDateContext=DatePolicy.context();")
 html=change(html,"function dateCheck(date, minimum=trackingStart) { assert(validDate(date) && date >= minimum && date <= CUTOFF, 'Use a date from '+minimum+' through the fixed synthetic cutoff '+CUTOFF+'.'); }","function dateCheck(date, minimum=trackingStart) { assert(DatePolicy.real(date) && date >= minimum && date <= DatePolicy.today(), 'Use a real date from '+minimum+' through the local device day '+DatePolicy.today()+'.'); }")
 html=html.replace('{limit:CUTOFF}',"{limit:DatePolicy.MAX}")
 a=html.index('function scheduledDates(start, through, months) {');b=html.index('function policyDates(',a);html=html[:a]+"function scheduledDates(start, through, months) { return DatePolicy.schedule(start,through,months); }\n"+html[b:]
 html=change(html,"assert(validDate(through)&&through<=CUTOFF,'Invalid premium generation boundary.');","assert(DatePolicy.real(through),'Invalid premium generation boundary.');")
 html=change(html,"staged.push({id,holding:h.id,kind:'Premium'","assert(staged.length<DatePolicy.MAX_OCCURRENCES&&ledger.length+staged.length<20000,'Premium staging limit exceeded; nothing saved.');\n   staged.push({id,holding:h.id,kind:'Premium'")
 a=html.index("function policyDialog(id='ilp') {");b=html.index('function setupPreview()',a);html=html[:a]+(HERE/'integration.js').read_text()+'\n'+html[b:]
 html=change(html,"function showModal(content) { $('#modal-content').innerHTML = content;","function showModal(content) { formDateContext=DatePolicy.context();$('#modal-content').innerHTML = content;")
 html=change(html,"date:CUTOFF,fx:String(h.fx)","date:DatePolicy.today(),dateContext:DatePolicy.context(),fx:String(h.fx)")
 # Every remaining CUTOFF is a new-entry default/limit or its disclosure, never a report cutoff.
 html=html.replace('Fixed synthetic cutoff: ${CUTOFF}.','Device-local entry day: ${DatePolicy.today()}.').replace('CUTOFF','DatePolicy.today()')
 html=change(html,"$('#tx-date').value=s.date;","$('#tx-date').value=DatePolicy.today();")
 html=change(html,"disabled+' required')}${field('new-premium'", "disabled+' required min=\"2000-01-01\" max=\"'+DatePolicy.today()+'\"')}${field('new-premium'")
 html=change(html,"h?.policy?.end||'',disabled)","h?.policy?.end||'',disabled+' min=\"2000-01-01\" max=\"9999-12-31\"')")
 html=change(html,"field('edit-date','Date','date',t.date,`max=\"${DatePolicy.today()}\" required`)","field('edit-date','Date','date',t.date,`min=\"${t.source==='auto'?h.policy.start:h.tracking}\" max=\"${DatePolicy.today()}\" required`)")
 html=change(html,"const type=val('holding-type'),currency=val('holding-currency'),disabled=h&&!canEditBaseline?'disabled':'';","const type=val('holding-type'),currency=val('holding-currency'),disabled=h&&!canEditBaseline?'disabled':'',policyDisabled=h?'disabled':'';")
 a=html.index("+(type==='ILP'?");b=html.index('\n',a);html=html[:a]+html[a:b].replace('disabled','policyDisabled')+html[b:]
 html=change(html,'Existing policy start and historical schedule cannot be rewritten.','Existing policy schedule fields are read-only in v0.28: the one-future-slot format cannot safely retain schedule edit history.')
 html=change(html,'max="2026-06-30"','max="9999-12-31"')
 # Explicit setup baseline stays unchanged; only its maximum follows the current day.
 html=change(html,"go('setup');$('#setup-error').textContent='';","setupDateContext=DatePolicy.context();go('setup');$('#setup-date').max=DatePolicy.today();$('#setup-error').textContent='';")
 a=html.index('async function saveValuation(id,next=false)');b=html.index('function completedReview(',a);html=html[:a]+change(html[a:b],'})();}',"},valueDrafts.get(id)?.dateContext||formDateContext,nextContext=>{const draft=valueDrafts.get(id);if(draft)draft.dateContext=nextContext;reviewDateMaximums(nextContext,['update-date']);})();}")+html[b:]
 a=html.index('async function commitSetup()');b=html.index('function holdingForm(',a);html=html[:a]+change(html[a:b],'})();}',"},setupDateContext,nextContext=>{setupDateContext=nextContext;reviewDateMaximums(nextContext,['setup-date']);})();}")+html[b:]
 original=(DUR/'integration.js').read_text();assert original in base.decode()
 new=original
 new=change(new,'function storageStatus(message){','function storageStatus(message){const warning=DatePolicy.warning(financialSnapshot());message=(warning?warning+" ":"")+message;')
 new=change(new,'function durableHandler(action){let consumed=false;',"function durableHandler(action,dateContext=formDateContext,reviewContext=next=>{formDateContext=next;reviewDateMaximums(next,['tx-date','edit-date','correct-date','close-date','holding-tracking','new-policy-start']);}){let consumed=false;")
 new=change(new,'if(durableState.pending)return;','if(durableState.pending)return;\n try{DatePolicy.admit(financialSnapshot(),dateContext);}catch(error){dateContext=DatePolicy.context();reviewContext(dateContext);storageStatus(error.message);return;}')
 new=change(new,'op={committed:false,error:null};','op={committed:false,error:null,dateContext,reviewContext:next=>{dateContext=next;reviewContext(next);}};')
 new=change(new,'financialStore.commit(financialSnapshot(),durableState.revision)','financialStore.commit(financialSnapshot(),durableState.revision,(candidate,stored)=>{DatePolicy.admit(stored,op.dateContext);DatePolicy.admit(candidate,op.dateContext);})')
 new=change(new,'op.error=error;if(/revision conflict','op.error=error;op.reviewContext(DatePolicy.context());if(/revision conflict')
 (HERE/'durable-integration.js').write_text(new);html=change(html,original,new)
 # Backup warning is informational, not a restore veto. Existing replace CAS/guards stay unchanged.
 html=change(html,"'Validated preview only. Current records and selection unchanged. Optionally export current records above, then explicitly confirm replacement.'","'Validated preview only. Current records and selection unchanged. Optionally export current records above, then explicitly confirm replacement. '+DatePolicy.warning(payload.financial)")
 html=change(html,"(h.policy.future?' Future-only schedule from '","(h.policy.future?' Saved schedule segment from '")
 html=html.replace('Investment Tracker v0.27','Investment Tracker v0.28').replace('QUIET BANKING v0.27','QUIET BANKING v0.28')
 inputs={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in [HERE/'build.py',HERE/'engine-schedule.js',HERE/'cashflow-engine.cjs',HERE/'date-policy.cjs',HERE/'integration.js',HERE/'store.cjs',HERE/'crypto.cjs',HERE/'storage.cjs',HERE/'durable-integration.js',PWA/'worker.template.js',PWA/'client.template.js',ROOT/'app/quiet-banking-v0.27/index.html']}
 for name in ['manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png']:inputs[name]=sha((ROOT/'app/quiet-banking-v0.27'/name).read_bytes())
 inputs['tag']=args.tag;build=sha(canonical(inputs).encode())[:24]
 html=re.sub(r'<meta name="quiet-banking-build" content="[^"]+">','<meta name="quiet-banking-build" content="'+build+'">',html,count=1)
 html=re.sub(r'(<script id="quiet-banking-pwa-client">)[\s\S]*?(</script>)',lambda m:m[1]+'\n'+(PWA/'client.template.js').read_text().replace('__BUILD__',build)+'\n'+m[2],html,count=1)
 assert 'CUTOFF' not in html
 out.mkdir(parents=True,exist_ok=True);(out/'index.html').write_text(html)
 for name in ['manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png']:(out/name).write_bytes((ROOT/'app/quiet-banking-v0.27'/name).read_bytes())
 assets=[{'path':n,'type':t,'sha256':sha((out/n).read_bytes())}for n,t in [('index.html','text/html'),('manifest.webmanifest','application/manifest+json'),('icon-180.png','image/png'),('icon-192.png','image/png'),('icon-512.png','image/png')]]
 (out/'sw.js').write_text((PWA/'worker.template.js').read_text().replace('__CONFIG__',canonical({'id':build,'assets':assets})))
 receipt={'build':build,'inputs':inputs,'assets':assets,'package':{f.name:sha(f.read_bytes())for f in sorted(out.iterdir())if f.is_file()}}
 print(json.dumps(receipt,indent=2));(HERE/'html-delta.diff').write_text(''.join(difflib.unified_diff(base.decode().splitlines(True),html.splitlines(True),fromfile='v0.27/index.html',tofile='v0.28/index.html')))
if __name__=='__main__':main()
