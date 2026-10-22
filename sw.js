// Service worker: la app abre sin conexión. 61f4a47c2a cambia en cada publicación y renueva la caché.
var VERSION = "61f4a47c2a";
var CACHE = "transistock-" + VERSION;
var ARCHIVOS = ["./", "index.html", "app.js", "calculo.js", "style.css", "marca.css", "iconos.svg", "manifest.webmanifest", "data.json",
  "isotipo-azul.svg", "favicon.svg", "favicon-32.png", "icon-192.png",
  "fuentes/montserrat-latin-600-normal.woff2", "fuentes/inter-latin-500-normal.woff2", "fuentes/roboto-latin-400-normal.woff2"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    // también borra las cachés de cuando la app se llamaba Elestock
    return Promise.all(ks.filter(function (k) { return (k.indexOf("transistock-") === 0 || k.indexOf("elestock-") === 0) && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.slice(-9) === "data.json") {  // precios: primero la red, y la copia guardada si no hay conexión
    e.respondWith(fetch(e.request).then(function (r) {
      // un 404/503 (p. ej. durante un despliegue) no reemplaza la copia buena
      if (!r.ok) return caches.match(e.request).then(function (g) { return g || r; });
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request); }));
});
