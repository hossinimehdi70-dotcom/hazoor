/* ============================================================
   Service Worker — دفتر حضور و غیاب
   نسخه کش: هر بار نسخه‌ی برنامه را عوض کردید، اینجا هم عوض کنید
============================================================ */
const CACHE_NAME = 'hazoor-v1.2.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* نصب: کش کردن دارایی‌های اصلی */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* فعال‌سازی: پاک کردن کش‌های قدیمی */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* درخواست‌ها: Network First برای Firebase، Cache First برای بقیه */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Firebase / گوگل: اصلاً کش نکن */
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('firebaseio')) {
    return;
  }

  /* منابع دیگر: Cache First با fallback به شبکه */
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseClone);
        });
        return response;
      }).catch(() => {
        /* آفلاین: برای ناوبری صفحه، index.html برگردان */
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

/* پیام از برنامه: امکان به‌روزرسانی دستی */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
