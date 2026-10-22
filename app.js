(function () {
  "use strict";
  var C = Calculo, datos = null, pedido = [], vista = "precios", busqueda = "", categoria = "";
  var CLAVE = "transistock-pedido", CLAVE_VIEJA = "elestock-pedido";  // la app se llamaba Elestock

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
  function ico(nombre) {
    var ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg"), u = document.createElementNS(ns, "use");
    s.setAttribute("class", "ico");
    s.setAttribute("aria-hidden", "true");
    u.setAttribute("href", "iconos.svg#i-" + nombre);
    s.appendChild(u);
    return s;
  }
  function cargarPedido() {
    try {
      var guardado = localStorage.getItem(CLAVE);
      if (guardado === null && localStorage.getItem(CLAVE_VIEJA) !== null) {  // pedido armado antes del cambio de nombre
        guardado = localStorage.getItem(CLAVE_VIEJA);
        localStorage.setItem(CLAVE, guardado);
        localStorage.removeItem(CLAVE_VIEJA);
      }
      pedido = JSON.parse(guardado || "[]");
    } catch (e) { pedido = []; }
  }
  function guardarPedido() {
    try { localStorage.setItem(CLAVE, JSON.stringify(pedido)); } catch (e) { /* sin almacenamiento: sigue en memoria */ }
  }
  function mover(item, delta) { pedido = C.cambiar(pedido, item, delta); guardarPedido(); dibujar(); }

  function botonesCantidad(item) {
    var q = C.cantidadDe(pedido, item);
    if (!q) return h("button", { class: "mas", "aria-label": "Agregar " + item.n, onclick: function () { mover(item, 1); } }, ico("mas"));
    return h("span", { class: "cant" },
      h("button", { "aria-label": "Quitar uno de " + item.n, onclick: function () { mover(item, -1); } }, ico(q === 1 ? "borrar" : "menos")),
      h("b", { "aria-label": "Cantidad" }, C.cantidad(q)),
      h("button", { "aria-label": "Agregar otro " + item.n, onclick: function () { mover(item, 1); } }, ico("mas")));
  }
  function vacio(main, icono, texto) { main.appendChild(h("div", { class: "vacio" }, ico(icono), h("p", {}, texto))); }

  function dibujarCategorias() {
    var nav = document.getElementById("categorias"), vistas = {};
    nav.textContent = "";
    function chip(valor, texto) {
      nav.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(categoria === valor),
        onclick: function () { categoria = valor; dibujar(); window.scrollTo(0, 0); } }, texto));
    }
    chip("", "Todo");
    datos.componentes.forEach(function (c) { if (!vistas[c.c]) { vistas[c.c] = true; chip(c.c, c.c); } });
  }

  function vistaPrecios(main) {
    var cat = null, lista = null, n = 0;
    datos.componentes.forEach(function (c) {
      if (categoria && c.c !== categoria) return;
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
    if (!n) vacio(main, "buscar", busqueda ? "No hay componentes que coincidan con «" + busqueda + "»." : "No hay componentes en esta categoría.");
  }

  function vistaKits(main) {
    var anio = "x", n = 0;
    datos.kits.forEach(function (k) {
      if (!C.coincide(k.n, busqueda)) return;
      n++;
      if (k.a !== anio) { anio = k.a; main.appendChild(h("h2", {}, anio ? anio + "° año" : "Otros")); }
      var item = { t: "k", id: k.id, n: "Kit " + k.n, p: k.p };
      var detalle = h("ul", { class: "items" });
      k.i.forEach(function (i) { detalle.appendChild(h("li", {}, C.renglonKit(i.q, i.n))); });
      main.appendChild(h("details", { class: "kit" },
        h("summary", {}, h("span", { class: "nombre" }, k.n, h("small", {}, k.i.length + " componentes · tocá para ver")),
          h("span", { class: "precio" }, C.dinero(k.p)), ico("abajo")),
        detalle, h("div", { class: "pie" }, botonesCantidad(item))));
    });
    if (!n) vacio(main, "kit", busqueda ? "No hay kits que coincidan con «" + busqueda + "»." : "No hay kits publicados.");
  }

  function copiar(texto, aviso) {
    function listo(ok) { aviso.textContent = ok ? "Lista copiada ✔" : "No se pudo copiar: abrí «Ver el texto» y copialo a mano."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { listo(true); }, function () { listo(false); });
    else listo(false);
  }

  function vistaPedido(main) {
    main.appendChild(h("h2", {}, "Mi pedido"));
    if (!pedido.length) { vacio(main, "pedido", "Todavía no agregaste nada. Tocá + en Precios o en Kits."); return; }
    var lista = h("ul", { class: "lista" }), ordenado = C.ordenar(pedido, datos);
    ordenado.forEach(function (l) {
      lista.appendChild(h("li", {}, h("span", { class: "nombre" }, l.n, h("small", {}, C.dinero(l.p) + " c/u")),
        h("span", { class: "precio" }, C.dinero(l.p * l.q)), botonesCantidad(l)));
    });
    main.appendChild(lista);
    var aviso = h("span", { class: "aviso", role: "status" });
    var txt = C.texto(ordenado);
    main.appendChild(h("p", { class: "total" }, "Total", h("b", {}, C.dinero(C.total(pedido)))));
    main.appendChild(h("div", { class: "acciones" },
      h("a", { class: "boton wa", href: "https://wa.me/?text=" + encodeURIComponent(txt), target: "_blank", rel: "noopener" }, ico("whatsapp"), "Enviar por WhatsApp"),
      h("button", { class: "boton", type: "button", onclick: function () { copiar(txt, aviso); } }, ico("copiar"), "Copiar lista"),
      h("button", { class: "boton quitar", type: "button", onclick: function () { if (confirm("¿Vaciar el pedido?")) { pedido = []; guardarPedido(); dibujar(); } } }, ico("borrar"), "Vaciar")));
    main.appendChild(aviso);
    main.appendChild(h("details", { class: "copia" }, h("summary", {}, "Ver el texto"),
      h("textarea", { readonly: "readonly", rows: String(Math.min(pedido.length + 4, 12)), "aria-label": "Lista para copiar" }, txt)));
  }

  function dibujar() {
    var main = document.getElementById("main");
    main.textContent = "";
    document.getElementById("busqueda").hidden = vista === "pedido";
    document.getElementById("categorias").hidden = vista !== "precios";
    if (vista === "precios") { dibujarCategorias(); vistaPrecios(main); } else if (vista === "kits") vistaKits(main); else vistaPedido(main);
    var n = pedido.length, globo = document.getElementById("n-pedido");
    globo.textContent = n;
    globo.hidden = !n;
    ["precios", "kits", "pedido"].forEach(function (v) {
      var a = document.getElementById("tab-" + v);
      a.setAttribute("aria-current", v === vista ? "page" : "false");
    });
  }

  function leerVista() {
    var v = (location.hash || "#precios").slice(1);
    vista = v === "kits" || v === "pedido" ? v : "precios";
    dibujar();
    window.scrollTo(0, 0);
  }

  function iniciar() {
    cargarPedido();
    var q = document.getElementById("q"), limpiar = document.getElementById("limpiar");
    q.addEventListener("input", function () { busqueda = q.value; limpiar.hidden = !busqueda; dibujar(); });
    limpiar.addEventListener("click", function () { q.value = busqueda = ""; limpiar.hidden = true; dibujar(); q.focus(); });
    window.addEventListener("hashchange", leerVista);
    fetch("data.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      d.componentes = C.ordenar(d.componentes, d);  // dentro de cada categoría, por tipo y valor (10K después de 2K2)
      datos = d;
      pedido = C.actualizar(pedido, d);
      guardarPedido();
      document.getElementById("actualizado").textContent = (navigator.onLine === false ? "Sin conexión · precios guardados del " : "Precios al ")
        + d.actualizado + " · sujetos a cambio";
      leerVista();
    }).catch(function () {
      document.getElementById("actualizado").textContent = "";
      var main = document.getElementById("main");
      main.textContent = "";
      vacio(main, "alerta", "No se pudieron cargar los precios. Conectate a internet una vez para guardarlos.");
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  document.addEventListener("DOMContentLoaded", iniciar);
})();
