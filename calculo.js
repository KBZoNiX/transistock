// Lógica del pedido, sin tocar el DOM (así se puede probar aparte).
var Calculo = (function () {
  function dinero(n) {
    return "$ " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function cantidad(n) {
    return String(Math.round(n * 100) / 100).replace(".", ",");
  }
  // Renglón del contenido de un kit: «2 × BC547»; una parte de algo entero, como fracción: «1/4 de Placa…».
  function renglonKit(q, nombre) {
    if (q > 0 && q < 1) {
      for (var d = 2; d <= 10; d++) {
        var num = Math.round(q * d);
        if (num > 0 && Math.abs(q * d - num) < 1e-9) return num + "/" + d + " de " + nombre;
      }
    }
    return cantidad(q) + " × " + nombre;
  }
  function clave(l) { return l.t + ":" + l.id; }
  // pedido: [{t:'c'|'k', id, n, p, q}]; devuelve un pedido nuevo
  function cambiar(pedido, item, delta) {
    var out = [], hallado = false;
    for (var i = 0; i < pedido.length; i++) {
      var l = pedido[i];
      if (clave(l) === clave(item)) {
        hallado = true;
        var q = l.q + delta;
        if (q > 0) out.push({ t: l.t, id: l.id, n: l.n, p: l.p, q: q });
      } else out.push(l);
    }
    if (!hallado && delta > 0) out.push({ t: item.t, id: item.id, n: item.n, p: item.p, q: delta });
    return out;
  }
  function fijar(pedido, item, q) {
    var actual = 0;
    for (var i = 0; i < pedido.length; i++) if (clave(pedido[i]) === clave(item)) actual = pedido[i].q;
    return cambiar(pedido, item, q - actual);
  }
  function cantidadDe(pedido, item) {
    for (var i = 0; i < pedido.length; i++) if (clave(pedido[i]) === clave(item)) return pedido[i].q;
    return 0;
  }
  function total(pedido) {
    var s = 0;
    for (var i = 0; i < pedido.length; i++) s += pedido[i].p * pedido[i].q;
    return s;
  }
  function texto(pedido) {
    var l = ["Pedido de componentes - transistock"];
    for (var i = 0; i < pedido.length; i++) {
      var x = pedido[i];
      l.push(cantidad(x.q) + " × " + x.n + " – " + dinero(x.p * x.q));
    }
    l.push("TOTAL: " + dinero(total(pedido)));
    l.push("(precios orientativos - a confirmar)");
    return l.join("\n");
  }
  // Al cargar precios nuevos, cada línea del pedido toma el nombre y el precio de hoy, y se quita lo que ya
  // no se publica. Se busca por tipo, id y nombre; si no, sólo por nombre (pedidos guardados cuando el id
  // era la posición en la lista y podía apuntar a otra cosa).
  function actualizar(pedido, datos) {
    var actuales = [], out = [];
    datos.componentes.forEach(function (c) { actuales.push({ t: "c", id: c.id, n: c.n, p: c.p }); });
    datos.kits.forEach(function (k) { actuales.push({ t: "k", id: k.id, n: "Kit " + k.n, p: k.p }); });
    for (var i = 0; i < pedido.length; i++) {
      var l = pedido[i], hallado = null;
      for (var j = 0; j < actuales.length && !hallado; j++) {
        var a = actuales[j];
        if (a.t === l.t && a.id === l.id && a.n === l.n) hallado = a;
      }
      for (j = 0; j < actuales.length && !hallado; j++) if (actuales[j].t === l.t && actuales[j].n === l.n) hallado = actuales[j];
      if (hallado) out = cambiar(out, hallado, l.q);
    }
    return out;
  }
  // Valor eléctrico de un nombre, en unidades base: «2K2» -> 2200, «470R» -> 470, «4,7pF» -> 4.7e-12, «100uF 16V» -> 1e-4.
  // Toma el primer número que empieza una palabra (así «LM358» o «1N4007» no tienen valor), y sólo de la variante:
  // en «Capacitores electrolíticos <= 100uF — Cap. electro 1uF» el valor es 1uF.
  var MULT = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3, R: 1, k: 1e3, K: 1e3, M: 1e6 };
  var RE_VALOR = /(?:^|[\s\/(—-])(\d+(?:[.,]\d+)?)\s?([pnuµmRkKM]?)(\d*)\s?(?:F|Ω|W|V|A|H|mm)?(?=$|[\s\/,)])/;
  function valor(nombre) {
    var partes = nombre.split(" — "), m = RE_VALOR.exec(partes[partes.length - 1]);
    if (!m) return null;
    var cifras = m[1].replace(",", ".") + (m[3] ? (m[1].indexOf(",") < 0 && m[1].indexOf(".") < 0 ? "." : "") + m[3] : "");
    return parseFloat(cifras) * (m[2] ? MULT[m[2]] : 1);
  }
  // Clase de componente: primeras letras del nombre de la variante («Capacitores cerámicos — Cap. cerámico 10pF» -> «cap»).
  function clase(nombre) {
    var partes = nombre.split(" — ");
    return plano(partes[partes.length - 1]).replace(/[^a-z0-9 ]/g, "").trim().slice(0, 3);
  }
  // Comparación «natural»: los números se comparan como números (DIP8 < DIP14).
  function natural(a, b) {
    var x = plano(a).match(/\d+|\D+/g) || [], y = plano(b).match(/\d+|\D+/g) || [];
    for (var i = 0; i < Math.min(x.length, y.length); i++) {
      if (x[i] === y[i]) continue;
      var nx = /^\d/.test(x[i]), ny = /^\d/.test(y[i]);
      if (nx && ny) return parseInt(x[i], 10) - parseInt(y[i], 10);
      return x[i] < y[i] ? -1 : 1;
    }
    return x.length - y.length;
  }
  // Pedido para mostrar y copiar: kits primero; después los componentes por categoría (en el orden de la
  // lista de precios), por clase y por valor; los que no tienen valor van al final de su clase, por nombre.
  function ordenar(pedido, datos) {
    var cat = {}, rango = {};
    datos.componentes.forEach(function (c) {
      cat[c.id] = c.c;
      if (!(c.c in rango)) rango[c.c] = Object.keys(rango).length;
    });
    function clave(l) {
      var c = l.t === "k" ? -1 : (l.id in cat ? rango[cat[l.id]] : 1e9);
      return { c: c, k: l.t === "k" ? "" : clase(l.n), v: l.t === "k" ? null : valor(l.n), n: l.n };
    }
    return pedido.map(function (l) { return { l: l, k: clave(l) }; }).sort(function (a, b) {
      var x = a.k, y = b.k;
      if (x.c !== y.c) return x.c - y.c;
      if (x.k !== y.k) return x.k < y.k ? -1 : 1;
      if ((x.v === null) !== (y.v === null)) return x.v === null ? 1 : -1;
      if (x.v !== null && x.v !== y.v) return x.v - y.v;
      return natural(x.n, y.n);
    }).map(function (e) { return e.l; });
  }
  // normaliza para buscar: sin acentos y en minúsculas
  function plano(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function coincide(texto, busqueda) {
    var partes = plano(busqueda).split(/\s+/).filter(Boolean), t = plano(texto);
    for (var i = 0; i < partes.length; i++) if (t.indexOf(partes[i]) < 0) return false;
    return true;
  }
  return { dinero: dinero, cantidad: cantidad, renglonKit: renglonKit, cambiar: cambiar, fijar: fijar, cantidadDe: cantidadDe,
           total: total, texto: texto, coincide: coincide, actualizar: actualizar,
           valor: valor, ordenar: ordenar };
})();
if (typeof module !== "undefined") module.exports = Calculo;
