#!/usr/bin/env python3
"""Actual frozen v0.28 -> current generated v0.29, ordinary external discovery.
Uses no dashboard update/register call in the central failed-navigation window.
QB_CHROME and TMPDIR are explicit prerequisites; no install or shared outputs.
"""
from pathlib import Path
import hashlib,http.server,json,os,re,shutil,socket,tempfile,threading,time,traceback
from native_support import Chrome,READ_DB
ROOT=Path(__file__).resolve().parents[2]
NAMES=('index.html','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png')

def main():
 scratch=Path(os.environ['TMPDIR']);scratch.mkdir(parents=True,exist_ok=True)
 out=Path(tempfile.mkdtemp(prefix='qb-v029-external-',dir=scratch));profile=out/'profile';profile.mkdir();shutil.copyfile(__file__,out/'executed-driver.py')
 report={'pass':False,'checks':[],'boundary':'Genuine desktop Chromium; actual v0.28 and v0.29 bytes; loopback, not physical iPad/installed PWA.'};c=None;server=None;rows=[];sockets=set()
 def save(n,v):(out/n).write_text(json.dumps(v,indent=2)+'\n')
 def check(n,v,**kw):
  r={'name':n,'pass':bool(v),'time':time.time(),**kw};report['checks'].append(r);print(json.dumps(r),flush=True)
  if not v:raise AssertionError(n)
 try:
  A={n:(ROOT/'app/quiet-banking-v0.28'/n).read_bytes() for n in NAMES};B={n:(ROOT/'app/quiet-banking-v0.29'/n).read_bytes() for n in NAMES}
  builds={v:json.loads(re.search(rb'^const BUILD = (.*);$',fs['sw.js'],re.M)[1])['id'] for v,fs in [('A',A),('B',B)]};report['builds']=builds
  report['hashes']={v:{n:hashlib.sha256(b).hexdigest() for n,b in fs.items()} for v,fs in [('A',A),('B',B)]}
  state={'version':'A'}
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def get_request(self):
    sock,addr=super().get_request();sockets.add(sock);return sock,addr
  class Handler(http.server.BaseHTTPRequestHandler):
   def do_GET(self):
    n='index.html' if self.path=='/quiet/' else self.path.removeprefix('/quiet/');b=(A if state['version']=='A' else B).get(n) if self.path.startswith('/quiet/') else None
    rows.append({'time':time.time(),'path':self.path,'version':state['version'],'status':200 if b is not None else 404})
    self.send_response(200 if b is not None else 404);self.send_header('Cache-Control','no-store');self.send_header('Content-Type',{'html':'text/html','js':'application/javascript','png':'image/png','webmanifest':'application/manifest+json'}.get(n.rsplit('.',1)[-1],'text/plain'));self.end_headers()
    try:self.wfile.write(b or b'not found')
    except (BrokenPipeError,ConnectionResetError):pass
   def log_message(self,format,*a):pass
  server=Server(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/quiet/';report['base']=base
  c=Chrome(profile,out);report['browser']=c.call('Browser.getVersion');report['flags']=c.flags
  ot,observer=c.tab();c.call('ServiceWorker.enable',sid=observer);c.call('Page.navigate',{'url':base.replace('/quiet/','/observer')},observer);c.until(observer,"document.readyState==='complete'")
  def new():
   t,s=c.tab();nav=c.call('Page.navigate',{'url':base},s);return t,s,nav
  def loaded(s,b):
   c.until(s,"document.querySelector('#pwa-status')?.dataset.state==='ready'&&durableState.phase==='ready'",40)
   r=c.ev(s,"({build:document.querySelector('meta[name=quiet-banking-build]').content,controller:navigator.serviceWorker.controller?.scriptURL,recorder:window.__recorder===true,errors:window.__errors})")
   check('expected build/controller; startup recorder installed/empty',r['build']==b and r['controller']==base+'sw.js' and r['recorder'] and r['errors']==[],page=r)
  def oracle(s):return {'databases':c.ev(s,READ_DB),'localStorage':c.ev(observer,'Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])'),'applied':c.ev(s,'viewPreferences')}
  def click(s,selector):
   xy=c.ev(s,"(()=>{const n=document.querySelector(%s);n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()"%json.dumps(selector))
   for typ in ('mousePressed','mouseReleased'):c.call('Input.dispatchMouseEvent',{'type':typ,**xy,'button':'left','clickCount':1},s)
  t,s,_=new();c.until(s,"document.querySelector('#pwa-status')?.dataset.state==='reopen'",40);c.close(t);t,s,_=new();loaded(s,builds['A'])
  revision=c.ev(s,'durableState.revision');count=c.ev(s,'entries.length')
  c.ev(s,"transactionDialog('savings');document.querySelector('#tx-amount').value='29.125';document.querySelector('#tx-date').value=DatePolicy.today();document.querySelector('#transaction-form').requestSubmit()")
  c.until(s,'!durableState.pending&&durableState.revision==='+str(revision+1));check('distinguishable synthetic native save committed once',c.ev(s,'entries.length')==count+1)
  c.ev(s,"closeModal();go('portfolio')");click(s,'button[onclick="custom()"]');click(s,'input[data-custom-index="0"]');click(s,'#custom-apply')
  before=oracle(s);save('oracle-before.json',before);check('applied stored Custom fixture',before['applied']['mode']=='custom' and bool(before['applied']['excludedIds']))
  c.close(t)
  deadline=time.monotonic()+5
  while time.monotonic()<deadline:
   targets=c.call('Target.getTargets')['targetInfos']
   if not any(x['type']=='page' and x['url'].startswith(base) for x in targets):break
   time.sleep(.1)
  check('all app clients closed before corruption',not any(x['type']=='page' and x['url'].startswith(base) for x in targets),targets=targets)
  ws=None
  for target in targets:
   if target['type']=='service_worker' and target['targetId'] in c.workers:
    sid=c.workers[target['targetId']]
    if c.ev(sid,"typeof BUILD==='undefined'?null:BUILD.id")==builds['A']:ws=sid
  assert ws is not None
  mutation=c.ev(ws,"(async()=>{const c=await caches.open(CACHE);await c.put(new URL('index.html',self.registration.scope),new Response('CORRUPT ENTRY',{headers:{'content-type':'text/html'}}));return (await c.match(new URL('index.html',self.registration.scope))).text()})()")
  check('closed A cached entry actually corrupted',mutation=='CORRUPT ENTRY')
  check('corruption does not mutate complete native DB/preferences',c.ev(ws,READ_DB)==before['databases'] and c.ev(observer,'Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])')==before['localStorage'])
  state['version']='B';central=time.time();cycles=[];recovered=False
  for attempt in range(1,4):
   t,s,nav=new();time.sleep(3)
   p=c.ev(s,"({url:location.href,title:document.title,build:document.querySelector('meta[name=quiet-banking-build]')?.content})")
   cycles.append({'attempt':attempt,'navigate':nav,'page':p,'time':time.time()})
   if p.get('build')==builds['B']:loaded(s,builds['B']);recovered=True;break
   deadline=time.monotonic()+25
   while time.monotonic()<deadline:
    c.call('Target.getTargets');time.sleep(.5)
    if any(r['version']=='B' and r['path']=='/quiet/index.html' for r in rows):break
   c.close(t);time.sleep(2)
  report['cycles']=cycles
  check('ordinary navigation recovers actual v029 within bounded attempts',recovered,cycles=cycles)
  requests=[r for r in rows if r['version']=='B' and r['path']=='/quiet/sw.js' and r['time']>=central]
  check('native worker discovery precedes first failed-navigation observation',bool(requests) and requests[0]['time']<cycles[0]['time'],requests=requests)
  check('full exact DB/revision/preferences after actual A to B',oracle(s)==before)
  server.shutdown();server.server_close()
  for sock in sockets:
   try:sock.shutdown(socket.SHUT_RDWR)
   except OSError:pass
   sock.close()
  server=None
  probe="fetch(new URL('__uncached_probe__',%s),{cache:'no-store'}).then(()=>false,()=>true)"%json.dumps(base)
  check('page uncached fetch fails after listener and sockets cut',c.ev(s,probe))
  targets=c.call('Target.getTargets')['targetInfos'];ws=None
  for target in targets:
   if target['type']=='service_worker' and target['targetId'] in c.workers:
    sid=c.workers[target['targetId']]
    if c.ev(sid,"typeof BUILD==='undefined'?null:BUILD.id")==builds['B']:ws=sid
  check('actual B worker uncached fetch fails',ws is not None and c.ev(ws,probe))
  c.close(t);t,s,_=new();loaded(s,builds['B']);after=oracle(s);save('oracle-after-offline.json',after)
  check('actual v029 new offline target full exact oracle',after==before)
  check('no lifecycle forcing CDP commands',not any(r['method'] in ['ServiceWorker.updateRegistration','ServiceWorker.skipWaiting','ServiceWorker.unregister'] for r in c.commands))
  report['pass']=True
 except BaseException as e:report.update(error=str(e),traceback=traceback.format_exc());print(report['traceback'],flush=True)
 finally:
  if c:save('cdp-events.json',c.events);save('cdp-commands.json',c.commands);c.stop();report['chromeExit']=c.p.returncode
  if server:server.shutdown();server.server_close()
  save('http.json',rows);shutil.rmtree(profile);report['profileRemoved']=not profile.exists();save('report.json',report);print('REPORT='+str(out/'report.json'),flush=True)
 return 0 if report['pass'] else 1
if __name__=='__main__':raise SystemExit(main())
