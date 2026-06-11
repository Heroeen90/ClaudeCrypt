// ===== ClaudeCrypt — Service Worker (Offline Support) =====

const CACHE_NAME = 'claudecrypt-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/crypto-core.js',
  '/js/steganography.js',
  '/js/analyzer.js',
  '/js/keygen.js',
  '/js/vault.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/guide.js',
  '/js/app.js',
  '/manifest.json'
];

// تثبيت وتخزين الملفات
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// تفعيل وحذف الكاش القديم
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استجابة الطلبات من الكاش
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
