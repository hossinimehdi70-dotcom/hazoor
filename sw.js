/* ============================================================
   Service Worker — دفتر حضور و غیاب
   برای آپدیت برنامه فقط VERSION را تغییر دهید
============================================================ */
const VERSION      = 'v1.0.0';
const STATIC_CACHE = `hazoor-static-${VERSION}`;
const RUNTIME_CACHE= `hazoor-runtime-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

/* ---------- نصب ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => console.warn('خطا در کش:', url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* ---------- فعال‌سازی ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- پاسخ به درخواست‌ها ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  /* --- Google Fonts: Cache First --- */
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(request));
      })
    );
    return;
  }

  /* --- ناوبری صفحه: Network First با fallback به index.html --- */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match('./index.html'))
        )
    );
    return;
  }

  /* --- سایر منابع: Cache First با به‌روزرسانی در پس‌زمینه --- */
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && url.origin === location.origin) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

/* ---------- دریافت پیام از صفحه ---------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});