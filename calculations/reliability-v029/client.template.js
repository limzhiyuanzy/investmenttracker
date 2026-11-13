/* Quiet Banking v0.29 isolated static-code controls. No financial storage. */
(() => {
 'use strict';
 const BUILD = '__BUILD__';
 const status = document.querySelector('#pwa-status');
 const updateStatus = document.querySelector('#pwa-update-status');
 const retry = document.querySelector('#pwa-retry');
 const update = document.querySelector('#pwa-update');
 const repair = document.querySelector('#pwa-repair');
 let registration = null, sequence = 0, checking = false, repairing = false, installFailed = false;
 const show = (node, state, text) => { node.dataset.state = state; node.textContent = text; };
 const bounded = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Error('timeout')), ms);
  Promise.resolve(promise).then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
 });
 function ask(worker, type = 'GET_STATUS') {
  return new Promise((resolve, reject) => {
   const channel = new MessageChannel();
   const timer = setTimeout(() => { channel.port1.close(); reject(Error('timeout')); }, 10000);
   channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
   try { worker.postMessage({type}, [channel.port2]); }
   catch (e) { clearTimeout(timer); channel.port1.close(); reject(e); }
  });
 }
 function lifecycle() {
  if (registration?.waiting) show(updateStatus, 'waiting', 'Update waiting. Finish or save work, close ALL app windows, then reopen. Unsaved drafts are session-only.');
  else if (registration?.installing) show(updateStatus, 'preparing', 'Preparing a verified update. Current work is not reloaded.');
  else if (installFailed) show(updateStatus, 'failed', 'Update install failed. Previous active code, if usable, is retained. Check again online.');
 }
 async function readiness() {
  const turn = ++sequence, controller = navigator.serviceWorker.controller;
  try {
   if (!controller) { show(status, registration?.active ? 'reopen' : 'preparing', registration?.active ? 'Reopen after finishing work to finish offline setup.' : 'Preparing offline files. Keep online.'); return; }
   if (controller.scriptURL !== new URL('./sw.js', location.href).href) { show(status, 'mismatch', 'Another app directory controls this page. Finish work and reopen from this app address.'); return; }
   const result = await ask(controller);
   if (turn !== sequence || controller !== navigator.serviceWorker.controller) return;
   if (result?.build !== BUILD) show(status, 'mismatch', 'Page and controlling build differ. Finish work, close ALL app windows, then reopen.');
   else if (result.state === 'complete') show(status, 'ready', 'Offline files ready for this version. Financial saving is separate; this is not a backup.');
   else show(status, 'failed', 'Offline files failed verification. Stay online and use Repair offline files. Financial records are separate.');
  } catch (_) { if (turn === sequence) show(status, 'failed', 'Offline readiness could not be verified. Keep online; retry status without reloading work.'); }
  lifecycle();
 }
 function watch(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
   if (worker.state === 'redundant') installFailed = true;
   lifecycle(); void readiness();
  });
 }
 async function setup() {
  if (registration) return registration;
  registration = await bounded(navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}), 6000);
  watch(registration.installing);
  registration.addEventListener('updatefound', () => { installFailed = false; watch(registration.installing); lifecycle(); });
  return registration;
 }
 async function checkUpdates() {
  if (checking) return;
  checking = true; update.disabled = true;
  show(updateStatus, 'checking', 'Checking the server for app updates… Offline readiness is separate.');
  try {
   const reg = await setup(); installFailed = false;
   await bounded(reg.update(), 6000);
   show(updateStatus, 'checked', 'Update discovery completed. No replacement is waiting yet; this does not guarantee a newer release exists.');
   lifecycle();
  } catch (_) { show(updateStatus, 'failed', 'Update discovery failed or timed out. Keep working; check again online. Current offline readiness is shown separately.'); }
  finally { checking = false; update.disabled = false; void readiness(); }
 }
 async function repairFiles() {
  if (repairing) return;
  repairing = true; repair.disabled = true; ++sequence;
  show(status, 'repairing', 'Repairing this version’s offline files. Current forms and financial records are untouched.');
  try {
   const controller = navigator.serviceWorker.controller;
   if (!controller || controller.scriptURL !== new URL('./sw.js', location.href).href) throw Error('controller');
   const result = await ask(controller, 'REPAIR_STATIC');
   if (controller !== navigator.serviceWorker.controller || result?.build !== BUILD) { show(status, 'mismatch', 'Repair reply belongs to another build. Finish work and reopen safely.'); return; }
   if (result.state !== 'complete') {
    show(status, 'failed', 'Same-build repair unavailable. The server may have newer files, be offline, or storage may be full. Check for updates to prepare a replacement; do not reload unfinished work.');
    return;
   }
   await readiness();
  } catch (_) { show(status, 'failed', 'Repair could not be confirmed. Keep online and retry; no financial records were cleared.'); }
  finally { repairing = false; repair.disabled = false; }
 }
 retry.addEventListener('click', () => readiness());
 update.addEventListener('click', checkUpdates);
 repair.addEventListener('click', repairFiles);
 if (!['http:', 'https:'].includes(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window) || !window.MessageChannel) {
  show(status, 'unsupported', 'Offline install unavailable here. Use a supported browser and trusted HTTPS (loopback is test-only).');
  retry.disabled = update.disabled = repair.disabled = true; return;
 }
 document.addEventListener('visibilitychange', () => { if (!document.hidden && !repairing) void readiness(); });
 navigator.serviceWorker.addEventListener('controllerchange', () => { void readiness(); });
 show(updateStatus, 'idle', 'Check for updates while online. Updates never reload open work.');
 void setup().then(readiness).catch(() => show(status, 'failed', 'Offline registration failed or timed out. Keep online and Check for updates to retry.'));
})();
