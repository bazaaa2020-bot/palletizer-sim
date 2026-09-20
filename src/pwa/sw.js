// Service worker тренажёра. Весь тренажёр — один HTML-файл, он и так самодостаточный;
// задача worker'а в другом: дать установку как приложения и работу без сети, когда файл
// раздают по корпоративной сети, а не открывают с диска.
// Версия кэша подставляется сборщиком из хеша собранного файла — новая сборка вытесняет старую.
const CACHE = '__CACHE__';
const FILES = ['./', './palletizer-sim.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Сначала кэш: тренажёр не меняется между сборками, а сеть на площадке может и не работать.
// Навигация без сети и без точного совпадения отдаёт сам файл тренажёра.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)
    .then(res => {
      if (res && res.ok && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    })
    .catch(() => req.mode === 'navigate' ? caches.match('./palletizer-sim.html') : Promise.reject())));
});
