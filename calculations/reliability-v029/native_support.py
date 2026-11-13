"""Optional native stdlib CDP helper; derived from inspected local spike. No shared outputs."""
from pathlib import Path
import json,os,select,subprocess,time
RECORDER="window.__recorder=true;window.__errors=[];addEventListener('error',e=>__errors.push({type:'error',message:e.message}));addEventListener('unhandledrejection',e=>__errors.push({type:'rejection',message:String(e.reason)}));"
READ_DB="""(async()=>{const out={};for(const info of await indexedDB.databases()){const db=await new Promise((ok,no)=>{const r=indexedDB.open(info.name);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onupgradeneeded=()=>r.transaction.abort()});try{const stores={};for(const name of [...db.objectStoreNames]){stores[name]=await new Promise((ok,no)=>{const tx=db.transaction(name,'readonly'),s=tx.objectStore(name),r=s.openCursor(),rows=[];r.onsuccess=()=>{const c=r.result;if(c){rows.push({key:c.key,value:c.value});c.continue()}};tx.oncomplete=()=>ok(rows);tx.onerror=()=>no(tx.error)})}out[info.name]={version:db.version,stores}}finally{db.close()}}return out})()"""
class Chrome:
 def __init__(self,profile,out):
  self.log=open(out/'chrome.stderr','x'); self.counter=0;self.buffer=b'';self.events=[];self.commands=[];self.background={};self.seq=-1;self.workers={}
  flags=[os.environ['QB_CHROME'],'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--remote-debugging-pipe','--user-data-dir='+str(profile)]
  self.flags=flags
  self.p=subprocess.Popen(['bash','-c','exec "$@" 3<&0 4>&1','bash',*flags],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=self.log)
  self.call('Target.setAutoAttach',{'autoAttach':True,'waitForDebuggerOnStart':True,'flatten':True,'filter':[{'type':'service_worker'},{'exclude':True}]})
 def send(self,m):self.p.stdin.write(json.dumps(m).encode()+b'\0');self.p.stdin.flush()
 def call(self,method,params=None,sid=None):
  self.counter+=1;n=self.counter;m={'id':n,'method':method,'params':params or {}}
  if sid:m['sessionId']=sid
  self.commands.append({'time':time.time(),**m});self.send(m);deadline=time.monotonic()+35
  while True:
   while b'\0' not in self.buffer:
    if not select.select([self.p.stdout],[],[],max(0,deadline-time.monotonic()))[0]:raise TimeoutError(method)
    b=os.read(self.p.stdout.fileno(),65536)
    if not b:raise RuntimeError('Chrome closed')
    self.buffer+=b
   raw,self.buffer=self.buffer.split(b'\0',1);r=json.loads(raw)
   if r.get('id')==n:
    if 'error'in r:raise RuntimeError(r['error'])
    return r.get('result',{})
   if 'method'in r:
    r['observedAt']=time.time();self.events.append(r)
    if r['method']=='Target.attachedToTarget' and r['params']['targetInfo']['type']=='service_worker':
     p=r['params'];self.workers[p['targetInfo']['targetId']]=p['sessionId']
     for method2 in ('Runtime.enable','Network.enable','Runtime.runIfWaitingForDebugger'):
      self.seq-=1;self.send({'id':self.seq,'method':method2,'params':{},'sessionId':p['sessionId']})
   elif r.get('id',0)<0:self.background[r['id']]=r
 def ev(self,s,code):
  r=self.call('Runtime.evaluate',{'expression':code,'awaitPromise':True,'returnByValue':True},s)
  if 'exceptionDetails'in r:raise RuntimeError(r['exceptionDetails'])
  return r['result'].get('value')
 def tab(self):
  t=self.call('Target.createTarget',{'url':'about:blank'})['targetId'];s=self.call('Target.attachToTarget',{'targetId':t,'flatten':True})['sessionId']
  for m in ('Page.enable','Runtime.enable','Network.enable'):self.call(m,sid=s)
  self.call('Page.addScriptToEvaluateOnNewDocument',{'source':RECORDER},s);return t,s
 def until(self,s,expr,timeout=25):
  end=time.monotonic()+timeout
  while time.monotonic()<end:
   try:
    v=self.ev(s,expr)
    if v:return v
   except RuntimeError:pass
   time.sleep(.1)
  raise TimeoutError(expr)
 def close(self,t):self.call('Target.closeTarget',{'targetId':t})
 def stop(self):
  try:self.call('Browser.close')
  except Exception:self.p.terminate()
  try:self.p.wait(timeout=10)
  except subprocess.TimeoutExpired:self.p.kill();self.p.wait()
  self.log.close()
