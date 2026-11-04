const VERSION = "b087e8d4c4cc7c75";
const FILES = ["index.html","style.css","app.mjs","time.mjs","share.mjs","image-card.mjs","pwa.mjs","site.webmanifest","favicon.svg","favicon.ico","apple-touch-icon.png","assets/logo-wordmark-a.png","assets/icon-192.png","assets/icon-512.png","assets/icon-maskable-512.png"];
const SCOPE = self.registration.scope;
const PREFIX = `life-hourglass:${SCOPE}:`;
const CACHE = `${PREFIX}${VERSION}`;
const URLS = FILES.map(file => new URL(file, SCOPE).href);
const ALLOWED = new Set(URLS);
const INDEX = new URL('index.html', SCOPE).href;
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  url.search = '';
  url.hash = '';
  const key = request.mode === 'navigate' && url.href === SCOPE ? INDEX : url.href;
  if (!ALLOWED.has(key)) return;

  // Local editing stays live. Published builds keep their complete version together.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (LOCAL) {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch {}
    }
    const cached = await cache.match(key);
    if (cached) return cached;
    return fetch(request);
  })());
});
