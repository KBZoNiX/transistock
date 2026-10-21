// Lógica del pedido, sin tocar el DOM (así se puede probar aparte).
var Calculo = (function () {
  function dinero(n) {
    return "$ " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function cantidad(n) {
    return String(Math.round(n * 100) / 100).replace(".", ",");
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
  function texto(pedido, actualizado) {
    var l = ["Pedido de componentes – ESETP 703"];
    for (var i = 0; i < pedido.length; i++) {
      var x = pedido[i];
      l.push(cantidad(x.q) + " × " + x.n + " – " + dinero(x.p * x.q));
    }
    l.push("TOTAL: " + dinero(total(pedido)));
    l.push("(precios al " + actualizado + ", sujetos a cambio)");
    return l.join("\n");
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
  return { dinero: dinero, cantidad: cantidad, cambiar: cambiar, fijar: fijar, cantidadDe: cantidadDe,
           total: total, texto: texto, coincide: coincide };
})();
if (typeof module !== "undefined") module.exports = Calculo;
