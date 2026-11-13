#!/usr/bin/env python3
"""Optional genuine Chromium evidence. QB_CHROME must name an existing executable.
No package install; all profiles/fixtures/evidence live under configured TMPDIR.
"""
from pathlib import Path
import base64
import hashlib
import http.server
import importlib.util
import json
import os
import re
import shutil
import socket
import tempfile
import threading
import time
import traceback
from native_support import Chrome, READ_DB

ROOT = Path(__file__).resolve().parents[2]
NAMES = ['index.html','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png']
SHA = lambda b: hashlib.sha256(b).hexdigest()

def main():
    scratch = Path(os.environ['TMPDIR']); scratch.mkdir(parents=True, exist_ok=True)
    out = Path(tempfile.mkdtemp(prefix='qb-v029-native-', dir=scratch))
    profile = out/'profile'; profile.mkdir()
    shutil.copyfile(__file__, out/'executed-driver.py')
    shutil.copyfile(Path(__file__).with_name('native_support.py'), out/'executed-support.py')
    report = {'pass':False,'boundary':'Desktop Chromium real worker/cache/native IndexedDB; loopback fixture; not actual iPad or installed PWA.','checks':[]}
    c = None; server = None
    def save(name, value): (out/name).write_text(json.dumps(value,indent=2)+'\n')
    def check(name, condition, **detail):
        row={'name':name,'pass':bool(condition),'time':time.time(),**detail};report['checks'].append(row); print(json.dumps(row),flush=True)
        if not condition: raise AssertionError(name)
    try:
        A = {n:(ROOT/'app/quiet-banking-v0.29'/n).read_bytes() for n in NAMES}
        aid = json.loads(re.search(rb'^const BUILD = (.*);$',A['sw.js'],re.M)[1])['id']
        spec=importlib.util.spec_from_file_location('build',Path(__file__).with_name('build.py')); build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)
        build.generate(out/'B',tag='native-update-B')
        B={n:(out/'B'/n).read_bytes() for n in NAMES}; bid=json.loads(re.search(rb'^const BUILD = (.*);$',B['sw.js'],re.M)[1])['id']
        report.update({'buildA':aid,'buildB':bid,'hashes':{v:{n:SHA(b) for n,b in data.items()} for v,data in [('A',A),('B',B)]}})
        state={'version':'A','bad':False}; rows=[]; sockets=set()
        class Server(http.server.ThreadingHTTPServer):
            daemon_threads=True
            def get_request(self):
                sock,addr=super().get_request();sockets.add(sock);return sock,addr
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                name='index.html' if self.path=='/quiet/' else self.path.removeprefix('/quiet/')
                data=(A if state['version']=='A' else B).get(name) if self.path.startswith('/quiet/') else None
                if state['bad'] and name=='icon-192.png':data=b'bad-new-build-icon'
                row={'time':time.time(),'path':self.path,'version':state['version'],'bad':state['bad'],'sha256':SHA(data) if data is not None else None};rows.append(row)
                self.send_response(200 if data is not None else 404);self.send_header('Cache-Control','no-store')
                self.send_header('Content-Type',{'html':'text/html','js':'application/javascript','png':'image/png','webmanifest':'application/manifest+json'}.get(name.rsplit('.',1)[-1],'text/plain'));self.end_headers()
                try:self.wfile.write(data or b'not found')
                except (BrokenPipeError,ConnectionResetError):pass
            def log_message(self,*a):pass
        server=Server(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{server.server_port}/quiet/';report['base']=base
        c=Chrome(profile,out);report['browser']=c.call('Browser.getVersion');report['flags']=c.flags
        def new():
            t,s=c.tab();c.call('Page.navigate',{'url':base},s);return t,s
        def loaded(s,buildid):
            c.until(s,"document.querySelector('#pwa-status')?.dataset.state==='ready'&&durableState.phase==='ready'",40)
            r=c.ev(s,"({build:document.querySelector('meta[name=quiet-banking-build]').content,controller:navigator.serviceWorker.controller?.scriptURL,recorder:window.__recorder===true,errors:window.__errors,url:location.href})")
            check('correct build/controller and startup recorder present/empty',r['build']==buildid and r['controller']==base+'sw.js' and r['recorder'] and r['errors']==[],page=r)
        def click(s,selector):
            xy=c.ev(s,"(()=>{const n=document.querySelector(%s);if(!n||n.disabled||!n.getClientRects().length)throw Error('unreachable '+%s);n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()"%(json.dumps(selector),json.dumps(selector)))
            for typ in ('mousePressed','mouseReleased'):c.call('Input.dispatchMouseEvent',{'type':typ,**xy,'button':'left','clickCount':1},s)
        def oracle(s): return {'databases':c.ev(s,READ_DB),'localStorage':c.ev(s,'Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])'),'applied':c.ev(s,'viewPreferences')}
        def worker():
            c.call('Target.getTargets')
            for target,sid in reversed(list(c.workers.items())):
                try:
                    if c.ev(sid,'BUILD.id')==aid:return sid
                except RuntimeError:pass
            raise AssertionError('active worker session missing')
        def command(s,kind):
            return c.ev(s,"new Promise((ok,no)=>{const q=new MessageChannel();const t=setTimeout(()=>no(Error('message timeout')),15000);q.port1.onmessage=e=>{clearTimeout(t);q.port1.close();ok(e.data)};navigator.serviceWorker.controller.postMessage({type:%s},[q.port2])})"%json.dumps(kind))
        t,s=new();c.until(s,"document.querySelector('#pwa-status')?.dataset.state==='reopen'",40);c.close(t)
        t,s=new();loaded(s,aid)
        # Distinguishable genuine financial write + applied Custom preference.
        count=c.ev(s,'entries.length');rev=c.ev(s,'durableState.revision')
        c.ev(s,"transactionDialog('savings');document.querySelector('#tx-amount').value='19.75';document.querySelector('#tx-date').value=DatePolicy.today();document.querySelector('#transaction-form').requestSubmit()")
        c.until(s,'!durableState.pending&&durableState.revision==='+str(rev+1));check('one real native transaction',c.ev(s,'entries.length')==count+1)
        c.ev(s,"closeModal();go('portfolio')");click(s,'button[onclick="custom()"]');click(s,'input[data-custom-index="0"]');click(s,'#custom-apply')
        before=oracle(s);save('oracle-before-code.json',before)
        check('synthetic Custom selection persisted',before['applied']['mode']=='custom' and bool(before['applied']['excludedIds']))
        # Keep a raw invalid draft open throughout actual update/status/repair clicks.
        c.ev(s,"transactionDialog('savings');document.querySelector('#tx-amount').value='1234.567891';document.querySelector('#tx-actual-balance').value='draft precision sentinel'")
        draft=c.ev(s,"({amount:document.querySelector('#tx-amount').value,note:document.querySelector('#tx-actual-balance').value,html:document.querySelector('#transaction-form').innerHTML})")
        # Native modal blocks real root clicks: close only after capturing session raw state.
        # Worker-side operations while open do not navigate or rebuild the form.
        check('worker check with precise open draft',command(s,'GET_STATUS')['state']=='complete')
        check('worker repair with precise open draft',command(s,'REPAIR_STATIC')['state']=='complete')
        check('precise draft untouched',c.ev(s,"({amount:document.querySelector('#tx-amount').value,note:document.querySelector('#tx-actual-balance').value,html:document.querySelector('#transaction-form').innerHTML})")==draft)
        c.ev(s,"document.querySelector('#tx-amount').value='';document.querySelector('#tx-amount').dispatchEvent(new Event('input',{bubbles:true}))")
        check('blank raw draft during repair',command(s,'REPAIR_STATIC')['state']=='complete' and c.ev(s,"document.querySelector('#tx-amount').value")== '')
        c.ev(s,"closeModal()")
        # Corrupt actual native Cache API, show failed readiness, repair via reachable UI.
        mutation=c.ev(s,"(async()=>{const keys=(await caches.keys()).filter(n=>n.includes(':v029:'));let changed=0;for(const n of keys){const cc=await caches.open(n);await cc.delete(new URL('icon-192.png',location.href));changed++}return {keys,changed}})()")
        click(s,'#pwa-retry');c.until(s,"document.querySelector('#pwa-status').dataset.state==='failed'")
        check('missing cache asset is visibly failed readiness',mutation['changed']>0,mutation=mutation)
        click(s,'#pwa-repair');c.until(s,"document.querySelector('#pwa-status').dataset.state==='ready'",30)
        check('real repair button completed full native cache verification',command(s,'GET_STATUS')['state']=='complete')
        c.ev(s,"(async()=>{for(const n of (await caches.keys()).filter(n=>n.includes(':v029:'))){const cc=await caches.open(n);await cc.put(new URL('icon-192.png',location.href),new Response('corrupt',{headers:{'content-type':'image/png'}}))}})()")
        click(s,'#pwa-retry');c.until(s,"document.querySelector('#pwa-status').dataset.state==='failed'")
        click(s,'#pwa-repair');c.until(s,"document.querySelector('#pwa-status').dataset.state==='ready'",30)
        check('corrupt asset repair leaves exact entire native financial oracle',oracle(s)==before)
        # Prove the repaired A itself can reopen offline, BEFORE any B update.
        repaired_port=server.server_port
        server.shutdown();server.server_close()
        for sock in sockets:
            try:sock.shutdown(socket.SHUT_RDWR)
            except OSError:pass
            sock.close()
        sockets.clear();server=None
        repaired_probe="fetch(new URL('__repair_uncached_probe__',%s),{cache:'no-store'}).then(()=>false,()=>true)"%json.dumps(base)
        check('repaired A page uncached network probe fails',c.ev(s,repaired_probe))
        check('repaired A worker uncached network probe fails',c.ev(worker(),repaired_probe))
        c.close(t);t,s=new();loaded(s,aid)
        check('repaired A new genuinely offline target full native oracle',oracle(s)==before)
        server=Server(('127.0.0.1',repaired_port),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
        # Exercise bounded pending real native IndexedDB transaction. A test-only get
        # request loop keeps the genuine readwrite transaction alive after its put.
        c.ev(s,"window.__holdCommit=true;window.__nativePuts=0;window.__originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=window.__originalPut.apply(this,args);if(this.transaction.mode==='readwrite'){window.__nativePuts++;const store=this;const keep=()=>{if(window.__holdCommit){const q=store.get(args[1]===undefined?0:args[1]);q.onsuccess=keep;q.onerror=()=>{}}};keep()}return r};transactionDialog('savings');document.querySelector('#tx-amount').value='2.25';document.querySelector('#tx-actual-balance').value='';document.querySelector('#tx-date').value=DatePolicy.today();document.querySelector('#transaction-form').requestSubmit()")
        c.until(s,'durableState.pending&&window.__nativePuts>0')
        check('real IndexedDB save transaction held pending',c.ev(s,'durableState.pending&&window.__nativePuts===1'))
        check('worker repair during pending native save',command(s,'REPAIR_STATIC')['state']=='complete')
        c.ev(s,"document.querySelector('#pwa-update').click();document.querySelector('#transaction-form').requestSubmit()")
        check('existing pending-save guard blocks root update click',c.ev(s,"document.querySelector('#pwa-update-status').dataset.state==='idle'"))
        c.ev(s,'window.__holdCommit=false;IDBObjectStore.prototype.put=window.__originalPut')
        c.until(s,'!durableState.pending&&durableState.revision==='+str(rev+2));check('pending native save committed exactly once',c.ev(s,'entries.length')==count+2)
        c.ev(s,'closeModal()');before=oracle(s);save('oracle-after-one-pending-save.json',before)
        # Delayed native crypto: retain existing validated preview across an export.
        downloads=out/'downloads';downloads.mkdir()
        c.call('Browser.setDownloadBehavior',{'behavior':'allow','downloadPath':str(downloads)})
        c.ev(s,"backupPreview();document.querySelector('#backup-password').value='synthetic-fixture-passphrase';document.querySelector('#backup-confirm-password').value='synthetic-fixture-passphrase';exportEncryptedBackup()")
        c.until(s,'backupSession&&!backupSession.busy',30)
        deadline=time.monotonic()+15
        while not list(downloads.glob('*.qbb')) and time.monotonic()<deadline:time.sleep(.1)
        files=list(downloads.glob('*.qbb'));check('actual native encrypted file download',len(files)==1)
        c.ev(s,"document.querySelector('#backup-restore-password').value='synthetic-fixture-passphrase'")
        node=c.call('DOM.getDocument',sid=s)['root']['nodeId'];fid=c.call('DOM.querySelector',{'nodeId':node,'selector':'#backup-file'},s)['nodeId'];c.call('DOM.setFileInputFiles',{'nodeId':fid,'files':[str(files[0])]},s)
        c.ev(s,'void previewEncryptedBackup()');c.until(s,'backupSession?.preview&&!backupSession.busy',30)
        preview=c.ev(s,'JSON.stringify(backupSession.preview)')
        check('native selected file nonwriting decrypt preview',oracle(s)==before)
        c.ev(s,"window.__cryptoGate=new Promise(ok=>window.__releaseCrypto=ok);window.__encrypt=SubtleCrypto.prototype.encrypt;SubtleCrypto.prototype.encrypt=async function(...a){const out=await window.__encrypt.apply(this,a);await window.__cryptoGate;return out};document.querySelector('#backup-password').value='synthetic-fixture-passphrase';document.querySelector('#backup-confirm-password').value='synthetic-fixture-passphrase';void exportEncryptedBackup()")
        c.until(s,'backupSession.busy')
        check('repair during delayed native encryption',command(s,'REPAIR_STATIC')['state']=='complete')
        c.ev(s,"document.querySelector('#pwa-update').click()")
        check('existing backup busy guard blocks root update control',c.ev(s,"document.querySelector('#pwa-update-status').dataset.state==='idle'"))
        c.ev(s,'window.__releaseCrypto();SubtleCrypto.prototype.encrypt=window.__encrypt');c.until(s,'!backupSession.busy',30)
        check('export keeps prior preview and native data intact',c.ev(s,'JSON.stringify(backupSession.preview)')==preview and oracle(s)==before)
        c.ev(s,"window.__cryptoGate=new Promise(ok=>window.__releaseCrypto=ok);window.__decrypt=SubtleCrypto.prototype.decrypt;SubtleCrypto.prototype.decrypt=async function(...a){const out=await window.__decrypt.apply(this,a);await window.__cryptoGate;return out};document.querySelector('#backup-restore-password').value='synthetic-fixture-passphrase';void previewEncryptedBackup()")
        c.until(s,'backupSession.busy')
        check('worker repair during delayed native decrypt',command(s,'REPAIR_STATIC')['state']=='complete')
        c.ev(s,"document.querySelector('#pwa-update').click()")
        check('decrypt busy guard blocks root update',c.ev(s,"document.querySelector('#pwa-update-status').dataset.state==='idle'"))
        c.ev(s,'window.__releaseCrypto();SubtleCrypto.prototype.decrypt=window.__decrypt');c.until(s,'!backupSession.busy&&!!backupSession.preview',30)
        check('delayed decrypt publishes same preview without financial writes',c.ev(s,'JSON.stringify(backupSession.preview)')==preview and oracle(s)==before)
        c.ev(s,"go('portfolio')")
        # Failed B install must retain active A. Then good B waits normally.
        state.update(version='B',bad=True);click(s,'#pwa-update')
        c.until(s,"document.querySelector('#pwa-update-status').dataset.state==='failed'",35)
        check('failed B retains complete A and full native oracle',command(s,'GET_STATUS')['build']==aid and command(s,'GET_STATUS')['state']=='complete' and oracle(s)==before)
        state['bad']=False
        # Old A must refuse B bytes as same-build repair.
        click(s,'#pwa-repair');c.until(s,"document.querySelector('#pwa-status').textContent.includes('Same-build repair unavailable')",30)
        check('A rejects newer server bytes and retains usable A',command(s,'GET_STATUS')['state']=='complete')
        c.ev(s,"transactionDialog('savings');document.querySelector('#tx-amount').value='';document.querySelector('#tx-actual-balance').value='B waiting draft';document.querySelector('#pwa-update').click()")
        c.until(s,"document.querySelector('#pwa-update-status').dataset.state==='waiting'",40)
        check('B waits with old A controller and raw blank draft',command(s,'GET_STATUS')['build']==aid and c.ev(s,"document.querySelector('#tx-amount').value===''&&document.querySelector('#tx-actual-balance').value==='B waiting draft'"))
        check('code operations never increment financial revision',oracle(s)==before)
        shot=c.call('Page.captureScreenshot',{'format':'png'},s);(out/'A-draft-B-waiting.png').write_bytes(base64.b64decode(shot['data']))
        c.close(t);time.sleep(2);t,s=new();loaded(s,bid)
        check('normal close/reopen activates B with entire financial oracle',oracle(s)==before)
        # Hard network cut: close listener AND every accepted socket, including preconnects.
        server.shutdown();server.server_close()
        for sock in sockets:
            try:sock.shutdown(socket.SHUT_RDWR)
            except OSError:pass
            sock.close()
        server=None
        probe="fetch(new URL('__uncached_probe__',%s),{cache:'no-store'}).then(()=>false,()=>true)"%json.dumps(base)
        check('page genuinely cannot fetch uncached server',c.ev(s,probe))
        targets=c.call('Target.getTargets')['targetInfos'];ws=None
        for target in targets:
            if target['type']=='service_worker' and target['targetId'] in c.workers:
                sid=c.workers[target['targetId']]
                if c.ev(sid,"typeof BUILD==='undefined'?null:BUILD.id")==bid:ws=sid
        check('actual B worker cannot fetch uncached server',ws is not None and c.ev(ws,probe))
        c.close(t);t,s=new();loaded(s,bid)
        check('new offline target exact controller/build and full native oracle',oracle(s)==before)
        # Existing actual-file explicit replacement while fully offline, same contents.
        c.ev(s,"backupPreview();document.querySelector('#backup-restore-password').value='synthetic-fixture-passphrase'")
        node=c.call('DOM.getDocument',sid=s)['root']['nodeId'];fid=c.call('DOM.querySelector',{'nodeId':node,'selector':'#backup-file'},s)['nodeId'];c.call('DOM.setFileInputFiles',{'nodeId':fid,'files':[str(files[0])]},s)
        c.ev(s,'void previewEncryptedBackup()');c.until(s,'backupSession?.preview&&!backupSession.busy',30)
        check('offline actual downloaded file nonwriting preview matches oracle',oracle(s)==before)
        # Deliberately do not restore stale earlier file after the pending-save fixture:
        # the file here was exported after it, so its full records match current data.
        revision=c.ev(s,'durableState.revision')
        c.ev(s,"window.__holdRestore=true;window.__restorePuts=0;window.__restorePut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=window.__restorePut.apply(this,args);window.__restorePuts++;const store=this;const keep=()=>{if(window.__holdRestore){const q=store.get(args[1]===undefined?0:args[1]);q.onsuccess=keep;q.onerror=()=>{}}};keep();return r};document.querySelector('#backup-replace-check').checked=true;void replaceEncryptedBackup()")
        c.until(s,'backupSession.busy&&durableState.pending&&window.__restorePuts>0')
        check('pending native replacement keeps verified B status',command(s,'GET_STATUS')['state']=='complete')
        c.ev(s,"document.querySelector('#pwa-update').click();document.querySelector('#pwa-repair').click();void replaceEncryptedBackup()")
        check('pending restore busy guard blocks code controls',c.ev(s,"document.querySelector('#pwa-update-status').dataset.state==='idle'&&document.querySelector('#pwa-status').dataset.state==='ready'"))
        c.ev(s,'window.__holdRestore=false;IDBObjectStore.prototype.put=window.__restorePut')
        c.until(s,'!backupSession.busy&&durableState.revision==='+str(revision+1),30)
        after=oracle(s);save('oracle-after-explicit-offline-restore.json',after)
        # Revision legitimately advances only for explicit financial replacement.
        expected=json.loads(json.dumps(before))
        expected['databases']['quietbanking.financial-records']['stores']['snapshots'][0]['value']['revision'] += 1
        check('explicit offline replacement exact full oracle with only expected top-level revision increment',expected==after)
        check('startup/interactions runtime recorder present/empty at final target',c.ev(s,'window.__recorder===true&&window.__errors.length===0'))
        shot=c.call('Page.captureScreenshot',{'format':'png'},s);(out/'B-offline-restored.png').write_bytes(base64.b64decode(shot['data']))
        report['pass']=True
    except BaseException as error:
        report.update(error=str(error),traceback=traceback.format_exc());print(report['traceback'],flush=True)
    finally:
        if c:
            save('cdp-events.json',c.events);save('cdp-commands.json',c.commands);c.stop();report['chromeExit']=c.p.returncode
        if server:server.shutdown();server.server_close()
        save('http.json',rows if 'rows' in locals() else [])
        shutil.rmtree(profile);report['profileRemoved']=not profile.exists()
        save('report.json',report);print('REPORT='+str(out/'report.json'),flush=True)
    return 0 if report['pass'] else 1

if __name__=='__main__':raise SystemExit(main())
