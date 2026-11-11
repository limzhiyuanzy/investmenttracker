'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),candidate=process.env.CANDIDATE_HTML||path.join(root,'app/quiet-banking-v0.27/index.html');
const html=fs.readFileSync(candidate,'utf8');
function dateGate(day){const script=html.match(/function dateCheck\(date, minimum=trackingStart\) \{[^\n]+/)[0];const ctx={trackingStart:'2025-01-01',CUTOFF:'2026-06-30',DatePolicy:{today:()=>day,real:s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='2000-01-01'&&s<='9999-12-31'&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s},assert:(ok,msg)=>assert.ok(ok,msg),validDate:s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s};vm.createContext(ctx);vm.runInContext(script,ctx);return s=>vm.runInContext('dateCheck('+JSON.stringify(s)+')',ctx);}
console.log('Candidate',candidate,require('node:crypto').createHash('sha256').update(html).digest('hex'));
for(const day of ['2026-06-30','2026-07-01','2026-11-11'])test('actual handler admits local current day '+day,()=>assert.doesNotThrow(()=>dateGate(day)(day)));
test('actual handler refuses tomorrow without mutating data',()=>{const g=dateGate('2026-11-11');assert.throws(()=>g('2026-11-12'),/date|day|cutoff/i)});
test('actual handler refuses impossible calendar date',()=>assert.throws(()=>dateGate('2026-11-11')('2026-02-29'),/date|day|cutoff/i));
if(process.env.DATE_MODULE){const P=require(path.resolve(process.env.DATE_MODULE));
 for(const [s,ok]of [['2000-02-29',true],['2024-02-29',true],['2100-02-29',false],['1999-12-31',false],['9999-12-31',true],['10000-01-01',false]])test('calendar '+s,()=>assert.equal(P.real(s),ok));
 test('local getters win over UTC on disagreement',()=>{const d=new Date('2026-07-01T00:30:00Z');d.getFullYear=()=>2026;d.getMonth=()=>5;d.getDate=()=>30;assert.equal(P.context(()=>d).day,'2026-06-30')});
 test('context stable within day and invalidates midnight timezone and rollback',()=>{let d=new Date(2026,11,31,12);const now=()=>d,context=P.context(now);d=new Date(2026,11,31,13);assert.doesNotThrow(()=>P.fresh(context,now));d=new Date(2027,0,1);assert.throws(()=>P.fresh(context,now),/review/i);d=new Date(2026,11,30);assert.throws(()=>P.fresh(context,now),/review/i);d=new Date(2026,11,31,12);d.getTimezoneOffset=()=>999;assert.throws(()=>P.fresh(context,now),/review/i)});
}
