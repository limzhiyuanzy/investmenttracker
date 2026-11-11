'use strict';
// Read-only retargeting adapter: never changes an original test or artifact.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ROOT=path.resolve(__dirname,'../..'),DUR=path.join(ROOT,'calculations/durable-records-v025'),OLD=path.join(ROOT,'calculations/backup-v027'),HERE=__dirname,APP=path.join(ROOT,'app/quiet-banking-v0.28/index.html');
const originalRead=fs.readFileSync,originalLoad=Module._load;
const remaps=new Map([[path.join(ROOT,'app/quiet-banking-v0.27/index.html'),APP],[path.join(DUR,'store.cjs'),path.join(HERE,'store.cjs')],[path.join(DUR,'integration.js'),path.join(HERE,'durable-integration.js')],[path.join(ROOT,'design/prototypes/quiet-banking-app-v0.25.html'),APP],[path.join(OLD,'crypto.cjs'),path.join(HERE,'crypto.cjs')],[path.join(OLD,'storage.cjs'),path.join(HERE,'storage.cjs')]]);
fs.readFileSync=function(file,...args){const resolved=typeof file==='string'?path.resolve(file):file;return originalRead.call(this,remaps.get(resolved)||file,...args)};
Module._load=function(request,parent,isMain){let resolved;try{resolved=Module._resolveFilename(request,parent)}catch(_){}return originalLoad.call(this,remaps.get(resolved)||request,parent,isMain)};
process.env.DLR_APP=APP;
if(!process.argv[2])console.log('v028 adapter target',APP,require('node:crypto').createHash('sha256').update(originalRead(APP)).digest('hex'));
