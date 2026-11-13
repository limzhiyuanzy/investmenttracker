/* Quiet Banking v0.29: static-only verified generation publication. */
'use strict';
const BUILD = {"assets":[{"path":"index.html","sha256":"5c805bbed34c96633422c12b5bb84bd42a3f7bc1f8db0be32be30c9229a30079","size":242825,"type":"text/html"},{"path":"manifest.webmanifest","sha256":"7f4549c20352c364ebeae1b577aa5507801d3d815c5c0c9b34a7007fb2e665d7","size":336,"type":"application/manifest+json"},{"path":"icon-180.png","sha256":"fec04371e4e3593012cc7edda2c1b3bdad90fca7d84d8c99f57b9974140637f8","size":5312,"type":"image/png"},{"path":"icon-192.png","sha256":"d5e9cb27cde17489a875d4de31db87a78b8180707f5d8b5f525e54390237aac7","size":5753,"type":"image/png"},{"path":"icon-512.png","sha256":"7c5677b7487cb4744a1f1ad6f165f62889064fb57b56652ffef5559d7b9a536f","size":19665,"type":"image/png"}],"id":"ca3a6cd70613351f6b916829"};
const ROOT = new URL('./', self.registration.scope);
const PREFIX = 'quietbanking:pwa:v029:' + encodeURIComponent(ROOT.href) + ':' + BUILD.id + ':';
const MARKER = new URL('__qb_static_complete__', ROOT).href;
const ASSETS = BUILD.assets.map(a => ({...a, url: new URL(a.path, ROOT).href}));
let repair = null;
async function verified(response, asset) {
 if (!response || response.status !== 200 || response.type === 'opaque' || response.redirected) throw Error('response');
 if ((response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== asset.type) throw Error('type');
 const bytes = await response.clone().arrayBuffer();
 if (bytes.byteLength !== asset.size) throw Error('integrity');
 const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
 if (hash !== asset.sha256) throw Error('integrity');
 return response;
}
async function complete(cache) {
 try {
  const marker = await cache.match(MARKER);
  if (!marker || await marker.text() !== BUILD.id || (await cache.keys()).length !== ASSETS.length + 1) return false;
  for (const asset of ASSETS) await verified(await cache.match(asset.url), asset);
  return true;
 } catch (_) { return false; }
}
async function eligible() {
 // A single-key marker write is the commit point, NOT a cache rename.
 // Revalidate the entire generation after every restart and before every serve.
 for (const name of (await caches.keys()).filter(n => n.startsWith(PREFIX)).sort().reverse()) {
  const cache = await caches.open(name);
  if (await complete(cache)) return {name, cache};
 }
 return null;
}
async function download(asset) {
 const abort = new AbortController(); let timer;
 try {
  return await Promise.race([
   (async () => {
    const response = await fetch(asset.url, {cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: abort.signal});
    // Bound the response body and verification wait as well as response headers.
    return verified(response, asset);
   })(),
   new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(Error('timeout')); }, 4000); })
  ]);
 } finally { clearTimeout(timer); }
}
function rebuild() {
 if (repair) return repair;
 repair = (async () => {
  let name;
  try {
   const usable = await eligible();
   // Only this scope AND this build. Never touch another worker's install.
   for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== usable?.name) await caches.delete(key);
   name = PREFIX + crypto.randomUUID();
   const cache = await caches.open(name);
   const responses = await Promise.all(ASSETS.map(download));
   for (let i = 0; i < ASSETS.length; i++) await cache.put(ASSETS[i].url, responses[i]);
   for (const asset of ASSETS) await verified(await cache.match(asset.url), asset);
   // No fetch/status path accepts an unmarked generation, even if interrupted.
   await cache.put(MARKER, new Response(BUILD.id));
   if (!await complete(cache)) throw Error('publication');
   return {build: BUILD.id, state: 'complete'};
  } catch (_) {
   if (name) await caches.delete(name).catch(() => {});
   return {build: BUILD.id, state: 'failed', reason: 'same-build-repair-unavailable'};
  }
 })().finally(() => { repair = null; });
 return repair;
}
self.addEventListener('install', event => event.waitUntil((async () => {
 if ((await rebuild()).state !== 'complete') throw Error('Static install failed');
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
 if (!await eligible()) throw Error('Static activation failed');
 // Normal browser activation only; no takeover and no cross-build deletion.
})()));
self.addEventListener('fetch', event => {
 const request = event.request, url = new URL(request.url);
 if (request.method !== 'GET' || url.origin !== ROOT.origin || url.search || url.hash) return;
 let target = url.href;
 if (request.mode === 'navigate' && target === ROOT.href) target = new URL('index.html', ROOT).href;
 const asset = ASSETS.find(a => a.url === target);
 if (!asset) return;
 event.respondWith((async () => {
  try { const set = await eligible(); return await verified(set && await set.cache.match(asset.url), asset); }
  catch (_) { return Response.error(); }
 })());
});
self.addEventListener('message', event => {
 if (!event.source?.id || event.ports?.length !== 1 || !event.data || Object.keys(event.data).length !== 1 || !['GET_STATUS', 'REPAIR_STATIC'].includes(event.data.type)) return;
 event.waitUntil((async () => {
  const source = await self.clients.get(event.source.id);
  if (!source || source.type !== 'window') return;
  const url = new URL(source.url);
  if (url.origin !== ROOT.origin || !(url.href === ROOT.href || url.pathname === new URL('index.html', ROOT).pathname)) return;
  const result = event.data.type === 'REPAIR_STATIC' ? await rebuild() : {build: BUILD.id, state: await eligible() ? 'complete' : 'failed'};
  event.ports[0].postMessage(result);
 })());
});
