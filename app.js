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

  // ---------- acerca de: tirar la barra azul hacia abajo despliega el panel; el logo viaja al centro y crece ----------
  function iniciarAcerca() {
    var barra = document.querySelector(".barra"), marca = document.getElementById("marca"), panel = document.getElementById("acerca"),
      hoja = panel.querySelector(".hoja"), cerrar = document.getElementById("cerrar-acerca"),
      desvanecen = panel.querySelectorAll(".texto, .volver"),
      vuelan = [].map.call(panel.querySelectorAll("[data-vuela]"), function (el) {
        var pieza = el.getAttribute("data-vuela");
        return { el: el, iso: pieza === "iso", desde: barra.querySelector('[data-vuela="' + pieza + '"]') };
      });
    var abierto = false, preparado = false, avance = 0, recorrido = 1, gesto = null, ocultar = null, arrastro = false, DURA = 380;

    function preparar() {  // mide la partida (en la barra) y la llegada (en el panel) de cada pieza que vuela
      clearTimeout(ocultar);
      preparado = true;
      panel.hidden = false;
      barra.classList.add("abierta");
      document.body.style.overflow = "hidden";
      // la hoja baja desde justo debajo del logo: azul sobre azul, así va tapando el buscador
      recorrido = Math.max(window.innerHeight - marca.getBoundingClientRect().bottom - 6, 1);
      vuelan.forEach(function (v) {
        v.el.style.transition = "none";
        v.el.style.transform = "none";
        var a = v.desde.getBoundingClientRect(), z = v.el.getBoundingClientRect();
        v.dx = a.left - z.left; v.dy = a.top - z.top; v.k = a.height / z.height;
      });
    }
    function pintar(p, animar) {
      avance = p;
      var t = animar ? "transform " + DURA + "ms cubic-bezier(.2,.8,.2,1), opacity " + DURA + "ms" : "none", q = 1 - p;
      hoja.style.transition = t;
      hoja.style.transform = "translateY(" + (-q * recorrido) + "px)";
      vuelan.forEach(function (v) {
        // de fila a columna: el nombre baja antes y el isotipo crece después, para que no se pisen a mitad de camino
        var m = v.iso ? q : Math.pow(q, 1.6), k = v.iso ? Math.pow(p, 1.5) : 1 - m;
        v.el.style.transition = t;
        v.el.style.transform = "translate(" + v.dx * m + "px," + v.dy * m + "px) scale(" + (v.k + (1 - v.k) * k) + ")";
      });
      var o = Math.max(0, (p - .55) / .45);
      [].forEach.call(desvanecen, function (el) { el.style.transition = t; el.style.opacity = o; });
    }
    function abrir() {
      if (!preparado) { preparar(); pintar(0, false); hoja.getBoundingClientRect(); }
      pintar(1, true);
      if (!abierto) {
        abierto = true;
        marca.setAttribute("aria-expanded", "true");
        try { history.pushState({ acerca: true }, ""); } catch (e) { /* sin historial: se cierra igual con Volver */ }
      }
      cerrar.focus({ preventScroll: true });
    }
    function plegar() {  // anima el cierre y deja todo como estaba
      pintar(0, true);
      abierto = false;
      marca.setAttribute("aria-expanded", "false");
      ocultar = setTimeout(function () {
        preparado = false;
        panel.hidden = true;
        barra.classList.remove("abierta");
        document.body.style.overflow = "";
        if (panel.contains(document.activeElement) || document.activeElement === document.body) marca.focus({ preventScroll: true });
      }, DURA);
    }
    function pedirCierre() {  // si abrir sumó un paso al historial, volver atrás lo saca (y popstate pliega)
      if (history.state && history.state.acerca) history.back(); else plegar();
    }

    function empezar(e) {
      if (e.button > 0 || gesto || (e.currentTarget === barra && e.target.closest("input, button"))) return;
      if (e.currentTarget === barra && abierto) return;
      gesto = { y: e.clientY, id: e.pointerId, origen: e.currentTarget, base: abierto ? 1 : 0, mueve: false, v: 0, yAnt: e.clientY, tAnt: e.timeStamp };
    }
    function mover(e) {
      var g = gesto;
      if (!g || e.pointerId !== g.id) return;
      var dy = e.clientY - g.y;
      if (!g.mueve) {
        if (Math.abs(dy) < 8) return;
        if (g.base ? dy > 0 : dy < 0) { gesto = null; return; }  // sólo baja si está cerrado, sólo sube si está abierto
        g.mueve = true;
        try { g.origen.setPointerCapture(e.pointerId); } catch (err) { /* sin captura: igual sigue el dedo */ }
        if (!preparado) preparar();
      }
      g.v = (e.clientY - g.yAnt) / Math.max(1, e.timeStamp - g.tAnt);
      g.yAnt = e.clientY; g.tAnt = e.timeStamp;
      pintar(Math.min(1, Math.max(0, g.base + dy / recorrido)), false);
    }
    function soltar(e) {
      var g = gesto;
      if (!g || e.pointerId !== g.id) return;
      gesto = null;
      if (!g.mueve) return;  // fue un toque: lo resuelve el click
      arrastro = true;
      setTimeout(function () { arrastro = false; }, 0);
      // un tirón rápido decide solo; si no, alcanza con pasar un cuarto del recorrido
      var queda = g.v > .4 || (g.v > -.4 && avance > (g.base ? .75 : .25));
      if (queda) abrir(); else if (abierto) pedirCierre(); else plegar();
    }
    [barra, panel].forEach(function (el) {
      el.addEventListener("pointerdown", empezar);
      el.addEventListener("pointermove", mover);
      el.addEventListener("pointerup", soltar);
      el.addEventListener("pointercancel", soltar);
    });
    marca.addEventListener("click", function () { if (!arrastro) abrir(); });
    marca.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
    cerrar.addEventListener("click", function () { if (!arrastro) pedirCierre(); });
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") pedirCierre();
      else if (e.key === "Tab") { e.preventDefault(); cerrar.focus(); }  // el único control del panel
    });
    window.addEventListener("popstate", function () { if (abierto) plegar(); });
    window.addEventListener("resize", function () { if (abierto && !gesto) { preparar(); pintar(1, false); } });
  }

  function iniciar() {
    cargarPedido();
    iniciarAcerca();
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
      document.getElementById("acerca-precios").textContent = "Precios al " + d.actualizado + ", sujetos a cambio.";
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
