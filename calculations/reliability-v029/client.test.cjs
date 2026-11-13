'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const {candidate,config,scope}=require('./portable.test.cjs');
const script=fs.readFileSync(path.join(candidate,'index.html'),'utf8').match(/<script id="quiet-banking-pwa-client">([\s\S]*?)<\/script>/)[1];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function client(){
 const e={updates:0,messages:[],reply:{build:config.id,state:'complete'},updatePromise:Promise.resolve(),held:[]};
 e.nodes={};for(const id of ['pwa-status','pwa-retry','pwa-update','pwa-repair','pwa-update-status'])e.nodes['#'+id]={dataset:{},addEventListener(n,f){this[n]=f;}};
 const worker={scriptURL:scope+'sw.js',postMessage(data,ports){e.messages.push(data.type);const respond=()=>ports[0].send(e.reply);if(e.hold)e.held.push(respond);else setTimeout(respond,0);}};
 e.reg={active:worker,waiting:null,installing:null,addEventListener(n,f){this[n]=f;},update(){e.updates++;return e.updatePromise;}};
 const navigator={serviceWorker:{controller:worker,register:async()=>e.reg,addEventListener(){}}};
 class MessageChannel{constructor(){this.port1={close(){}};this.port2={send:data=>this.port1.onmessage?.({data})};}}
 vm.runInNewContext(script,{document:{querySelector:s=>e.nodes[s],addEventListener(){}},navigator,location:{href:scope,protocol:'http:'},window:{isSecureContext:true,MessageChannel,caches:{}},MessageChannel,URL,setTimeout:(f,ms)=>setTimeout(f,Math.min(ms,50)),clearTimeout});
 e.node=id=>e.nodes['#'+id];return e;
}
test('update discovery failure never falsifies independent current offline readiness',async()=>{
 const e=client();await sleep(5);assert.equal(e.node('pwa-status').dataset.state,'ready');
 e.updatePromise=Promise.reject(Error('offline'));await e.node('pwa-update').click();await sleep(5);
 assert.equal(e.node('pwa-update-status').dataset.state,'failed');assert.equal(e.node('pwa-status').dataset.state,'ready');
});
test('repeated update clicks coalesce and bounded timeout releases disabled state',async()=>{
 const e=client();await sleep(5);e.updatePromise=new Promise(()=>{});
 const a=e.node('pwa-update').click(),b=e.node('pwa-update').click();assert.equal(e.node('pwa-update').disabled,true);await Promise.all([a,b]);
 assert.equal(e.updates,1);assert.equal(e.node('pwa-update').disabled,false);assert.equal(e.node('pwa-update-status').dataset.state,'failed');
});
test('late older status reply cannot override newer readiness',async()=>{
 const e=client();await sleep(5);e.hold=true;
 const first=e.node('pwa-retry').click(),second=e.node('pwa-retry').click();await sleep(1);
 e.reply={build:config.id,state:'complete'};e.held[1]();await second;
 e.reply={build:config.id,state:'failed'};e.held[0]();await first;assert.equal(e.node('pwa-status').dataset.state,'ready');
});
test('controller/page mismatch is explicit and never reported ready',async()=>{
 const e=client();await sleep(5);e.reply={build:'other-build',state:'complete'};await e.node('pwa-retry').click();assert.equal(e.node('pwa-status').dataset.state,'mismatch');
});
test('repair failure states same-build unavailable and sends no update command implicitly',async()=>{
 const e=client();await sleep(5);e.reply={build:config.id,state:'failed'};
 await e.node('pwa-repair').click();assert.equal(e.messages.at(-1),'REPAIR_STATIC');assert.equal(e.updates,0);assert.match(e.node('pwa-status').textContent,/Same-build repair unavailable/);assert.equal(e.node('pwa-repair').disabled,false);
});
