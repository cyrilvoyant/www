/* Interactive tools of cyrilvoyant.github.io (L6, 23 October 2026). No dependency, no data sent anywhere.
   Each function reproduces a reference code and is checked against values that code produced: /tools/js-tests.html.
     bedLQ, bedLQL        LQL-Equiv-web, lqlequiv.model._lql_dose_term (one fraction a day, before proliferation)
     thyroidTg            CTD_SIMU_RAI, Demonstrateur98f.m / Demonstrateur666f.m (RAIR-Sim demonstrators)
     nice                 nice-metrics, nice_metrics.m
     blendLS              cyclostationary-forecasting-matlab, predict_P_BLEND_LS.m
     scv, forecastability solar-variability-scv, scv.m and forecastability.m
   Widgets: <div class="cvt" data-tool="lql|thyroid|nice|blend|scv"></div>, mounted on load. */
(function () {
  "use strict";
  var CVT = {};

  // ---------------------------------------------------------------- radiobiology: BED under LQ and LQL
  CVT.bedLQ = function (n, d, ab) { return n * d * (1 + d / ab); };
  CVT.bedLQL = function (n, d, ab, dt, g) {      // Astrahan's linear tail above the transition dose dt; g = gamma/alpha
    return n * (d >= dt ? dt * (1 + dt / ab) + g * (d - dt) : d * (1 + d / ab));
  };

  // ---------------------------------------------------------------- thyroid: A, N, Tg over successive RAI sessions
  // dA/dt = -a ln2 A ; dN/dt = N (ln2/Td - r0 A) ; dTg/dt = lambda N - ke Tg   (time in months)
  // A and N have closed forms within a session; Tg is integrated with RK4 (step h months).
  CVT.thyroidTg = function (o) {
    var Td = o.Td, n = o.sessions, lag = o.lag, D = o.activity, tEnd = o.tEnd || 80, h = o.h || 0.002;
    var r0 = 0.00407, a = 0.0169, lam = 3.86e-9, ke = 0.319, k = a * Math.LN2;
    var N0 = 1.12e9, Tg0 = 100, A0 = 0, out = [], grid = o.grid || null;
    function Aof(A, t) { return A * Math.exp(-k * t); }
    function Nof(Ni, Ai, t) { return Ni * Math.exp(t * Math.LN2 / Td - r0 * Ai * (1 - Math.exp(-k * t)) / k); }
    var tAbs = 0;
    for (var i = 1; i <= n; i++) {
      var Ai = D + A0, Ni = N0, tg = Tg0, len = (i === n) ? tEnd - (i - 1) * lag : lag, steps = Math.round(len / h), hh = len / steps;
      var f = function (t, y) { return lam * Nof(Ni, Ai, t) - ke * y; };
      out.push([tAbs, tg]);
      for (var s = 0; s < steps; s++) {
        var t = s * hh;
        var k1 = f(t, tg), k2 = f(t + hh / 2, tg + hh * k1 / 2), k3 = f(t + hh / 2, tg + hh * k2 / 2), k4 = f(t + hh, tg + hh * k3);
        tg += hh * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
        out.push([tAbs + t + hh, tg]);
      }
      if (i < n) { N0 = Nof(Ni, Ai, lag); A0 = Aof(Ai, lag); Tg0 = tg; tAbs += lag; }
    }
    if (!grid) return out;
    return grid.map(function (g) {           // value at each requested time (first point at or after g)
      for (var j = 0; j < out.length; j++) if (out[j][0] >= g - 1e-9) return out[j][1];
      return out[out.length - 1][1];
    });
  };

  // ---------------------------------------------------------------- NICE^k against a reference forecast
  CVT.nice = function (y, yhat, yref, w) {
    w = w || [1 / 3, 1 / 3, 1 / 3];
    if (!yref) { yref = [NaN].concat(y.slice(0, -1)); }
    var e = [], r = [];
    for (var i = 0; i < y.length; i++) {
      if (isFinite(y[i]) && isFinite(yhat[i]) && isFinite(yref[i])) { e.push(y[i] - yhat[i]); r.push(y[i] - yref[i]); }
    }
    var m = { n: e.length };
    for (var k = 1; k <= 3; k++) {
      var se = 0, sr = 0;
      for (var j = 0; j < e.length; j++) { se += Math.pow(Math.abs(e[j]), k); sr += Math.pow(Math.abs(r[j]), k); }
      m["E" + k + "_model"] = Math.pow(se / e.length, 1 / k);
      m["E" + k + "_ref"] = Math.pow(sr / r.length, 1 / k);
      m["NICE" + k] = m["E" + k + "_model"] / m["E" + k + "_ref"];
    }
    m.NICE_Sigma = w[0] * m.NICE1 + w[1] * m.NICE2 + w[2] * m.NICE3;
    return m;
  };

  // ---------------------------------------------------------------- BLEND, one least-squares weight per phase
  // x_hat(t+h) = (1 - lambda) x(t+h-T) + lambda x(t), lambda clipped to [0,1], fitted on the whole series (1-based phases)
  CVT.blendLS = function (x, T, h) {
    var N = x.length, num = new Array(T).fill(0), den = new Array(T).fill(0), lam = new Array(T).fill(0);
    for (var t = T + 1; t <= N - h; t++) {                 // 1-based origins, as in the MATLAB code
      var ph = (t - 1) % T, y = x[t + h - 1], r = x[t - 1], c = x[t + h - T - 1];
      num[ph] += (y - c) * (r - c); den[ph] += (r - c) * (r - c);
    }
    for (var p = 0; p < T; p++) lam[p] = den[p] > 0 ? Math.max(0, Math.min(1, num[p] / den[p])) : 0;
    var pred = [], obs = [], se = 0;
    for (t = T + 1; t <= N - h; t++) {
      var l = lam[(t - 1) % T], v = (1 - l) * x[t + h - T - 1] + l * x[t - 1];
      pred.push(v); obs.push(x[t + h - 1]); se += Math.pow(x[t + h - 1] - v, 2);
    }
    return { lambda: lam, pred: pred, obs: obs, rmse: Math.sqrt(se / pred.length) };
  };

  // ---------------------------------------------------------------- sCV and forecastability F
  CVT.scv = function (I, Ic, d) {
    d = (d === undefined) ? 0.2 : d;
    var s2 = 0, c2 = 0, n = 0;
    for (var i = 0; i < I.length; i++) if (isFinite(I[i]) && isFinite(Ic[i])) { s2 += Math.pow(I[i] - Ic[i], 2); c2 += Ic[i] * Ic[i]; n++; }
    return Math.SQRT2 / Math.abs(d - 1) * Math.sqrt(s2 / n) / Math.sqrt(c2 / n);
  };
  function pearson(a, b) {
    if (a.length < 3) return NaN;
    var ma = 0, mb = 0, i;
    for (i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
    ma /= a.length; mb /= b.length;
    var sab = 0, saa = 0, sbb = 0;
    for (i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) * (a[i] - ma); sbb += (b[i] - mb) * (b[i] - mb); }
    var den = Math.sqrt(saa * sbb);
    return den === 0 ? NaN : sab / den;
  }
  CVT.forecastability = function (I, Ic, T, n, d) {
    var s = CVT.scv(I, Ic, d), e = I.map(function (v, i) { return v - Ic[i]; });
    if (s === 0) return { F: 1, scv: 0, rho_max: NaN, lag: NaN };
    var best = -1, lagBest = NaN;
    for (var L = n; L <= Math.floor(T / 2); L++) {
      var a = [], b = [];
      for (var i = 0; i + L < e.length; i++) if (isFinite(e[i]) && isFinite(e[i + L])) { a.push(e[i]); b.push(e[i + L]); }
      var r = Math.abs(pearson(a, b));
      if (isFinite(r) && r > best) { best = r; lagBest = L; }
    }
    return { F: 1 + s * (best - 1), scv: s, rho_max: best, lag: lagBest };
  };

  // ---------------------------------------------------------------- small helpers for the widgets
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function fmt(v, p) { return (isFinite(v) ? v.toFixed(p === undefined ? 3 : p) : "indéfini"); }
  function parseCols(text) {            // one row per line, columns separated by spaces, tabs, commas or semicolons
    var rows = text.trim().split(/\r?\n/).map(function (l) { return l.trim().split(/[\s,;]+/).map(Number); });
    return rows.filter(function (r) { return r.length && r.every(function (v) { return !isNaN(v); }); });
  }
  function slider(label, id, min, max, step, val, unit) {
    return '<label class="cvt-row" for="' + id + '"><span>' + label + '</span><input type="range" id="' + id + '" min="' + min + '" max="' + max +
      '" step="' + step + '" value="' + val + '"><output for="' + id + '" id="' + id + '-o">' + val + '</output> ' + (unit || "") + "</label>";
  }
  function num(label, id, val, step) {
    return '<label class="cvt-num" for="' + id + '"><span>' + label + '</span><input type="number" id="' + id + '" value="' + val + '" step="' + (step || "any") + '"></label>';
  }
  function niceStep(span) {             // 1, 2 or 5 times a power of ten, about 4 steps over the span
    var raw = span / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function lineChart(series, opt) {     // series: [{pts:[[x,y]], color, label, dash}]
    var W = 640, H = 300, L = 70, R = 14, Tm = 14, B = 42, xs = [], ys = [];
    series.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    var x0 = opt.xmin !== undefined ? opt.xmin : Math.min.apply(null, xs), x1 = opt.xmax !== undefined ? opt.xmax : Math.max.apply(null, xs);
    var y0 = opt.ymin !== undefined ? opt.ymin : Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys) * 1.05 || 1;
    if (opt.ymax !== undefined) y1 = opt.ymax;
    function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
    function Y(v) { return H - B - (Math.min(v, y1) - y0) / (y1 - y0) * (H - Tm - B); }
    var g = '<svg viewBox="0 0 ' + W + " " + H + '" class="cvt-chart" role="img" aria-label="' + (opt.aria || "") + '">';
    var sy = niceStep(y1 - y0), sx = niceStep(x1 - x0), v;
    for (v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grid"/>';
      g += '<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (+v.toPrecision(6)) + "</text>";
    }
    for (v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) {
      g += '<text x="' + X(v) + '" y="' + (H - B + 17) + '" text-anchor="middle">' + (+v.toPrecision(6)) + "</text>";
    }
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="#9fb0c0"/>';
    g += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="ax">' + opt.xlabel + "</text>";
    g += '<text transform="translate(14 ' + ((Tm + H - B) / 2) + ') rotate(-90)" text-anchor="middle" class="ax">' + opt.ylabel + "</text>";
    series.forEach(function (s) {
      if (s.marker) { g += '<circle cx="' + X(s.pts[0][0]) + '" cy="' + Y(s.pts[0][1]) + '" r="5" fill="' + s.color + '"/>'; return; }
      var d = s.pts.map(function (p, j) { return (j ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join(" ");
      g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2"' + (s.dash ? ' stroke-dasharray="5 4"' : "") + "/>";
    });
    g += "</svg>";
    var leg = '<p class="cvt-legend">' + series.filter(function (s) { return s.label; }).map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + s.label + "</span>"; }).join("") + "</p>";
    return leg + g;
  }
  var TESTS = '<p class="cvt-note">Comparaison au code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">page de vérification</a>. Les calculs restent dans votre navigateur ; les valeurs saisies ne sont pas envoyées.</p>';

  // ---------------------------------------------------------------- widget: LQ / LQL dose slider
  function mountLQL(box) {
    box.innerHTML = '<div class="cvt-grid">' + slider("Dose par fraction d", "lq-d", 0.5, 25, 0.1, 15, "Gy") + slider("Nombre de fractions n", "lq-n", 1, 40, 1, 1) +
      '</div><div class="cvt-grid">' + num("α/β (Gy)", "lq-ab", 3.9) + num("Dose de transition d<sub>T</sub> (Gy)", "lq-dt", 7.8) + num("γ/α (pente sans unité)", "lq-g", 5) +
      '</div><p class="cvt-hint">Valeurs initiales : rectum dans LQL-Equiv (α/β = 3.9 Gy, d<sub>T</sub> = 7.8 Gy, γ/α = 5). BED avant prolifération, une fraction par jour.</p>' +
      '<div class="cvt-out" aria-live="polite"></div><div class="cvt-plot"></div>' + TESTS;
    function upd() {
      var d = +box.querySelector("#lq-d").value, n = +box.querySelector("#lq-n").value, ab = +box.querySelector("#lq-ab").value,
          dt = +box.querySelector("#lq-dt").value, g = +box.querySelector("#lq-g").value;
      box.querySelector("#lq-d-o").textContent = d.toFixed(1); box.querySelector("#lq-n-o").textContent = n;
      var lq = CVT.bedLQ(n, d, ab), lql = CVT.bedLQL(n, d, ab, dt, g);
      box.querySelector(".cvt-out").innerHTML = "<p><strong>" + n + " × " + d.toFixed(1) + " Gy</strong>: BED<sub>LQ</sub> = <strong>" + fmt(lq, 1) +
        " Gy</strong>, BED<sub>LQL</sub> = <strong>" + fmt(lql, 1) + " Gy</strong>" + (d > dt ? " (LQ donne une valeur supérieure de " + fmt(100 * (lq / lql - 1), 0) + " %)" : " (identiques sous d<sub>T</sub>)") + ".</p>";
      var a = [], b = [];
      for (var x = 0.5; x <= 25.001; x += 0.25) { a.push([x, CVT.bedLQ(n, x, ab)]); b.push([x, CVT.bedLQL(n, x, ab, dt, g)]); }
      box.querySelector(".cvt-plot").innerHTML = lineChart([{ pts: a, color: "#b4513a", label: "LQ" }, { pts: b, color: "#07569a", label: "LQL" },
        { pts: [[d, lql]], color: "#07569a", marker: true }], { xlabel: "dose par fraction (Gy)", ylabel: "BED (Gy)", xmin: 0, xmax: 25, aria: "BED selon la dose par fraction, modèles LQ et LQL" });
    }
    box.addEventListener("input", upd); upd();
  }

  // ---------------------------------------------------------------- widget: thyroid protocol explorer
  function mountThyroid(box) {
    box.innerHTML = '<div class="cvt-grid"><label class="cvt-row" for="th-p"><span>Profil du modèle</span><select id="th-p"><option value="9.8">réfractaire (T<sub>d</sub> = 9,8 mois)</option>' +
      '<option value="66.6">répondeur (T<sub>d</sub> = 66,6 mois)</option></select></label>' + slider("Séances", "th-n", 1, 8, 1, 4) +
      slider("Mois entre les séances", "th-l", 1, 8, 1, 3) + slider("Activité par séance", "th-a", 1, 8, 0.1, 3.7, "GBq") +
      '</div><div class="cvt-out" aria-live="polite"></div><div class="cvt-plot"></div>' +
      '<p class="cvt-hint">Paramètres des démonstrateurs publics RAIR-Sim (Fusella Giuntini et coll.). Sorties du modèle pour deux profils types ; aucune prédiction individuelle pour un patient.</p>' + TESTS;
    function upd() {
      var Td = +box.querySelector("#th-p").value, n = +box.querySelector("#th-n").value, l = +box.querySelector("#th-l").value, A = +box.querySelector("#th-a").value;
      box.querySelector("#th-n-o").textContent = n; box.querySelector("#th-l-o").textContent = l; box.querySelector("#th-a-o").textContent = A.toFixed(1);
      var pts = CVT.thyroidTg({ Td: Td, sessions: n, lag: l, activity: A, h: 0.01 }), last = pts[pts.length - 1][1];
      var peak = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
      box.querySelector(".cvt-out").innerHTML = "<p>Thyroglobuline après 80 mois : <strong>" + fmt(last, 1) + " ng/mL</strong> (valeur initiale de 100 ng/mL, comme dans les simulations de l’article). " +
        (Td < 30 ? "Profil réfractaire de l’article (27,5 % de la cohorte) : la thyroglobuline diminue d’abord puis remonte, sauf intensification du protocole simulé."
                 : "Profil répondeur de l’article (72,5 % de la cohorte) : la thyroglobuline diminue progressivement ; le modèle explore l’activité minimale efficace.") + "</p>";
      var thin = pts.filter(function (p, i) { return i % 20 === 0; });
      box.querySelector(".cvt-plot").innerHTML = lineChart([{ pts: thin, color: "#b4513a", label: "Tg (ng/mL)" }],
        { xlabel: "mois", ylabel: "thyroglobuline (ng/mL)", xmin: 0, xmax: 80, ymin: 0, ymax: Math.max(110, peak * 1.05), aria: "Thyroglobuline sur 80 mois" });
    }
    box.addEventListener("input", upd); upd();
  }

  // ---------------------------------------------------------------- data widgets (NICE, BLEND, sCV/F): demo data or pasted columns
  function demo() {                  // 20 synthetic days, hourly: clear sky, cloudy signal, a forecast (deterministic generator)
    var T = 24, N = 20 * T, s = 7, cs = [], x = [], f = [];
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var c = 1;
    for (var t = 1; t <= N; t++) {
      var k = Math.max(0, 1000 * Math.sin(2 * Math.PI * t / T)); c = 0.8 * c + 0.2 * (0.25 + 0.85 * rnd());
      cs.push(+k.toFixed(1)); x.push(+(k * Math.min(1, c)).toFixed(1));
    }
    for (t = 0; t < N; t++) f.push(+Math.max(0, 0.6 * (t ? x[t - 1] : x[0]) + 0.4 * cs[t] * 0.8).toFixed(1));
    return { T: T, cs: cs, x: x, f: f };
  }
  function dataBox(id, cols, hint) {
    var d = demo(), rows = d.x.map(function (v, i) { return cols.map(function (c) { return d[c][i]; }).join("\t"); }).join("\n");
    return '<label class="cvt-data" for="' + id + '"><span>' + hint + '</span><textarea id="' + id + '" rows="6" spellcheck="false">' + rows + "</textarea></label>";
  }
  function mountNICE(box) {
    box.innerHTML = dataBox("ni-d", ["x", "f"], "Deux colonnes : observation y(t), prévision de y(t) émise n pas auparavant (une ligne par pas de temps). Exemple chargé (n = 1) ; vous pouvez coller vos données.") +
      '<div class="cvt-grid">' + num("Horizon de prévision n (pas)", "ni-n", 1, 1) + "</div>" +
      '<p class="cvt-hint">La référence reste la persistance simple : l’observation n pas auparavant, ŷ(t) = y(t − nΔt) (équations 2 et 11 de l’article).</p>' +
      '<div class="cvt-out" aria-live="polite"></div>' + TESTS;
    var ta = box.querySelector("#ni-d"), demoText = ta.value, demoLag = 1;
    function demoFor(n) {          // demo forecast issued n steps ahead: it may only use observations up to t - n
      var d = demo();
      return d.x.map(function (v, t) { return v + "\t" + (+Math.max(0, 0.6 * d.x[Math.max(0, t - n)] + 0.32 * d.cs[t]).toFixed(1)); }).join("\n");
    }
    function upd() {
      var lag = Math.max(1, Math.round(+box.querySelector("#ni-n").value || 1));
      if (ta.value === demoText && lag !== demoLag) { demoText = ta.value = demoFor(lag); demoLag = lag; }
      var rows = parseCols(ta.value), y = rows.map(function (r) { return r[0]; }), f = rows.map(function (r) { return r[1]; });
      var ref = y.map(function (v, i) { return i >= lag ? y[i - lag] : NaN; });
      if (y.length < lag + 3) { box.querySelector(".cvt-out").innerHTML = "<p>Collez au moins n + 3 lignes.</p>"; return; }
      var m = CVT.nice(y, f, ref);
      box.querySelector(".cvt-out").innerHTML = '<table class="cvt-table"><tr><th></th><th>k = 1 (MAE)</th><th>k = 2 (RMSE)</th><th>k = 3</th></tr>' +
        "<tr><th>erreur du modèle E<sub>k</sub></th><td>" + fmt(m.E1_model, 2) + "</td><td>" + fmt(m.E2_model, 2) + "</td><td>" + fmt(m.E3_model, 2) + "</td></tr>" +
        "<tr><th>erreur de persistance simple</th><td>" + fmt(m.E1_ref, 2) + "</td><td>" + fmt(m.E2_ref, 2) + "</td><td>" + fmt(m.E3_ref, 2) + "</td></tr>" +
        "<tr><th>NICE<sup>k</sup></th><td>" + fmt(m.NICE1) + "</td><td>" + fmt(m.NICE2) + "</td><td>" + fmt(m.NICE3) + "</td></tr></table>" +
        "<p>NICE<sup>Σ</sup> = <strong>" + fmt(m.NICE_Sigma) + "</strong> sur " + m.n + " observations (poids égaux). " +
        (!isFinite(m.NICE_Sigma) ? "Ratio indéfini : vérifiez que l’erreur de référence est non nulle et que les données valides correspondent aux mêmes dates cibles." : m.NICE_Sigma <= 1 ? "Repères : 0 = prévision parfaite, 1 = persistance simple ; le ratio peut dépasser 1. Ici, le modèle conserve " + fmt(100 * m.NICE_Sigma, 0) + " % de l’erreur de la persistance."
          : "Au-dessus de 1, l’erreur dépasse celle de la persistance simple. Vérifiez notamment l’alignement temporel de la colonne de prévisions avec l’horizon n. Le ratio reste affiché sans écrêtage.") + "</p>";
    }
    box.addEventListener("input", upd); upd();
  }
  function layoutStyle() {            // sticky control bar and 2×2 charts, injected once (BLEND explorer)
    if (document.getElementById("cvt-layout")) return;
    var st = document.createElement("style"); st.id = "cvt-layout";
    st.textContent = ".cvt-sticky{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.95);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);border:1px solid #d8e0e8;border-radius:10px;padding:8px 12px;margin:8px 0;box-shadow:0 2px 8px rgba(23,37,54,.06)}" +
      ".cvt-sticky{width:min(1280px,calc(100vw - 32px));margin-left:calc(50% - min(640px,calc(50vw - 16px)));box-sizing:border-box}.cvt-sticky .cvt-grid{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 16px}.cvt-sticky .cvt-hint{margin:4px 0 0}.cvt-datadet{margin:6px 0}.cvt-datadet summary{cursor:pointer;font-weight:600}" +
      ".cvt-2x2{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:min(1280px,calc(100vw - 32px));position:relative;left:50%;transform:translateX(-50%)}" +
      ".cvt-cell{border:1px solid #d8e0e8;border-radius:10px;padding:10px;background:#fff;min-width:0}.cvt-cell h3{margin:0 0 4px;font-size:1rem}" +
      "@media (max-width:900px){.cvt-2x2{grid-template-columns:1fr;width:auto;left:0;transform:none}.cvt-sticky{width:auto;margin-left:0}.cvt-sticky .cvt-grid{grid-template-columns:1fr 1fr}}";
    document.head.appendChild(st);
  }
  function mountBLEND(box) {
    layoutStyle();
    box.innerHTML = '<details class="cvt-datadet"><summary>Données : démo, PV réel ou les vôtres</summary>' +
      dataBox("bl-d", ["x"], "Une colonne : le signal régulièrement échantillonné (une ligne par pas de temps). Exemple horaire chargé ; vous pouvez coller vos données.") + "</details>" +
      '<div class="cvt-sticky"><div class="cvt-grid">' + num("Période T (pas)", "bl-T", 24, 1) + slider("Horizon h", "bl-h", 1, 24, 1, 1, "pas") + slider("Fenêtre affichée (période)", "bl-w", 1, 30, 1, 1, "") +
      slider("Phase de l’origine", "bl-ph", 1, 24, 1, 1, "") + slider("Votre λ", "bl-l", 0, 1, 0.01, 0.5, "") + "</div>" +
      '<p class="cvt-hint"><button type="button" class="cvt-btn bl-real">Charger des données PV réelles (Palaiseau, 40 jours, pas de 30 min)</button> <span class="bl-src"></span></p></div>' +
      '<div class="cvt-out" aria-live="polite"></div><div class="cvt-2x2">' +
      "<div class=\"cvt-cell\"><h3>1. Trois périodes entières, de nuit à nuit</h3><div class=\"cvt-plot bl-p1\"></div></div>" +
      "<div class=\"cvt-cell\"><h3>2. Réglez λ vous-même</h3><p class=\"cvt-hint\">À une phase donnée de la période, la prévision vaut (1 − λ) × la valeur une période plus tôt + λ × la dernière valeur. " +
      "Son erreur quadratique moyenne est une parabole en λ ; la RMSE affichée est sa racine carrée et a le même minimum. λ = 0 donne la persistance cyclique, λ = 1 la persistance, et BLEND prend le minimum des moindres carrés dans [0, 1].</p>" +
      '<div class="cvt-out bl-o2" aria-live="polite"></div><div class="cvt-plot bl-p2"></div></div>' +
      "<div class=\"cvt-cell\"><h3>λ à chaque phase</h3><div class=\"cvt-plot bl-p3\"></div></div>" +
      "<div class=\"cvt-cell\"><h3>3. Ce que le mélange apporte, horizon par horizon</h3><div class=\"cvt-plot bl-p4\"></div><div class=\"cvt-out bl-o4\"></div></div></div>" +
      '<p class="cvt-hint">Poids ajustés sur toute la série : diagnostic sur les données d’ajustement, comme dans le code de référence par défaut. Pour évaluer une prévision, ajustez sur une période d’entraînement puis testez sur une autre période.</p>' + TESTS;
    var lastKey = "", real = null;
    function errs(x, T, h) {                // RMSE of persistence, cyclic persistence and BLEND on the same targets
      var b = CVT.blendLS(x, T, h), sp = 0, sc = 0, k = 0;
      for (var t = T + 1; t <= x.length - h; t++, k++) { sp += Math.pow(x[t + h - 1] - x[t - 1], 2); sc += Math.pow(x[t + h - 1] - x[t + h - T - 1], 2); }
      return { b: b, p: Math.sqrt(sp / k), c: Math.sqrt(sc / k) };
    }
    function nightStart(x, T) {             // middle of the longest low stretch of the mean profile, so that the window shows whole days
      var prof = new Array(T).fill(0), cnt = new Array(T).fill(0), i, q;
      for (i = 0; i < x.length; i++) { prof[i % T] += x[i]; cnt[i % T]++; }
      for (q = 0; q < T; q++) prof[q] /= cnt[q];
      var mx = Math.max.apply(null, prof), lo = prof.map(function (v) { return v <= 0.02 * mx; }), bestLen = 0, bestMid = prof.indexOf(Math.min.apply(null, prof));
      for (q = 0; q < T; q++) {
        if (!lo[q] || lo[(q + T - 1) % T]) continue;
        var n = 0; while (n < T && lo[(q + n) % T]) n++;
        if (n > bestLen) { bestLen = n; bestMid = (q + Math.floor(n / 2)) % T; }
      }
      return bestMid;
    }
    function upd() {
      var x = parseCols(box.querySelector("#bl-d").value).map(function (r) { return r[0]; }), T = Math.round(+box.querySelector("#bl-T").value), hEl = box.querySelector("#bl-h");
      hEl.max = Math.max(1, T); var h = +hEl.value; box.querySelector("#bl-h-o").textContent = h;
      if (!(T >= 2) || x.length < 3 * T || h > T) { box.querySelector(".cvt-out").innerHTML = "<p>Il faut au moins trois périodes de données et h ≤ T.</p>"; return; }
      var e = errs(x, T, h), best = Math.min(e.p, e.c), gain = 100 * (1 - e.b.rmse / best);
      box.querySelector(".cvt-out").innerHTML = "<p>RMSE sur les mêmes cibles : BLEND <strong>" + fmt(e.b.rmse, 1) + "</strong> · persistance " + fmt(e.p, 1) +
        " · persistance cyclique " + fmt(e.c, 1) + ".</p><p>À cet horizon, BLEND est <strong>" + fmt(gain, 1) + " %</strong> sous la meilleure des deux persistances, " +
        (e.p < e.c ? "la persistance." : "la persistance cyclique.") + "</p>";
      // 1. the forecast itself over three whole periods, starting in the middle of the night
      var q0 = nightStart(x, T), k0 = ((q0 - T - h) % T + 2 * T) % T, nper = Math.max(1, Math.floor((e.b.pred.length - k0) / T) - 2), wEl = box.querySelector("#bl-w");
      wEl.max = nper; if (+wEl.value > nper) wEl.value = nper;
      var w = +wEl.value; box.querySelector("#bl-w-o").textContent = w;
      var i0 = k0 + (w - 1) * T, P = [], C = [], B = [], O = [];
      for (var k = i0; k < Math.min(e.b.pred.length, i0 + 3 * T + 1); k++) {
        var t = T + 1 + k, s = (k - i0) / T;
        O.push([s, x[t + h - 1]]); P.push([s, x[t - 1]]); C.push([s, x[t + h - T - 1]]); B.push([s, e.b.pred[k]]);
      }
      box.querySelector(".bl-p1").innerHTML = lineChart([
        { pts: O, color: "#172536", label: "observation" }, { pts: P, color: "#ad5200", label: "persistance (dernière valeur)", dash: true },
        { pts: C, color: "#8a96a3", label: "persistance cyclique (une période plus tôt)", dash: true }, { pts: B, color: "#3c8d5a", label: "BLEND" }],
        { xlabel: "périodes dans la fenêtre (chaque graduation : milieu de la nuit)", ylabel: "signal", xmin: 0, xmax: 3, aria: "Prévisions et observation sur trois périodes entières" });
      // 2. the parabola at one phase, with the reader's lambda and the least-squares one
      var phEl = box.querySelector("#bl-ph"), key = T + "|" + h + "|" + x.length + "|" + x[0];
      phEl.max = T;
      if (key !== lastKey) {                // new data, period or horizon: start at the phase where BLEND mixes most (lambda closest to 0.5)
        var bp = 0; e.b.lambda.forEach(function (l, p) { if (Math.abs(l - 0.5) < Math.abs(e.b.lambda[bp] - 0.5)) bp = p; });
        phEl.value = bp + 1; lastKey = key;
      }
      var p = +phEl.value - 1, lu = +box.querySelector("#bl-l").value, ls = e.b.lambda[p], ys = [], rs = [], cs = [];
      box.querySelector("#bl-ph-o").textContent = p + 1; box.querySelector("#bl-l-o").textContent = lu.toFixed(2);
      for (t = T + 1; t <= x.length - h; t++) if ((t - 1) % T === p) { ys.push(x[t + h - 1]); rs.push(x[t - 1]); cs.push(x[t + h - T - 1]); }
      function E(l) { var s2 = 0; for (var i = 0; i < ys.length; i++) s2 += Math.pow(ys[i] - (1 - l) * cs[i] - l * rs[i], 2); return Math.sqrt(s2 / ys.length); }
      var par = []; for (var j = 0; j <= 50; j++) par.push([j / 50, E(j / 50)]);
      box.querySelector(".bl-o2").innerHTML = "<p>Phase " + (p + 1) + " (" + ys.length + " cibles) : persistance cyclique (λ = 0) " + fmt(E(0), 1) + " · persistance (λ = 1) " + fmt(E(1), 1) +
        " · votre λ = " + lu.toFixed(2) + ": <strong>" + fmt(E(lu), 1) + "</strong> · BLEND λ = " + ls.toFixed(2) + ": <strong>" + fmt(E(ls), 1) + "</strong>.</p>";
      box.querySelector(".bl-p2").innerHTML = lineChart([{ pts: par, color: "#3c8d5a", label: "RMSE à cette phase selon λ" },
        { pts: [[lu, E(lu)]], color: "#ad5200", marker: true }, { pts: [[ls, E(ls)]], color: "#3c8d5a", marker: true }],
        { xlabel: "λ (0 = une période plus tôt, 1 = dernière valeur)", ylabel: "RMSE", xmin: 0, xmax: 1, ymin: 0.8 * E(ls), aria: "Erreur à une phase selon le poids du mélange" });
      box.querySelector(".bl-p3").innerHTML = lineChart([{ pts: e.b.lambda.map(function (l, i) { return [i + 1, l]; }), color: "#3c8d5a", label: "λ de BLEND à chaque phase (le point : la phase choisie)" },
        { pts: [[p + 1, ls]], color: "#3c8d5a", marker: true }],
        { xlabel: "phase de l’origine", ylabel: "λ", xmin: 1, xmax: T, ymin: 0, ymax: 1, aria: "Poids BLEND selon la phase" });
      // 3. gain over the better persistence, for every horizon up to one period
      var G = [], cross = 0;
      for (var hh = 1; hh <= T; hh++) { var r = errs(x, T, hh), refError = Math.min(r.p, r.c); if (refError > 0) G.push([hh, 100 * (1 - r.b.rmse / refError)]); if (!cross && r.c <= r.p) cross = hh; }
      var gainSeries = [{ pts: G, color: "#3c8d5a", label: "Gain de BLEND sur la meilleure persistance (%)" }];
      if (isFinite(gain)) gainSeries.push({ pts: [[h, gain]], color: "#3c8d5a", marker: true });
      box.querySelector(".bl-p4").innerHTML = G.length ? lineChart(gainSeries,
        { xlabel: "horizon h (pas)", ylabel: "gain (%)", xmin: 1, xmax: T, ymin: 0, aria: "Gain de BLEND selon l’horizon" }) : "<p>Le gain relatif est indéfini si l’erreur de référence est nulle. Lire les erreurs absolues ci-dessus.</p>";
      box.querySelector(".bl-o4").innerHTML = "<p>" + (cross ? "Premier horizon où la persistance cyclique égale ou bat la persistance : h = " + cross + " pas. Cela ne garantit pas le même classement à tous les horizons suivants."
        : "La persistance a une RMSE plus faible à chaque horizon testé.") + " Le mélange compte surtout là où aucune ne l’emporte nettement. Jamais négatif ici, puisque les poids sont ajustés sur ces mêmes données.</p>";
    }
    box.querySelector(".bl-real").addEventListener("click", function () {
      function load(j) {
        real = j; box.querySelector("#bl-d").value = j.x.join("\n"); box.querySelector("#bl-T").value = j.T; box.querySelector("#bl-h").value = 2;
        box.querySelector(".bl-src").innerHTML = "Puissance AC (W), à partir du " + j.start_utc.slice(0, 10) + ", UTC ; phase 1 = 00 h 00, un pas = 30 min. <a href=\"https://doi.org/" + j.doi + "\">PV_ELM_pred</a>, exemple public.";
        upd();
      }
      if (real) { load(real); return; }
      fetch("/assets/tools/blend-palaiseau.json").then(function (r) { return r.json(); }).then(load).catch(function () { box.querySelector(".bl-src").textContent = "Les données n’ont pas pu être chargées."; });
    });
    box.addEventListener("input", upd); upd();
  }
  function mountSCV(box) {
    box.innerHTML = dataBox("sc-d", ["x", "cs"], "Deux colonnes : éclairement mesuré, éclairement de ciel clair (une ligne par pas de temps). Exemple horaire chargé ; vous pouvez coller vos données.") +
      '<div class="cvt-grid">' + num("Nombre de pas par jour T", "sc-T", 24, 1) + slider("Horizon n", "sc-n", 1, 12, 1, 1, "pas") + num("Plancher diffus d", "sc-dd", 0.2, 0.05) + "</div>" +
      '<div class="cvt-out" aria-live="polite"></div>' + TESTS;
    function upd() {
      var rows = parseCols(box.querySelector("#sc-d").value), I = rows.map(function (r) { return r[0]; }), C = rows.map(function (r) { return r[1]; });
      var T = Math.round(+box.querySelector("#sc-T").value), n = +box.querySelector("#sc-n").value, d = +box.querySelector("#sc-dd").value;
      box.querySelector("#sc-n-o").textContent = n;
      if (I.length <= T / 2 + 2 || n > T / 2 || !(d >= 0 && d < 1)) { box.querySelector(".cvt-out").innerHTML = "<p>Il faut plus de T/2 + 2 lignes, n ≤ T/2 et 0 ≤ d &lt; 1.</p>"; return; }
      var r = CVT.forecastability(I, C, T, n, d);
      box.querySelector(".cvt-out").innerHTML = "<p>sCV = <strong>" + fmt(r.scv) + "</strong> (0 : ciel clair ; 1 : alternance aléatoire entre ciel clair et couvert) · " +
        "ρ<sub>max</sub> = " + fmt(r.rho_max) + " au retard " + r.lag + " · F = <strong>" + fmt(r.F) + "</strong> (plus élevé : plus facile à prévoir à " + n + " pas" + (n > 1 ? "" : "") + " à l’avance).</p>";
    }
    box.addEventListener("input", upd); upd();
  }

  // ---------------------------------------------------------------- γ-index (Voyant, International Journal of Forecasting 2026, Eqs 1-2)
  // pred: forecast map at time index tp, array of ny rows of nx values; obs: array of nt observed maps (same grid), spacing dx (km), dt (min).
  // γ(x,y,t) = min over |x-x'|,|y-y'| ≤ 1.5 DTA and |t-t'| ≤ 1.5 TTA of sqrt(d²/DTA² + Δt²/TTA² + ΔI²/IDT²); GPR = share of γ ≤ 1 (Eq. 2).
  CVT.gamma = function (pred, obs, o) {
    var ny = pred.length, nx = pred[0].length, nt = obs.length, rs = Math.floor(1.5 * o.DTA / o.dx + 1e-9), rt = Math.floor(1.5 * o.TTA / o.dt + 1e-9);
    var map = [], sum = 0, pass = 0, max = -Infinity, n = 0, se = 0;
    for (var i = 0; i < ny; i++) {
      var row = [];
      for (var j = 0; j < nx; j++) {
        var p = pred[i][j], best = Infinity;
        for (var k = Math.max(0, o.tp - rt); k <= Math.min(nt - 1, o.tp + rt); k++) {
          var tt = Math.pow((k - o.tp) * o.dt / o.TTA, 2), F = obs[k];
          if (tt >= best * best) continue;
          for (var a = Math.max(0, i - rs); a <= Math.min(ny - 1, i + rs); a++) {
            var dyy = Math.pow((a - i) * o.dx / o.DTA, 2);
            for (var b = Math.max(0, j - rs); b <= Math.min(nx - 1, j + rs); b++) {
              var g2 = dyy + Math.pow((b - j) * o.dx / o.DTA, 2) + tt + Math.pow((p - F[a][b]) / o.IDT, 2);
              if (g2 < best * best) best = Math.sqrt(g2);
            }
          }
        }
        row.push(best); sum += best; n++; if (best <= 1) pass++; if (best > max) max = best;
        se += Math.pow(p - obs[o.tp][i][j], 2);
      }
      map.push(row);
    }
    return { map: map, mean: sum / n, max: max, gpr: 100 * pass / n, rmse: Math.sqrt(se / n) };
  };
  // the synthetic scene of the explorer and of the tests: clear sky I0 with one cloud (Gaussian dimming) moving east at speed v (km/min)
  CVT.cloudScene = function (o) {
    function frame(cx, cy, depth) {
      var F = [];
      for (var i = 0; i < o.n; i++) {
        var r = [];
        for (var j = 0; j < o.n; j++) {
          var d2 = Math.pow(j * o.dx - cx, 2) + Math.pow(i * o.dx - cy, 2);
          r.push(o.I0 - depth * Math.exp(-d2 / (2 * o.sigma * o.sigma)));
        }
        F.push(r);
      }
      return F;
    }
    var obs = [];
    for (var k = 0; k < o.nt; k++) obs.push(frame(o.cx + o.v * (k - o.tp) * o.dt, o.cy, o.depth));
    var pred = frame(o.cx + o.shift + o.v * (-o.lag), o.cy + (o.shiftY || 0), o.depth * o.scale);   // forecast: displaced (x along the motion, y across), late or early, deeper
    if (o.bias) pred = pred.map(function (r) { return r.map(function (v) { return v + o.bias; }); });
    return { obs: obs, pred: pred };
  };

  // ---------------------------------------------------------------- widget: γ-index explorer (one cloud, forecast displaced, late or biased)
  function mountGamma(box) {
    box.innerHTML = '<p class="cvt-hint"><strong>L’erreur de prévision</strong></p><div class="cvt-grid">' +
      slider("Décalage du nuage vers le nord (perpendiculaire au mouvement)", "gm-s", 0, 6, 0.25, 2, "km") + slider("Retard (+) ou avance (−) de la prévision", "gm-l", -30, 30, 5, 0, "min") +
      slider("Biais d’intensité", "gm-b", -80, 80, 5, 0, "W/m²") + '</div><p class="cvt-hint"><strong>Les tolérances (équation 1)</strong></p><div class="cvt-grid">' +
      slider("DTA, espace", "gm-dta", 0.5, 3, 0.5, 2, "km") + slider("TTA, temps", "gm-tta", 5, 30, 5, 30, "min") + slider("IDT, intensité", "gm-idt", 10, 100, 5, 50, "W/m²") +
      '</div><div class="btns"><button type="button" class="cvt-btn" id="gm-art">Tolérances de l’article (2 km, 30 min, 50 W/m²)</button>' +
      '<button type="button" class="cvt-btn" id="gm-play" aria-pressed="false">▶ Éloigner le nuage prévu</button></div>' +
      '<div class="cvt-maps"><figure><canvas width="40" height="40" id="gm-obs"></canvas><figcaption>Observation à l’instant t</figcaption></figure>' +
      '<figure><canvas width="40" height="40" id="gm-pred"></canvas><figcaption>Prévision pour l’instant t</figcaption></figure>' +
      '<figure><canvas width="40" height="40" id="gm-err"></canvas><figcaption>Erreur ponctuelle |prévision − observation|</figcaption></figure>' +
      '<figure><canvas width="40" height="40" id="gm-g"></canvas><figcaption>Carte γ : vert γ ≤ 1 (accepté), rouge γ &gt; 1</figcaption></figure></div>' +
      '<div class="cvt-out" aria-live="polite"></div>' +
      '<p class="cvt-hint">Scène synthétique : ciel clair à 800 W/m², nuage atténuant l’éclairement de 500 W/m² et se déplaçant vers l’est à 12 km/h ; maille de 0,5 km sur 20 km, '
      + 'observations toutes les 5 min. γ suit l’équation (1) de l’article : pour chaque pixel prévu, recherche de l’observation la plus proche dans l’espace normalisé des distances, temps et intensités '
      + 'dans un voisinage de 1,5 DTA et 1,5 TTA ; GPR est la proportion de γ ≤ 1 (équation 2). Illustration de la définition, pas résultat de l’article. Le terme temporel suit l’article ; la fonction MATLAB archivée le traite différemment (voir le guide et sa note sur les unités).</p>' + TESTS;
    var timer = null, N = 40, DX = 0.5, DT = 5, NT = 19, TP = 9;
    function val(id) { return +box.querySelector("#" + id).value; }
    function paint(id, M, f) {
      var c = box.querySelector("#" + id), ctx = c.getContext("2d"), img = ctx.createImageData(N, N);
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) { var k = (i * N + j) * 4, col = f(M[i][j]); img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255; }
      ctx.putImageData(img, 0, 0);
    }
    function sky(v) { var t = Math.max(0, Math.min(1, (v - 250) / 600)); return [60 + 190 * t, 90 + 160 * t, 140 + 105 * t]; }
    function err(v) { var t = Math.min(1, v / 300); return [255 - 75 * t, 255 - 200 * t, 255 - 220 * t]; }
    function gcol(g) { if (g <= 1) { var t = g; return [220 - 160 * (1 - t), 240 - 60 * (1 - t), 220 - 140 * (1 - t)]; } var u = Math.min(1, (g - 1) / 2); return [235 - 40 * u, 150 - 110 * u, 130 - 100 * u]; }
    function upd() {
      var o = { n: N, nt: NT, tp: TP, dx: DX, dt: DT, I0: 800, depth: 500, sigma: 3, v: 0.2, cx: 7, cy: 10, shift: 0, shiftY: -val("gm-s"), lag: val("gm-l"), scale: 1, bias: val("gm-b"),
                DTA: val("gm-dta"), TTA: val("gm-tta"), IDT: val("gm-idt") };
      [["gm-s", 2], ["gm-l", 0], ["gm-b", 0], ["gm-dta", 1], ["gm-tta", 0], ["gm-idt", 0]].forEach(function (x) { box.querySelector("#" + x[0] + "-o").textContent = val(x[0]).toFixed(x[1]); });
      var s = CVT.cloudScene(o), g = CVT.gamma(s.pred, s.obs, o), obs = s.obs[TP];
      var E = s.pred.map(function (r, i) { return r.map(function (v, j) { return Math.abs(v - obs[i][j]); }); }), bad = 0;
      E.forEach(function (r) { r.forEach(function (v) { if (v > o.IDT) bad++; }); });
      paint("gm-obs", obs, sky); paint("gm-pred", s.pred, sky); paint("gm-err", E, err); paint("gm-g", g.map, gcol);
      box.querySelector(".cvt-out").innerHTML = "<p>GPR = <strong>" + fmt(g.gpr, 1) + " %</strong> des pixels acceptés (γ ≤ 1) · γ̄ = " + fmt(g.mean, 2) + " · γ<sub>max</sub> = " + fmt(g.max, 2) +
        "</p><p>Vue ponctuelle : RMSE = <strong>" + fmt(g.rmse, 0) + " W/m²</strong>, et " + fmt(100 * bad / (N * N), 1) + " % des pixels diffèrent de plus que IDT. " +
        (o.shiftY !== 0 && o.bias === 0 && o.lag === 0 ? "Un nuage décalé produit deux zones d’erreur ponctuelle : là où il était prévu et là où il se trouve. γ tient compte du déplacement dans les tolérances choisies." :
         o.lag !== 0 && o.shiftY === 0 ? "Un nuage en avance ou en retard est un déplacement temporel : TTA intervient dans son acceptation." :
         o.bias !== 0 && o.shiftY === 0 && o.lag === 0 ? "Le biais d’intensité intervient dans le terme IDT. Avec une recherche de voisinage, un déplacement peut aussi trouver une intensité plus proche : inspectez la carte et gardez les erreurs ponctuelles." : "Les erreurs se combinent dans une distance normalisée commune selon les tolérances retenues.") + "</p>";
    }
    box.querySelector("#gm-art").addEventListener("click", function () { box.querySelector("#gm-dta").value = 2; box.querySelector("#gm-tta").value = 30; box.querySelector("#gm-idt").value = 50; upd(); });
    box.querySelector("#gm-play").addEventListener("click", function () {
      var b = this;
      if (timer) { clearInterval(timer); timer = null; b.textContent = "▶ Éloigner le nuage prévu"; b.setAttribute("aria-pressed", "false"); return; }
      b.textContent = "❚❚ Arrêter"; b.setAttribute("aria-pressed", "true");
      var s = box.querySelector("#gm-s"); s.value = 0; box.querySelector("#gm-l").value = 0; box.querySelector("#gm-b").value = 0;
      timer = setInterval(function () { var v = +s.value + 0.25; if (v > 6) { clearInterval(timer); timer = null; b.textContent = "▶ Éloigner le nuage prévu"; b.setAttribute("aria-pressed", "false"); return; } s.value = v; upd(); }, 220);
    });
    box.addEventListener("input", upd); upd();
  }

  // ---------------------------------------------------------------- widget: ARTU coefficients (Voyant et al., Renewable Energy 2022)
  // The tables M(R) of the dépôt ARTU (K_alpha.zip), interpolated like MATLAB interp2 'linear': K[i][j], i = rho(h), j = rho(2h).
  CVT.artuLookup = function (tables, rh, r2h, R) {
    var T = tables.tables[String(R)], g = tables.grid, n = g.n - 1;
    if (!T || !(rh >= -1 && rh <= 1 && r2h >= -1 && r2h <= 1)) return { K: NaN, alpha: NaN };
    function bil(M) {
      var fi = (rh - g.start) / g.step, fj = (r2h - g.start) / g.step;
      var i = Math.min(Math.floor(fi + 1e-9), n - 1), j = Math.min(Math.floor(fj + 1e-9), n - 1), u = fi - i, v = fj - j;
      return (1 - u) * (1 - v) * M[i][j] + u * (1 - v) * M[i + 1][j] + (1 - u) * v * M[i][j + 1] + u * v * M[i + 1][j + 1];
    }
    var K = bil(T.K), a = bil(T.alpha);
    return { K: K, alpha: a, S: a + K, P: a * K };
  };
  function mountARTU(box) {
    box.innerHTML = '<p class="cvt-hint">Chargement des tables de coefficients du dépôt ARTU…</p>';
    fetch("/assets/artu/artu-tables.json").then(function (r) { return r.json(); }).then(function (tab) { buildARTU(box, tab); })
      .catch(function () { box.innerHTML = '<p class="cvt-hint">Les tables n’ont pas pu être chargées.</p>'; });
  }
  function buildARTU(box, tab) {
    var RS = ["0", "0.01", "0.05", "0.1"];
    box.innerHTML = '<div class="cvt-grid">' + slider("Autocorrélation au retard h, ρ(h)", "ar-1", -0.95, 0.95, 0.01, 0.4) +
      slider("Autocorrélation au retard 2h, ρ(2h)", "ar-2", -0.95, 0.95, 0.01, 0.3) + "</div>" +
      '<fieldset class="cvt-seg"><legend>Qualité de mesure R = σ<sub>v</sub>² / σ<sub>x</sub>² (variance du bruit divisée par celle du signal)</legend>' +
      RS.map(function (r) { return '<label><input type="radio" name="ar-R" value="' + r + '"' + (r === "0.05" ? " checked" : "") + "> " + r + (r === "0.05" ? " (article)" : "") + "</label>"; }).join("") +
      '<button type="button" class="cvt-btn" id="ar-play" aria-pressed="false">▶ Faire varier R</button></fieldset>' +
      '<div class="cvt-artu"><div class="cvt-map"><div class="cvt-seg small" role="group" aria-label="Carte affichée">' +
      '<label><input type="radio" name="ar-m" value="K" checked> carte de K</label><label><input type="radio" name="ar-m" value="alpha"> carte de α</label></div>' +
      '<div class="cvt-mapbox"><canvas width="200" height="200" aria-hidden="true"></canvas><svg viewBox="0 0 200 200" class="cvt-over" role="img" aria-label="Carte des coefficients selon rho(h) et rho(2h) ; cliquer pour choisir un point"></svg></div>' +
      '<p class="cvt-scale"><span>−1</span><i></i><span>+1</span></p>' +
      '<p class="cvt-hint">Horizontale : ρ(h) ; verticale : ρ(2h). Cliquer ou déplacer le pointeur sur la carte. Traits pleins : ρ(h) = 0 et parabole ρ(2h) = ρ(h)², délimitant les quatre zones de K décrites dans l’article. ' +
      'Zone grise : ρ(2h) &lt; 2ρ(h)² − 1, inaccessible pour une série stationnaire (propriété générale des autocorrélations, pas résultat de l’article).</p></div>' +
      '<div class="cvt-res"><div class="cvt-out" aria-live="polite"></div><div class="cvt-w"></div></div></div>' +
      '<p class="cvt-hint">Tables M(R) du <a href="https://github.com/cyrilvoyant/ARTU">dépôt ARTU</a> (pas de 0,05), interpolation linéaire comme dans <code>K_alpha.m</code>. ' +
      'Exemple de l’article (h = 1, ρ(1) = 0,4, ρ(2) = 0,3, R = 0,05) : α = 0,59, K = −0,25, prévision 0,34 y(t) + 0,15 y(t−1) + 0,51 ȳ.</p>' + TESTS;
    var cv = box.querySelector("canvas"), ctx = cv.getContext("2d"), svg = box.querySelector(".cvt-over"), mapKey = "", timer = null;
    function R() { return box.querySelector('input[name="ar-R"]:checked').value; }
    function which() { return box.querySelector('input[name="ar-m"]:checked').value; }
    function color(v) {                      // diverging: blue below 0, white at 0, terracotta above, clipped at +-1
      var t = Math.max(-1, Math.min(1, v)), a = Math.abs(t), c = t < 0 ? [7, 86, 154] : [180, 81, 58];
      return [255 + (c[0] - 255) * a, 255 + (c[1] - 255) * a, 255 + (c[2] - 255) * a];
    }
    function drawMap() {
      var key = R() + which();
      if (key === mapKey) return;
      mapKey = key;
      var img = ctx.createImageData(200, 200), M = which();
      for (var py = 0; py < 200; py++) for (var px = 0; px < 200; px++) {
        var r1 = -1 + 2 * (px + 0.5) / 200, r2 = 1 - 2 * (py + 0.5) / 200, k = (py * 200 + px) * 4;
        var v = CVT.artuLookup(tab, r1, r2, R())[M], c = color(v);
        if (r2 < 2 * r1 * r1 - 1) c = [c[0] * 0.55 + 205 * 0.45, c[1] * 0.55 + 210 * 0.45, c[2] * 0.55 + 216 * 0.45];
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    function X(r) { return (r + 1) * 100; }
    function Y(r) { return (1 - r) * 100; }
    function upd() {
      var r1 = +box.querySelector("#ar-1").value, r2 = +box.querySelector("#ar-2").value, Rv = R();
      box.querySelector("#ar-1-o").textContent = r1.toFixed(2); box.querySelector("#ar-2-o").textContent = r2.toFixed(2);
      drawMap();
      var par = "", fea = "";
      for (var x = -1; x <= 1.0001; x += 0.02) { par += (par ? "L" : "M") + X(x).toFixed(1) + " " + Y(x * x).toFixed(1); fea += (fea ? "L" : "M") + X(x).toFixed(1) + " " + Y(2 * x * x - 1).toFixed(1); }
      svg.innerHTML = '<line x1="100" x2="100" y1="0" y2="200" stroke="#172536" stroke-width="1"/><path d="' + par + '" fill="none" stroke="#172536" stroke-width="1.2"/>' +
        '<path d="' + fea + '" fill="none" stroke="#6b7c8c" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<circle cx="' + X(r1) + '" cy="' + Y(r2) + '" r="5" fill="#fff" stroke="#172536" stroke-width="2"/>';
      var c = CVT.artuLookup(tab, r1, r2, Rv), out = box.querySelector(".cvt-out");
      if (r2 < 2 * r1 * r1 - 1) {
        out.innerHTML = "<p>Cette paire d’autocorrélations ne correspond pas à une série stationnaire (ρ(2h) &lt; 2ρ(h)² − 1). Choisissez un point hors de la zone grise.</p>";
        box.querySelector(".cvt-w").innerHTML = ""; return;
      }
      var wy = c.S, wl = -c.P, wm = 1 + c.P - c.S;
      out.innerHTML = "<p>R = <strong>" + Rv + "</strong>: α = <strong>" + fmt(c.alpha, 2) + "</strong>, K = <strong>" + fmt(c.K, 2) + "</strong>, donc S = α + K = " + fmt(c.S, 2) + " et P = αK = " + fmt(c.P, 2) + ".</p>" +
        '<p class="cvt-eq">ŷ(t + h) = <strong>' + fmt(wy, 2) + "</strong> y(t) " + (wl < 0 ? "− " : "+ ") + "<strong>" + fmt(Math.abs(wl), 2) + "</strong> y(t − h) " + (wm < 0 ? "− " : "+ ") +
        "<strong>" + fmt(Math.abs(wm), 2) + "</strong> ȳ</p><p class=\"cvt-hint\">Seuls S et P interviennent dans la prévision : K et α peuvent échanger leurs rôles (comme à R = 0) sans la modifier. La somme des trois poids vaut 1.</p>";
      var bars = [["dernière valeur y(t)", wy, "#07569a"], ["valeur h auparavant y(t − h)", wl, "#3c8d5a"], ["moyenne d’entraînement ȳ", wm, "#b4513a"]], g = '<svg viewBox="0 0 340 112" class="cvt-chart" role="img" aria-label="Poids de la prévision ARTU">';
      var Z = 170, U = 120;
      g += '<line x1="' + Z + '" x2="' + Z + '" y1="4" y2="108" stroke="#9fb0c0"/>';
      bars.forEach(function (b, k) {
        var w = Math.max(-1.35, Math.min(1.35, b[1])) * U, y = 10 + k * 34;
        g += '<rect x="' + (w < 0 ? Z + w : Z) + '" y="' + y + '" width="' + Math.abs(w) + '" height="16" fill="' + b[2] + '" rx="2"/>' +
          '<text x="' + (w < 0 ? Z + 6 : Z - 6) + '" y="' + (y + 12) + '" text-anchor="' + (w < 0 ? "start" : "end") + '">' + b[0] + "</text>" +
          '<text x="' + (w < 0 ? Z + w - 4 : Z + w + 4) + '" y="' + (y + 12) + '" text-anchor="' + (w < 0 ? "end" : "start") + '" class="ax">' + fmt(b[1], 2) + "</text>";
      });
      box.querySelector(".cvt-w").innerHTML = g + "</svg>";
    }
    function pick(e) {
      var r = svg.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      var r1 = Math.max(-0.95, Math.min(0.95, -1 + 2 * (p.clientX - r.left) / r.width)), r2 = Math.max(-0.95, Math.min(0.95, 1 - 2 * (p.clientY - r.top) / r.height));
      box.querySelector("#ar-1").value = r1.toFixed(2); box.querySelector("#ar-2").value = r2.toFixed(2); upd();
    }
    var down = false;
    svg.addEventListener("pointerdown", function (e) { down = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); pick(e); });
    svg.addEventListener("pointermove", function (e) { if (down) pick(e); });
    svg.addEventListener("pointerup", function () { down = false; });
    box.querySelector("#ar-play").addEventListener("click", function () {
      var b = this;
      if (timer) { clearInterval(timer); timer = null; b.textContent = "▶ Faire varier R"; b.setAttribute("aria-pressed", "false"); return; }
      b.textContent = "❚❚ Arrêter"; b.setAttribute("aria-pressed", "true");
      function step() {
        var k = (RS.indexOf(R()) + 1) % RS.length;
        box.querySelector('input[name="ar-R"][value="' + RS[k] + '"]').checked = true; upd();
      }
      step(); timer = setInterval(step, 1400);
    });
    box.addEventListener("input", upd); box.addEventListener("change", upd); upd();
  }

  function stickyControls(box) {      // the first block of controls of every tool stays in view while scrolling (Cyril, 25/10)
    layoutStyle();
    if (box.querySelector(".cvt-sticky")) return;
    var g = box.querySelector(".cvt-grid");
    if (!g) {                          // tools that build their controls later (ARTU loads its tables first)
      if (window.MutationObserver && !box.dataset.waitSticky) {
        box.dataset.waitSticky = "1";
        var mo = new MutationObserver(function () { if (box.querySelector(".cvt-grid")) { mo.disconnect(); stickyControls(box); } });
        mo.observe(box, { childList: true, subtree: true });
      }
      return;
    }
    var w = document.createElement("div"); w.className = "cvt-sticky";
    g.parentNode.insertBefore(w, g); w.appendChild(g);
  }
  var MOUNT = { lql: mountLQL, thyroid: mountThyroid, nice: mountNICE, blend: mountBLEND, scv: mountSCV, artu: mountARTU, gamma: mountGamma };
  function init() {
    [].forEach.call(document.querySelectorAll(".cvt[data-tool]"), function (box) {
      var f = MOUNT[box.getAttribute("data-tool")];
      if (f && !box.dataset.ready) { box.dataset.ready = "1"; f(box); stickyControls(box); }
    });
  }
  window.CVT = CVT;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
