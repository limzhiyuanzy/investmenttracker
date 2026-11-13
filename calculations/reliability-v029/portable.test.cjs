'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const candidate=process.env.QB_TARGET||path.join(root,'app/quiet-banking-v0.29');
const sw=fs.readFileSync(path.join(candidate,'sw.js'),'utf8');
const config=JSON.parse(sw.match(/const BUILD = (.*);/)[1]);
const scope='http://localhost/bank/';
class Cache {
 constructor(env){this.e=env;this.data=new Map();}
 async put(k,r){
  this.e.puts=(this.e.puts||0)+1;
  if(this.e.writeFail)throw Error('quota');
  if(this.e.holdBefore===this.e.puts){this.e.held=true;await new Promise(()=>{});}
  this.data.set(String(k.url||k),r.clone());
  if(this.e.holdAfter===this.e.puts){this.e.held=true;await new Promise(()=>{});}
 }
 async match(k){return this.data.get(String(k.url||k))?.clone();}
 async keys(){return [...this.data.keys()].map(url=>({url}));}
 async delete(k){return this.data.delete(String(k.url||k));}
}
function environment(existing){
 const e={map:existing||new Map(),fetches:0,mode:'good',writeFail:false};
 e.caches={open:async n=>{if(!e.map.has(n))e.map.set(n,new Cache(e));return e.map.get(n);},keys:async()=>[...e.map.keys()],delete:async n=>e.map.delete(n)};
 e.launch=()=>{
 const handlers={};
 const self={registration:{scope},clients:{get:async id=>({id,type:e.clientType||'window',url:e.clientURL||scope+'index.html'})},addEventListener:(n,f)=>handlers[n]=f};
 const fetch=async(url,options)=>{
 e.fetches++;assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
 if(e.mode==='offline')throw Error('offline');
 if(e.mode==='hang')return new Promise(()=>{});
 const asset=config.assets.find(a=>new URL(a.path,scope).href===url);assert.ok(asset,'static allowlist');
 let body=fs.readFileSync(path.join(candidate,asset.path));
 if(e.mode==='hash')body=Buffer.from('newer build');
 const r=new Response(body,{status:e.mode==='status'?503:200,headers:{'content-type':e.mode==='mime'?'text/plain':asset.type}});
 if(e.mode==='redirect')Object.defineProperty(r,'redirected',{value:true});
 return r;
 };
 vm.runInNewContext(sw,{self,caches:e.caches,fetch,crypto,URL,Response,Request,AbortController,setTimeout,clearTimeout,Uint8Array,console});
 e.event=async(type,extra={})=>{let work;handlers[type]({...extra,waitUntil:p=>work=p});return await work;};
 e.command=async(type,source={id:'client'})=>{let reply;await e.event('message',{data:{type},source,ports:[{postMessage:r=>reply=r}]});return reply;};
 e.read=async()=>{let result;handlers.fetch({request:{url:scope+'index.html',method:'GET',mode:'navigate'},respondWith:p=>result=p});return await result;};
 };
 e.launch();return e;
}
test('explicit reachable check really invokes registration.update',async()=>{
 const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
 const script=html.match(/<script id="quiet-banking-pwa-client">([\s\S]*?)<\/script>/)[1];
 const nodes={};for(const id of ['pwa-status','pwa-retry','pwa-update','pwa-repair','pwa-update-status'])nodes['#'+id]={dataset:{},textContent:'',addEventListener(n,f){this[n]=f;}};
 let updates=0;
 const reg={active:null,waiting:null,installing:null,addEventListener(){},update:async()=>{updates++;}};
 const navigator={serviceWorker:{controller:null,register:async()=>reg,addEventListener(){}}};
 vm.runInNewContext(script,{document:{querySelector:s=>nodes[s],addEventListener(){}},navigator,location:{href:scope,protocol:'http:'},window:{isSecureContext:true,MessageChannel:true,caches:{}},MessageChannel:class{},URL,setTimeout,clearTimeout});
 await new Promise(r=>setTimeout(r,5));
 const button=nodes['#pwa-update'].click||nodes['#pwa-retry'].click;assert.ok(button);
 await button();await new Promise(r=>setTimeout(r,5));assert.equal(updates,1);
});
test('worker admits real same-build repair',async()=>{const e=environment();const r=await e.command('REPAIR_STATIC');assert.equal(r?.state,'complete');assert.ok(e.fetches>=5);});
test('new controls remain visibly separated in existing inline style',()=>{
 const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
 assert.match(html,/>Verify offline status<\/button>\s+<button id="pwa-update"/);
 assert.match(html,/>Check for updates<\/button>\s+<button id="pwa-repair"/);
});
module.exports={environment,config,candidate,scope};
