/* Quiet Banking static shell worker; no financial storage access. */
'use strict';
const BUILD = {"assets":[{"path":"index.html","sha256":"f1255a2caf4b66b5ceb7220571259cc9f5bc36aa5f4203f34f11a592b9abecd2","type":"text/html"},{"path":"manifest.webmanifest","sha256":"7f4549c20352c364ebeae1b577aa5507801d3d815c5c0c9b34a7007fb2e665d7","type":"application/manifest+json"},{"path":"icon-180.png","sha256":"fec04371e4e3593012cc7edda2c1b3bdad90fca7d84d8c99f57b9974140637f8","type":"image/png"},{"path":"icon-192.png","sha256":"d5e9cb27cde17489a875d4de31db87a78b8180707f5d8b5f525e54390237aac7","type":"image/png"},{"path":"icon-512.png","sha256":"7c5677b7487cb4744a1f1ad6f165f62889064fb57b56652ffef5559d7b9a536f","type":"image/png"}],"id":"c9804128b4dcc8e9acb4bbdd"};
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
