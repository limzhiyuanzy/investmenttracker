/* Quiet Banking static shell worker; no financial storage access. */
'use strict';
const BUILD = __CONFIG__;
const ROOT = new URL('./', self.registration.scope);
const PREFIX = 'quietbanking:pwa:v026:' + encodeURIComponent(ROOT.href) + ':';
const CACHE = PREFIX + BUILD.id;
const ASSETS = BUILD.assets.map(a => ({...a, url: new URL(a.path, ROOT).href}));
async function verified(response, asset) {
 if (!response || response.status !== 200 || response.type === 'opaque' || response.redirected) throw Error('Required static response unavailable');
 if ((response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== asset.type) throw Error('Required static content type incorrect');
 const bytes = await response.clone().arrayBuffer();
 const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
 if (digest !== asset.sha256) throw Error('Required static integrity incorrect');
 return response;
}
async function complete() {
 const cache = await caches.open(CACHE);
 if ((await cache.keys()).length !== ASSETS.length) return false;
 try { for (const asset of ASSETS) await verified(await cache.match(asset.url), asset); return true; }
 catch (_) { return false; }
}
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  // Validate the whole build before writing any accepted shell.
  const responses = await Promise.all(ASSETS.map(async asset => {
   const response = await fetch(asset.url, {cache: 'no-store', credentials: 'same-origin', redirect: 'error'});
   return verified(response, asset);
  }));
  const cache = await caches.open(CACHE);
  try {
   for (let i = 0; i < ASSETS.length; i++) await cache.put(ASSETS[i].url, responses[i]);
   if (!await complete()) throw Error('Incomplete static cache');
  } catch (error) { await caches.delete(CACHE); throw error; }
 })());
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  if (!await complete()) throw Error('Static cache verification failed');
  // Normal activation occurs only after old clients close. Scope-specific ownership.
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
 })());
});
self.addEventListener('fetch', event => {
 const request = event.request, url = new URL(request.url);
 if (request.method !== 'GET' || url.origin !== ROOT.origin || url.search || url.hash) return;
 let target = url.href;
 if (request.mode === 'navigate' && (target === ROOT.href || target === new URL('index.html', ROOT).href)) target = new URL('index.html', ROOT).href;
 const asset = ASSETS.find(a => a.url === target);
 if (!asset) return; // No generic navigation, runtime-data or SW-script caching.
 event.respondWith((async () => {
  try { return await verified(await (await caches.open(CACHE)).match(asset.url), asset); }
  catch (_) { return Response.error(); } // Never mix active shell with a different server build.
 })());
});
self.addEventListener('message', event => {
 if (!event.ports[0] || !event.data || event.data.type !== 'GET_STATUS' || Object.keys(event.data).length !== 1) return;
 event.waitUntil((async () => {
  const ready = await complete();
  event.ports[0].postMessage({build: BUILD.id, cache: CACHE, state: ready ? 'complete' : 'failed'});
 })());
});
