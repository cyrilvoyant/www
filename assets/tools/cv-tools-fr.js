(function(){function c(){document.querySelectorAll('.cvt[data-tool]').forEach(function(b){b.dataset.ready='fr';});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',c);else c();})();
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
      g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2"' + (s.dash ? ' stroke-dasharray="' + (s.dash === "dotted" ? "2 4" : "5 4") + '"' : "") + "/>";
    });
    g += "</svg>";
    var leg = '<p class="cvt-legend">' + series.filter(function (s) { return s.label; }).map(function (s) {
      var swatch = s.marker ? "width:8px;height:8px;border-radius:50%;background:" + s.color
        : s.dash ? "height:0;background:none;border-top:2px " + (s.dash === "dotted" ? "dotted " : "dashed ") + s.color
        : "background:" + s.color;
      return '<span><i aria-hidden="true" style="' + swatch + '"></i>' + s.label + "</span>"; }).join("") + "</p>";
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
    var fr = document.documentElement.lang === "fr";
    function tr(f, e) { return fr ? f : e; }
    function local(v, digits) { var s = fmt(v, digits); return fr ? s.replace(".", ",") : s; }
    box.innerHTML = '<div class="cvt-grid"><label class="cvt-row" for="th-p"><span>' + tr("Profil du patient", "Profil du modèle") + '</span><select id="th-p"><option value="9.8">' +
      tr("réfractaire (T<sub>d</sub> = 9,8 mois)", "réfractaire (T<sub>d</sub> = 9,8 mois)") + '</option>' +
      '<option value="66.6">' + tr("répondeur (T<sub>d</sub> = 66,6 mois)", "répondeur (T<sub>d</sub> = 66,6 mois)") + '</option></select></label>' + slider(tr("Séances", "Séances"), "th-n", 1, 8, 1, 4) +
      slider(tr("Mois entre les séances", "Mois entre les séances"), "th-l", 1, 8, 1, 3) + slider(tr("Activité par séance", "Activité par séance"), "th-a", 1, 8, 0.1, 3.7, "GBq") +
      '</div><div class="cvt-out" aria-live="polite"></div><div class="cvt-plot"></div>' +
      '<p class="cvt-hint">' + tr("Paramètres des démonstrateurs publics RAIR-Sim (Fusella Giuntini et al.). Sorties du modèle pour deux archétypes, et non prédictions pour un patient.",
        "Paramètres des démonstrateurs publics RAIR-Sim (Fusella Giuntini et coll.). Sorties du modèle pour deux profils types ; aucune prédiction individuelle pour un patient.") + '</p>' +
      (fr ? '<p class="cvt-note">Comparé au code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">cas de vérification</a>. Le calcul se fait dans votre navigateur ; aucune donnée n’est envoyée.</p>' : TESTS);
    function upd() {
      var Td = +box.querySelector("#th-p").value, n = +box.querySelector("#th-n").value, l = +box.querySelector("#th-l").value, A = +box.querySelector("#th-a").value;
      box.querySelector("#th-n-o").textContent = n; box.querySelector("#th-l-o").textContent = l; box.querySelector("#th-a-o").textContent = local(A, 1);
      var pts = CVT.thyroidTg({ Td: Td, sessions: n, lag: l, activity: A, h: 0.01 }), last = pts[pts.length - 1][1];
      var peak = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
      box.querySelector(".cvt-out").innerHTML = "<p>" + tr("Thyroglobuline après 80 mois : ", "Thyroglobuline après 80 mois : ") + "<strong>" + local(last, 1) + " ng/mL</strong> " +
        tr("(départ à 100 ng/mL, comme dans les simulations de l’article). ", "(valeur initiale de 100 ng/mL, comme dans les simulations de l’article). ") +
        (Td < 30 ? tr("Profil réfractaire de l’article (27,5 % des 40 patients classés : 11 réfractaires, 29 répondeurs ; cohorte de 50) : la thyroglobuline diminue d’abord, puis remonte si le protocole n’est pas intensifié.",
                      "Refractory profile of the article (27.5 % of the 40 classified patients: 11 refractory, 29 responders; cohort of 50): thyroglobulin first decreases, then rises again unless the protocol is intensified.")
                 : tr("Profil répondeur de l’article (72,5 % des 40 patients classés : 29 répondeurs et 11 réfractaires ; cohorte de 50) : la thyroglobuline diminue progressivement ; l’objectif est l’activité efficace minimale.",
                      "Responding profile of the article (72.5 % of the 40 classified patients: 29 responders, 11 refractory; cohort of 50): thyroglobulin decreases progressively; the aim is the minimal effective activity.")) + "</p>";
      var thin = pts.filter(function (p, i) { return i % 20 === 0; });
      box.querySelector(".cvt-plot").innerHTML = lineChart([{ pts: thin, color: "#b4513a", label: "Tg (ng/mL)" }],
        { xlabel: tr("mois", "mois"), ylabel: tr("thyroglobuline (ng/mL)", "thyroglobuline (ng/mL)"), xmin: 0, xmax: 80, ymin: 0, ymax: Math.max(110, peak * 1.05), aria: tr("Thyroglobuline sur 80 mois", "Thyroglobuline sur 80 mois") });
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
    var fr = document.documentElement.lang === "fr";
    var local = function (v, digits) { var s = fmt(v, digits); return fr ? s.replace(".", ",") : s; };
    var nv = function (v) { return isFinite(v) && v > 1.0005 ? "&gt; 1" : local(v); };
    var tests = fr
      ? '<p class="cvt-note">Comparé au code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">cas de vérification</a>. Le calcul se fait dans votre navigateur ; aucune donnée n’est envoyée.</p>'
      : TESTS;
    box.innerHTML = dataBox("ni-d", ["x", "f"], fr
      ? "Deux colonnes : observation y(t), prévision émise n pas plus tôt pour cette date cible. Démonstration chargée (n = 1) ; vous pouvez coller vos données."
      : "Deux colonnes : observation y(t), prévision de y(t) émise n pas auparavant (une ligne par pas de temps). Exemple chargé (n = 1) ; vous pouvez coller vos données.") +
      '<div class="cvt-grid">' + num(fr ? "Horizon de prévision n (pas)" : "Horizon de prévision n (pas)", "ni-n", 1, 1) + "</div>" +
      (fr
        ? '<p class="cvt-hint">La référence est la persistance simple : l’observation n pas plus tôt, ŷ(t) = y(t − nΔt). Modèle et référence sont évalués aux mêmes dates cibles.</p>'
        : '<p class="cvt-hint">La référence reste la persistance simple : l’observation n pas auparavant, ŷ(t) = y(t − nΔt) (équations 2 et 11 de l’article).</p>') +
      '<div class="cvt-out" aria-live="polite"></div>' + tests;
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
      if (y.length < lag + 3) { box.querySelector(".cvt-out").innerHTML = fr ? "<p>Il faut au moins n + 3 lignes.</p>" : "<p>Collez au moins n + 3 lignes.</p>"; return; }
      var m = CVT.nice(y, f, ref);
      box.querySelector(".cvt-out").innerHTML = '<table class="cvt-table"><tr><th></th><th>k = 1 (MAE)</th><th>k = 2 (RMSE)</th><th>k = 3</th></tr>' +
        "<tr><th>" + (fr ? "Erreur du modèle" : "model error") + " E<sub>k</sub></th><td>" + local(m.E1_model, 2) + "</td><td>" + local(m.E2_model, 2) + "</td><td>" + local(m.E3_model, 2) + "</td></tr>" +
        "<tr><th>" + (fr ? "Erreur de persistance simple" : "erreur de persistance simple") + "</th><td>" + local(m.E1_ref, 2) + "</td><td>" + local(m.E2_ref, 2) + "</td><td>" + local(m.E3_ref, 2) + "</td></tr>" +
        "<tr><th>NICE<sup>k</sup></th><td>" + nv(m.NICE1) + "</td><td>" + nv(m.NICE2) + "</td><td>" + nv(m.NICE3) + "</td></tr></table>" +
        (fr
          ? "<p>NICE<sup>Σ</sup> = <strong>" + nv(m.NICE_Sigma) + "</strong> sur " + m.n + " observations (poids égaux). " +
            (!isFinite(m.NICE_Sigma)
              ? "Rapport indéfini : vérifiez que l’erreur de persistance n’est pas nulle et que les séries ont les mêmes dates cibles."
              : m.NICE_Sigma <= 1
                ? "Échelle utile : 0 = prévision parfaite, 1 = persistance simple. Ici, le modèle conserve " + local(100 * m.NICE_Sigma, 0) + " % de l’erreur de persistance."
                : "Hors de l’échelle utile 0–1 : ce modèle fait plus d’erreur que la persistance simple.") + "</p>"
          : "<p>NICE<sup>Σ</sup> = <strong>" + nv(m.NICE_Sigma) + "</strong> sur " + m.n + " observations (poids égaux). " +
            (!isFinite(m.NICE_Sigma) ? "Ratio indéfini : vérifiez que l’erreur de référence est non nulle et que les données valides correspondent aux mêmes dates cibles." : m.NICE_Sigma <= 1 ? "Repères : 0 = prévision parfaite, 1 = persistance simple ; le ratio peut dépasser 1. Ici, le modèle conserve " + local(100 * m.NICE_Sigma, 0) + " % de l’erreur de la persistance."
              : "Au-dessus de 1, l’erreur dépasse celle de la persistance simple. Vérifiez notamment l’alignement temporel de la colonne de prévisions avec l’horizon n. Le ratio reste affiché sans écrêtage.") + "</p>");
    }
    box.addEventListener("input", upd); upd();
  }
  function layoutStyle() {            // sticky control bar and 2×2 charts, injected once (BLEND explorer)
    if (document.getElementById("cvt-layout")) return;
    var st = document.createElement("style"); st.id = "cvt-layout";
    st.textContent = ".cvt-sticky{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.95);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);border:1px solid #d8e0e8;border-radius:10px;padding:8px 12px;margin:8px 0;box-shadow:0 2px 8px rgba(23,37,54,.06)}" +
      ".cvt-sticky{width:min(1280px,calc(100vw - 32px));margin-left:calc(50% - min(640px,calc(50vw - 16px)));box-sizing:border-box}.cvt-sticky .cvt-grid{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 16px}.cvt-sticky .cvt-hint{margin:4px 0 0}.cvt-datadet{margin:6px 0}.cvt-datadet summary{cursor:pointer;font-weight:600}" +
      '[data-tool="blend"] .cvt-sticky{top:calc(var(--xs-h,0px) + 52px);z-index:12}' +
      ".cvt-2x2{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:min(1280px,calc(100vw - 32px));position:relative;left:50%;transform:translateX(-50%)}" +
      ".cvt-cell{border:1px solid #d8e0e8;border-radius:10px;padding:10px;background:#fff;min-width:0}.cvt-cell h3{margin:0 0 4px;font-size:1rem}" +
      "@media (max-width:900px){.cvt-2x2{grid-template-columns:1fr;width:auto;left:0;transform:none}.cvt-sticky{width:auto;margin-left:0}.cvt-sticky .cvt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}" +
      '@media (max-width:600px){[data-tool="blend"] .cvt-sticky{padding:6px 8px}' +
      '[data-tool="blend"] .cvt-sticky .cvt-grid{gap:4px 10px}' +
      '[data-tool="blend"] .cvt-sticky :is(.cvt-num,.cvt-row){font-size:.83rem;line-height:1.2}' +
      '[data-tool="blend"] .cvt-sticky .cvt-row{grid-template-columns:minmax(0,1fr) auto;gap:2px 4px}' +
      '[data-tool="blend"] .cvt-sticky .cvt-row output{min-width:0}' +
      '[data-tool="blend"] .cvt-sticky .cvt-num input{width:3.8em;min-width:0}' +
      '[data-tool="blend"] .bl-real{font-size:.8rem;line-height:1.2;padding:5px 9px}}';
    document.head.appendChild(st);
  }
  function mountBLEND(box) {
    layoutStyle();
    var fr = document.documentElement.lang === "fr";
    function tr(f, e) { return fr ? f : e; }
    function local(v, digits) { var s = fmt(v, digits); return fr ? s.replace(".", ",") : s; }
    var tests = fr
      ? '<p class="cvt-note">Comparé au code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">cas de vérification</a>. Calcul local dans le navigateur.</p>'
      : TESTS;
    box.innerHTML = '<details class="cvt-datadet"><summary>' + tr("Données : démo, PV réel ou les vôtres", "Données : démo, PV réel ou les vôtres") + '</summary>' +
      dataBox("bl-d", ["x"], tr("Une colonne : signal régulièrement échantillonné (une ligne par pas de temps). Exemple horaire chargé ; vous pouvez coller vos données.", "Une colonne : le signal régulièrement échantillonné (une ligne par pas de temps). Exemple horaire chargé ; vous pouvez coller vos données.")) + "</details>" +
      '<div class="cvt-sticky"><div class="cvt-grid">' + num(tr("Période T (pas)", "Période T (pas)"), "bl-T", 24, 1) +
      slider(tr("Horizon h (pas)", "Horizon h (steps)"), "bl-h", 1, 24, 1, 1, "") +
      slider(tr("Fenêtre affichée (période)", "Fenêtre affichée (période)"), "bl-w", 1, 30, 1, 1, "") +
      slider(tr("Départ dans le cycle", "Start within the cycle"), "bl-ph", 1, 24, 1, 1, "") +
      slider(tr("Votre λ", "Votre λ"), "bl-l", 0, 1, 0.01, 0.5, "") + "</div>" +
      '<p class="cvt-hint"><button type="button" class="cvt-btn bl-real">' + tr("Charger les données PV de Palaiseau", "Load Palaiseau PV data") + '</button> <span class="bl-src"></span></p></div>' +
      '<div class="cvt-out" aria-live="polite"></div><div class="cvt-2x2">' +
      '<div class="cvt-cell"><h3>' + tr("1. Trois périodes entières, de nuit à nuit", "1. Trois périodes entières, de nuit à nuit") + '</h3><p class="cvt-hint">' +
      tr("Le mélange manuel utilise votre λ pour toute la fenêtre. BLEND garde son poids ajusté séparément à chaque position du cycle.",
         "The manual forecast uses your λ throughout the window. BLEND keeps its own fitted weight for each position in the cycle.") +
      '</p><div class="cvt-plot bl-p1"></div></div>' +
      '<div class="cvt-cell"><h3>' + tr("2. Réglez λ vous-même", "2. Réglez λ vous-même") + '</h3><p class="cvt-hint">' +
      tr("Pour chaque cible, on mélange la mesure prise une période avant cette cible et la dernière mesure connue au départ. λ est le poids de cette dernière mesure. L’erreur quadratique moyenne est une parabole en λ ; la RMSE affichée a le même minimum. λ = 0 donne la persistance cyclique, λ = 1 la persistance, et BLEND prend le minimum des moindres carrés dans [0, 1].",
         "For each target, blend the observation one period before the target with the latest observation available at the start. λ is the weight of that latest observation. Son erreur quadratique moyenne est une parabole en λ ; la RMSE affichée est sa racine carrée et a le même minimum. λ = 0 donne la persistance cyclique, λ = 1 la persistance, et BLEND prend le minimum des moindres carrés dans [0, 1].") + '</p>' +
      '<div class="cvt-out bl-o2" aria-live="polite"></div><div class="cvt-plot bl-p2"></div></div>' +
      '<div class="cvt-cell"><h3>' + tr("Le poids de BLEND selon le départ", "BLEND weight by forecast start") + '</h3><p class="cvt-hint">' +
      tr("Le départ est l’instant de la dernière mesure connue. La position 1 est le premier pas du cycle. Dans les données de Palaiseau, c’est minuit UTC : la position 5 correspond à 02 h 00. La cible est h pas après le départ.",
         "A forecast starts at the latest known observation. Position 1 is the first step in the cycle. In the Palaiseau data that is midnight UTC, so position 5 is 02:00 UTC. The target is h steps after the start.") +
      '</p><div class="cvt-plot bl-p3"></div></div>' +
      '<div class="cvt-cell"><h3>' + tr("3. Ce que le mélange apporte, horizon par horizon", "3. Ce que le mélange apporte, horizon par horizon") + '</h3><div class="cvt-plot bl-p4"></div><div class="cvt-out bl-o4"></div></div></div>' +
      '<p class="cvt-hint">' + tr("Poids ajustés sur toute la série : diagnostic sur les données d’ajustement, comme dans le code de référence par défaut. Pour évaluer une prévision, ajustez sur une période d’entraînement et testez sur une autre période.",
        "Poids ajustés sur toute la série : diagnostic sur les données d’ajustement, comme dans le code de référence par défaut. Pour évaluer une prévision, ajustez sur une période d’entraînement puis testez sur une autre période.") + '</p>' + tests;
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
      if (!(T >= 2) || x.length < 3 * T || h > T) { box.querySelector(".cvt-out").innerHTML = "<p>" + tr("Il faut au moins trois périodes de données et h ≤ T.", "Il faut au moins trois périodes de données et h ≤ T.") + "</p>"; return; }
      var e = errs(x, T, h), best = Math.min(e.p, e.c), gain = best > 0 ? 100 * (1 - e.b.rmse / best) : NaN;
      box.querySelector(".cvt-out").innerHTML = "<p>" + tr("RMSE sur les mêmes cibles", "RMSE on the same targets") + " : BLEND <strong>" + local(e.b.rmse, 1) + "</strong> · " + tr("persistance", "persistance") + " " + local(e.p, 1) +
        " · " + tr("persistance cyclique", "persistance cyclique") + " " + local(e.c, 1) + ".</p>" + (h === T
        ? "<p>" + tr("À h = T, les deux persistances donnent la même prévision pour chaque cible. Modifier λ ne change alors aucune prévision.",
          "At h = T, both persistence forecasts coincide at every target. Changing λ has no effect on the forecasts.") + "</p>"
        : best > 0 ? "<p>" + tr("À cet horizon, BLEND est", "At this horizon, BLEND is") + " <strong>" + local(gain, 1) + " %</strong> " + tr("sous la meilleure des deux persistances", "below the better of the two persistences") + ", " +
        (e.p < e.c ? tr("la persistance.", "la persistance.") : tr("la persistance cyclique.", "la persistance cyclique.")) + "</p>" : "");
      // 1. the forecast itself over three whole periods, starting in the middle of the night
      var q0 = nightStart(x, T), k0 = ((q0 - T - h) % T + 2 * T) % T, nper = Math.max(1, Math.floor((e.b.pred.length - k0) / T) - 2), wEl = box.querySelector("#bl-w");
      wEl.max = nper; if (+wEl.value > nper) wEl.value = nper;
      var w = +wEl.value; box.querySelector("#bl-w-o").textContent = w;
      var lu = +box.querySelector("#bl-l").value;
      var i0 = k0 + (w - 1) * T, P = [], C = [], B = [], O = [], M = [];
      for (var k = i0; k < Math.min(e.b.pred.length, i0 + 3 * T + 1); k++) {
        var t = T + 1 + k, s = (k - i0) / T;
        var latest = x[t - 1], previousCycle = x[t + h - T - 1];
        O.push([s, x[t + h - 1]]);
        P.push([s, latest]); C.push([s, previousCycle]); B.push([s, e.b.pred[k]]);
        M.push([s, (1 - lu) * previousCycle + lu * latest]);
      }
      box.querySelector(".bl-p1").innerHTML = lineChart([
        { pts: O, color: "#172536", label: "observation" },
        { pts: M, color: "#7252a3", label: tr("mélange manuel", "manual forecast") + " (λ = " + local(lu, 2) + ")", dash: "dotted" },
        { pts: P, color: "#ad5200", label: tr("persistance (dernière valeur)", "persistance (dernière valeur)"), dash: true },
        { pts: C, color: "#8a96a3", label: tr("persistance cyclique (une période plus tôt)", "persistance cyclique (une période plus tôt)"), dash: true }, { pts: B, color: "#3c8d5a", label: "BLEND" }],
        { xlabel: tr("périodes dans la fenêtre (chaque graduation : milieu de la nuit)", "périodes dans la fenêtre (chaque graduation : milieu de la nuit)"), ylabel: "signal", xmin: 0, xmax: 3, aria: tr("Prévisions et observation sur trois périodes entières", "Prévisions et observation sur trois périodes entières") });
      // 2. the parabola at one phase, with the reader's lambda and the least-squares one
      var phEl = box.querySelector("#bl-ph"), key = T + "|" + h + "|" + x.length + "|" + x[0];
      phEl.max = T;
      if (key !== lastKey) {                // new data, period or horizon: start at the phase where BLEND mixes most (lambda closest to 0.5)
        var bp = 0; e.b.lambda.forEach(function (l, p) { if (Math.abs(l - 0.5) < Math.abs(e.b.lambda[bp] - 0.5)) bp = p; });
        phEl.value = bp + 1; lastKey = key;
      }
      var p = +phEl.value - 1, ls = e.b.lambda[p], ys = [], rs = [], cs = [];
      box.querySelector("#bl-ph-o").textContent = p + 1; box.querySelector("#bl-l-o").textContent = local(lu, 2);
      for (t = T + 1; t <= x.length - h; t++) if ((t - 1) % T === p) { ys.push(x[t + h - 1]); rs.push(x[t - 1]); cs.push(x[t + h - T - 1]); }
      function E(l) { var s2 = 0; for (var i = 0; i < ys.length; i++) s2 += Math.pow(ys[i] - (1 - l) * cs[i] - l * rs[i], 2); return Math.sqrt(s2 / ys.length); }
      var par = []; for (var j = 0; j <= 50; j++) par.push([j / 50, E(j / 50)]);
      box.querySelector(".bl-o2").innerHTML = "<p>" + tr("Départ au pas", "Start at step") + " " + (p + 1) + " (" + ys.length + " " + tr("cibles", "targets") + ") : " + tr("persistance cyclique", "persistance cyclique") + " (λ = 0) " + local(E(0), 1) + " · " + tr("persistance", "persistance") + " (λ = 1) " + local(E(1), 1) +
        " · " + tr("votre λ", "your λ") + " = " + local(lu, 2) + " : <strong>" + local(E(lu), 1) + "</strong> · BLEND λ = " + local(ls, 2) + " : <strong>" + local(E(ls), 1) + "</strong>.</p>";
      box.querySelector(".bl-p2").innerHTML = lineChart([{ pts: par, color: "#3c8d5a", label: tr("RMSE de cette phase selon λ", "RMSE à cette phase selon λ") },
        { pts: [[lu, E(lu)]], color: "#7252a3", marker: true, label: tr("votre λ", "your λ") }, { pts: [[ls, E(ls)]], color: "#3c8d5a", marker: true, label: tr("λ de BLEND", "BLEND λ") }],
        { xlabel: tr("λ (0 = période précédente, 1 = dernière valeur)", "λ (0 = une période plus tôt, 1 = dernière valeur)"), ylabel: "RMSE", xmin: 0, xmax: 1, ymin: 0.8 * E(ls), aria: tr("Erreur à une phase selon le poids du mélange", "Erreur à une phase selon le poids du mélange") });
      box.querySelector(".bl-p3").innerHTML = lineChart([{ pts: e.b.lambda.map(function (l, i) { return [i + 1, l]; }), color: "#3c8d5a", label: tr("BLEND λ à chaque phase (point : phase ci-dessus)", "λ de BLEND à chaque phase (le point : la phase choisie)") },
        { pts: [[p + 1, ls]], color: "#3c8d5a", marker: true }],
        { xlabel: tr("pas de départ dans le cycle", "start step within the cycle"), ylabel: "λ", xmin: 1, xmax: T, ymin: 0, ymax: 1, aria: tr("Poids BLEND selon la phase", "Poids BLEND selon la phase") });
      // 3. gain over the better persistence, for every horizon up to one period
      var G = [], cross = 0;
      for (var hh = 1; hh <= T; hh++) { var r = errs(x, T, hh), refError = Math.min(r.p, r.c); if (refError > 0) G.push([hh, 100 * (1 - r.b.rmse / refError)]); if (!cross && r.c <= r.p) cross = hh; }
      var gainSeries = [{ pts: G, color: "#3c8d5a", label: tr("Gain de BLEND sur la meilleure persistance (%)", "Gain de BLEND sur la meilleure persistance (%)") }];
      if (isFinite(gain)) gainSeries.push({ pts: [[h, gain]], color: "#3c8d5a", marker: true });
      box.querySelector(".bl-p4").innerHTML = G.length ? lineChart(gainSeries,
        { xlabel: tr("horizon h (pas)", "horizon h (pas)"), ylabel: tr("gain (%)", "gain (%)"), xmin: 1, xmax: T, ymin: 0, aria: tr("Gain de BLEND selon l’horizon", "Gain de BLEND selon l’horizon") }) : "<p>" + tr("Le gain relatif est indéfini si l’erreur de référence est nulle. Lire les erreurs absolues ci-dessus.", "Le gain relatif est indéfini si l’erreur de référence est nulle. Lire les erreurs absolues ci-dessus.") + "</p>";
      box.querySelector(".bl-o4").innerHTML = "<p>" + (cross ? tr("Premier horizon où la persistance cyclique égale ou bat la persistance : h = ", "Premier horizon où la persistance cyclique égale ou bat la persistance : h = ") + cross + tr(" pas. Ce résultat ne vaut pas nécessairement à tous les horizons suivants.", " pas. Cela ne garantit pas le même classement à tous les horizons suivants.")
        : tr("La persistance a la RMSE la plus faible à chaque horizon testé.", "La persistance a une RMSE plus faible à chaque horizon testé.")) + " " + tr("Le mélange est utile lorsque les deux références sont proches. Le gain calculé ici ne peut être négatif car les poids sont ajustés et évalués sur ces mêmes données.", "Blending matters most where neither wins clearly. Never negative here, since the weights are fitted on these same data.") + "</p>";
    }
    box.querySelector(".bl-real").addEventListener("click", function () {
      function load(j) {
        real = j; box.querySelector("#bl-d").value = j.x.join("\n"); box.querySelector("#bl-T").value = j.T; box.querySelector("#bl-h").value = 2;
        box.querySelector(".bl-src").innerHTML = tr("Puissance CA (W), depuis le ", "Puissance AC (W), à partir du ") + j.start_utc.slice(0, 10) + tr(" (UTC) ; phase 1 = 00 h 00, un pas = 30 min. <a href=\"https://doi.org/", ", UTC ; phase 1 = 00 h 00, un pas = 30 min. <a href=\"https://doi.org/") + j.doi + "\">PV_ELM_pred</a>, " + tr("exemple public.", "public example.");
        upd();
      }
      if (real) { load(real); return; }
      fetch("/assets/tools/blend-palaiseau.json").then(function (r) { return r.json(); }).then(load).catch(function () { box.querySelector(".bl-src").textContent = tr("Impossible de charger les données.", "Les données n’ont pas pu être chargées."); });
    });
    box.addEventListener("input", upd); upd();
  }
  function mountSCV(box) {
    var fr = document.documentElement.lang === "fr";
    var fmtLocale = function (v) { var s = fmt(v); return fr ? s.replace(".", ",") : s; };
    var tests = fr
      ? '<p class="cvt-note">Vérifié par comparaison avec le code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">cas de test</a>. Tout s’exécute dans votre navigateur ; aucune donnée n’est envoyée.</p>'
      : TESTS;
    box.innerHTML = dataBox("sc-d", ["x", "cs"], fr
      ? "Deux colonnes : irradiance mesurée puis irradiance de ciel clair (une ligne par pas de temps). Démonstration horaire chargée ; vous pouvez coller vos données."
      : "Deux colonnes : éclairement mesuré, éclairement de ciel clair (une ligne par pas de temps). Exemple horaire chargé ; vous pouvez coller vos données.") +
      '<div class="cvt-grid">' + num(fr ? "Pas de temps par jour T" : "Nombre de pas par jour T", "sc-T", 24, 1) + slider(fr ? "Horizon n" : "Horizon n", "sc-n", 1, 12, 1, 1, fr ? "pas" : "pas") + num(fr ? "Plancher diffus d (fraction de lumière restant sous un nuage épais)" : "Plancher diffus d (fraction of light left under thick cloud)", "sc-dd", 0.2, 0.05) + "</div>" +
      '<div class="cvt-out" aria-live="polite"></div>' + tests;
    function upd() {
      var rows = parseCols(box.querySelector("#sc-d").value), I = rows.map(function (r) { return r[0]; }), C = rows.map(function (r) { return r[1]; });
      var T = Math.round(+box.querySelector("#sc-T").value), n = +box.querySelector("#sc-n").value, d = +box.querySelector("#sc-dd").value;
      box.querySelector("#sc-n-o").textContent = n;
      if (I.length <= T / 2 + 2 || n > T / 2 || !(d >= 0 && d < 1)) { box.querySelector(".cvt-out").innerHTML = fr
        ? "<p>Il faut plus de lignes que T/2 + 2, un horizon n ≤ T/2 et une fraction diffuse 0 ≤ d &lt; 1.</p>"
        : "<p>Il faut plus de T/2 + 2 lignes, n ≤ T/2 et 0 ≤ d &lt; 1.</p>"; return; }
      var r = CVT.forecastability(I, C, T, n, d);
      box.querySelector(".cvt-out").innerHTML = fr
        ? "<p>sCV = <strong>" + fmtLocale(r.scv) + "</strong> (0 : ciel clair ; 1 : alternance aléatoire entre ciel clair et couvert) · " +
          "ρ<sub>max</sub> = " + fmtLocale(r.rho_max) + " au retard " + r.lag + " · F = <strong>" + fmtLocale(r.F) + "</strong> (plus F est élevé, plus cet horizon est prévisible selon l’indice).</p>"
        : "<p>sCV = <strong>" + fmt(r.scv) + "</strong> (0 : ciel clair ; 1 : alternance aléatoire entre ciel clair et couvert) · " +
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
    var fr = document.documentElement.lang === "fr";
    function tr(f, e) { return fr ? f : e; }
    function local(v, digits) { var s = fmt(v, digits); return fr ? s.replace(".", ",") : s; }
    box.innerHTML = '<p class="cvt-hint"><strong>' + tr("L’erreur de prévision", "L’erreur de prévision") + '</strong></p><div class="cvt-grid">' +
      slider(tr("Décalage du nuage vers le nord", "Décalage du nuage vers le nord (perpendiculaire au mouvement)"), "gm-s", 0, 6, 0.25, 2, "km") +
      slider(tr("Retard (+) ou avance (−)", "Retard (+) ou avance (−) de la prévision"), "gm-l", -30, 30, 5, 0, "min") +
      slider(tr("Biais d’intensité", "Biais d’intensité"), "gm-b", -80, 80, 5, 0, "W/m²") +
      '</div><p class="cvt-hint"><strong>' + tr("Les tolérances (équation 1)", "Les tolérances (équation 1)") + '</strong></p><div class="cvt-grid">' +
      slider(tr("DTA (distance to agreement), espace", "DTA (distance to agreement), spatial"), "gm-dta", 0.5, 3, 0.5, 2, "km") +
      slider(tr("TTA (time to agreement), temps", "TTA (time to agreement), temporal"), "gm-tta", 5, 30, 5, 30, "min") +
      slider(tr("IDT (intensity difference threshold), intensité", "IDT (intensity difference threshold), intensity"), "gm-idt", 10, 100, 5, 50, "W/m²") +
      '</div><div class="btns"><button type="button" class="cvt-btn" id="gm-art">' + tr("Tolérances de l’article (2 km, 30 min, 50 W/m²)", "Tolérances de l’article (2 km, 30 min, 50 W/m²)") + '</button>' +
      '<button type="button" class="cvt-btn" id="gm-play" aria-pressed="false">▶ ' + tr("Éloigner le nuage prévu", "Move the forecast cloud away") + '</button></div>' +
      '<div class="cvt-maps"><figure><canvas width="40" height="40" id="gm-obs"></canvas><figcaption>' + tr("Observation à l’instant t", "Observation à l’instant t") + '</figcaption></figure>' +
      '<figure><canvas width="40" height="40" id="gm-pred"></canvas><figcaption>' + tr("Prévision pour l’instant t", "Prévision pour l’instant t") + '</figcaption></figure>' +
      '<figure><canvas width="40" height="40" id="gm-err"></canvas><figcaption>' + tr("Erreur ponctuelle |prévision − observation|", "Erreur ponctuelle |prévision − observation|") + '</figcaption></figure>' +
      '<figure><canvas width="40" height="40" id="gm-g"></canvas><figcaption>' + tr("Carte γ : vert γ ≤ 1, rouge γ &gt; 1", "Carte γ : vert γ ≤ 1 (accepté), rouge γ &gt; 1") + '</figcaption></figure></div>' +
      '<div class="cvt-out" aria-live="polite"></div>' +
      '<p class="cvt-hint">' + tr(
        "Scène synthétique : ciel clair à 800 W/m², nuage atténuant l’irradiance de 500 W/m² et se déplaçant vers l’est à 12 km/h ; maille de 0,5 km sur 20 km, observations toutes les 5 min. γ suit l’équation (1) de l’article. Le GPR affiché est la part des pixels acceptés de cette carte 2D. Illustration pédagogique, pas un résultat de l’article. Le terme temporel suit l’article ; la fonction MATLAB archivée le traite différemment (voir la note sur les unités).",
        "Scène synthétique : ciel clair à 800 W/m², nuage atténuant l’éclairement de 500 W/m² et se déplaçant vers l’est à 12 km/h ; maille de 0,5 km sur 20 km, observed images every 5 min. γ follows Eq. (1) of the article; the displayed GPR is the share of accepted pixels on this 2D map. An illustration of the definition, not a result of the article. The temporal term follows the article; the archived MATLAB function treats it differently (see the note on units)."
      ) + '</p>' + (fr ? '<p class="cvt-note">Comparé au code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">cas de vérification</a>.</p>' : TESTS);
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
      [["gm-s", 2], ["gm-l", 0], ["gm-b", 0], ["gm-dta", 1], ["gm-tta", 0], ["gm-idt", 0]].forEach(function (x) { box.querySelector("#" + x[0] + "-o").textContent = local(val(x[0]), x[1]); });
      var s = CVT.cloudScene(o), g = CVT.gamma(s.pred, s.obs, o), obs = s.obs[TP];
      var E = s.pred.map(function (r, i) { return r.map(function (v, j) { return Math.abs(v - obs[i][j]); }); }), bad = 0;
      E.forEach(function (r) { r.forEach(function (v) { if (v > o.IDT) bad++; }); });
      paint("gm-obs", obs, sky); paint("gm-pred", s.pred, sky); paint("gm-err", E, err); paint("gm-g", g.map, gcol);
      box.querySelector(".cvt-out").innerHTML = "<p>GPR = <strong>" + local(g.gpr, 1) + " %</strong>" +
        tr(" des pixels acceptés", " of the pixels accepted") + " (γ ≤ 1) · γ̄ = " + local(g.mean, 2) + " · γ<sub>max</sub> = " + local(g.max, 2) +
        "</p><p>" + tr("Vue ponctuelle", "Pointwise view") + " : RMSE = <strong>" + local(g.rmse, 0) + " W/m²</strong>, " +
        local(100 * bad / (N * N), 1) + " %" + tr(" des pixels dépassent IDT. ", " of the pixels differ by more than IDT. ") +
        (o.shiftY !== 0 && o.bias === 0 && o.lag === 0 ? tr("Un nuage décalé crée deux zones d’erreur ponctuelle. γ tient compte du déplacement dans les tolérances choisies.", "A displaced cloud creates two pointwise-error regions. γ accounts for that displacement within the chosen tolerances.") :
         o.lag !== 0 && o.shiftY === 0 ? tr("Un nuage en avance ou en retard est un déplacement temporel : TTA intervient dans son acceptation.", "A late or early cloud is a displacement in time: TTA contributes to its acceptance.") :
         o.bias !== 0 && o.shiftY === 0 && o.lag === 0 ? tr("Le biais d’intensité intervient dans IDT. La recherche de voisinage peut trouver une intensité plus proche : inspectez la carte.", "Biais d’intensité contributes through IDT. A spatial or temporal search can find a closer intensity; inspect the map.") :
         tr("Les erreurs se combinent dans une distance normalisée selon les tolérances retenues.", "Errors combine in a normalized distance under the selected tolerances.")) + "</p>";
    }
    box.querySelector("#gm-art").addEventListener("click", function () { box.querySelector("#gm-dta").value = 2; box.querySelector("#gm-tta").value = 30; box.querySelector("#gm-idt").value = 50; upd(); });
    box.querySelector("#gm-play").addEventListener("click", function () {
      var b = this;
      if (timer) { clearInterval(timer); timer = null; b.textContent = "▶ " + tr("Éloigner le nuage prévu", "Move the forecast cloud away"); b.setAttribute("aria-pressed", "false"); return; }
      b.textContent = "❚❚ " + tr("Arrêter", "Stop"); b.setAttribute("aria-pressed", "true");
      var s = box.querySelector("#gm-s"); s.value = 0; box.querySelector("#gm-l").value = 0; box.querySelector("#gm-b").value = 0;
      timer = setInterval(function () { var v = +s.value + 0.25; if (v > 6) { clearInterval(timer); timer = null; b.textContent = "▶ " + tr("Éloigner le nuage prévu", "Move the forecast cloud away"); b.setAttribute("aria-pressed", "false"); return; } s.value = v; upd(); }, 220);
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

/* Écrans français de /fr/outils/ : présentation seulement. Tous les calculs passent par window.CVT,
   dont les fonctions restent celles du paquet audité (voir tools/js-tests.html). */
(function () {
  "use strict";
  var C = window.CVT;
  if (!C) return;
  var LINKS = {
    pers: "/fr/actualites/forecasting-with-less/", nice: "/fr/actualites/nice-forecast-evaluation/", eval: "/fr/recits/evaluer-prevision-solaire-persistance/",
    blend: "/fr/outils/blend/", scv: "/fr/actualites/why-forecast-solar-power/", cours: "/fr/enseignement/cours-prevision-solaire/"
  };
  function a(k, t) { return '<a href="' + LINKS[k] + '">' + t + "</a>"; }
  function fr(v, d) {
    if (!isFinite(v)) return "indéfini";
    d = d === undefined ? 2 : d;
    var r = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v;
    return r.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");
  }
  function $(box, s) { return box.querySelector(s); }
  function val(box, id) { return +$(box, "#" + id).value; }
  function style() {
    if (document.getElementById("cvfr-style")) return;
    var st = document.createElement("style"); st.id = "cvfr-style";
    st.textContent =
      ".cvfr .cvt-sticky{position:sticky;z-index:5;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0;box-shadow:0 2px 8px rgba(23,37,54,.08)}" +
      "@media(max-width:760px){.cvfr .cvt-sticky{position:static}}" +
      '.cvfr[data-tool="blend"] .cvt-sticky{position:sticky;top:calc(var(--xs-h,0px) + 52px);z-index:12}' +
      '@media(max-width:760px){.cvfr[data-tool="blend"] .cvfr-ctls{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px}.cvfr[data-tool="blend"] .cvt-sticky{padding:6px 8px;line-height:1.25}.cvfr[data-tool="blend"] .cvfr-ctl label{font-size:.82rem}}' +
      ".cvfr-panel{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0}" +
      ".cvfr-presets{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}" +
      ".cvfr-pre{font:inherit;font-size:.92rem;font-weight:600;padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}" +
      ".cvfr-pre[aria-pressed=true]{background:#172536;color:#fff;border-color:#172536}" +
      ".cvfr-case{margin:0 0 10px;min-height:1.4em}" +
      ".cvfr-ctls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px 18px}" +
      ".cvfr-ctl{position:relative;min-width:0}.cvfr-ctl label{font-size:.93rem;font-weight:600}.cvfr-ctl output{color:var(--link);font-variant-numeric:tabular-nums;white-space:nowrap}" +
      ".cvfr-ctl input[type=range]{display:block;width:100%;accent-color:var(--link);margin:4px 0 0}.cvfr-ctl select{display:block;width:100%;font:inherit;padding:4px 6px;margin-top:4px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink)}.cvfr-ctl input[type=number]{display:block;width:100%;box-sizing:border-box;font:inherit;padding:4px 6px;margin-top:4px;border:1px solid var(--line);border-radius:6px}" +
      ".cvfr-q{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;min-width:22px;padding:0;margin-left:6px;border-radius:50%;border:1px solid #6b7f8f;background:var(--paper);color:var(--ink);font:700 12px/1 system-ui;cursor:help;vertical-align:middle}" +
      ".cvfr-tip{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 4px);background:#172536;color:#fff;padding:9px 11px;border-radius:8px;font-size:.86rem;font-weight:400;line-height:1.4}.cvfr-tip[hidden]{display:none}" +
      ".cvfr-verdict{background:#172536;color:#fff;border-radius:12px;padding:12px 16px;margin:10px 0;font-size:1.05rem;line-height:1.45}.cvfr-verdict a{color:#ffd28a}.cvfr-verdict p{margin:0}" +
      ".cvfr-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,165px),1fr));gap:10px;margin:10px 0}.cvfr-card{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-width:0}.cvfr-card b{display:block;font-size:1.45rem;line-height:1.2;color:var(--link);font-variant-numeric:tabular-nums}.cvfr-card span{display:block;font-weight:650;font-size:.92rem}.cvfr-card small{display:block;font-size:.84rem;line-height:1.35;color:var(--muted);margin-top:3px}" +
      ".cvfr-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:12px;margin:10px 0}.cvfr-fig{margin:0;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px;min-width:0}.cvfr-fig h3{margin:0 0 6px;font-size:1rem}.cvfr-fig p{margin:6px 0 0;font-size:.9rem}" +
      ".cvfr .cvt-chart{max-width:none}.cvfr .cvt-chart text{font-size:15px;fill:var(--ink)}.cvfr .cvt-chart text.ax{font-size:16px}" +
      "@media(max-width:560px){.cvfr .cvt-chart text{font-size:21px}.cvfr .cvt-chart text.ax{font-size:21px}}" +
      ".cvfr-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.9rem;margin:6px 0 0}.cvfr-leg i{display:inline-block;width:18px;height:4px;margin-right:6px;vertical-align:middle;border-radius:2px}" +
      ".cvfr-g{display:grid;grid-template-columns:minmax(100px,auto) 1fr minmax(60px,auto);gap:6px 10px;align-items:center;margin:6px 0}.cvfr-g span{font-weight:600;font-size:.93rem}.cvfr-g div{height:18px;background:#e8eef3;border-radius:4px;overflow:hidden}.cvfr-g i{display:block;height:100%}.cvfr-g b{font-variant-numeric:tabular-nums;text-align:right}.cvfr-over{color:#a8431f}" +
      ".cvfr-w{display:grid;grid-template-columns:minmax(110px,42%) 1fr 58px;gap:6px 10px;align-items:center;margin:6px 0}.cvfr-w span{font-size:.92rem}.cvfr-w div{position:relative;height:18px;background:#eef2f5;border-radius:3px}.cvfr-w div::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:#6b7f8f}.cvfr-w i{position:absolute;top:2px;bottom:2px;border-radius:2px}.cvfr-w b{text-align:right;font-variant-numeric:tabular-nums}" +
      ".cvfr-t{width:100%;border-collapse:collapse;font-size:.93rem;margin:8px 0;font-variant-numeric:tabular-nums}.cvfr-t caption{text-align:left}.cvfr-t th,.cvfr-t td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right}.cvfr-t th:first-child,.cvfr-t td:first-child{text-align:left}.cvfr-t tr.on td,.cvfr-t tr.on th{background:#e8f3f8}.cvfr-tw{overflow-x:auto}" +
      ".cvfr-det{margin:8px 0}.cvfr-det summary{cursor:pointer;font-weight:600}.cvfr-note{font-size:.9rem;color:var(--muted);margin:6px 0}" +
      ".cvfr-defs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:10px 22px;margin:12px 0}.cvfr-defs div{border-top:1px solid var(--line);padding-top:8px}.cvfr-defs dt{font-weight:700}.cvfr-defs dd{margin:2px 0 0}";
    document.head.appendChild(st);
  }
  var tipN = 0;
  function tip(html) {
    var id = "cvfr-t" + (++tipN);
    return '<button type="button" class="cvfr-q" aria-label="Définition" aria-expanded="false" aria-controls="' + id + '">?</button><span class="cvfr-tip" role="tooltip" id="' + id + '" hidden>' + html + "</span>";
  }
  function wireTips() {
    if (document.body.dataset.cvfrTips) return;
    document.body.dataset.cvfrTips = "1";
    function q(e) { return e.target.closest ? e.target.closest(".cvfr-q") : null; }
    function show(b, on) { var t = document.getElementById(b.getAttribute("aria-controls")); if (t) { t.hidden = !on; b.setAttribute("aria-expanded", on ? "true" : "false"); } }
    function closeAll(except) { [].forEach.call(document.querySelectorAll(".cvfr-q"), function (b) { if (b !== except) show(b, false); }); }
    document.addEventListener("mouseover", function (e) { var b = q(e); if (b) { closeAll(b); show(b, true); } });
    document.addEventListener("mouseout", function (e) { var b = q(e); if (b && document.activeElement !== b) show(b, false); });
    document.addEventListener("focusin", function (e) { var b = q(e); if (b) { closeAll(b); show(b, true); } });
    document.addEventListener("focusout", function (e) { var b = q(e); if (b) show(b, false); });
    document.addEventListener("click", function (e) { var b = q(e); closeAll(b); if (b) { e.preventDefault(); show(b, true); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(null); });
  }
  function slide(o) {
    return '<div class="cvfr-ctl"><label for="' + o.id + '">' + o.label + ' : <output id="' + o.id + '-o" for="' + o.id + '"></output></label>' + tip(o.tip) +
      '<input type="range" id="' + o.id + '" min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + o.val + '"></div>';
  }
  function setOut(box, id, text) { $(box, "#" + id + "-o").textContent = text; }
  function card(label, value, def) { return '<div class="cvfr-card"><span>' + label + "</span><b>" + value + "</b><small>" + def + "</small></div>"; }
  function fig(title, cls, note) { return '<figure class="cvfr-fig"><h3>' + title + '</h3><div class="' + cls + '"></div>' + (note ? "<p>" + note + "</p>" : "") + "</figure>"; }
  function presets(list) {
    return '<div class="cvfr-presets" role="group" aria-label="Préréglages">' + list.map(function (p, i) { return '<button type="button" class="cvfr-pre" data-pre="' + i + '" aria-pressed="false">' + p.name + "</button>"; }).join("") + '</div><p class="cvfr-case"></p>';
  }
  function markPreset(box, list, i) {
    [].forEach.call(box.querySelectorAll(".cvfr-pre[data-pre]"), function (b) { b.setAttribute("aria-pressed", +b.dataset.pre === i ? "true" : "false"); });
    $(box, ".cvfr-case").innerHTML = i >= 0 ? list[i].text : "Réglage libre : les boutons ci-dessus remettent un cas expliqué.";
  }
  function wirePresets(box, list, apply) {
    [].forEach.call(box.querySelectorAll(".cvfr-pre[data-pre]"), function (b) {
      b.addEventListener("click", function () { var i = +b.dataset.pre; markPreset(box, list, i); apply(list[i]); });
    });
  }
  function parse(text, ncol) {          // tabulation, espace ou point-virgule séparent les colonnes ; la virgule décimale française est lue
    var rows = [], bad = 0;
    text.trim().split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l) return;
      var p = l.split(/[\s;]+/);
      if (p.length < ncol && l.indexOf(",") >= 0) p = l.split(",");
      var r = p.map(function (s) { return Number(s.replace(",", ".")); });
      if (r.length >= ncol && r.slice(0, ncol).every(function (v) { return isFinite(v); })) rows.push(r); else bad++;
    });
    return { rows: rows, bad: bad };
  }
  function niceStep(span) { var raw = span / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  function tick(v, step) { var d = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9)); return fr(v, d); }
  function plot(series, o) {            // series : {pts, color, label, marker, thin}
    var W = 640, H = 330, L = 84, R = 16, Tm = 14, B = 62, xs = [], ys = [];
    series.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    ys = ys.filter(function (v) { return isFinite(v); });
    var x0 = o.xmin !== undefined ? o.xmin : Math.min.apply(null, xs), x1 = o.xmax !== undefined ? o.xmax : Math.max.apply(null, xs);
    var y0 = o.ymin !== undefined ? o.ymin : Math.min(0, Math.min.apply(null, ys)), y1 = o.ymax !== undefined ? o.ymax : (Math.max.apply(null, ys) * 1.05 || 1);
    if (!(y1 > y0)) y1 = y0 + 1;
    var lg = !!o.log;
    if (lg) { y0 = Math.floor(Math.log10(Math.max(o.ymin || 0.01, 1e-3))); y1 = Math.ceil(Math.log10(Math.max(y1, 10))); }
    function X(v) { return L + (v - x0) / ((x1 - x0) || 1) * (W - L - R); }
    function Yr(v) { return H - B - (v - y0) / (y1 - y0) * (H - Tm - B); }
    function Y(v) { return Yr(lg ? Math.log10(Math.max(v, 1e-6)) : v); }
    var g = '<svg viewBox="0 0 ' + W + " " + H + '" class="cvt-chart" role="img" aria-label="' + (o.aria || "") + '">', v;
    if (lg) {
      for (v = y0; v <= y1; v++) { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Yr(v) + '" y2="' + Yr(v) + '" class="grid"/><text x="' + (L - 8) + '" y="' + (Yr(v) + 5) + '" text-anchor="end">' + fr(Math.pow(10, v), v < 0 ? -v : 0) + "</text>"; }
    } else {
      var sy = niceStep(y1 - y0);
      for (v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Yr(v) + '" y2="' + Yr(v) + '" class="grid"/><text x="' + (L - 8) + '" y="' + (Yr(v) + 5) + '" text-anchor="end">' + tick(v, sy) + "</text>"; }
    }
    var sx = niceStep(x1 - x0);
    for (v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) g += '<text x="' + X(v) + '" y="' + (H - B + 24) + '" text-anchor="middle">' + tick(v, sx) + "</text>";
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="#7c8d9a"/>';
    (o.vlines || []).forEach(function (x) { g += '<line x1="' + X(x) + '" x2="' + X(x) + '" y1="' + Tm + '" y2="' + (H - B) + '" stroke="#a9b6c2" stroke-width="1"/>'; });
    g += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + o.xlabel + "</text>";
    g += '<text transform="translate(18 ' + ((Tm + H - B) / 2) + ') rotate(-90)" text-anchor="middle" class="ax">' + o.ylabel + "</text>";
    var yTop = lg ? Math.pow(10, y1) : y1, yBot = lg ? Math.pow(10, y0) : y0;
    series.forEach(function (s) {
      if (s.marker) { var q = s.pts[0]; if (isFinite(q[1]) && q[1] <= yTop && q[1] >= yBot) g += '<circle cx="' + X(q[0]) + '" cy="' + Y(q[1]) + '" r="6" fill="' + s.color + '" stroke="#fff" stroke-width="1.5"/>'; return; }
      var d = "", pen = false;
      s.pts.forEach(function (p) {
        if (!isFinite(p[1]) || p[1] > yTop || p[1] < yBot) { pen = false; return; }   // hors de l'axe : le trait s'interrompt, il ne simule pas un plateau
        d += (pen ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); pen = true;
      });
      g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.thin ? 1.6 : 2.4) + '"' +
        (s.dash ? ' stroke-dasharray="' + (s.dash === "dotted" ? "2 4" : "5 4") + '"' : "") + '/>';
    });
    g += "</svg>";
    var leg = series.filter(function (s) { return s.label; });
    return g + (leg.length ? '<p class="cvfr-leg">' + leg.map(function (s) { var swatch = s.marker ? "width:8px;height:8px;border-radius:50%;background:" + s.color
        : s.dash ? "height:0;background:none;border-top:2px " + (s.dash === "dotted" ? "dotted " : "dashed ") + s.color
        : "background:" + s.color;
      return '<span><i aria-hidden="true" style="' + swatch + '"></i>' + s.label + "</span>"; }).join("") + "</p>" : "");
  }
  var CHECK = '<p class="cvfr-note">Calculs comparés au code de référence : <a href="https://cyrilvoyant.github.io/tools/js-tests.html">cas de vérification</a> (page en anglais). Tout reste dans votre navigateur ; rien n’est envoyé.</p>';

  // ------------------------------------------------------------------ données de démonstration
  function demoData() {
    var T = 24, N = 20 * T, s = 7, cs = [], x = [];
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var c = 1;
    for (var t = 1; t <= N; t++) { var k = Math.max(0, 1000 * Math.sin(2 * Math.PI * t / T)); c = 0.8 * c + 0.2 * (0.25 + 0.85 * rnd()); cs.push(+k.toFixed(1)); x.push(+(k * Math.min(1, c)).toFixed(1)); }
    return { T: T, cs: cs, x: x };
  }

  // ------------------------------------------------------------------ NICE
  function niceText(v) { if (!isFinite(v)) return "indéfini"; return v > 1.0005 ? "&gt; 1" : fr(v, 2); }
  function mountNICE(box) {
    var D = demoData(), mean = D.x.reduce(function (p, q) { return p + q; }, 0) / D.x.length;
    var FORE = {
      demo: function (t, n) { return +Math.max(0, 0.6 * D.x[Math.max(0, t - n)] + 0.32 * D.cs[t]).toFixed(1); },
      perfect: function (t) { return D.x[t]; },
      pers: function (t, n) { return D.x[Math.max(0, t - n)]; },
      mean: function () { return +mean.toFixed(1); },
      spikes: function (t, n) { var v = FORE.demo(t, n); return t % 37 === 13 && D.cs[t] > 0 ? v + 700 : v; }
    };
    var P = [
      { name: "Prévision de démonstration", mode: "demo", n: 1, text: "Une prévision simple : 60 % de la valeur connue n pas plus tôt, plus une part du ciel clair. Augmentez l’horizon n : l’écart avec la persistance se creuse à mesure qu’elle se dégrade." },
      { name: "Prévision parfaite", mode: "perfect", n: 1, text: "La prévision vaut l’observation : toutes les erreurs sont nulles, NICE vaut 0. C’est le bas de l’échelle, inatteignable en pratique." },
      { name: "La persistance elle-même", mode: "pers", n: 1, text: "La prévision recopie la valeur connue n pas plus tôt : c’est la référence. NICE vaut exactement 1, à tout horizon. Bouger n change les erreurs, pas NICE : c’est mathématiquement juste." },
      { name: "La moyenne", mode: "mean", n: 1, text: "Une prévision constante. À horizon 1, la persistance est bien meilleure : NICE &gt; 1. Dès n = 4, la persistance s’est tant dégradée que la moyenne passe devant : NICE tombe sous 1." },
      { name: "Quelques grosses erreurs", mode: "spikes", n: 1, text: "La prévision de démonstration, avec 700 W/m² d’erreur sur de rares pas. NICE¹ bouge peu, NICE³ bondit : plus k est grand, plus les grands écarts pèsent." }
    ];
    box.innerHTML = presets(P) +
      '<div class="cvt-sticky"><div class="cvfr-ctls">' + slide({ id: "ni-n", label: "Horizon n", min: 1, max: 12, step: 1, val: 1, tip: "Nombre de pas entre la dernière valeur connue et la valeur à prévoir. La persistance recopie l’observation n pas plus tôt. Ici un pas vaut une heure." }) + "</div></div>" +
      '<div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="ni-g cvfr-panel"></div><div class="cvfr-tw ni-t"></div>' +
      '<div class="cvfr-charts">' + fig("Trois jours : observation, prévision, persistance", "ni-p1", "L’écart entre le noir et le bleu est l’erreur de la prévision.") + fig("La RMSE selon l’horizon", "ni-p2", "") + "</div>" +
      '<details class="cvfr-det"><summary>Voir ou coller vos données</summary><label class="cvt-data" for="ni-d"><span>Deux colonnes, une ligne par pas de temps : observation, puis prévision émise n pas plus tôt pour cette même date. Colonnes séparées par une tabulation, un espace ou un point-virgule ; point ou virgule décimale.</span><textarea id="ni-d" rows="6" spellcheck="false"></textarea></label></details>' + CHECK;
    var mode = "demo", ta = $(box, "#ni-d");
    function fill(n) { ta.value = D.x.map(function (v, t) { return v + "\t" + FORE[mode](t, n); }).join("\n"); }
    function upd() {
      var n = val(box, "ni-n"); setOut(box, "ni-n", n + " pas");
      if (mode !== "custom") fill(n);
      var p = parse(ta.value, 2), y = p.rows.map(function (r) { return r[0]; }), f = p.rows.map(function (r) { return r[1]; });
      if (y.length < n + 3) { $(box, ".cvfr-verdict").innerHTML = "Il faut au moins n + 3 lignes valides."; return; }
      var ref = y.map(function (v, i) { return i >= n ? y[i - n] : NaN; }), m = C.nice(y, f, ref), v2 = m.NICE2;
      $(box, ".cvfr-verdict").innerHTML = !isFinite(v2)
        ? "Rapport indéfini : l’erreur de la persistance est nulle sur ces données. Vérifiez les colonnes."
        : v2 > 1.0005 ? "<strong>" + a("nice", "NICE²") + " &gt; 1 : moins bon que la " + a("pers", "persistance") + ".</strong> Recopier la valeur connue n pas plus tôt ferait mieux. Pensez aussi à vérifier l’alignement des dates."
          : v2 < 0.0005 ? "<strong>" + a("nice", "NICE²") + " = 0 : prévision parfaite.</strong>"
            : v2 >= 0.9995 ? "<strong>" + a("nice", "NICE²") + " = 1 : autant d’erreur que la " + a("pers", "persistance") + ".</strong> Rien de gagné."
              : "<strong>" + a("nice", "NICE²") + " = " + fr(v2, 2) + " : utile.</strong> La prévision garde " + fr(100 * v2, 0) + " % de la " + a("eval", "RMSE") + " de la " + a("pers", "persistance") + ".";
      var rows = [["NICE¹ (MAE)", m.NICE1, "k = 1 : tous les écarts comptent pareil."], ["NICE² (RMSE)", m.NICE2, "k = 2 : les grands écarts comptent plus."], ["NICE³", m.NICE3, "k = 3 : les très grands écarts dominent."], ["NICE<sup>Σ</sup>", m.NICE_Sigma, "Moyenne à poids égaux des trois."]];
      $(box, ".ni-g").innerHTML = "<p class=\"cvfr-note\">Échelle : 0 = parfaite, 1 = persistance. Une barre rouge pleine signale une valeur au-dessus de 1. k = 1 : tous les écarts comptent pareil ; k = 2 et 3 : les grands écarts comptent de plus en plus. NICE<sup>Σ</sup> : moyenne à poids égaux des trois.</p>" + rows.map(function (r) {
        var over = r[1] > 1.0005, w = isFinite(r[1]) ? Math.min(100, 100 * r[1]) : 0;
        return '<div class="cvfr-g"><span>' + r[0] + '</span><div><i style="width:' + w + "%;background:" + (over ? "#a8431f" : "#086b94") + '"></i></div><b' + (over ? ' class="cvfr-over"' : "") + ">" + niceText(r[1]) + "</b></div>";
      }).join("");
      $(box, ".ni-t").innerHTML = '<table class="cvfr-t"><caption class="cvfr-note">Les erreurs elles-mêmes, dans l’unité des données (' + m.n + " observations communes" + (p.bad ? ", " + p.bad + " lignes ignorées" : "") + ').</caption><thead><tr><th></th><th>k = 1 : MAE</th><th>k = 2 : RMSE</th><th>k = 3</th></tr></thead><tbody><tr><th scope="row">Prévision</th><td>' + fr(m.E1_model, 1) + "</td><td>" + fr(m.E2_model, 1) + "</td><td>" + fr(m.E3_model, 1) + '</td></tr><tr><th scope="row">Persistance</th><td>' + fr(m.E1_ref, 1) + "</td><td>" + fr(m.E2_ref, 1) + "</td><td>" + fr(m.E3_ref, 1) + "</td></tr></tbody></table>";
      var W = Math.min(72, y.length - n), i0 = Math.max(n, Math.min(y.length - W, 240)), O = [], Q = [], R = [];
      for (var i = i0; i < i0 + W; i++) { O.push([i - i0, y[i]]); Q.push([i - i0, f[i]]); R.push([i - i0, y[i - n]]); }
      $(box, ".ni-p1").innerHTML = plot([{ pts: O, color: "#172536", label: "observation" }, { pts: R, color: "#ad5200", label: "persistance", thin: true }, { pts: Q, color: "#086b94", label: "prévision" }], { xlabel: "pas de temps", ylabel: "valeur", xmin: 0, xmax: Math.max(1, W - 1), aria: "Observation, prévision et persistance sur trois jours" });
      var Ge = [], Gp = [], lim = Math.min(12, y.length - 3);
      for (var q = 1; q <= lim; q++) {
        var rq = y.map(function (v, j) { return j >= q ? y[j - q] : NaN; }), fq = f;
        if (mode !== "custom") fq = y.map(function (v, j) { return FORE[mode](j, q); });
        var mq = C.nice(y, fq, rq); Gp.push([q, mq.E2_ref]); Ge.push([q, mq.E2_model]);
      }
      var S2 = [{ pts: Gp, color: "#ad5200", label: "persistance" }];
      if (mode !== "custom") S2.push({ pts: Ge, color: "#086b94", label: "prévision" });
      S2.push({ pts: [[n, m.E2_ref]], color: "#ad5200", marker: true }); if (mode !== "custom") S2.push({ pts: [[n, m.E2_model]], color: "#086b94", marker: true });
      $(box, ".ni-p2").innerHTML = plot(S2, { xlabel: "horizon n (pas)", ylabel: "RMSE", xmin: 1, xmax: lim, ymin: 0, aria: "RMSE de la prévision et de la persistance selon l’horizon" }) +
        (mode === "custom" ? '<p class="cvfr-note">Avec vos données, seule la persistance se recalcule : votre colonne de prévision correspond à un seul horizon.</p>' : "<p class=\"cvfr-note\">Tant que le bleu reste sous l’orange, NICE² reste sous 1.</p>");
    }
    wirePresets(box, P, function (p) { mode = p.mode; $(box, "#ni-n").value = p.n; upd(); });
    box.addEventListener("input", function (e) {
      if (e.target === ta) { mode = "custom"; markPreset(box, P, -1); }
      upd();
    });
    markPreset(box, P, 0); upd();
  }

  // ------------------------------------------------------------------ BLEND
  function mountBLEND(box) {
    var D = demoData(), real = null;
    var P = [
      { name: "Démonstration, h = 1", data: "demo", h: 1, text: "À 1 pas, la persistance manque la montée et la descente du Soleil, la persistance cyclique manque les nuages. Les mélanger réduit nettement l’erreur, et λ varie fortement d’une phase à l’autre." },
      { name: "Démonstration, h = 12", data: "demo", h: 12, text: "À une demi-période, la dernière valeur est à l’opposé du cycle : la persistance cyclique l’emporte et λ tombe près de 0." },
      { name: "Démonstration, h = 24", data: "demo", h: 24, text: "À h = T, la valeur une période plus tôt et la dernière valeur sont la même donnée. Les deux persistances coïncident : rien à mélanger, gain nul. Ce n’est pas une panne." },
      { name: "PV réel, 1 heure", data: "real", h: 2, text: "Puissance PV mesurée à Palaiseau, h = 2 pas de 30 min. Les poids diffèrent d’une heure à l’autre : c’est l’intérêt d’un poids par phase." },
      { name: "PV réel, 12 heures", data: "real", h: 24, text: "Puissance PV mesurée à Palaiseau, h = 24 pas de 30 min. La persistance recopie la nuit pour le jour : la persistance cyclique domine." }
    ];
    box.innerHTML = presets(P) + '<div class="cvt-sticky"><div class="cvfr-ctls">' +
      slide({ id: "bl-h", label: "Horizon h", min: 1, max: 24, step: 1, val: 1, tip: "Nombre de pas entre la dernière valeur connue et la valeur à prévoir." }) +
      slide({ id: "bl-ph", label: "Départ dans le cycle", min: 1, max: 24, step: 1, val: 1, tip: "Position dans le cycle de la dernière mesure connue. La cible est h pas plus tard." }) +
      slide({ id: "bl-l", label: "Votre λ", min: 0, max: 1, step: 0.01, val: 0.5, tip: "Le poids de la dernière valeur. λ = 1 : persistance. λ = 0 : persistance cyclique. Entre les deux, le même poids s’applique à toute la courbe du mélange manuel." }) +
      slide({ id: "bl-w", label: "Fenêtre affichée", min: 1, max: 30, step: 1, val: 1, tip: "Change seulement les trois périodes montrées sur le premier graphique. Aucun résultat chiffré n’en dépend." }) +
      '<div class="cvfr-ctl"><label for="bl-T">Période T (pas)</label>' + tip("Nombre de pas dans un cycle : 24 pour une journée au pas horaire, 48 au pas de 30 min.") + '<input type="number" id="bl-T" min="2" step="1" value="24"></div></div></div>' +
      '<div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="cvfr-cards bl-c"></div>' +
      '<div class="cvfr-charts">' + fig("Trois périodes, de nuit à nuit", "bl-p1", "Le mélange manuel utilise votre λ pour toute la fenêtre. BLEND garde son poids ajusté à chaque position du cycle.") + fig("Réglez λ : la RMSE de cette phase", "bl-p2", "<span class=\"bl-o2\"></span>") + fig("Le poids de BLEND selon le départ", "bl-p3", "Le départ est l’instant de la dernière mesure connue. À Palaiseau, le pas 1 correspond à minuit UTC, et le pas 5 à 02 h 00. La cible est h pas après le départ. Si les deux persistances sont toujours égales à un pas donné, BLEND prend λ = 0 par convention.") + fig("Ce que le mélange apporte selon l’horizon", "bl-p4", "<span class=\"bl-o4\"></span>") + "</div>" +
      '<details class="cvfr-det"><summary>Voir ou coller vos données</summary><label class="cvt-data" for="bl-d"><span>Une colonne, une ligne par pas de temps, régulièrement échantillonnée. Il faut au moins trois périodes.</span><textarea id="bl-d" rows="6" spellcheck="false"></textarea></label><p class="bl-src cvfr-note"></p></details>' +
      '<p class="cvfr-note">Les poids sont calculés sur toute la série, comme le code de référence par défaut. Le gain mesure ce que le mélange peut apporter, pas une performance future : pour évaluer, calculez les poids sur une période et testez sur une autre.</p>' + CHECK;
    var ta = $(box, "#bl-d"), lastKey = "";
    ta.value = D.x.join("\n");
    function errs(x, T, h) {
      var b = C.blendLS(x, T, h), sp = 0, sc = 0, k = 0;
      for (var t = T + 1; t <= x.length - h; t++, k++) { sp += Math.pow(x[t + h - 1] - x[t - 1], 2); sc += Math.pow(x[t + h - 1] - x[t + h - T - 1], 2); }
      return { b: b, p: Math.sqrt(sp / k), c: Math.sqrt(sc / k) };
    }
    function nightStart(x, T) {
      var prof = new Array(T).fill(0), cnt = new Array(T).fill(0), i, q;
      for (i = 0; i < x.length; i++) { prof[i % T] += x[i]; cnt[i % T]++; }
      for (q = 0; q < T; q++) prof[q] /= cnt[q];
      var mx = Math.max.apply(null, prof), lo = prof.map(function (v) { return v <= 0.02 * mx; }), bestLen = 0, bestMid = prof.indexOf(Math.min.apply(null, prof));
      for (q = 0; q < T; q++) { if (!lo[q] || lo[(q + T - 1) % T]) continue; var n = 0; while (n < T && lo[(q + n) % T]) n++; if (n > bestLen) { bestLen = n; bestMid = (q + Math.floor(n / 2)) % T; } }
      return bestMid;
    }
    function upd() {
      var pr = parse(ta.value, 1), x = pr.rows.map(function (r) { return r[0]; }), T = Math.round(val(box, "bl-T")), hEl = $(box, "#bl-h");
      hEl.max = Math.max(1, T); var h = +hEl.value; setOut(box, "bl-h", h + " pas");
      if (!(T >= 2) || x.length < 3 * T || h > T) { $(box, ".cvfr-verdict").innerHTML = "Il faut au moins trois périodes de données et h ≤ T."; return; }
      var e = errs(x, T, h), best = Math.min(e.p, e.c), gain = best > 0 ? 100 * (1 - e.b.rmse / best) : NaN, same = h === T;
      $(box, ".cvfr-verdict").innerHTML = same
        ? "<strong>À h = T, les deux persistances sont une seule et même prévision.</strong> BLEND ne peut rien leur ajouter."
        : "<strong>À cet horizon, " + a("blend", "BLEND") + " fait " + fr(gain, 1) + " % de " + a("eval", "RMSE") + " en moins</strong> que la meilleure des deux persistances, ici la " + (e.p < e.c ? a("pers", "persistance") : "persistance cyclique") + ".";
      $(box, ".bl-c").innerHTML = card("RMSE de BLEND", fr(e.b.rmse, 1), "Combinaison convexe de la persistance et de la persistance cyclique.") + card("RMSE de la persistance", fr(e.p, 1), "Recopie la dernière valeur connue.") + card("RMSE de la persistance cyclique", fr(e.c, 1), "Recopie la valeur une période plus tôt, au même moment du cycle.");
      var q0 = nightStart(x, T), k0 = ((q0 - T - h) % T + 2 * T) % T, nper = Math.max(1, Math.floor((e.b.pred.length - k0) / T) - 2), wEl = $(box, "#bl-w");
      wEl.max = nper; if (+wEl.value > nper) wEl.value = nper;
      var w = +wEl.value; setOut(box, "bl-w", w + " / " + nper);
      var lu = val(box, "bl-l");
      var i0 = k0 + (w - 1) * T, Pp = [], Cc = [], Bb = [], O = [], M = [];
      for (var k = i0; k < Math.min(e.b.pred.length, i0 + 3 * T + 1); k++) {
        var t = T + 1 + k, s = (k - i0) / T, latest = x[t - 1], previousCycle = x[t + h - T - 1];
        O.push([s, x[t + h - 1]]); Pp.push([s, latest]); Cc.push([s, previousCycle]); Bb.push([s, e.b.pred[k]]);
        M.push([s, (1 - lu) * previousCycle + lu * latest]);
      }
      $(box, ".bl-p1").innerHTML = plot([ { pts: O, color: "#172536", label: "observation" },
        { pts: M, color: "#7252a3", label: "mélange manuel (λ = " + fr(lu, 2) + ")", dash: "dotted" },
        { pts: Pp, color: "#ad5200", label: "persistance", thin: true, dash: true },
        { pts: Cc, color: "#697989", label: "persistance cyclique", thin: true, dash: true }, { pts: Bb, color: "#0f8a7e", label: "BLEND" }], { xlabel: "périodes (chaque graduation : milieu de la nuit)", ylabel: "signal", xmin: 0, xmax: 3, aria: "Prévisions et observation sur trois périodes" });
      var phEl = $(box, "#bl-ph"), key = T + "|" + h + "|" + x.length + "|" + x[0];
      phEl.max = T;
      if (key !== lastKey) { var bp = 0; e.b.lambda.forEach(function (l, p) { if (Math.abs(l - 0.5) < Math.abs(e.b.lambda[bp] - 0.5)) bp = p; }); phEl.value = bp + 1; lastKey = key; }
      var p = +phEl.value - 1, ls = e.b.lambda[p], ys = [], rs = [], cs = [];
      setOut(box, "bl-ph", (p + 1) + " / " + T); setOut(box, "bl-l", fr(lu, 2));
      for (t = T + 1; t <= x.length - h; t++) if ((t - 1) % T === p) { ys.push(x[t + h - 1]); rs.push(x[t - 1]); cs.push(x[t + h - T - 1]); }
      function E(l) { var s2 = 0; for (var i = 0; i < ys.length; i++) s2 += Math.pow(ys[i] - (1 - l) * cs[i] - l * rs[i], 2); return Math.sqrt(s2 / ys.length); }
      var par = []; for (var j = 0; j <= 50; j++) par.push([j / 50, E(j / 50)]);
      var flat = Math.abs(E(0) - E(1)) < 1e-9 && Math.abs(E(0) - E(0.5)) < 1e-9;
      $(box, ".bl-o2").innerHTML = flat ? "La courbe est plate à cette phase : les deux persistances y donnent la même valeur (en pleine nuit, ou à h = T). Votre λ ne change rien : c’est normal." :
        "Départ au pas " + (p + 1) + " : votre λ = " + fr(lu, 2) + " donne " + fr(E(lu), 1) + " ; le minimum, celui de BLEND, est λ = " + fr(ls, 2) + " avec " + fr(E(ls), 1) + ".";
      $(box, ".bl-p2").innerHTML = plot([{ pts: par, color: "#0f8a7e", label: "RMSE selon λ" }, { pts: [[lu, E(lu)]], color: "#7252a3", marker: true, label: "votre λ" }, { pts: [[ls, E(ls)]], color: "#0f8a7e", marker: true, label: "λ de BLEND" }], { xlabel: "λ (0 : persistance cyclique, 1 : persistance)", ylabel: "RMSE", xmin: 0, xmax: 1, ymin: 0, aria: "Erreur à une phase selon le poids du mélange" });
      $(box, ".bl-p3").innerHTML = plot([{ pts: e.b.lambda.map(function (l, i) { return [i + 1, l]; }), color: "#0f8a7e" }, { pts: [[p + 1, ls]], color: "#0f8a7e", marker: true }], { xlabel: "pas de départ dans le cycle", ylabel: "λ", xmin: 1, xmax: T, ymin: 0, ymax: 1, aria: "Poids de BLEND selon la phase" });
      var G = [], cross = 0;
      for (var hh = 1; hh <= T; hh++) { var r = errs(x, T, hh), ref = Math.min(r.p, r.c); if (ref > 0) G.push([hh, 100 * (1 - r.b.rmse / ref)]); if (!cross && r.c <= r.p) cross = hh; }
      var GS = [{ pts: G, color: "#0f8a7e" }]; if (isFinite(gain)) GS.push({ pts: [[h, gain]], color: "#0f8a7e", marker: true });
      $(box, ".bl-p4").innerHTML = plot(GS, { xlabel: "horizon h (pas)", ylabel: "gain (%)", xmin: 1, xmax: T, ymin: 0, aria: "Gain de BLEND selon l’horizon" });
      $(box, ".bl-o4").innerHTML = (cross ? "La persistance cyclique égale ou bat la persistance à partir de h = " + cross + " pas." : "La persistance reste devant à tous les horizons testés.") + " Le gain ne peut pas être négatif ici : le poids est choisi sur ces mêmes données et λ = 0 ou 1 reste possible.";
    }
    function loadReal(p) {
      function go(j) {
        real = j; ta.value = j.x.join("\n"); $(box, "#bl-T").value = j.T; $(box, "#bl-h").max = j.T; $(box, "#bl-h").value = p.h;
        $(box, ".bl-src").innerHTML = "Puissance AC (W), à partir du " + j.start_utc.slice(0, 10) + ", UTC ; phase 1 = 00 h 00, un pas = 30 min. <a href=\"https://doi.org/" + j.doi + "\">PV_ELM_pred</a>, exemple public.";
        upd();
      }
      if (real) { go(real); return; }
      fetch("/assets/tools/blend-palaiseau.json").then(function (r) { return r.json(); }).then(go).catch(function () { $(box, ".cvt-out").innerHTML = "Les données n’ont pas pu être chargées."; });
    }
    wirePresets(box, P, function (p) {
      $(box, "#bl-w").value = 1; $(box, "#bl-l").value = 0.5;
      if (p.data === "real") { loadReal(p); return; }
      ta.value = D.x.join("\n"); $(box, "#bl-T").value = 24; $(box, "#bl-h").max = 24; $(box, "#bl-h").value = p.h; $(box, ".bl-src").innerHTML = ""; upd();
    });
    box.addEventListener("input", function () { markPreset(box, P, -1); upd(); });
    markPreset(box, P, 0); upd();
  }

  // ------------------------------------------------------------------ sCV et F
  function mountSCV(box) {
    var T0 = 24, DAYS = 60, DF = 0.2;
    function gen(kind) {   // les ciels de demo_scv.m (dépôt solar-variability-scv), avec un générateur déterministe ; « days » est propre à cette page
      var s = 11, N = T0 * DAYS, cs = [], m = [], t, i;
      function u() { s = (s * 16807) % 2147483647; return s / 2147483647; }
      function g() { return Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u()); }
      function clip(v) { return Math.max(DF, Math.min(1, v)); }
      function mov(arr, k) { return arr.map(function (_, j) { var lo = Math.max(0, j - Math.floor(k / 2)), hi = k % 2 ? Math.min(arr.length - 1, j + Math.floor(k / 2)) : j, c = 0; for (i = lo; i <= hi; i++) c += arr[i]; return c / (hi - lo + 1); }); }
      for (t = 0; t < N; t++) { var h = t % T0; cs.push(h >= 6 && h <= 18 ? 1000 * Math.sin(Math.PI * (h - 6) / 12) : 0); }
      if (kind === "clear") m = cs.map(function () { return 1; });
      if (kind === "light") m = mov(cs.map(function () { return 1 - 0.08 * Math.abs(g()); }), 3).map(clip);
      if (kind === "broken") m = mov(cs.map(function () { return 1 - 0.45 * Math.abs(g()); }), 2).map(clip);
      if (kind === "reference") m = cs.map(function () { return u() < 0.5 ? 1 : DF; });
      if (kind === "days") { var day = []; for (t = 0; t < DAYS; t++) day.push(u() < 0.5 ? 1 : DF); m = cs.map(function (_, j) { return day[Math.floor(j / T0)]; }); }
      return { cs: cs.map(function (c) { return +c.toFixed(1); }), x: cs.map(function (c, j) { return +(c * m[j]).toFixed(1); }) };
    }
    var P = [
      { name: "Ciel clair", kind: "clear", text: "L’éclairement suit le ciel clair : sCV = 0, F = 1. Rien à prévoir au-delà du cycle du Soleil. F ne bouge pas avec l’horizon : c’est juste, il n’y a aucun écart à prévoir." },
      { name: "Voile léger", kind: "light", text: "De petits écarts au ciel clair : sCV faible, donc F reste près de 1 quel que soit l’horizon. Peu de variabilité, peu de difficulté." },
      { name: "Ciel fragmenté", kind: "broken", text: "Des nuages fréquents : la variabilité monte. L’écart au ciel clair garde pourtant la forme de la journée, nul la nuit, fort à midi : ρ<sub>max</sub> reste élevé à 1 pas." },
      { name: "Clair ou couvert au hasard", kind: "reference", text: "Chaque heure tire à pile ou face : ciel clair, ou seulement la fraction d de ciel clair. C’est le cas de référence de l’article : sCV proche de 1, et F basse, car peu de mémoire." },
      { name: "Journées entières couvertes", kind: "days", text: "Même amplitude que le cas précédent, mais le ciel reste le même toute la journée. La variabilité reste forte et la mémoire remonte F : un ciel très variable peut rester prévisible." }
    ];
    box.innerHTML = presets(P) + '<div class="cvt-sticky"><div class="cvfr-ctls">' +
      slide({ id: "sc-n", label: "Horizon n", min: 1, max: 12, step: 1, val: 1, tip: "Nombre de pas à l’avance, au plus T/2. sCV n’en dépend pas ; F, si." }) +
      slide({ id: "sc-dd", label: "Plancher diffus d", min: 0, max: 0.6, step: 0.05, val: 0.2, tip: "La fraction de ciel clair qui reste sous un nuage épais : 0,2 dans l’article. Il fixe l’échelle de sCV, proportionnelle à 1/(1 − d). Les séries chargées restent construites avec d = 0,2." }) +
      '<div class="cvfr-ctl"><label for="sc-T">Pas par jour T</label>' + tip("Nombre de pas dans une journée : 24 au pas horaire. La mémoire est cherchée entre l’horizon n et T/2.") + '<input type="number" id="sc-T" min="2" step="1" value="24"></div></div></div>' +
      '<div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="cvfr-cards sc-c"></div><div class="cvfr-charts">' +
      fig("Trois jours : éclairement mesuré et ciel clair", "sc-p1", "") + fig("La prévisibilité F selon l’horizon", "sc-p2", "F reste entre 1 − sCV (aucune mémoire) et 1 (mémoire totale). Elle ne peut que baisser ou rester stable quand l’horizon grandit : la mémoire est cherchée sur de moins en moins de retards.") + "</div>" +
      '<details class="cvfr-det"><summary>Voir ou coller vos données</summary><label class="cvt-data" for="sc-d"><span>Deux colonnes, une ligne par pas de temps : éclairement mesuré, puis éclairement de ciel clair, dans la même unité. Point ou virgule décimale.</span><textarea id="sc-d" rows="6" spellcheck="false"></textarea></label></details>' + CHECK;
    var ta = $(box, "#sc-d");
    function load(k) { var g = gen(k); ta.value = g.x.map(function (v, i) { return v + "\t" + g.cs[i]; }).join("\n"); }
    function upd() {
      var pr = parse(ta.value, 2), I = pr.rows.map(function (r) { return r[0]; }), Cl = pr.rows.map(function (r) { return r[1]; }), T = Math.round(val(box, "sc-T")), nEl = $(box, "#sc-n");
      nEl.max = Math.max(1, Math.floor(T / 2)); var n = +nEl.value, d = val(box, "sc-dd");
      setOut(box, "sc-n", n + " pas"); setOut(box, "sc-dd", fr(d, 2));
      if (!(T >= 2) || I.length <= T / 2 + 2 || n > T / 2) { $(box, ".cvfr-verdict").innerHTML = "Il faut plus de T/2 + 2 lignes et un horizon n ≤ T/2."; return; }
      var r = C.forecastability(I, Cl, T, n, d), noMem = !(r.rho_max >= 0);
      if (!isFinite(r.scv)) { $(box, ".cvfr-verdict").innerHTML = "sCV indéfini : le ciel clair est nul sur toutes les lignes."; return; }
      if (r.scv > 0 && noMem) { $(box, ".cvfr-verdict").innerHTML = "F indéfini : l’autocorrélation de l’écart au ciel clair n’existe à aucun retard (écart constant). sCV = " + fr(r.scv, 2) + "."; return; }
      $(box, ".cvfr-verdict").innerHTML = "<strong>" + a("scv", "Variabilité sCV") + " = " + fr(r.scv, 2) + ", prévisibilité F = " + fr(r.F, 2) + " à " + n + " pas.</strong> " +
        (r.scv === 0 ? "Aucun écart au ciel clair." : r.scv < 0.3 ? "Le ciel s’écarte peu du ciel clair." : r.rho_max >= 0.5 ? "Le ciel s’écarte du ciel clair, mais ces écarts durent : il reste de quoi prévoir." : "Le ciel s’écarte du ciel clair et ces écarts s’oublient vite : peu de prise à cet horizon.");
      $(box, ".sc-c").innerHTML = card("sCV", fr(r.scv, 2), "L’écart quadratique au ciel clair, rapporté au ciel clair. 0 : ciel clair. 1 : la référence d’un ciel très variable, pas un maximum.") +
        card("ρ<sub>max</sub>", r.scv === 0 ? "sans objet" : fr(r.rho_max, 2), r.scv === 0 ? "Il n’y a aucun écart dont mesurer la mémoire." : "La mémoire : la plus forte corrélation, en valeur absolue, entre l’écart au ciel clair et lui-même, de n à T/2 pas plus tôt. Atteinte ici à " + r.lag + " pas.") +
        card("F", fr(r.F, 2), "Prévisibilité : F = 1 + sCV × (ρ<sub>max</sub> − 1). Plus elle est haute, plus cet horizon est facile.");
      var w = Math.min(3 * T, I.length), i0 = Math.max(0, Math.min(I.length - w, 10 * T)), Io = [], Co = [];
      for (var i = i0; i < i0 + w; i++) { Io.push([(i - i0) / T, I[i]]); Co.push([(i - i0) / T, Cl[i]]); }
      $(box, ".sc-p1").innerHTML = plot([{ pts: Co, color: "#ad5200", label: "ciel clair", thin: true }, { pts: Io, color: "#172536", label: "éclairement mesuré" }], { xlabel: "jours", ylabel: "éclairement", xmin: 0, xmax: w / T, aria: "Éclairement et ciel clair sur trois jours" });
      var Fp = [], top = Math.floor(T / 2);
      for (var q = 1; q <= Math.min(top, 48); q++) Fp.push([q, C.forecastability(I, Cl, T, q, d).F]);
      var lo = 1 - r.scv, xm = Math.max(2, Fp.length);
      $(box, ".sc-p2").innerHTML = plot([{ pts: Fp, color: "#086b94", label: "F" }, { pts: [[1, 1], [xm, 1]], color: "#49834c", label: "1 : mémoire totale", thin: true }, { pts: [[1, lo], [xm, lo]], color: "#a8431f", label: "1 − sCV : aucune mémoire", thin: true }, { pts: [[n, r.F]], color: "#086b94", marker: true }],
        { xlabel: "horizon n (pas)", ylabel: "F", xmin: 1, xmax: xm, ymin: Math.min(0, lo - 0.05), ymax: 1.08, aria: "Prévisibilité selon l’horizon" });
    }
    wirePresets(box, P, function (p) { load(p.kind); $(box, "#sc-T").value = T0; $(box, "#sc-dd").value = 0.2; upd(); });
    box.addEventListener("input", function (e) { if (e.target === ta || e.target.id === "sc-T" || e.target.id === "sc-dd") markPreset(box, P, -1); upd(); });
    load("broken"); markPreset(box, P, 2); upd();
  }

  // ------------------------------------------------------------------ indice gamma
  function mountGamma(box) {
    var N = 40, DX = 0.5, DT = 5, NT = 19, TP = 9, timer = null, cmpKey = "", cmpRows = [];
    function scene(s, l, b, D, Tt, I) { return { n: N, nt: NT, tp: TP, dx: DX, dt: DT, I0: 800, depth: 500, sigma: 3, v: 0.2, cx: 7, cy: 10, shift: 0, shiftY: -s, lag: l, scale: 1, bias: b, DTA: D, TTA: Tt, IDT: I }; }
    var P = [
      { name: "Nuage décalé de 2 km", s: 2, l: 0, b: 0, text: "Le nuage est bien prévu, mais 2 km trop au nord. La RMSE le compte deux fois : là où il était prévu, là où il se trouve. γ l’accepte : le décalage reste dans la tolérance de distance." },
      { name: "Retard de 30 min", s: 0, l: 30, b: 0, text: "Le bon nuage, en retard. La RMSE monte fortement, mais chaque pixel trouve la bonne valeur dans la tolérance de temps. Réduisez TTA pour voir γ devenir sévère." },
      { name: "Biais de 80 W/m²", s: 0, l: 0, b: 80, text: "Le nuage est au bon endroit, mais toute la carte est 80 W/m² trop claire. La RMSE reste modérée ; γ rejette la plupart des pixels : dans le ciel clair, 80 dépasse IDT = 50 W/m² et aucune observation n’est aussi claire." },
      { name: "Nuage décalé de 6 km", s: 6, l: 0, b: 0, text: "Un décalage trois fois plus grand que DTA. Attention : le GPR reste élevé, car la plus grande partie de la carte est du ciel clair sans erreur. Regardez γ<sub>max</sub> et la carte, pas seulement le GPR." },
      { name: "Tolérances strictes", s: 3, l: 0, b: 0, D: 0.5, Tt: 5, I: 10, text: "Un décalage de 3 km jugé avec 0,5 km, 5 min et 10 W/m². Le GPR chute : les tolérances font partie du résultat, elles se choisissent selon l’usage, avant de comparer des prévisions." }
    ];
    box.innerHTML = presets(P) +
      '<div class="cvfr-panel"><p class="cvfr-note"><strong>L’erreur de la prévision</strong></p><div class="cvfr-ctls">' +
      slide({ id: "gm-s", label: "Décalage vers le nord", min: 0, max: 6, step: 0.25, val: 2, tip: "Le nuage prévu est déplacé perpendiculairement à son mouvement." }) +
      slide({ id: "gm-l", label: "Retard (+) ou avance (−)", min: -30, max: 30, step: 5, val: 0, tip: "Le nuage se déplace vers l’est à 12 km/h : 30 min de retard le placent 6 km trop à l’ouest." }) +
      slide({ id: "gm-b", label: "Biais", min: -80, max: 80, step: 5, val: 0, tip: "Toute la carte prévue est trop claire (+) ou trop sombre (−), en W/m²." }) +
      '</div><p class="cvfr-note"><strong>Les tolérances : ce qu’on accepte</strong></p><div class="cvfr-ctls">' +
      slide({ id: "gm-dta", label: "DTA", min: 0.5, max: 3, step: 0.5, val: 2, tip: "Tolérance de distance : le décalage acceptable en km. Une maille de la grille dans l’article, soit environ 2 km." }) +
      slide({ id: "gm-tta", label: "TTA", min: 5, max: 30, step: 5, val: 30, tip: "Tolérance de temps : le décalage acceptable en minutes. 30 min dans l’article." }) +
      slide({ id: "gm-idt", label: "IDT", min: 10, max: 100, step: 5, val: 50, tip: "Tolérance d’intensité : l’écart acceptable en W/m². 50 W/m² dans l’article." }) +
      '</div><div class="cvfr-presets"><button type="button" class="cvfr-pre" id="gm-art">Tolérances de l’article</button><button type="button" class="cvfr-pre" id="gm-play" aria-pressed="false">▶ Éloigner le nuage prévu</button></div></div>' +
      '<div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="cvfr-cards gm-c"></div>' +
      '<div class="cvt-maps"><figure><canvas width="40" height="40" id="gm-obs"></canvas><figcaption>Observation (sombre : nuage)</figcaption></figure><figure><canvas width="40" height="40" id="gm-pred"></canvas><figcaption>Prévision</figcaption></figure><figure><canvas width="40" height="40" id="gm-err"></canvas><figcaption>Erreur point par point (rouge : forte)</figcaption></figure><figure><canvas width="40" height="40" id="gm-g"></canvas><figcaption>γ (vert : accepté, rouge : rejeté)</figcaption></figure></div>' +
      '<div class="cvfr-tw gm-t"></div>' +
      '<p class="cvfr-note">Scène synthétique : ciel clair à 800 W/m², un nuage de −500 W/m² se déplaçant vers l’est à 12 km/h, grille de 0,5 km sur 20 km, une observation toutes les 5 min. Pour chaque pixel, γ cherche l’observation la plus proche à l’intérieur de 1,5 DTA et 1,5 TTA. Illustration de la définition, pas un résultat de l’article. Le terme temporel suit l’article ; la fonction MATLAB archivée le traite différemment.</p>' + CHECK;
    function paint(id, M, f) { var c = $(box, "#" + id), ctx = c.getContext("2d"), img = ctx.createImageData(N, N); for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) { var k = (i * N + j) * 4, q = f(M[i][j]); img.data[k] = q[0]; img.data[k + 1] = q[1]; img.data[k + 2] = q[2]; img.data[k + 3] = 255; } ctx.putImageData(img, 0, 0); }
    function sky(v) { var t = Math.max(0, Math.min(1, (v - 250) / 600)); return [60 + 190 * t, 90 + 160 * t, 140 + 105 * t]; }
    function errc(v) { var t = Math.min(1, v / 300); return [255 - 75 * t, 255 - 200 * t, 255 - 220 * t]; }
    function gcol(g) { if (g <= 1) { var t = g; return [220 - 160 * (1 - t), 240 - 60 * (1 - t), 220 - 140 * (1 - t)]; } var u = Math.min(1, (g - 1) / 2); return [235 - 40 * u, 150 - 110 * u, 130 - 100 * u]; }
    function compareTable(D, Tt, I, cur) {
      var key = [D, Tt, I].join("|");
      if (key !== cmpKey) {
        cmpKey = key;
        var cases = [["Prévision exacte", 0, 0, 0], ["Décalé de 2 km", 2, 0, 0], ["Décalé de 6 km", 6, 0, 0], ["Retard de 15 min", 0, 15, 0], ["Retard de 30 min", 0, 30, 0], ["Biais de 40 W/m²", 0, 0, 40], ["Biais de 80 W/m²", 0, 0, 80]];
        cmpRows = cases.map(function (c) { var o = scene(c[1], c[2], c[3], D, Tt, I), s = C.cloudScene(o), g = C.gamma(s.pred, s.obs, o); return { name: c[0], s: c[1], l: c[2], b: c[3], g: g }; });
      }
      $(box, ".gm-t").innerHTML = '<table class="cvfr-t"><caption class="cvfr-note">Sept erreurs, mêmes tolérances : la RMSE et γ ne les classent pas dans le même ordre.</caption><thead><tr><th>Erreur</th><th>RMSE (W/m²)</th><th>GPR</th><th>γ moyen</th></tr></thead><tbody>' + cmpRows.map(function (r) {
        var on = r.s === cur[0] && r.l === cur[1] && r.b === cur[2];
        return "<tr" + (on ? ' class="on"' : "") + '><th scope="row">' + r.name + "</th><td>" + fr(r.g.rmse, 0) + "</td><td>" + fr(r.g.gpr, 0) + " %</td><td>" + fr(r.g.mean, 2) + "</td></tr>";
      }).join("") + "</tbody></table>";
    }
    function upd() {
      var S = val(box, "gm-s"), L = val(box, "gm-l"), Bi = val(box, "gm-b"), D = val(box, "gm-dta"), Tt = val(box, "gm-tta"), I = val(box, "gm-idt"), o = scene(S, L, Bi, D, Tt, I);
      setOut(box, "gm-s", fr(S, 2) + " km"); setOut(box, "gm-l", fr(L, 0) + " min"); setOut(box, "gm-b", fr(Bi, 0) + " W/m²"); setOut(box, "gm-dta", fr(D, 1) + " km"); setOut(box, "gm-tta", fr(Tt, 0) + " min"); setOut(box, "gm-idt", fr(I, 0) + " W/m²");
      var s = C.cloudScene(o), g = C.gamma(s.pred, s.obs, o), obs = s.obs[TP], bad = 0;
      var E = s.pred.map(function (r, i) { return r.map(function (v, j) { return Math.abs(v - obs[i][j]); }); });
      E.forEach(function (r) { r.forEach(function (v) { if (v > I) bad++; }); });
      paint("gm-obs", obs, sky); paint("gm-pred", s.pred, sky); paint("gm-err", E, errc); paint("gm-g", g.map, gcol);
      var ok = g.gpr > 80 && g.mean < 0.7;
      $(box, ".cvfr-verdict").innerHTML = g.rmse === 0 ? "<strong>Prévision exacte :</strong> RMSE nulle, γ nul partout." :
        "<strong>La RMSE dit " + fr(g.rmse, 0) + " W/m². γ accepte " + fr(g.gpr, 0) + " % des pixels.</strong> " + (ok ? "Les deux repères pratiques de l’article sont respectés (GPR &gt; 80 %, γ moyen &lt; 0,7)." : "Au moins un repère pratique de l’article n’est pas respecté (GPR &gt; 80 %, γ moyen &lt; 0,7).");
      $(box, ".gm-c").innerHTML = card("GPR", fr(g.gpr, 1) + " %", "La part des pixels acceptés (γ ≤ 1).") + card("γ moyen", fr(g.mean, 2), "La distance moyenne à la meilleure observation, en unités de tolérance.") + card("γ<sub>max</sub>", fr(g.max, 2), "Le pixel le moins acceptable de la carte.") + card("RMSE", fr(g.rmse, 0) + " W/m²", "L’erreur point par point, sans tolérance. " + fr(100 * bad / (N * N), 0) + " % des pixels dépassent IDT.");
      compareTable(D, Tt, I, [S, L, Bi]);
    }
    function apply(p) { $(box, "#gm-s").value = p.s; $(box, "#gm-l").value = p.l; $(box, "#gm-b").value = p.b; $(box, "#gm-dta").value = p.D || 2; $(box, "#gm-tta").value = p.Tt || 30; $(box, "#gm-idt").value = p.I || 50; upd(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } var b = $(box, "#gm-play"); b.textContent = "▶ Éloigner le nuage prévu"; b.setAttribute("aria-pressed", "false"); }
    wirePresets(box, P, function (p) { stop(); apply(p); });
    $(box, "#gm-art").addEventListener("click", function () { $(box, "#gm-dta").value = 2; $(box, "#gm-tta").value = 30; $(box, "#gm-idt").value = 50; markPreset(box, P, -1); $(box, ".cvfr-case").innerHTML = "Les tolérances de l’article sur la Corse : 2 km, 30 min, 50 W/m². Elles se choisissent selon l’usage : gardez l’erreur, changez les tolérances : γ change."; upd(); });
    $(box, "#gm-play").addEventListener("click", function () {
      if (timer) { stop(); return; }
      var b = this, s = $(box, "#gm-s"); b.textContent = "❚❚ Arrêter"; b.setAttribute("aria-pressed", "true"); s.value = 0; $(box, "#gm-l").value = 0; $(box, "#gm-b").value = 0; markPreset(box, P, -1);
      timer = setInterval(function () { var v = +s.value + 0.25; if (v > 6) { stop(); return; } s.value = v; upd(); }, 260);
    });
    box.addEventListener("input", function () { stop(); markPreset(box, P, -1); upd(); });
    markPreset(box, P, 0); apply(P[0]);
  }

  // ------------------------------------------------------------------ ARTU
  function mountARTU(box) {
    box.innerHTML = '<p class="cvfr-note">Chargement des tables de coefficients du dépôt ARTU…</p>';
    fetch("/assets/artu/artu-tables.json").then(function (r) { return r.json(); }).then(function (t) { buildARTU(box, t); })
      .catch(function () { box.innerHTML = '<p class="cvfr-note">Les tables n’ont pas pu être chargées.</p>'; });
  }
  function buildARTU(box, tab) {
    var RS = ["0", "0.01", "0.05", "0.1"], mapKey = "";
    function Rf(r) { return r.replace(".", ","); }
    var P = [
      { name: "Exemple de l’article", r1: 0.4, r2: 0.3, R: "0.05", text: "ρ(h) = 0,4, ρ(2h) = 0,3, R = 0,05 : l’exemple de l’article et du code K_alpha.m. La moitié du poids va à la moyenne : la mémoire est modeste." },
      { name: "Forte mémoire", r1: 0.8, r2: 0.65, R: "0.05", text: "Le signal ressemble longtemps à lui-même : l’essentiel du poids va à la dernière valeur, la moyenne compte peu." },
      { name: "Presque aucune mémoire", r1: 0.05, r2: 0.02, R: "0.05", text: "Le passé récent n’apporte presque rien : le meilleur pari est la moyenne d’entraînement, comme pour un signal aléatoire." },
      { name: "Signal qui alterne", r1: -0.4, r2: 0.1, R: "0.05", text: "Une valeur haute annonce plutôt une valeur basse. Le poids de la dernière valeur devient négatif et celui de la moyenne dépasse 1. Ce n’est pas une erreur : leur somme vaut toujours 1." }
    ];
    box.innerHTML = presets(P) + '<div class="cvt-sticky"><div class="cvfr-ctls">' +
      slide({ id: "ar-1", label: "Mémoire ρ(h)", min: -0.95, max: 0.95, step: 0.01, val: 0.4, tip: "Autocorrélation au retard h : la ressemblance du signal avec lui-même h pas plus tôt. Calculée sur les données d’entraînement." }) +
      slide({ id: "ar-2", label: "Mémoire ρ(2h)", min: -0.95, max: 0.95, step: 0.01, val: 0.3, tip: "La même ressemblance, 2h pas plus tôt." }) +
      '<div class="cvfr-ctl"><label for="ar-R">Bruit de mesure R</label>' + tip("R = variance du bruit de mesure / variance du signal. 0 : mesure parfaite. 0,1 : la variance du bruit fait 10 % de celle du signal. L’article prend 0,05 quand l’erreur de mesure n’est pas connue.") +
      '<select id="ar-R">' + RS.map(function (r) { return '<option value="' + r + '"' + (r === "0.05" ? " selected" : "") + ">" + Rf(r) + "</option>"; }).join("") + "</select></div>" +
      '<div class="cvfr-ctl"><label for="ar-m">Carte affichée</label>' + tip("K et α sont les deux coefficients lus dans la table de l’article. Seuls leur somme et leur produit entrent dans la prévision.") + '<select id="ar-m"><option value="K">K</option><option value="alpha">α</option></select></div></div></div>' +
      '<div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="cvfr-charts"><figure class="cvfr-fig"><h3>Les poids de la prévision</h3><p class="cvt-eq ar-eq"></p><div class="ar-w"></div><div class="cvfr-tw ar-t"></div><p class="ar-h"></p></figure>' +
      '<figure class="cvfr-fig"><h3>La carte des coefficients</h3><div class="cvt-mapbox"><canvas width="200" height="200" aria-hidden="true"></canvas><svg viewBox="0 0 200 200" class="cvt-over" role="img" aria-label="Carte des coefficients selon les deux autocorrélations ; cliquer pour choisir un point"></svg></div><p class="cvt-scale"><span>−1</span><i></i><span>+1</span></p>' +
      "<p>Horizontale : ρ(h). Verticale : ρ(2h). Cliquez sur la carte. Traits noirs : ρ(h) = 0 et la parabole ρ(2h) = ρ(h)², qui délimitent les zones de K décrites dans l’article. Zone grisée : ρ(2h) &lt; 2ρ(h)² − 1, impossible pour une série stationnaire ; c’est une propriété générale des autocorrélations.</p></figure></div>" +
      '<p class="cvfr-note">Tables M(R) du <a href="https://github.com/cyrilvoyant/ARTU">dépôt ARTU</a>, au pas de 0,05, interpolées linéairement comme dans <code>K_alpha.m</code>. En prévision solaire, y est l’<a href="' + LINKS.cours + '">indice de ciel clair</a>.</p>' + CHECK;
    var cv = $(box, "canvas"), ctx = cv.getContext("2d"), svg = $(box, ".cvt-over");
    function color(v) { var t = Math.max(-1, Math.min(1, v)), m = Math.abs(t), c = t < 0 ? [7, 86, 154] : [180, 81, 58]; return [255 + (c[0] - 255) * m, 255 + (c[1] - 255) * m, 255 + (c[2] - 255) * m]; }
    function R() { return $(box, "#ar-R").value; }
    function which() { return $(box, "#ar-m").value; }
    function drawMap() {
      var key = R() + which(); if (key === mapKey) return; mapKey = key;
      var img = ctx.createImageData(200, 200), M = which();
      for (var py = 0; py < 200; py++) for (var px = 0; px < 200; px++) {
        var r1 = -1 + 2 * (px + 0.5) / 200, r2 = 1 - 2 * (py + 0.5) / 200, k = (py * 200 + px) * 4, c = color(C.artuLookup(tab, r1, r2, R())[M]);
        if (r2 < 2 * r1 * r1 - 1) c = [c[0] * 0.55 + 205 * 0.45, c[1] * 0.55 + 210 * 0.45, c[2] * 0.55 + 216 * 0.45];
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    function X(r) { return (r + 1) * 100; } function Y(r) { return (1 - r) * 100; }
    function upd() {
      var r1 = val(box, "ar-1"), r2 = val(box, "ar-2"), Rv = R();
      setOut(box, "ar-1", fr(r1, 2)); setOut(box, "ar-2", fr(r2, 2)); drawMap();
      var par = "", fea = "";
      for (var x = -1; x <= 1.0001; x += 0.02) { par += (par ? "L" : "M") + X(x).toFixed(1) + " " + Y(x * x).toFixed(1); fea += (fea ? "L" : "M") + X(x).toFixed(1) + " " + Y(2 * x * x - 1).toFixed(1); }
      svg.innerHTML = '<line x1="100" x2="100" y1="0" y2="200" stroke="#172536" stroke-width="1"/><path d="' + par + '" fill="none" stroke="#172536" stroke-width="1.2"/><path d="' + fea + '" fill="none" stroke="#6b7c8c" stroke-width="1"/><circle cx="' + X(r1) + '" cy="' + Y(r2) + '" r="5" fill="#fff" stroke="#172536" stroke-width="2"/>';
      var out = $(box, ".cvfr-verdict"), W = $(box, ".ar-w");
      if (r2 < 2 * r1 * r1 - 1) {
        out.innerHTML = "<strong>Ce couple ne peut pas venir d’une série stationnaire</strong> (ρ(2h) &lt; 2ρ(h)² − 1). Choisissez un point hors de la zone grisée.";
        W.innerHTML = ""; $(box, ".ar-eq").innerHTML = ""; $(box, ".ar-t").innerHTML = ""; $(box, ".ar-h").innerHTML = ""; return;
      }
      var c = C.artuLookup(tab, r1, r2, Rv), wy = c.S, wl = -c.P, wm = 1 + c.P - c.S;
      function signed(v) { return (v < 0 ? "− " : "+ ") + "<strong>" + fr(Math.abs(v), 2) + "</strong>"; }
      $(box, ".ar-eq").innerHTML = "ŷ(t + h) = <strong>" + fr(wy, 2) + "</strong> y(t) " + signed(wl) + " y(t − h) " + signed(wm) + " ȳ<br><small>y(t) : la série (en prévision solaire, l’indice de ciel clair) ; ŷ(t + h) : la prévision à l’horizon h ; ȳ : la moyenne d’entraînement.</small>";
      var big = wm > wy && wm > wl ? "la moyenne d’entraînement" : wy >= wl ? "la dernière valeur" : "la valeur h pas plus tôt";
      out.innerHTML = "<strong>Le plus gros poids va à " + big + ".</strong> Deux autocorrélations et une table suffisent : ici α = " + fr(c.alpha, 2) + ", K = " + fr(c.K, 2) + ", donc S = α + K = " + fr(c.S, 2) + " et P = αK = " + fr(c.P, 2) + ".";
      var bars = [["dernière valeur y(t)", wy, "#07569a"], ["valeur h pas plus tôt y(t − h)", wl, "#3c8d5a"], ["moyenne d’entraînement ȳ", wm, "#b4513a"]], sc = Math.max(1.5, Math.abs(wy), Math.abs(wl), Math.abs(wm));
      W.innerHTML = bars.map(function (b) { var w = 50 * Math.abs(b[1]) / sc, l = b[1] < 0 ? 50 - w : 50; return '<div class="cvfr-w"><span>' + b[0] + '</span><div><i style="left:' + l + "%;width:" + w + "%;background:" + b[2] + '"></i></div><b>' + fr(b[1], 2) + "</b></div>"; }).join("");
      $(box, ".ar-t").innerHTML = '<table class="cvfr-t"><caption class="cvfr-note">Les mêmes poids selon le bruit de mesure R.</caption><thead><tr><th>R</th><th>y(t)</th><th>y(t − h)</th><th>ȳ</th></tr></thead><tbody>' + RS.map(function (r) { var q = C.artuLookup(tab, r1, r2, r); return "<tr" + (r === Rv ? ' class="on"' : "") + '><th scope="row">' + Rf(r) + "</th><td>" + fr(q.S, 2) + "</td><td>" + fr(-q.P, 2) + "</td><td>" + fr(1 + q.P - q.S, 2) + "</td></tr>"; }).join("") + "</tbody></table>";
      $(box, ".ar-h").innerHTML = "La somme des trois poids vaut 1. K et α peuvent échanger leurs rôles sans changer la prévision : seuls S et P comptent. Si R ne change presque rien à ce point, c’est que les tables y donnent presque les mêmes coefficients." + (wy > 1 ? " Un poids supérieur à 1 prolonge la tendance récente." : "");
    }
    function pick(e) {
      var r = svg.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      $(box, "#ar-1").value = Math.max(-0.95, Math.min(0.95, -1 + 2 * (p.clientX - r.left) / r.width)).toFixed(2);
      $(box, "#ar-2").value = Math.max(-0.95, Math.min(0.95, 1 - 2 * (p.clientY - r.top) / r.height)).toFixed(2);
      markPreset(box, P, -1); upd();
    }
    var down = false;
    svg.addEventListener("pointerdown", function (e) { down = true; if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId); pick(e); });
    svg.addEventListener("pointermove", function (e) { if (down) pick(e); });
    svg.addEventListener("pointerup", function () { down = false; });
    wirePresets(box, P, function (p) { $(box, "#ar-1").value = p.r1; $(box, "#ar-2").value = p.r2; $(box, "#ar-R").value = p.R; upd(); });
    box.addEventListener("input", function () { markPreset(box, P, -1); upd(); });
    markPreset(box, P, 0); upd();
  }

  // ------------------------------------------------------------------ LQ et LQL
  function mountLQL(box) {
    var TIS = [["Rectum (tissu sain)", 3.9, 7.8], ["Moelle épinière (tissu sain)", 2, 4], ["Poumon (tissu sain)", 3.1, 6.2], ["Prostate (tumeur)", 3.1, 6.2], ["Tumeur standard", 10, 20]];
    var P = [
      { name: "Petites fractions : 30 × 2 Gy", n: 30, d: 2, text: "La dose par fraction reste sous la dose de transition : LQ et LQL sont le même calcul. Bougez α/β : le résultat change ; l’écart entre les modèles reste nul, et c’est mathématiquement juste." },
      { name: "Autour du seuil : 5 × 8 Gy", n: 5, d: 8, text: "Pour le rectum, la dose de transition est 7,8 Gy : on la franchit à peine et les deux modèles restent presque confondus." },
      { name: "Dose unique : 1 × 15 Gy", n: 1, d: 15, text: "Bien au-dessus de la dose de transition du rectum, LQ continue de monter en courbe alors que LQL monte en ligne droite : LQ donne une valeur nettement plus élevée." },
      { name: "Très forte dose : 1 × 25 Gy", n: 1, d: 25, text: "L’écart se creuse encore : c’est dans ce domaine que le choix du modèle pèse le plus." }
    ];
    box.innerHTML = presets(P) + '<div class="cvt-sticky"><div class="cvfr-ctls">' +
      slide({ id: "lq-d", label: "Dose par fraction d", min: 0.5, max: 25, step: 0.1, val: 15, tip: "La dose d’une séance, en gray (Gy)." }) +
      slide({ id: "lq-n", label: "Nombre de fractions n", min: 1, max: 40, step: 1, val: 1, tip: "Le nombre de séances. La BED est proportionnelle à n : l’écart relatif entre LQ et LQL n’en dépend donc pas. C’est normal." }) +
      '<div class="cvfr-ctl"><label for="lq-tis">Tissu</label>' + tip("Paramètres de la bibliothèque de LQL-Equiv, pour comparer des courbes. Rien ici n’est une recommandation.") + '<select id="lq-tis">' + TIS.map(function (t, i) { return '<option value="' + i + '">' + t[0] + "</option>"; }).join("") + '<option value="-1">Réglage libre</option></select></div>' +
      slide({ id: "lq-ab", label: "α/β", min: 0.4, max: 20, step: 0.1, val: 3.9, tip: "Paramètre du modèle linéaire-quadratique, en Gy. Plus il est faible, plus le tissu est sensible à la dose par fraction." }) +
      slide({ id: "lq-dt", label: "Dose de transition d<sub>T</sub>", min: 0.8, max: 32, step: 0.1, val: 7.8, tip: "Au-dessus de cette dose par fraction, LQL passe de la courbe à une droite. Dans la bibliothèque de LQL-Equiv, d<sub>T</sub> = 2 α/β." }) +
      slide({ id: "lq-g", label: "Pente γ/α", min: 1, max: 15, step: 0.1, val: 5, tip: "La pente de la droite au-dessus de d<sub>T</sub>, sans unité. LQL-Equiv prend 5." }) +
      '</div></div><div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="cvfr-cards lq-c"></div><div class="cvfr-charts">' + fig("BED selon la dose par fraction", "lq-p", "Le trait vertical marque d<sub>T</sub>, les points la dose choisie. Sous d<sub>T</sub>, les deux courbes n’en font qu’une.") + "</div>" + CHECK;
    function upd() {
      var d = val(box, "lq-d"), n = val(box, "lq-n"), ab = val(box, "lq-ab"), dt = val(box, "lq-dt"), g = val(box, "lq-g");
      setOut(box, "lq-d", fr(d, 1) + " Gy"); setOut(box, "lq-n", n); setOut(box, "lq-ab", fr(ab, 1) + " Gy"); setOut(box, "lq-dt", fr(dt, 1) + " Gy"); setOut(box, "lq-g", fr(g, 1));
      var lq = C.bedLQ(n, d, ab), lql = C.bedLQL(n, d, ab, dt, g), pct = 100 * (lq / lql - 1), slope = 1 + 2 * dt / ab, smooth = Math.abs(slope - g) < 0.05;
      var head = "<strong>" + n + " × " + fr(d, 1) + " Gy : ";
      $(box, ".cvfr-verdict").innerHTML = d <= dt ? head + "LQ et LQL sont identiques,</strong> car d reste sous d<sub>T</sub>."
        : pct >= 0.5 ? head + "LQ donne une BED supérieure de " + fr(pct, 0) + " % à celle de LQL.</strong>"
          : pct <= -0.5 ? head + "LQL dépasse LQ de " + fr(-pct, 0) + " %.</strong> Cela arrive quand la pente γ/α dépasse celle de la courbe LQ, un réglage hors de la bibliothèque de LQL-Equiv."
            : head + "LQ et LQL restent à moins de 1 % l’un de l’autre.</strong>";
      $(box, ".lq-c").innerHTML = card("BED LQ", fr(lq, 1) + " Gy", "BED = n d (1 + d / (α/β)). La BED, dose biologiquement efficace, permet de comparer des fractionnements différents.") + card("BED LQL", fr(lql, 1) + " Gy", "La même formule sous d<sub>T</sub> ; au-dessus, une droite de pente γ/α.") + card("Raccord à d<sub>T</sub>", smooth ? "sans cassure" : "avec cassure", "La courbe LQ a pour pente " + fr(slope, 1) + " à d<sub>T</sub> : 1 + 2 d<sub>T</sub> / (α/β). Si γ/α vaut cette pente, la droite prolonge la courbe.");
      var A = [], B = [];
      for (var x = 0.5; x <= 25.001; x += 0.25) { A.push([x, C.bedLQ(n, x, ab)]); B.push([x, C.bedLQL(n, x, ab, dt, g)]); }
      $(box, ".lq-p").innerHTML = plot([{ pts: A, color: "#b4513a", label: "LQ" }, { pts: B, color: "#07569a", label: "LQL" }, { pts: [[d, lq]], color: "#b4513a", marker: true }, { pts: [[d, lql]], color: "#07569a", marker: true }], { xlabel: "dose par fraction (Gy)", ylabel: "BED (Gy)", xmin: 0, xmax: 25, vlines: dt <= 25 ? [dt] : [], aria: "BED selon la dose par fraction, modèles LQ et LQL" });
    }
    wirePresets(box, P, function (p) { $(box, "#lq-n").value = p.n; $(box, "#lq-d").value = p.d; $(box, "#lq-tis").value = 0; $(box, "#lq-ab").value = 3.9; $(box, "#lq-dt").value = 7.8; $(box, "#lq-g").value = 5; upd(); });
    box.addEventListener("input", function (e) {
      if (e.target.id === "lq-tis") { var t = TIS[+e.target.value]; if (t) { $(box, "#lq-ab").value = t[1]; $(box, "#lq-dt").value = t[2]; $(box, "#lq-g").value = 5; } }
      else if (/lq-(ab|dt|g)$/.test(e.target.id)) $(box, "#lq-tis").value = "-1";
      markPreset(box, P, -1);
      upd();
    });
    markPreset(box, P, 2); upd();
  }

  // ------------------------------------------------------------------ modèle thyroïde
  function mountThyroid(box) {
    var P = [
      { name: "Réfractaire : 4 séances", Td: 9.8, n: 4, l: 3, A: 3.7, text: "Le temps de doublement court l’emporte après la dernière séance : la thyroglobuline simulée baisse, puis remonte." },
      { name: "Réfractaire : 8 séances", Td: 9.8, n: 8, l: 3, A: 3.7, text: "Davantage de séances contiennent la remontée plus longtemps : c’est l’intensification explorée par l’article pour ce profil." },
      { name: "Répondeur : 4 séances", Td: 66.6, n: 4, l: 3, A: 3.7, text: "Avec le même protocole, le temps de doublement long laisse la thyroglobuline simulée descendre durablement." },
      { name: "Répondeur : activité réduite", Td: 66.6, n: 3, l: 6, A: 1.1, text: "Moins d’activité et des séances plus espacées : pour ce profil, l’article cherche l’activité minimale efficace. Le modèle montre ce que ce choix change, il ne le recommande pas." }
    ];
    box.innerHTML = presets(P) + '<div class="cvt-sticky"><div class="cvfr-ctls"><div class="cvfr-ctl"><label for="th-p">Profil du modèle</label>' + tip("Défini par le temps de doublement T<sub>d</sub> des cellules tumorales : la durée en mois pour que leur nombre double sans traitement.") +
      '<select id="th-p"><option value="9.8">réfractaire, doublement en 9,8 mois</option><option value="66.6">répondeur, doublement en 66,6 mois</option></select></div>' +
      slide({ id: "th-n", label: "Séances", min: 1, max: 8, step: 1, val: 4, tip: "Le nombre d’administrations d’iode radioactif." }) +
      slide({ id: "th-l", label: "Espacement", min: 1, max: 8, step: 1, val: 3, tip: "Le nombre de mois entre deux séances." }) +
      slide({ id: "th-a", label: "Activité par séance", min: 1, max: 8, step: 0.1, val: 3.7, tip: "L’activité d’iode administrée à chaque séance, en gigabecquerels (GBq)." }) +
      '<div class="cvfr-ctl"><label for="th-log">Axe vertical</label>' + tip("L’échelle logarithmique montre aussi les très petites valeurs : chaque graduation vaut dix fois la précédente.") + '<select id="th-log"><option value="0">linéaire</option><option value="1">logarithmique</option></select></div></div></div>' +
      '<div class="cvfr-verdict cvt-out" aria-live="polite"></div><div class="cvfr-cards th-c"></div><div class="cvfr-charts">' + fig("Thyroglobuline simulée sur 80 mois", "th-plot", "Les traits verticaux marquent les séances. L’autre profil suit le même protocole. Un trait qui s’arrête sort de l’axe.") + "</div>" +
      '<p class="cvfr-note">Paramètres des démonstrateurs publics RAIR-Sim, ceux de l’équipe de l’article. Sorties du modèle pour deux profils types : ni prédiction pour un patient, ni recommandation.</p>' + CHECK;
    function small(v) { return v < 0.1 ? "&lt; 0,1" : fr(v, v < 10 ? 1 : 0); }
    function upd() {
      var Td = +$(box, "#th-p").value, n = val(box, "th-n"), l = val(box, "th-l"), A = val(box, "th-a"), lg = $(box, "#th-log").value === "1";
      setOut(box, "th-n", n); setOut(box, "th-l", l + " mois"); setOut(box, "th-a", fr(A, 1) + " GBq");
      var other = Td < 30 ? 66.6 : 9.8, pts = C.thyroidTg({ Td: Td, sessions: n, lag: l, activity: A, h: 0.01 }), pto = C.thyroidTg({ Td: other, sessions: n, lag: l, activity: A, h: 0.01 }), none = C.thyroidTg({ Td: Td, sessions: 1, lag: 80, activity: 0, h: 0.01 });
      var last = pts[pts.length - 1][1], lastO = pto[pto.length - 1][1], mn = Infinity, tm = 0;
      pts.forEach(function (p) { if (p[1] < mn) { mn = p[1]; tm = p[0]; } });
      var rebound = tm < 79.5 && last > 1.05 * mn, name = Td < 30 ? "réfractaire" : "répondeur", nameO = Td < 30 ? "répondeur" : "réfractaire";
      $(box, ".cvfr-verdict").innerHTML = "<strong>Après 80 mois, la thyroglobuline simulée vaut " + small(last) + " ng/mL pour le profil " + name + "</strong>, contre " + small(lastO) + " ng/mL pour le profil " + nameO + " avec le même protocole. " + (rebound ? "Elle atteint son minimum vers le mois " + fr(tm, 0) + ", puis remonte." : "Elle baisse jusqu’au bout de la simulation.");
      $(box, ".th-c").innerHTML = card("Tg à 80 mois", small(last) + " ng/mL", "Tg : la thyroglobuline, le marqueur sanguin suivi. Le modèle part de 100 ng/mL, comme dans les simulations de l’article.") + card("Minimum", small(mn) + " ng/mL", "Atteint vers le mois " + fr(tm, 0) + ".") + card("Sans aucune séance", small(none[none.length - 1][1]) + " ng/mL", "La même équation, activité nulle. Une partie de la baisse du début ne vient pas de l’iode : le modèle élimine la thyroglobuline avec une demi-vie d’environ 2,2 mois.");
      function thin(q) { return q.filter(function (p, i) { return i % 20 === 0; }); }
      var main = thin(pts), oth = thin(pto), peak = Math.max.apply(null, main.map(function (p) { return p[1]; })), v = [];
      for (var i = 0; i < n; i++) v.push(i * l);
      $(box, ".th-plot").innerHTML = plot([{ pts: oth, color: "#8a96a3", label: "profil " + nameO, thin: true }, { pts: main, color: "#b4513a", label: "profil " + name }], lg ? { xlabel: "mois", ylabel: "Tg (ng/mL)", xmin: 0, xmax: 80, log: true, ymin: 0.01, ymax: Math.max(peak, Math.max.apply(null, oth.map(function (p) { return p[1]; }))) * 1.1, vlines: v, aria: "Thyroglobuline sur 80 mois" }
        : { xlabel: "mois", ylabel: "Tg (ng/mL)", xmin: 0, xmax: 80, ymin: 0, ymax: Math.max(110, peak * 1.05), vlines: v, aria: "Thyroglobuline sur 80 mois" });
    }
    wirePresets(box, P, function (p) { $(box, "#th-p").value = p.Td; $(box, "#th-n").value = p.n; $(box, "#th-l").value = p.l; $(box, "#th-a").value = p.A; upd(); });
    box.addEventListener("input", function (e) { if (e.target.id !== "th-log") markPreset(box, P, -1); upd(); });
    markPreset(box, P, 0); upd();
  }

  var MOUNT = { lql: mountLQL, thyroid: mountThyroid, nice: mountNICE, blend: mountBLEND, scv: mountSCV, artu: mountARTU, gamma: mountGamma };
  function start() {
    style(); wireTips();
    [].forEach.call(document.querySelectorAll(".cvt[data-tool]"), function (box) {
      var f = MOUNT[box.getAttribute("data-tool")];
      if (f && !box.dataset.cvfr) { box.dataset.cvfr = "1"; box.classList.add("cvfr"); f(box); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
