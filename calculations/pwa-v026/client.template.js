/* Quiet Banking isolated code-cache/install client. Static build status only. */
(() => {
 'use strict';
 const BUILD = '__BUILD__';
 const status = document.querySelector('#pwa-status');
 const retry = document.querySelector('#pwa-retry');
 let registration = null, sequence = 0, running = false, installFailed = false;
 const show = (state, text) => { status.dataset.state = state; status.textContent = text; };
 function ask(worker) {
  return new Promise((resolve, reject) => {
   const channel = new MessageChannel();
   const timer = setTimeout(() => { channel.port1.close(); reject(Error('Static status timed out')); }, 4000);
   channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
   try { worker.postMessage({type: 'GET_STATUS'}, [channel.port2]); }
   catch (error) { clearTimeout(timer); channel.port1.close(); reject(error); }
  });
 }
 async function check() {
  const turn = ++sequence;
  try {
   if (installFailed) { show('failed', 'Offline install/update failed. Previous active code, if any, is retained. Retry/check while online.'); return; }
   const controller = navigator.serviceWorker.controller;
   if (!controller) {
    const installed = registration?.active || registration?.waiting;
    show(installed ? 'reopen' : 'preparing', installed ? 'Reopen once to finish offline setup. Do not reload an unfinished form.' : 'Preparing offline files. Keep this page open online.');
    return;
   }
   if (controller.scriptURL !== new URL('./sw.js', location.href).href) {
    show('reopen', 'Reopen once to finish offline setup for this app directory. Do not reload an unfinished form.'); return;
   }
   const result = await ask(controller);
   if (turn !== sequence || navigator.serviceWorker.controller !== controller) return;
   if (result?.build !== BUILD) { show('mismatch', 'Offline files not ready for this page version. Finish or save work, close ALL app windows, then reopen.'); return; }
   if (result.state !== 'complete') { show('failed', 'Offline files failed verification. Stay online and retry/check. Financial saving is separate.'); return; }
   if (registration?.waiting) show('waiting', 'Offline files ready for current version. Update waiting: finish or save work, close ALL app windows, then reopen.');
   else show('ready', 'Offline files ready for this version. Local records are separate; this is not a backup.');
  } catch (_) { if (turn === sequence) show('failed', 'Offline setup/status failed. Keep working online; retry/check without reloading your form.'); }
 }
 function watch(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
   if (worker.state === 'redundant') { installFailed = true; void check(); }
   else void check();
  });
 }
 async function start() {
  if (running) return;
  if (!['http:', 'https:'].includes(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window) || !window.MessageChannel) {
   show('unsupported', 'Offline install unavailable in this context. A supported browser and trusted HTTPS are required (local loopback is test-only).'); return;
  }
  running = true; installFailed = false; retry.disabled = true;
  show('preparing', 'Preparing offline files. Keep this page open online.');
  try {
   // Relative to the document directory at root or any stable nested path.
   registration = await navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'});
   watch(registration.installing);
   registration.addEventListener('updatefound', () => watch(registration.installing));
   await check();
   // Bounded initial observation, never automatic reload or draft replacement.
   for (let i = 0; i < 16 && status.dataset.state === 'preparing'; i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); await check();
   }
   if (status.dataset.state === 'preparing') show('preparing', 'Offline files still preparing. Keep online and use Retry/check.');
  } catch (_) { show('failed', 'Offline setup failed. Financial saving is separate. Keep online and retry/check; no records were cleared.'); }
  finally { running = false; retry.disabled = false; }
 }
 retry.addEventListener('click', () => { void start(); });
 document.addEventListener('visibilitychange', () => { if (!document.hidden && registration) void check(); });
 if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => { void check(); });
 void start();
})();
