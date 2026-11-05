// Service worker Spesialisasi 95: membuat aplikasi tetap terbuka tanpa internet.
const VERSION = 'v4';
const SHELL = `s95-shell-${VERSION}`;
const FONTS = 's95-fonts';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('s95-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Halaman: ambil versi terbaru dari jaringan, pakai cache saat offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok && url.pathname === '/') { const copy = res.clone(); caches.open(SHELL).then(c => c.put('/', copy)); } return res; })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Font Google: simpan setelah dimuat pertama kali.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Aset statis milik aplikasi sendiri: cache dulu, lalu jaringan.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
  // Permintaan lain (mis. API sinkron) dibiarkan langsung ke jaringan.
});
