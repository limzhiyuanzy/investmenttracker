#!/usr/bin/env python3
"""Bounded real Chromium/Cache API failure supplement, never owner profiles.
Test-only worker Cache.put adapters are explicitly NOT physical quota exhaustion.
Protocol worker stop is used ONLY for explicit interruption cases here.
"""
from pathlib import Path
import hashlib, http.server, importlib.util, json, os, re, shutil, tempfile, threading, time, traceback
from native_support import Chrome, READ_DB

ROOT = Path(__file__).resolve().parents[2]
NAMES = ['index.html','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png']
SHA = lambda b: hashlib.sha256(b).hexdigest()

def main():
    out = Path(tempfile.mkdtemp(prefix='qb-native-failures-',dir=os.environ['TMPDIR']))
    profile = out/'profile'; profile.mkdir()
    for name in ['native_failures.py','native_support.py']:
        shutil.copyfile(Path(__file__).with_name(name),out/('executed-'+name))
    report = {'pass':False,'checks':[], 'boundary':'Real desktop Chromium worker/Cache API/IndexedDB; loopback/no-sandbox; injected Cache.put rejection is not physical quota; no power-loss claim.'}
    rows=[]; c=None; server=None; gate=threading.Event(); gate.set()
    def save(name,value): (out/name).write_text(json.dumps(value,indent=2)+'\n')
    def check(name, condition, **detail):
        row={'name':name,'pass':bool(condition),'time':time.time(),**detail}; report['checks'].append(row);print(json.dumps(row),flush=True)
        if not condition: raise AssertionError(name)
    try:
        A={n:(ROOT/'app/quiet-banking-v0.29'/n).read_bytes() for n in NAMES}
        spec=importlib.util.spec_from_file_location('builder',Path(__file__).with_name('build.py'))
        assert spec and spec.loader
        builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
        builder.generate(out/'B',tag='native-failures-B')
        B={n:(out/'B'/n).read_bytes() for n in NAMES}
        def config(data):
            match = re.search(rb'^const BUILD = (.*);$',data['sw.js'],re.M)
            assert match is not None, 'worker BUILD config missing'
            return json.loads(match[1])
        aid,bid=config(A)['id'],config(B)['id']
        report['candidate']={'build':aid,'assets':{n:SHA(b) for n,b in A.items()}}
        report['fixtureB']={'build':bid,'assets':{n:SHA(b) for n,b in B.items()}}
        state={'version':'A','hold':False,'delay':False}
        class Server(http.server.ThreadingHTTPServer): daemon_threads=True
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                version=state['version'];name='index.html' if self.path=='/quiet/' else self.path.removeprefix('/quiet/')
                data=(A if version=='A' else B).get(name) if self.path.startswith('/quiet/') else None
                row={'path':self.path,'version':version,'time':time.time(),'sha256':SHA(data) if data else None}; rows.append(row)
                if name=='icon-192.png':
                    if state['hold']: gate.wait(12)
                    if state['delay']: time.sleep(5.5)
                self.send_response(200 if data else 404);self.send_header('Cache-Control','no-store')
                self.send_header('Content-Type',{'html':'text/html','js':'application/javascript','png':'image/png','webmanifest':'application/manifest+json'}.get(name.rsplit('.',1)[-1],'text/plain'));self.end_headers()
                try:self.wfile.write(data or b'not found')
                except (BrokenPipeError,ConnectionResetError):pass
            def log_message(self,format,*a):pass
        server=Server(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{server.server_port}/quiet/'; report['base']=base
        c=Chrome(profile,out); report['browser']=c.call('Browser.getVersion');report['flags']=c.flags
        def new():
            t,s=c.tab();c.call('ServiceWorker.enable',sid=s);c.call('Page.navigate',{'url':base},s);return t,s
        t,s=new();c.until(s,"document.querySelector('#pwa-status')?.dataset.state==='reopen'",40);c.close(t)
        t,s=new();c.until(s,"document.querySelector('#pwa-status')?.dataset.state==='ready'&&durableState.phase==='ready'",40)
        t2,s2=new();c.until(s2,"document.querySelector('#pwa-status')?.dataset.state==='ready'",40)
        def oracle():return {'db':c.ev(s,READ_DB),'localStorage':c.ev(s,'Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])'),'applied':c.ev(s,'viewPreferences')}
        rev=c.ev(s,'durableState.revision');count=c.ev(s,'entries.length')
        c.ev(s,"transactionDialog('savings');document.querySelector('#tx-amount').value='31.25';document.querySelector('#tx-date').value=DatePolicy.today();document.querySelector('#transaction-form').requestSubmit()")
        c.until(s,'!durableState.pending&&durableState.revision==='+str(rev+1))
        c.ev(s,"closeModal();go('portfolio');custom();document.querySelector('input[data-custom-index=\"0\"]').click();document.querySelector('#custom-apply').click();localStorage.setItem('quietbanking.retry.synthetic','preference sentinel')")
        before=oracle();save('oracle-before.json',before)
        check('distinguishable actual native transaction committed once',c.ev(s,'entries.length')==count+1)
        c.ev(s,"(async()=>{const q=await caches.open('unrelated-retry-fixture');await q.put('/unrelated',new Response('do-not-touch'));const f=await caches.open('quietbanking:pwa:v029:future-unowned-build:stage');await f.put('/future',new Response('future sentinel'))})()")
        def start(sid,key='reply',kind='REPAIR_STATIC'):
            c.ev(sid,"window[%s]=null;void new Promise(ok=>{const q=new MessageChannel();q.port1.onmessage=e=>{q.port1.close();ok(e.data)};navigator.serviceWorker.controller.postMessage({type:%s},[q.port2])}).then(v=>window[%s]=v)"%(json.dumps(key),json.dumps(kind),json.dumps(key)))
        def result(sid,key='reply'):return c.until(sid,'window['+json.dumps(key)+']',18)
        def command(kind):start(s,'__statusReply',kind);return result(s,'__statusReply')
        def worker(build=aid):
            targets=c.call('Target.getTargets')['targetInfos']
            for target in reversed(targets):
                sid=c.workers.get(target['targetId'])
                if target['type']=='service_worker' and sid:
                    try:
                        if c.ev(sid,'BUILD.id')==build:return sid
                    except RuntimeError:pass
            raise AssertionError('missing worker '+build)
        def inventory():return c.ev(s,"(async()=>{const out={};for(const n of await caches.keys()){const cc=await caches.open(n);out[n]=await Promise.all((await cc.keys()).map(async r=>({url:r.url,body:r.url.endsWith('__qb_static_complete__')?await(await cc.match(r)).text():null})))}return out})()")
        def isolation():return c.ev(s,"(async()=>await(await(await caches.open('unrelated-retry-fixture')).match('/unrelated')).text()==='do-not-touch'&&await(await(await caches.open('quietbanking:pwa:v029:future-unowned-build:stage')).match('/future')).text()==='future sentinel')()")
        # Two real app window sources, duplicate requests, one shared five-file download.
        gate.clear();state['hold']=True;begin=len(rows)
        start(s,'r1');start(s,'r2');start(s2,'r3')
        c.until(s,"window.r1===null&&window.r2===null")
        deadline=time.monotonic()+3
        while not any(r['path'].endswith('icon-192.png') for r in rows[begin:]) and time.monotonic()<deadline:time.sleep(.05)
        check('held native repair retains ready old generation',command('GET_STATUS')['state']=='complete')
        gate.set();state['hold']=False
        replies=[result(s,'r1'),result(s,'r2'),result(s2,'r3')]
        downloads=[r for r in rows[begin:] if r['path'].removeprefix('/quiet/') in [a['path'] for a in config(A)['assets']]]
        check('three requests from two clients coalesce into five static fetches',all(r=={'build':aid,'state':'complete'} for r in replies) and len(downloads)==5,requests=downloads)
        check('coalesced repair preserves exact DB preferences revision',oracle()==before)
        # Native Cache API backing, narrowly injected worker Cache.put failure adapters.
        for mode in ['write','quota-adapter','marker','publication']:
            ws=worker()
            patch="""globalThis.__originalPut=Cache.prototype.put;globalThis.__injected=0;Cache.prototype.put=async function(request,response){const url=typeof request==='string'?request:request.url;const marker=url.endsWith('__qb_static_complete__');const mode=%s;if((mode==='write'||mode==='quota-adapter')&&!marker||mode==='marker'&&marker){__injected++;throw new DOMException('synthetic scoped adapter',mode==='quota-adapter'?'QuotaExceededError':'UnknownError')}const out=await __originalPut.call(this,request,response);if(mode==='publication'&&marker){__injected++;await __originalPut.call(this,request,new Response('invalid-publication-marker'))}return out};true"""%json.dumps(mode)
            c.ev(ws,patch);start(s);reply=result(s)
            check('native '+mode+' rejection reports failure and retains verified old set',reply['state']=='failed' and command('GET_STATUS')['state']=='complete' and c.ev(ws,'__injected')>0)
            c.ev(ws,'Cache.prototype.put=__originalPut;true')
            check('native '+mode+' failure preserves entire financial oracle and unrelated caches',oracle()==before and isolation())
        state['delay']=True;start_at=time.monotonic();start(s);reply=result(s);elapsed=time.monotonic()-start_at;state['delay']=False
        check('real delayed HTTP response hits bounded worker timeout retaining ready set',reply['state']=='failed' and 3.5<=elapsed<9 and command('GET_STATUS')['state']=='complete',elapsed=elapsed)
        # Explicit interruption only. Pause AFTER a real native write, then stop the worker.
        def interrupt(after_marker):
            ws=worker();c.ev(ws,"globalThis.__originalPut=Cache.prototype.put;globalThis.__paused=false;Cache.prototype.put=async function(req,res){const out=await __originalPut.call(this,req,res);const marker=(typeof req==='string'?req:req.url).endsWith('__qb_static_complete__');if(marker===%s){__paused=true;await new Promise(()=>{})}return out};true"%('true' if after_marker else 'false'))
            prior=set(inventory());start(s,'interrupted');c.until(ws,'__paused',12)
            inv=inventory();new_names=set(inv)-prior
            check('interruption fixture reached actual '+('commit marker' if after_marker else 'first file')+' write',len(new_names)==1,inventory=inv)
            stage=next(iter(new_names));check('native staged generation '+('has exact six entries' if after_marker else 'is partial unmarked'),len(inv[stage])==(6 if after_marker else 1) and any(r['body']==aid for r in inv[stage])==after_marker)
            versions=[v for e in c.events if e.get('method')=='ServiceWorker.workerVersionUpdated' for v in e['params']['versions'] if v.get('scriptURL')==base+'sw.js' and v.get('status')=='activated' and v.get('runningStatus')=='running']
            assert versions, 'no activated running version event'
            c.call('ServiceWorker.stopWorker',{'versionId':versions[-1]['versionId']},s)
            start(s,'__restartStatus','GET_STATUS')
            # Auto-attach pauses a restarted SAME target without another attach event.
            # Resume only the explicit interruption target, not discovery/update.
            time.sleep(.25)
            c.call('Runtime.runIfWaitingForDebugger',sid=ws)
            check('restart reconciles only verified complete generation after '+('marker' if after_marker else 'partial')+' interruption',result(s,'__restartStatus')['state']=='complete')
            return stage
        stage=interrupt(False)
        # Remove only the known usable A generations in this disposable profile to expose partial refusal.
        inv=inventory(); complete_names=[n for n,entries in inv.items() if any(r['body']==aid for r in entries)]
        c.ev(s,'Promise.all('+json.dumps(complete_names)+'.map(n=>caches.delete(n)))')
        check('restarted worker refuses lone interrupted partial stage',command('GET_STATUS')['state']=='failed')
        check('partial native generation is not served as HTML',c.ev(s,"fetch('index.html',{cache:'no-store'}).then(()=>false,()=>true)"))
        start(s);check('fresh repair recovers partial-only cache without financial writes',result(s)['state']=='complete' and oracle()==before)
        check('next repair removes abandoned own-build stage',stage not in inventory())
        committed_stage=interrupt(True)
        other_complete=[n for n,entries in inventory().items() if n!=committed_stage and any(r['body']==aid for r in entries)]
        c.ev(s,'Promise.all('+json.dumps(other_complete)+'.map(n=>caches.delete(n)))')
        check('restarted worker independently accepts only fully verified post-marker generation',command('GET_STATUS')['state']=='complete')
        check('post-marker restart still preserves exact native financial oracle',oracle()==before)
        for _ in range(3):
            start(s);assert result(s)['state']=='complete'
        own_generations=[n for n in inventory() if ':'+aid+':' in n]
        check('repeated native repairs bound generations for this scope and build to two',len(own_generations)==2 and isolation(),generations=own_generations)
        # B installing concurrently with active A repair: A cleanup must not touch B stage.
        state.update(version='B',hold=True);gate.clear()
        c.ev(s,"void navigator.serviceWorker.getRegistration().then(r=>r.update());true")
        c.until(s,"navigator.serviceWorker.getRegistration().then(r=>r.installing?.state==='installing')",15)
        deadline=time.monotonic()+3
        while not any(bid in n for n in inventory()) and time.monotonic()<deadline:time.sleep(.05)
        b_stages=[n for n in inventory() if bid in n]
        check('actual B installation has separate native staging cache',len(b_stages)==1,stages=b_stages)
        # A fetches newer B bytes and must reject; leave B held until A has failed.
        start(s,'overlap');reply=result(s,'overlap')
        check('A repair overlapping B installation fails without deleting B staging',reply['state']=='failed' and all(n in inventory() for n in b_stages) and command('GET_STATUS')['build']==aid)
        gate.set();state['hold']=False
        c.until(s,"navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)",20)
        check('B completes verified waiting while both A clients stay controlled',command('GET_STATUS')['build']==aid and any(len(entries)==6 and any(r['body']==bid for r in entries) for entries in inventory().values()))
        check('overlap keeps old future unrelated caches and exact entire native oracle',isolation() and oracle()==before and any(aid in n for n in inventory()))
        check('runtime error recorder remains empty in both app clients',c.ev(s,'__recorder&&__errors.length===0') and c.ev(s2,'__recorder&&__errors.length===0'))
        save('oracle-after.json',oracle());save('final-cache-inventory.json',inventory());report['pass']=True
    except BaseException as error:
        report.update(error=str(error),traceback=traceback.format_exc());print(report['traceback'],flush=True)
    finally:
        gate.set()
        if c:
            save('cdp-commands.json',c.commands);save('cdp-events.json',c.events);c.stop();report['chromeExit']=c.p.returncode
        if server:server.shutdown();server.server_close()
        save('http.json',rows);shutil.rmtree(profile);report['profileRemoved']=not profile.exists();save('report.json',report);print('REPORT='+str(out/'report.json'),flush=True)
    return 0 if report['pass'] else 1

if __name__=='__main__':raise SystemExit(main())
