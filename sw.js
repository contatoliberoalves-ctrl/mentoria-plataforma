// Mentoria Cartórios — Service Worker v1
var CACHE = 'mentoria-v1';
var STATIC = [
  '/',
  '/index.html',
  '/CartorioApp.dc.html',
  '/AdminOABv2.dc.html',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(STATIC.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function(err) {
        console.warn('[SW] Cache install partial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
           .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;
  // Don't cache Supabase API calls
  if (req.url.indexOf('supabase.co') >= 0) return;
  // Network first for HTML, cache first for static assets
  var isNavigation = req.mode === 'navigate';
  e.respondWith(
    caches.match(req).then(function(cached) {
      var fetchP = fetch(req).then(function(res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      }).catch(function() { return cached; });
      // For navigation: try network first, fallback to cache
      if (isNavigation) return fetchP;
      // For assets: try cache first, then network
      return cached || fetchP;
    })
  );
});
