'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),P=require('./date-policy.cjs');
const empty={trackingStart:'2025-01-01',holdings:[],entries:[],reviews:[]};
test('out-of-range backward clock permits readable context but blocks writes with warning',()=>{const now=()=>new Date(1999,11,31,12);let c;A.doesNotThrow(()=>{c=P.context(now)});A.match(P.warning(empty,now),/clock|calendar/i);A.throws(()=>P.admit(empty,c,now),/clock|calendar/i)});
