'use strict';
const fs=require('node:fs'),vm=require('node:vm');
function app(html,{strict=true,detachTransactionFields=false,indexedDB,protocol="http:"}={}){
 const nodes=new Map(),storage=new Map(),scroll=[];
 const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 function node(s){if(!nodes.has(s)){const n={value:'',textContent:'',style:{},disabled:false,hidden:false,open:false,listeners:{},addEventListener(k,f){(this.listeners[k]??=[]).push(f);},showModal(){this.open=true;},close(){this.open=false;for(const f of this.listeners.close||[])f();},querySelectorAll(){return [];},scrollIntoView(){},focus(){},setAttribute(){},removeAttribute(){}};let content='';Object.defineProperty(n,'innerHTML',{get:()=>content,set:v=>{if(detachTransactionFields&&s==='#tx-fields')for(const key of ['tx-kind','tx-date','tx-amount-fields','tx-amount','tx-quantity','tx-price','tx-fee','tx-actual-balance','tx-bank-preview','tx-fx','tx-treatment','tx-reinvestment','tx-reinvested-units'])nodes.delete('#'+key);content=v;parse(v);}});n.insertAdjacentHTML=(_p,v)=>{n.innerHTML+=v;};nodes.set(s,n);}return nodes.get(s);}
 function parse(s){for(const m of s.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const n=node('#'+m[3]),attrs=m[2];n.disabled=/\bdisabled\b/.test(attrs);n.hidden=/\bhidden\b/.test(attrs);if(m[1]==='input')n.value=decode(attrs.match(/\bvalue="([^"]*)"/)?.[1]||'');if(m[1]==='select'){const tail=s.slice(m.index+m[0].length).split('</select>')[0],opts=[...tail.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)],o=opts.find(o=>/\bselected\b/.test(o[1]))||opts[0];n.value=o?decode(o[1].match(/\bvalue="([^"]*)"/)?.[1]??o[2]):'';}}}
 parse(html.split('<script')[0]);node('#transaction-filter').value='all';node('#source-filter').value='all';
 const window={scrollY:0,scrollTo(x,y){this.scrollY=y;scroll.push(y);}},context={indexedDB,location:{protocol},window,document:{querySelector:s=>!strict?node(s):nodes.get(s)||(/^#[\w-]+ button\[type="submit"\]$/.test(s)&&nodes.has(s.split(' ')[0])?node(s):null),querySelectorAll:()=>[],addEventListener(){}},requestAnimationFrame:f=>f(),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
 vm.createContext(context);for(const s of html.matchAll(/<script(?: id="cashflow-engine")?>([\s\S]*?)<\/script>/g))vm.runInContext(s[1],context);
 return {node,run:s=>vm.runInContext(s,context),state:window.prototypeState,ready:window.durableReady,storage,window,scroll};
}
const inputs=(a,vs)=>{for(const[k,v]of Object.entries(vs))a.node('#'+k).value=String(v);};
const submit=f=>{if(typeof f!=='function')throw Error('Missing real form handler');f({preventDefault(){}});};
module.exports={app,inputs,submit};
