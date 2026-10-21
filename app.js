(function () {
  "use strict";
  var C = Calculo, datos = null, pedido = [], vista = "precios", busqueda = "";
  var CLAVE = "elestock-pedido";

  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "class") el.className = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  function cargarPedido() {
    try { pedido = JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch (e) { pedido = []; }
  }
  function guardarPedido() {
    try { localStorage.setItem(CLAVE, JSON.stringify(pedido)); } catch (e) { /* sin almacenamiento: sigue en memoria */ }
  }
  function mover(item, delta) { pedido = C.cambiar(pedido, item, delta); guardarPedido(); dibujar(); }

  function botonesCantidad(item) {
    var q = C.cantidadDe(pedido, item);
    if (!q) return h("button", { class: "mas", "aria-label": "Agregar " + item.n, onclick: function () { mover(item, 1); } }, "+");
    return h("span", { class: "cant" },
      h("button", { "aria-label": "Quitar uno de " + item.n, onclick: function () { mover(item, -1); } }, "−"),
      h("b", {}, C.cantidad(q)),
      h("button", { "aria-label": "Agregar otro " + item.n, onclick: function () { mover(item, 1); } }, "+"));
  }

  function vistaPrecios(main) {
    var cat = null, lista = null, n = 0;
    datos.componentes.forEach(function (c) {
      if (!C.coincide(c.n + " " + c.c, busqueda)) return;
      n++;
      if (c.c !== cat) {
        cat = c.c;
        main.appendChild(h("h2", {}, cat));
        lista = h("ul", { class: "lista" });
        main.appendChild(lista);
      }
      var item = { t: "c", id: c.id, n: c.n, p: c.p };
      lista.appendChild(h("li", {}, h("span", { class: "nombre" }, c.n), h("span", { class: "precio" }, C.dinero(c.p)), botonesCantidad(item)));
    });
    if (!n) main.appendChild(h("p", { class: "vacio" }, "No hay componentes que coincidan."));
  }

  function vistaKits(main) {
    var anio = "x", n = 0;
    datos.kits.forEach(function (k) {
      if (!C.coincide(k.n, busqueda)) return;
      n++;
      if (k.a !== anio) { anio = k.a; main.appendChild(h("h2", {}, anio ? anio + "° año" : "Otros")); }
      var item = { t: "k", id: k.id, n: "Kit " + k.n, p: k.p };
      var detalle = h("ul", { class: "items" });
      k.i.forEach(function (i) { detalle.appendChild(h("li", {}, C.cantidad(i.q) + " × " + i.n)); });
      main.appendChild(h("details", { class: "kit" },
        h("summary", {}, h("span", { class: "nombre" }, k.n), h("span", { class: "precio" }, C.dinero(k.p))),
        detalle, h("div", { class: "pie" }, botonesCantidad(item))));
    });
    if (!n) main.appendChild(h("p", { class: "vacio" }, "No hay kits publicados."));
  }

  function copiar(texto, aviso) {
    function listo(ok) { aviso.textContent = ok ? "Copiado ✔" : "No se pudo copiar: mantené apretado el texto de abajo y copialo."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { listo(true); }, function () { listo(false); });
    else listo(false);
  }

  function vistaPedido(main) {
    main.appendChild(h("h2", {}, "Mi pedido"));
    if (!pedido.length) { main.appendChild(h("p", { class: "vacio" }, "Todavía no agregaste nada. Usá el botón + en Precios o en Kits.")); return; }
    var lista = h("ul", { class: "lista" });
    pedido.forEach(function (l) {
      lista.appendChild(h("li", {}, h("span", { class: "nombre" }, l.n), h("span", { class: "precio" }, C.dinero(l.p * l.q)), botonesCantidad(l)));
    });
    main.appendChild(lista);
    var aviso = h("span", { class: "aviso", role: "status" });
    var txt = C.texto(pedido, datos.actualizado);
    main.appendChild(h("p", { class: "total" }, "Total: ", h("b", {}, C.dinero(C.total(pedido)))));
    main.appendChild(h("div", { class: "acciones" },
      h("button", { class: "p", onclick: function () { copiar(txt, aviso); } }, "Copiar lista"),
      h("button", { onclick: function () { if (confirm("¿Vaciar el pedido?")) { pedido = []; guardarPedido(); dibujar(); } } }, "Vaciar"), aviso));
    main.appendChild(h("textarea", { readonly: "readonly", rows: String(Math.min(pedido.length + 4, 12)), "aria-label": "Lista para copiar" }, txt));
  }

  function dibujar() {
    var main = document.getElementById("main");
    main.textContent = "";
    var buscador = document.getElementById("busqueda");
    buscador.hidden = vista === "pedido";
    if (vista === "precios") vistaPrecios(main); else if (vista === "kits") vistaKits(main); else vistaPedido(main);
    var n = pedido.reduce(function (s, l) { return s + 1; }, 0);
    document.getElementById("n-pedido").textContent = n ? " (" + n + ")" : "";
    ["precios", "kits", "pedido"].forEach(function (v) {
      var a = document.getElementById("tab-" + v);
      a.setAttribute("aria-current", v === vista ? "page" : "false");
    });
  }

  function leerVista() {
    var v = (location.hash || "#precios").slice(1);
    vista = v === "kits" || v === "pedido" ? v : "precios";
    dibujar();
  }

  function iniciar() {
    cargarPedido();
    var q = document.getElementById("q");
    q.addEventListener("input", function () { busqueda = q.value; dibujar(); });
    window.addEventListener("hashchange", leerVista);
    fetch("data.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      datos = d;
      document.getElementById("actualizado").textContent = "Precios al " + d.actualizado + " · sujetos a cambio";
      leerVista();
    }).catch(function () {
      document.getElementById("main").textContent = "No se pudieron cargar los precios. Conectate a internet una vez para guardarlos.";
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  document.addEventListener("DOMContentLoaded", iniciar);
})();
