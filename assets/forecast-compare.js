/* Forecast comparator (www, 24/10/2026): persistence, cyclic persistence, BLEND, AR-OLS and ridge ELM on public Palaiseau PV data.
   All numbers come from forecast-compare.json, computed by the validated PV_ELM_pred code (work/forecast_compare/make_forecast_compare.py);
   this script only displays them. Plain SVG, no library. */
(function () {
  "use strict";
  var box = document.getElementById("fc");
  if (!box || !window.fetch) return;
  var fr = box.getAttribute("data-lang") === "fr";
  var L = fr ? {
    h: "Horizon", show: "Modèles affichés", metric: "Métrique", scope: "Cibles", day: "de jour", all: "jour et nuit",
    m1: "Erreur selon l'horizon", m2: "Prévisions et observation sur quatre jours, à l'horizon choisi", obs: "observation",
    names: { P: "persistance", Pc: "persistance cyclique (24 h avant)", BLEND: "BLEND", AR: "autorégression AR (24 h de retards)", ELM: "ELM ridge" },
    best: "Meilleur modèle à cet horizon : ", vs: " NICE < 1 : meilleur que la persistance simple.", min: "min", kw: "kW", step: "pas de 30 min dans la fenêtre",
    table: ["Modèle", "RMSE (kW)", "nRMSE", "nMAE", "NICE₁", "NICE₂", "NICE₃"]
  } : {
    h: "Horizon", show: "Models shown", metric: "Metric", scope: "Targets", day: "daytime", all: "day and night",
    m1: "Error against horizon", m2: "Forecasts and observation over four days, at the chosen horizon", obs: "observation",
    names: { P: "persistence", Pc: "cyclic persistence (24 h before)", BLEND: "BLEND", AR: "autoregression AR (24 h of lags)", ELM: "ridge ELM" },
    best: "Best model at this horizon: ", vs: " NICE < 1: better than simple persistence.", min: "min", kw: "kW", step: "30-min step in the window",
    table: ["Model", "RMSE (kW)", "nRMSE", "nMAE", "NICE₁", "NICE₂", "NICE₃"]
  };
  var COL = { P: "#ad5200", Pc: "#8a96a3", BLEND: "#b07d12", AR: "#7a5aa6", ELM: "#07569a" };
  var METRICS = [["NICE2", "NICE₂"], ["NICE1", "NICE₁"], ["NICE3", "NICE₃"], ["nRMSE", "nRMSE"], ["nMAE", "nMAE"], ["RMSE", "RMSE (kW)"]];
  var D = null, NS = "http://www.w3.org/2000/svg";
  function f(v, n) { var s = v.toFixed(n); return fr ? s.replace(".", ",") : s; }
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function path(pts) { return pts.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); }

  function ui() {
    var hs = D.horizons;
    box.innerHTML =
      '<div class="fc-ctl"><label class="fc-h"><span>' + L.h + ' <output></output></span><input type="range" min="0" max="' + (hs.length - 1) + '" value="1" step="1"></label>' +
      '<label><span>' + L.metric + '</span><select class="fc-m">' + METRICS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + "</option>"; }).join("") + "</select></label>" +
      '<label><span>' + L.scope + '</span><select class="fc-s"><option value="day">' + L.day + '</option><option value="all">' + L.all + "</option></select></label></div>" +
      '<fieldset class="fc-mods"><legend>' + L.show + "</legend>" + D.models.map(function (m) {
        return '<label><input type="checkbox" value="' + m + '"' + (m === "P" || m === "AR" || m === "ELM" ? " checked" : "") + '> <i style="background:' + COL[m] + '"></i>' + L.names[m] + "</label>";
      }).join("") + "</fieldset>" +
      '<h3>' + L.m1 + '</h3><svg class="fc-svg fc-1" viewBox="0 0 640 260" role="img" aria-label="' + L.m1 + '"></svg>' +
      '<p class="fc-out" aria-live="polite"></p>' +
      '<h3>' + L.m2 + '</h3><svg class="fc-svg fc-2" viewBox="0 0 640 240" role="img" aria-label="' + L.m2 + '"></svg>' +
      '<div class="fc-tw"><table class="fc-t"></table></div>';
    box.addEventListener("input", draw); box.addEventListener("change", draw); draw();
  }
  function shown() { return [].slice.call(box.querySelectorAll(".fc-mods input:checked")).map(function (i) { return i.value; }); }

  function chart1(svg, key, hi, mods) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 640, H = 260, l = 56, r = 12, t = 12, b = 36, hs = D.horizons, vals = [];
    mods.forEach(function (m) { vals = vals.concat(D.metrics[m][key]); });
    var isN = key.indexOf("NICE") === 0, sc = key.indexOf("RMSE_") === 0 ? 1e-3 : 1;
    var y1 = Math.max.apply(null, vals.concat(isN ? [1.05] : [])) * sc * 1.05, y0 = 0;
    var X = function (k) { return l + (W - l - r) * k / (hs.length - 1); }, Y = function (v) { return H - b - (H - t - b) * (v - y0) / (y1 - y0); };
    for (var g = 0; g <= 4; g++) { var v = y0 + (y1 - y0) * g / 4; el("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), "class": "fc-grid" }, svg); el("text", { x: l - 6, y: Y(v) + 4, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = f(v, isN ? 2 : 2); }
    hs.forEach(function (h, k) { if (k % 2 === 1 || k === 0) el("text", { x: X(k), y: H - b + 16, "text-anchor": "middle", "class": "fc-ax" }, svg).textContent = (h * 30 >= 60 ? f(h * 0.5, 1) + " h" : h * 30 + " " + L.min); });
    if (isN) { el("line", { x1: l, x2: W - r, y1: Y(1), y2: Y(1), "class": "fc-one" }, svg); el("text", { x: W - r, y: Y(1) - 4, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = fr ? "= persistance" : "= persistence"; }
    el("line", { x1: X(hi), x2: X(hi), y1: t, y2: H - b, "class": "fc-now" }, svg);
    mods.forEach(function (m) {
      var pts = D.metrics[m][key].map(function (v, k) { return [X(k), Y(v * sc)]; });
      el("path", { d: path(pts), stroke: COL[m], "class": "fc-line" }, svg);
      el("circle", { cx: X(hi), cy: Y(D.metrics[m][key][hi] * sc), r: 4.5, fill: COL[m] }, svg);
    });
  }
  function chart2(svg, hi, mods) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 640, H = 240, l = 46, r = 12, t = 10, b = 30, w = D.window[String(D.horizons[hi])], n = w.obs.length, top = D.pmax * 1.05;
    var X = function (k) { return l + (W - l - r) * k / (n - 1); }, Y = function (v) { return H - b - (H - t - b) * v / top; };
    for (var g = 0; g <= 4; g++) { var v = top * g / 4; el("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), "class": "fc-grid" }, svg); el("text", { x: l - 6, y: Y(v) + 4, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = f(v / 1000, 0); }
    el("text", { x: 12, y: t + 8, "class": "fc-ax" }, svg).textContent = L.kw;
    for (var d = 0; d <= 4; d++) el("text", { x: X(Math.min(n - 1, d * 48)), y: H - 10, "text-anchor": "middle", "class": "fc-ax" }, svg).textContent = (fr ? "jour " : "day ") + (d + 1);
    el("path", { d: path(w.obs.map(function (v, k) { return [X(k), Y(v)]; })), "class": "fc-obs" }, svg);
    mods.forEach(function (m) { el("path", { d: path(w[m].map(function (v, k) { return [X(k), Y(v)]; })), stroke: COL[m], "class": "fc-line fc-thin" }, svg); });
  }
  function draw() {
    var hi = +box.querySelector(".fc-h input").value, h = D.horizons[hi], key = box.querySelector(".fc-m").value + "_" + box.querySelector(".fc-s").value, mods = shown();
    box.querySelector(".fc-h output").textContent = h * 30 >= 60 ? f(h * 0.5, 1) + " h" : h * 30 + " " + L.min;
    chart1(box.querySelector(".fc-1"), key, hi, mods); chart2(box.querySelector(".fc-2"), hi, mods);
    var sc = box.querySelector(".fc-s").value, best = D.models.slice().sort(function (a, b) { return D.metrics[a]["RMSE_" + sc][hi] - D.metrics[b]["RMSE_" + sc][hi]; })[0];
    box.querySelector(".fc-out").innerHTML = L.best + "<b>" + L.names[best] + "</b> (RMSE " + f(D.metrics[best]["RMSE_" + sc][hi] / 1000, 3) + " " + L.kw + ", NICE₂ " + f(D.metrics[best]["NICE2_" + sc][hi], 3) + ")." + L.vs;
    var rows = D.models.map(function (m) {
      var g = function (k, n, s) { return f(D.metrics[m][k + "_" + sc][hi] * (s || 1), n); };
      return "<tr" + (m === best ? ' class="fc-best"' : "") + '><th scope="row"><i style="background:' + COL[m] + '"></i>' + L.names[m] + "</th><td>" + g("RMSE", 3, 1e-3) + "</td><td>" + g("nRMSE", 3) + "</td><td>" + g("nMAE", 3) + "</td><td>" + g("NICE1", 3) + "</td><td>" + g("NICE2", 3) + "</td><td>" + g("NICE3", 3) + "</td></tr>";
    }).join("");
    box.querySelector(".fc-t").innerHTML = "<thead><tr>" + L.table.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody>";
  }
  fetch(box.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (j) { D = j; ui(); }).catch(function () { box.textContent = fr ? "Données indisponibles." : "Data unavailable."; });
})();
