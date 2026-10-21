// Service worker: la app abre sin conexión. 6b3e8a34e5 cambia en cada publicación y renueva la caché.
var VERSION = "6b3e8a34e5";
var CACHE = "elestock-" + VERSION;
var ARCHIVOS = ["./", "index.html", "app.js", "calculo.js", "style.css", "manifest.webmanifest", "icon-192.png", "data.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("elestock-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.slice(-9) === "data.json") {  // precios: primero la red, y la copia guardada si no hay conexión
    e.respondWith(fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request); }));
});
