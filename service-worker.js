/**
 * AFAU Digital — service-worker.js
 * Cacheia o app shell inteiro para uso offline. O único ponto que
 * exige rede é a consulta ao site oficial da SEMOB — e essa consulta
 * é sempre aberta em nova aba pelo próprio app (window.open), então
 * este Service Worker nunca intercepta ou armazena nada desse domínio.
 */

const CACHE_VERSION = 'afau-digital-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './utils.js',
  './storage.js',
  './scanner.js',
  './camera.js',
  './manifest.json',
  './libs/html5-qrcode.min.js',
  './libs/chart.min.js',
  './assets/img/logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
];

// Nunca cachear nem responder por este domínio — toda consulta oficial
// é feita pelo usuário, direto, em nova aba.
const NEVER_CACHE_HOSTS = ['servicos.semob.df.gov.br'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('[sw] precache parcial (algum arquivo faltando em /libs?)', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (NEVER_CACHE_HOSTS.includes(url.hostname)) {
    return; // deixa passar direto para a rede, sem interceptar
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
