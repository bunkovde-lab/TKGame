/* Офлайн-режим «Мир Раскола».
   Страницы, скрипты и стили: сначала сеть, без сети — копия из кэша.
   Картинки: сначала кэш. Список файлов обновляет tools/sw-assets.mjs при деплое. */
const CACHE = 'mir-raskola-dev';
const ASSETS = [
  "./chapter/assets/combat-cargo.webp",
  "./chapter/assets/combat-relay.webp",
  "./chapter/assets/detail-badge.webp",
  "./chapter/assets/detail-key.webp",
  "./chapter/assets/detail-manifest.webp",
  "./chapter/assets/detail-recorder.webp",
  "./chapter/assets/detail-sample.webp",
  "./chapter/assets/detail-terminal.webp",
  "./chapter/assets/scene-archive.webp",
  "./chapter/assets/scene-clinic.webp",
  "./chapter/assets/scene-interview.webp",
  "./chapter/assets/scene-office.webp",
  "./chapter/assets/scene-port.webp",
  "./chapter/assets/scene-registry.webp",
  "./chapter/assets/scene-relay.webp",
  "./chapter/assets/scene-waiting.webp",
  "./chapter/assets/scene-warehouse.webp",
  "./chapter/assets/station-map.webp",
  "./chapter/crew.js",
  "./chapter/data.js",
  "./chapter/engine.js",
  "./chapter/fx.js",
  "./chapter/",
  "./chapter/prior.js",
  "./chapter/story.js",
  "./chapter/style.css",
  "./chapter/ui.js",
  "./hub.css",
  "./hub.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-32.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./icons/og-cover.jpg",
  "./",
  "./manifest.webmanifest",
  "./prologue/assets/crew-corvin-off-talk.webp",
  "./prologue/assets/crew-corvin-off.webp",
  "./prologue/assets/crew-corvin-talk.webp",
  "./prologue/assets/crew-corvin.webp",
  "./prologue/assets/crew-irena-off-talk.webp",
  "./prologue/assets/crew-irena-off.webp",
  "./prologue/assets/crew-irena-talk.webp",
  "./prologue/assets/crew-irena.webp",
  "./prologue/assets/crew-mara-off-talk.webp",
  "./prologue/assets/crew-mara-off.webp",
  "./prologue/assets/crew-mara-talk.webp",
  "./prologue/assets/crew-mara.webp",
  "./prologue/assets/crew-rein-off-talk.webp",
  "./prologue/assets/crew-rein-off.webp",
  "./prologue/assets/crew-rein-talk.webp",
  "./prologue/assets/crew-rein.webp",
  "./prologue/assets/dock.webp",
  "./prologue/assets/intro-0.webp",
  "./prologue/assets/intro-1.webp",
  "./prologue/assets/intro-2.webp",
  "./prologue/assets/intro-3.webp",
  "./prologue/assets/prop-badge.webp",
  "./prologue/assets/prop-desk.webp",
  "./prologue/assets/prop-navigation.webp",
  "./prologue/assets/prop-reader.webp",
  "./prologue/assets/prop-sample.webp",
  "./prologue/assets/prop-scanner.webp",
  "./prologue/assets/room-airlock.webp",
  "./prologue/assets/room-analysis.webp",
  "./prologue/assets/room-cockpit.webp",
  "./prologue/assets/room-lab.webp",
  "./prologue/assets/room-office.webp",
  "./prologue/assets/scene-airlock.webp",
  "./prologue/assets/scene-analysis.webp",
  "./prologue/assets/scene-cockpit.webp",
  "./prologue/assets/scene-lab.webp",
  "./prologue/assets/ship-map.webp",
  "./prologue/content.js",
  "./prologue/engine.js",
  "./prologue/",
  "./prologue/prologue.css",
  "./prologue/prologue.js"
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('mir-raskola-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.txt')) return;
  const isArt = /\.(webp|png|jpe?g|svg)$/i.test(url.pathname);
  if (isArt) {
    ev.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname, copy)); }
      return res;
    })));
    return;
  }
  ev.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match(url.pathname, { ignoreSearch: true }))));
});
