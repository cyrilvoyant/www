/* Interactive tools of the open courses (www, 24/10/2026): ROC curve, normal law table, attenuation.
   Plain SVG + JS, no library. The formulas are those of the chapters; window.CT exposes the maths for the test page.
   ROC: binormal model, healthy ~ N(0,1), sick ~ N(d,1); Se = 1 - Φ(s - d), Sp = Φ(s), AUC = Φ(d/√2); VPP/VPN by Bayes.
   Normal: Φ by the Cody-type rational erf (error < 1.2e-7), inverse by Acklam's algorithm refined by one Newton step.
   Attenuation: N/N0 = exp(-μx) = 2^(-x/CDA). */
(function () {
  "use strict";
  var CT = window.CT = {};
  function erf(x) {                    // W. J. Cody-type rational approximation via erfc (Numerical Recipes erfcc), |err| < 1.2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
            t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? 1 - r : r - 1;
  }
  var Phi = CT.Phi = function (z) { return 0.5 * (1 + erf(z / Math.SQRT2)); };
  CT.phi = function (z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); };
  CT.invPhi = function (p) {           // Acklam + one Newton step
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239],
        b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
        c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
        d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    return x - (Phi(x) - p) / CT.phi(x);
  };
  CT.roc = function (d, s, prev) {
    var se = 1 - Phi(s - d), sp = Phi(s);
    return { se: se, sp: sp, auc: Phi(d / Math.SQRT2),
             vpp: se * prev / (se * prev + (1 - sp) * (1 - prev)), vpn: sp * (1 - prev) / (sp * (1 - prev) + (1 - se) * prev) };
  };
  CT.atten = function (mu, x) { return Math.exp(-mu * x); };

  var NS = "http://www.w3.org/2000/svg";
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function h(t, a, html) { var e = document.createElement(t); for (var k in a) e.setAttribute(k, a[k]); if (html != null) e.innerHTML = html; return e; }
  function f(v, n) { return v.toFixed(n === undefined ? 2 : n).replace(".", ","); }
  function pct(v) { return (100 * v).toFixed(1).replace(".", ",") + " %"; }
  function slider(lab, min, max, step, val, fmt) {
    var w = h("label", { "class": "ct-sl" }), s = h("span", {}, lab), i = h("input", { type: "range", min: min, max: max, step: step, value: val }), o = h("output", {});
    w.appendChild(s); w.appendChild(i); w.appendChild(o);
    var upd = function () { o.textContent = fmt(+i.value); }; i.addEventListener("input", upd); upd();
    return { w: w, i: i };
  }
  function path(pts) { return pts.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); }

  /* ROC: two distributions, a threshold, the ROC curve with the current point, Se/Sp/VPP/VPN at a prevalence */
  function roc(box) {
    box.appendChild(h("h3", {}, "Courbe ROC : déplacez le seuil"));
    box.appendChild(h("p", { "class": "muted" }, "Résultats du test chez les non-malades N(0, 1) et chez les malades N(d, 1). Le seuil classe positif tout résultat au-dessus ; la prévalence change les valeurs prédictives, pas la courbe."));
    var g = h("div", { "class": "ct-grid" }); box.appendChild(g);
    var W = 300, H = 170, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": "Distributions des résultats et seuil" }, g);
    var R = 170, sr = el("svg", { viewBox: "0 0 " + R + " " + R, "class": "ct-svg ct-sq", role: "img", "aria-label": "Courbe ROC" }, g);
    var cD = slider("Séparation d", 0, 4, 0.05, 1.8, function (v) { return f(v); }),
        cS = slider("Seuil s", -3, 6, 0.05, 1, function (v) { return f(v); }),
        cP = slider("Prévalence", 0.001, 0.5, 0.001, 0.1, function (v) { return pct(v); });
    var ctl = h("div", { "class": "ct-ctl" }); [cD, cS, cP].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var X = function (z) { return 10 + (W - 20) * (z + 3.5) / 10; }, Y = function (v) { return H - 18 - (H - 30) * v / 0.42; };
    el("line", { x1: 10, y1: H - 18, x2: W - 10, y2: H - 18, "class": "ct-ax" }, sv);
    var aH = el("path", { "class": "ct-a1" }, sv), aS = el("path", { "class": "ct-a2" }, sv), lH = el("path", { "class": "ct-l1" }, sv), lS = el("path", { "class": "ct-l2" }, sv);
    var th = el("line", { "class": "ct-th", y1: 6, y2: H - 18 }, sv);
    el("text", { x: 14, y: 14, "class": "ct-tx1" }, sv).textContent = "non-malades";
    var tS = el("text", { y: 14, "class": "ct-tx2" }, sv); tS.textContent = "malades";
    var P = function (v) { return 14 + (R - 24) * v; }, Q = function (v) { return R - 14 - (R - 24) * v; };
    el("rect", { x: P(0), y: Q(1), width: P(1) - P(0), height: Q(0) - Q(1), "class": "ct-frame" }, sr);
    el("line", { x1: P(0), y1: Q(0), x2: P(1), y2: Q(1), "class": "ct-diag" }, sr);
    var aR = el("path", { "class": "ct-a2" }, sr), cR = el("path", { "class": "ct-l2" }, sr), pt = el("circle", { r: 4.5, "class": "ct-pt" }, sr);
    el("text", { x: P(0.5), y: R - 2, "class": "ct-axl", "text-anchor": "middle" }, sr).textContent = "1 − Sp";
    el("text", { x: 4, y: Q(0.5), "class": "ct-axl", transform: "rotate(-90 9 " + Q(0.5) + ")", "text-anchor": "middle" }, sr).textContent = "Se";
    function draw() {
      var d = +cD.i.value, s = +cS.i.value, p = +cP.i.value, z, k, A = [], B = [], C = [], D = [];
      for (k = 0; k <= 120; k++) { z = -3.5 + 10 * k / 120; A.push([X(z), Y(CT.phi(z))]); B.push([X(z), Y(CT.phi(z - d))]); }
      lH.setAttribute("d", path(A)); lS.setAttribute("d", path(B));
      for (k = 0; k <= 60; k++) { z = s + (6.5 - s) * k / 60; C.push([X(z), Y(CT.phi(z))]); D.push([X(z), Y(CT.phi(z - d))]); }
      aH.setAttribute("d", path([[X(s), Y(0)]].concat(C, [[X(6.5), Y(0)]])) + "Z");
      aS.setAttribute("d", path([[X(s), Y(0)]].concat(D, [[X(6.5), Y(0)]])) + "Z");
      th.setAttribute("x1", X(s)); th.setAttribute("x2", X(s)); tS.setAttribute("x", Math.min(W - 60, X(d) - 20));
      var E = [[P(0), Q(0)]];
      for (k = 0; k <= 80; k++) { z = 6.5 - 10 * k / 80; E.push([P(1 - Phi(z)), Q(1 - Phi(z - d))]); }
      cR.setAttribute("d", path(E)); aR.setAttribute("d", path(E.concat([[P(1), Q(0)]])) + "Z");
      var r = CT.roc(d, s, p); pt.setAttribute("cx", P(1 - r.sp)); pt.setAttribute("cy", Q(r.se));
      out.innerHTML = "Se = <b>" + pct(r.se) + "</b> · Sp = <b>" + pct(r.sp) + "</b> · AUC = <b>" + f(r.auc, 3) + "</b><br>VPP = <b>" + pct(r.vpp) +
        "</b> · VPN = <b>" + pct(r.vpn) + "</b> pour une prévalence de " + pct(p) + " · indice de Youden Se + Sp − 1 = " + f(r.se + r.sp - 1, 3);
    }
    [cD, cS, cP].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }

  /* Normal law: from z to P(Z < z) and back, with the shaded area; or from x, μ, σ */
  function normal(box) {
    box.appendChild(h("h3", {}, "Table de la loi normale, interactive"));
    box.appendChild(h("p", { "class": "muted" }, "Choisissez une valeur et lisez l'aire, ou choisissez une probabilité et lisez la borne. Tout se fait avec z = (x − μ)/σ."));
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + (H + 12), "class": "ct-svg", role: "img", "aria-label": "Densité de la loi normale et aire" }, box);
    var X = function (z) { return 10 + (W - 20) * (z + 4) / 8; }, Y = function (v) { return H - 20 - (H - 30) * v / 0.4; };
    var ar = el("path", { "class": "ct-a2" }, sv), ln = el("path", { "class": "ct-l2" }, sv);
    el("line", { x1: 10, y1: H - 20, x2: W - 10, y2: H - 20, "class": "ct-ax" }, sv);
    var xl = [];
    for (var t = -3; t <= 3; t++) { el("text", { x: X(t), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = t;
      xl.push(el("text", { x: X(t), y: H + 6, "class": "ct-axl ct-xl", "text-anchor": "middle" }, sv)); }
    el("text", { x: 6, y: H - 8, "class": "ct-axl" }, sv).textContent = "z"; el("text", { x: 6, y: H + 6, "class": "ct-axl ct-xl" }, sv).textContent = "x";
    var A = []; for (var k = 0; k <= 120; k++) { var z0 = -4 + 8 * k / 120; A.push([X(z0), Y(CT.phi(z0))]); } ln.setAttribute("d", path(A));
    var row = h("div", { "class": "ct-ctl ct-num" });
    var mode = h("select", { "aria-label": "Aire cherchée" }, '<option value="lt">P(Z &lt; z)</option><option value="gt">P(Z &gt; z)</option><option value="two">P(−|z| &lt; Z &lt; |z|)</option>');
    var iz = h("input", { type: "number", step: "0.01", value: "1.96", "aria-label": "z" }), ip = h("input", { type: "number", step: "0.0001", min: "0", max: "1", value: "0.975", "aria-label": "probabilité" });
    var im = h("input", { type: "number", step: "any", value: "0", "aria-label": "μ" }), is = h("input", { type: "number", step: "any", min: "0", value: "1", "aria-label": "σ" }), ix = h("input", { type: "number", step: "any", value: "1.96", "aria-label": "x" });
    [["Aire", mode], ["z", iz], ["probabilité", ip], ["x", ix], ["μ", im], ["σ", is]].forEach(function (p) { var l = h("label", {}, "<span>" + p[0] + "</span>"); l.appendChild(p[1]); row.appendChild(l); });
    box.appendChild(row);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    function area(z) {
      var m = mode.value, pts = [], a, b, lo, hi;
      if (m === "lt") { a = -4; b = Math.max(-4, Math.min(4, z)); }
      else if (m === "gt") { a = Math.max(-4, Math.min(4, z)); b = 4; }
      else { a = -Math.min(4, Math.abs(z)); b = -a; }
      for (var k = 0; k <= 60; k++) { var u = a + (b - a) * k / 60; pts.push([X(u), Y(CT.phi(u))]); }
      ar.setAttribute("d", path([[X(a), Y(0)]].concat(pts, [[X(b), Y(0)]])) + "Z");
    }
    function P(z) { var m = mode.value; return m === "lt" ? Phi(z) : m === "gt" ? 1 - Phi(z) : 2 * Phi(Math.abs(z)) - 1; }
    function fromZ() { var z = +iz.value, s = +is.value || 1; ip.value = P(z).toFixed(4); ix.value = (+im.value + z * s).toPrecision(6) * 1; show(z); }
    function fromP() {
      var p = Math.min(0.99999, Math.max(0.00001, +ip.value)), m = mode.value, z = m === "lt" ? CT.invPhi(p) : m === "gt" ? CT.invPhi(1 - p) : CT.invPhi((1 + p) / 2);
      iz.value = z.toFixed(4); ix.value = (+im.value + z * (+is.value || 1)).toPrecision(6) * 1; show(z);
    }
    function fromX() { var z = (+ix.value - +im.value) / (+is.value || 1); iz.value = z.toFixed(4); ip.value = P(z).toFixed(4); show(z); }
    function show(z) {
      area(z); var mu = +im.value, sg = +is.value || 1;
      for (var k = 0; k < xl.length; k++) xl[k].textContent = +(mu + (k - 3) * sg).toPrecision(4);
      out.innerHTML = "x = " + f(+ix.value, 3) + " pour N(" + f(mu, 3) + " ; " + f(sg, 3) + ") → z = (x − μ)/σ = <b>" + f(z, 4) + "</b> · aire = <b>" + f(P(z), 4) + "</b> · densité φ(z) = " + f(CT.phi(z), 4);
    }
    iz.addEventListener("input", fromZ); ip.addEventListener("input", fromP); ix.addEventListener("input", fromX);
    // μ and σ describe the population: the measured value x stays, z and the area follow
    im.addEventListener("input", fromX); is.addEventListener("input", fromX); mode.addEventListener("change", fromZ); fromZ();
  }

  /* Attenuation: a beam crossing a slab, N/N0, the CDA, 1000 photons */
  function atten(box) {
    box.appendChild(h("h3", {}, "Atténuation d'un faisceau : la couche de demi-atténuation"));
    box.appendChild(h("p", { "class": "muted" }, "N(x) = N₀ e<sup>−μx</sup> = N₀ / 2<sup>x/CDA</sup>. Sur mille photons qui entrent, combien sortent ?"));
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": "Courbe d'atténuation et épaisseur traversée" }, box);
    var cC = slider("CDA (cm)", 0.1, 10, 0.1, 2, function (v) { return f(v, 1) + " cm"; }),
        cX = slider("Épaisseur x (cm)", 0, 30, 0.1, 6, function (v) { return f(v, 1) + " cm"; });
    var ctl = h("div", { "class": "ct-ctl" }); ctl.appendChild(cC.w); ctl.appendChild(cX.w); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var X = function (x) { return 34 + (W - 44) * x / 30; }, Y = function (v) { return 10 + (H - 34) * (1 - v); };
    el("line", { x1: 34, y1: Y(0), x2: W - 10, y2: Y(0), "class": "ct-ax" }, sv); el("line", { x1: 34, y1: Y(0), x2: 34, y2: Y(1), "class": "ct-ax" }, sv);
    [0, 0.5, 1].forEach(function (v) { el("text", { x: 28, y: Y(v) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = f(v, 1); });
    [0, 10, 20, 30].forEach(function (v) { el("text", { x: X(v), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = v + " cm"; });
    var slab = el("rect", { y: Y(1), height: Y(0) - Y(1), x: X(0), "class": "ct-slab" }, sv), cur = el("path", { "class": "ct-l2" }, sv), pt = el("circle", { r: 4.5, "class": "ct-pt" }, sv);
    var ticks = el("g", {}, sv);
    var dots = h("div", { "class": "ct-dots", "aria-hidden": "true" }); box.appendChild(dots);
    for (var k = 0; k < 1000; k++) dots.appendChild(h("i", {}));
    function draw() {
      var c = +cC.i.value, x = +cX.i.value, mu = Math.LN2 / c, A = [], k;
      for (k = 0; k <= 120; k++) { var u = 30 * k / 120; A.push([X(u), Y(CT.atten(mu, u))]); }
      cur.setAttribute("d", path(A)); slab.setAttribute("width", X(x) - X(0));
      var r = CT.atten(mu, x); pt.setAttribute("cx", X(x)); pt.setAttribute("cy", Y(r));
      while (ticks.firstChild) ticks.removeChild(ticks.firstChild);
      for (k = 1; k * c <= 30 && k <= 12; k++) el("line", { x1: X(k * c), x2: X(k * c), y1: Y(0), y2: Y(0) + 5, "class": "ct-ax" }, ticks);
      var n = Math.round(1000 * r), ds = dots.children;
      for (k = 0; k < 1000; k++) ds[k].className = k < n ? "on" : "";
      out.innerHTML = "μ = ln 2 / CDA = <b>" + f(mu, 3) + " cm⁻¹</b> · x = " + f(x / c, 2) + " CDA · N/N₀ = <b>" + (r < 0.001 ? r.toExponential(2).replace(".", ",") : f(r, 4)) +
        "</b> · sur 1000 photons, <b>" + n + "</b> sortent" + (x / c >= 9.95 ? " (10 CDA ≈ 1 sur 1000)" : "");
    }
    [cC, cX].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }

  var T = { roc: roc, normal: normal, atten: atten };
  function init() {
    var bs = document.querySelectorAll(".ctool[data-tool]");
    for (var i = 0; i < bs.length; i++) { var b = bs[i], fn = T[b.getAttribute("data-tool")]; if (fn && !b.childNodes.length) fn(b); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
