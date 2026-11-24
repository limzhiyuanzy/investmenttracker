'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=path.resolve(process.env.CANDIDATE_HTML||'app/quiet-banking-v0.27/index.html'),html=fs.readFileSync(file,'utf8'),c={module:{exports:{}}};vm.runInNewContext(html.match(/<script id="cashflow-engine">([\s\S]*?)<\/script>/)[1],c);const E=c.module.exports;
test('pure reporting engine schedule refuses cap exhaustion instead of silent truncation',()=>A.throws(()=>E.schedule('2000-01-01','9999-12-31',1),/limit|exceed|bound/i));
test('pure reporting engine schedule at year9999 never generates extended-year dates',()=>A.deepEqual(Array.from(E.schedule('9999-10-31','9999-12-31',1)),['9999-10-31','9999-11-30','9999-12-31']));

test('annual leap-day schedule clips non-leap century without losing its original anchor',()=>{
 const expected=[
  '2096-02-29','2097-02-28','2098-02-28','2099-02-28','2100-02-28',
  '2101-02-28','2102-02-28','2103-02-28','2104-02-29'
 ];
 // 2100 is not a leap year; clipping must not permanently change the due day.
 for(const [name,engine] of [['reporting',E],['date policy',require('./date-policy.cjs')]]){
  A.deepEqual(Array.from(engine.schedule('2096-02-29','2104-02-29',12)),expected,name);
 }
});
