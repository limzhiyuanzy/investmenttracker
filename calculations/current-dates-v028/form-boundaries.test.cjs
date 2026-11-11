'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(process.env.CANDIDATE_HTML||'app/quiet-banking-v0.28/index.html'),'utf8');
test('fresh Record another defaults to local today rather than prior saved economic date',()=>{const block=html.slice(html.indexOf('function recordAnother()'),html.indexOf('function',html.indexOf('function recordAnother()')+10));A.match(block,/\$\('#tx-date'\)\.value=DatePolicy\.today\(\)/)});
test('new policy inception date exposes matching bounded ordinary-entry max',()=>A.match(html,/field\('new-policy-start'[^\n]*?max=/));
