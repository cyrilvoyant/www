/* ELM lab (page « Comprendre l'ELM », 13 Nov 2026). An extreme learning machine trained in the browser, with the
   recipe of PV_ELM_pred (elm_common.py, dr_elm_ridge.py, utils.py): lags standardized + 4 cyclic time features,
   H = sigmoid(X IW' + bias) with IW ~ U(-1, 1) and bias ~ U(0, 1) drawn once then frozen, target centred and scaled,
   beta = (H'H + lam I)^-1 H'z, 100 candidate layers ranked by expanding-window temporal cross-validation (k = 5),
   best one refitted on the whole training set, test set scored once. Teaching choices of this page (Cyril):
   80 % of the series for training and optimisation, the last 20 % for the test; each of the three settings
   (inputs, hidden neurons, lam) is either fixed or optimised by grid search; pasted data are limited to 2000 values.
   Checked value by value against the Python reference work/elm_page/elm_ref.py. No data file, no dependency;
   pasted data never leave the browser. */
(function (root) {
  "use strict";
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) { var u = Math.max(rnd(), 1e-12), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var FH = 1, K = 5, NCAND = 100, RATIO = 0.8, NMIN = 200, NMAX = 2000, GRID = [1, 10, 25], LBS = [1, 3, 6, 12, 24], NHS = [5, 10, 25, 50, 100];
  function makeDataset(values, isday, spd) {
    var data = values.slice(0, NMAX), day = [], clip = true, i;
    for (i = 0; i < data.length; i++) { day.push(isday ? !!isday[i] : true); if (data[i] < 0) clip = false; }
    return { data: data, isday: day, spd: spd, clip: clip, masked: !!isday };
  }
  var SYN = (function () {
    var rnd = mulberry32(7), x = 0, t, h, k, s, d = [], day = [];
    for (t = 0; t < 24 * 40; t++) {
      h = t % 24; x = 0.9 * x + 0.45 * gauss(rnd);
      k = Math.min(1, Math.max(0.08, 0.72 + 0.32 * x));
      s = (h > 6 && h < 18) ? Math.sin(Math.PI * (h - 6) / 12) : 0;
      d.push(850 * Math.pow(s, 1.2) * k); day.push(s > 0);
    }
    return makeDataset(d, day, 24);
  })();
  function prepare(D, LB, cyc) {
    var data = D.data, spd = D.spd, n = LB + FH, m = data.length + 1 - n, d = LB + (cyc ? 4 : 0), X = [], y = [], mu = [], sd = [], i, j, v, s;
    for (j = 0; j < LB; j++) {
      s = 0; for (i = 0; i < m; i++) s += data[i + j]; mu.push(s / m);
      v = 0; for (i = 0; i < m; i++) v += Math.pow(data[i + j] - mu[j], 2); v = Math.sqrt(v / (m - 1)); sd.push(v === 0 ? 1 : v);
    }
    for (i = 0; i < m; i++) {
      var r = new Float64Array(d), idx = i + LB + FH - 1, h = (idx % spd) * (24 / spd), dj = Math.floor(idx / spd) % 365.25;
      for (j = 0; j < LB; j++) r[j] = (data[i + j] - mu[j]) / sd[j];
      if (cyc) {
        r[LB] = Math.sin(2 * Math.PI * h / 24); r[LB + 1] = Math.cos(2 * Math.PI * h / 24);
        r[LB + 2] = Math.sin(2 * Math.PI * dj / 365.25); r[LB + 3] = Math.cos(2 * Math.PI * dj / 365.25);
      }
      X.push(r); y.push(data[idx]);
    }
    return { X: X, y: y, m: m, d: d, sp: Math.floor(RATIO * m), LB: LB, D: D, off: LB + FH - 1, cyc: !!cyc };
  }
  function layer(nh, d, rnd) {
    var IW = [], b = new Float64Array(nh), i, j, w;
    for (i = 0; i < nh; i++) { w = new Float64Array(d); for (j = 0; j < d; j++) w[j] = 2 * rnd() - 1; IW.push(w); }
    for (i = 0; i < nh; i++) b[i] = rnd();
    return { IW: IW, b: b };
  }
  function hrow(x, L, out) {
    var nh = L.b.length, d = x.length, i, j, a, w;
    for (i = 0; i < nh; i++) { w = L.IW[i]; a = L.b[i]; for (j = 0; j < d; j++) a += w[j] * x[j]; out[i] = 1 / (1 + Math.exp(-a)); }
    return out;
  }
  function solve(A, g, lam) {      // (A + lam I) x = g with A symmetric positive semi-definite; A and g are left untouched
    var n = g.length, M = [], i, j, k, t, Mi, Mj, ok = true, y = new Float64Array(n), x = new Float64Array(n);
    for (i = 0; i < n; i++) { M.push(Float64Array.from(A[i])); M[i][i] += lam; }
    for (i = 0; i < n && ok; i++) {              // Cholesky, lower triangle in place
      Mi = M[i];
      for (j = 0; j <= i; j++) {
        Mj = M[j]; t = Mi[j]; for (k = 0; k < j; k++) t -= Mi[k] * Mj[k];
        if (j < i) Mi[j] = t / Mj[j]; else if (t > 1e-10 * (A[i][i] + lam)) Mi[i] = Math.sqrt(t); else ok = false;
      }
    }
    if (ok) {
      for (i = 0; i < n; i++) { t = g[i]; Mi = M[i]; for (k = 0; k < i; k++) t -= Mi[k] * y[k]; y[i] = t / Mi[i]; }
      for (i = n - 1; i >= 0; i--) { t = y[i]; for (k = i + 1; k < n; k++) t -= M[k][i] * x[k]; x[i] = t / M[i][i]; }
      return x;
    }
    return solveLU(A, g, lam);                   // nearly singular system (almost no Ridge): pivoting instead
  }
  function solveLU(A, g, lam) {    // Gaussian elimination with partial pivoting
    var n = g.length, M = [], y = Float64Array.from(g), i, j, k, p, f, t;
    for (i = 0; i < n; i++) { M.push(Float64Array.from(A[i])); M[i][i] += lam; }
    for (k = 0; k < n; k++) {
      p = k; for (i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (p !== k) { t = M[k]; M[k] = M[p]; M[p] = t; t = y[k]; y[k] = y[p]; y[p] = t; }
      for (i = k + 1; i < n; i++) { f = M[i][k] / M[k][k]; if (f !== 0) { var Mi = M[i], Mk = M[k]; for (j = k; j < n; j++) Mi[j] -= f * Mk[j]; y[i] -= f * y[k]; } }
    }
    var x = new Float64Array(n);
    for (i = n - 1; i >= 0; i--) { t = y[i]; for (j = i + 1; j < n; j++) t -= M[i][j] * x[j]; x[i] = t / M[i][i]; }
    return x;
  }
  function bounds(n) { var b = [], j; for (j = 0; j <= K; j++) b.push(Math.round(n * j / K)); return b; }
  /* One candidate layer: mean validation RMSE over the K-1 expanding-window folds, for each lam of the grid.
     The fit blocks are nested, so H'H, H'y and H'1 are accumulated once and reused by every fold. */
  function scoreCandidate(S, L, grid) {
    var nh = L.b.length, n = S.sp, B = bounds(n), H = [], clip = S.D.clip, i, j, k, f, r, q, sums = grid.map(function () { return 0; });
    for (i = 0; i < n; i++) H.push(hrow(S.X[i], L, new Float64Array(nh)));
    var G = [], gy = new Float64Array(nh), g1 = new Float64Array(nh), sy = 0;
    for (i = 0; i < nh; i++) G.push(new Float64Array(nh));
    for (f = 1; f < K; f++) {
      for (i = B[f - 1]; i < B[f]; i++) {
        r = H[i]; sy += S.y[i];
        for (j = 0; j < nh; j++) { var rj = r[j], Gj = G[j]; gy[j] += rj * S.y[i]; g1[j] += rj; for (k = 0; k <= j; k++) Gj[k] += rj * r[k]; }
      }
      for (j = 0; j < nh; j++) for (k = 0; k < j; k++) G[k][j] = G[j][k];     // mirror the lower triangle
      var nf = B[f], mu = sy / nf, v = 0; for (i = 0; i < nf; i++) v += Math.pow(S.y[i] - mu, 2); var sd = Math.sqrt(v / (nf - 1)); if (!(sd > 0)) sd = 1;
      var rhs = new Float64Array(nh); for (j = 0; j < nh; j++) rhs[j] = (gy[j] - mu * g1[j]) / sd;
      for (q = 0; q < grid.length; q++) {
        var beta = solve(G, rhs, grid[q]), se = 0, p;
        for (i = B[f]; i < B[f + 1]; i++) { r = H[i]; p = 0; for (j = 0; j < nh; j++) p += r[j] * beta[j]; p = p * sd + mu; if (clip && p < 0) p = 0; se += Math.pow(p - S.y[i], 2); }
        sums[q] += Math.sqrt(se / (B[f + 1] - B[f]));
      }
    }
    return sums.map(function (s) { return s / (K - 1); });
  }
  function metrics(S, a, b, fn) {   // as utils.py: night forced to 0 then only the masked points are scored
    var se = 0, sa = 0, sb = 0, sm = 0, c = 0, i, e, ys = [];
    for (i = a; i < b; i++) { if (!S.D.isday[i + S.off]) continue; e = fn(i) - S.y[i]; se += e * e; sa += Math.abs(e); sb += e; sm += S.y[i]; ys.push(S.y[i]); c++; }
    var my = sm / c, vy = 0; for (i = 0; i < c; i++) vy += Math.pow(ys[i] - my, 2);
    return { rmse: Math.sqrt(se / c), nrmse: Math.sqrt(se / c) / my, nmae: sa / c / my, nmbe: sb / c / my, r2: 1 - se / vy, mean: my };
  }
  function refit(S, L, lam) {
    var nh = L.b.length, n = S.sp, G = [], i, j, k, r, mu = 0, v = 0, H = [], data = S.D.data;
    for (i = 0; i < nh; i++) G.push(new Float64Array(nh));
    for (i = 0; i < n; i++) mu += S.y[i]; mu /= n; for (i = 0; i < n; i++) v += Math.pow(S.y[i] - mu, 2); var sd = Math.sqrt(v / (n - 1)); if (!(sd > 0)) sd = 1;
    var rhs = new Float64Array(nh);
    for (i = 0; i < S.m; i++) H.push(hrow(S.X[i], L, new Float64Array(nh)));
    for (i = 0; i < n; i++) { r = H[i]; var z = (S.y[i] - mu) / sd; for (j = 0; j < nh; j++) { rhs[j] += r[j] * z; for (k = 0; k < nh; k++) G[j][k] += r[j] * r[k]; } }
    var beta = solve(G, rhs, lam), pred = new Float64Array(S.m), p;
    for (i = 0; i < S.m; i++) { r = H[i]; p = 0; for (j = 0; j < nh; j++) p += r[j] * beta[j]; p = p * sd + mu; pred[i] = (S.D.clip && p < 0) ? 0 : p; }
    /* linear reference (AR): same inputs plus an intercept, least squares (tiny ridge 1e-8 so that the system is always solvable) */
    var na = S.d + 1, GA = [], ra = new Float64Array(na), x, a = new Float64Array(na), arp = new Float64Array(S.m);
    for (i = 0; i < na; i++) GA.push(new Float64Array(na));
    for (i = 0; i < n; i++) { x = S.X[i]; a[0] = 1; for (j = 1; j < na; j++) a[j] = x[j - 1]; for (j = 0; j < na; j++) { ra[j] += a[j] * S.y[i]; for (k = 0; k < na; k++) GA[j][k] += a[j] * a[k]; } }
    var w = solve(GA, ra, 1e-8);
    for (i = 0; i < S.m; i++) { x = S.X[i]; p = w[0]; for (j = 1; j < na; j++) p += w[j] * x[j - 1]; arp[i] = (S.D.clip && p < 0) ? 0 : p; }
    return { pred: pred, S: S, train: metrics(S, 0, n, function (i) { return pred[i]; }), test: metrics(S, n, S.m, function (i) { return pred[i]; }),
      pers: metrics(S, n, S.m, function (i) { return data[i + S.LB - 1]; }),
      ar: { pred: arp, coefs: na, train: metrics(S, 0, n, function (i) { return arp[i]; }), test: metrics(S, n, S.m, function (i) { return arp[i]; }) } };
  }
  function search(D, LB, nh, grid, seed, cyc) {   // synchronous version, used by the check; the page runs the same steps in slices
    var S = prepare(D, LB, cyc !== false), rnd = mulberry32(seed), best = { cv: Infinity }, cands = [], c, q, L, row;
    for (c = 0; c < NCAND; c++) {
      L = layer(nh, S.d, rnd); row = scoreCandidate(S, L, grid); cands.push(row);
      for (q = 0; q < grid.length; q++) if (row[q] < best.cv) best = { cv: row[q], L: L, lam: grid[q], c: c };
    }
    var R = refit(S, best.L, best.lam);
    return { cands: cands, best: best.c, lam: best.lam, cv: best.cv, train: R.train, test: R.test, pers: R.pers, ar: R.ar };
  }
  function parse(text) {
    var out = [], bad = 0;
    String(text).split(/[\s;]+/).forEach(function (t) { if (!t) return; var v = Number(t.replace(",", ".")); if (isFinite(v)) out.push(v); else bad++; });
    return { values: out, bad: bad };
  }
  var core = { SYN: SYN, makeDataset: makeDataset, search: search, parse: parse, GRID: GRID, LBS: LBS, NHS: NHS };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }

  var box = document.getElementById("elm-lab"); if (!box) return;
  var fr = (document.documentElement.lang || "").slice(0, 2) === "fr";
  function T(a, b) { return fr ? a : b; }
  function f(x, d) { return isFinite(x) ? Number(x).toLocaleString(fr ? "fr-FR" : "en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–"; }
  function fv(x) { var a = Math.abs(x); if (a < 1e-9) return "0"; return f(x, a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3); }
  function lamTxt(l) { return l < 1 ? "10⁻⁶" : String(l); }
  var OPT = T("optimiser", "optimise");
  function sel(id, vals, def, suffix) {
    return '<select id="' + id + '">' + vals.map(function (v) { return '<option value="' + v + '"' + (v === def ? " selected" : "") + ">" + v + (suffix || "") + "</option>"; }).join("") +
      '<option value="opt"' + (def === "opt" ? " selected" : "") + ">" + OPT + " (" + vals.join(", ") + ")</option></select>";
  }
  var st = { lb: 6, nh: 25, rg: "opt", cyc: true, day: 0, seed: 42, view: "test", run: 0, res: null, D: SYN, user: false };
  box.innerHTML =
    '<div class="el-ctl"><label>' + T("Entrées : valeurs passées", "Inputs: past values") + " " + sel("el-lb", LBS, 6) + "</label>" +
    "<label>" + T("Neurones cachés", "Hidden neurons") + " " + sel("el-nh", NHS, 25) + "</label>" +
    "<label>Ridge : λ " + '<select id="el-rg"><option value="opt" selected>' + OPT + ' (1, 10, 25)</option><option value="1">1</option><option value="10">10</option><option value="25">25</option><option value="1e-6">' + T("sans Ridge (10⁻⁶, presque 0)", "no Ridge (10⁻⁶, almost 0)") + "</option></select></label>" +
    '<label class="el-chk"><span><input type="checkbox" id="el-cyc" checked> ' + T("+ 4 entrées d’horloge", "+ 4 clock inputs") + "</span><small>sin(2πh/24), cos(2πh/24), sin(2π" + T("j", "d") + "/365" + T(",", ".") + "25), cos(2π" + T("j", "d") + "/365" + T(",", ".") + "25)</small></label>" +
    '<button type="button" id="el-new">' + T("Relancer avec 100 nouveaux candidats", "Run again with 100 new candidates") + "</button></div>" +
    '<p class="muted el-hint">' + T("Chaque réglage peut être fixé ou mis sur « optimiser » : un, deux ou les trois. Toutes les combinaisons sont alors essayées (recherche sur grille), avec 100 candidats chacune.", "Each setting can be fixed or set to “optimise”: one, two or all three. Every combination is then tried (grid search), with 100 candidates each.") + "</p>" +
    '<p class="el-msg el-status" id="el-optmsg" aria-live="polite"></p>' +
    '<p class="el-tabs" role="group" aria-label="' + T("Période affichée", "Period shown") + '"><button type="button" data-v="train" aria-pressed="false">' + T("Apprentissage (80 %)", "Training (80%)") + '</button><button type="button" data-v="test" class="on" aria-pressed="true">' + T("Test (20 %, jamais vu)", "Test (20%, never seen)") + "</button></p>" +
    '<svg id="el-plot" viewBox="0 0 640 250" role="img" aria-label="' + T("Mesure, prévisions de l’ELM et du modèle linéaire AR, persistance, sur trois jours", "Measurement, ELM and linear AR forecasts, persistence, over three days") + '"></svg>' +
    '<p class="el-scroll"><label for="el-day">' + T("Faire défiler les jours", "Scroll through the days") + '</label> <input type="range" id="el-day" min="0" max="0" step="1" value="0"> <span id="el-daylab" class="muted"></span></p>' +
    '<p class="el-leg"><span class="k3"></span>' + T("mesure", "measurement") + ' <span class="k4"></span>ELM <span class="k6"></span>' + T("AR (modèle linéaire)", "AR (linear model)") + ' <span class="k2"></span>' + T("persistance", "persistence") + "</p>" +
    '<div class="el-wrap" id="el-met" aria-live="polite"></div>' +
    '<details class="el-more"><summary>' + T("Voir l’optimisation : les 100 candidats et la grille", "Show the optimisation: the 100 candidates and the grid") + "</summary>" +
    '<div class="el-wrap" id="el-grid"></div>' +
    '<svg id="el-opt" viewBox="0 0 640 230" role="img" aria-label="' + T("Erreur de validation de chacun des 100 candidats", "Validation error of each of the 100 candidates") + '"></svg>' +
    '<p class="el-msg" id="el-optnote"></p></details>' +
    '<details class="el-more"><summary>' + T("Voir le modèle retenu : schéma et comptes", "Show the model kept: diagram and counts") + "</summary>" +
    '<svg id="el-net" viewBox="0 0 640 272" role="img" aria-label="' + T("Schéma du réseau retenu : entrées, couche cachée aléatoire et figée, poids de sortie ajustés", "Diagram of the network kept: inputs, random frozen hidden layer, fitted output weights") + '"></svg>' +
    '<p class="el-leg"><span class="k5"></span>' + T("liaisons tirées au hasard, jamais modifiées", "connections drawn at random, never changed") + ' <span class="k4"></span>' + T("poids calculés en une résolution", "weights computed in one solve") + "</p>" +
    '<div class="el-cards"></div></details>' +
    '<details class="el-more el-user"><summary>' + T("Essayer avec mes données", "Try with my own data") + "</summary>" +
    "<p>" + T("Collez une série à pas de temps régulier, une valeur par ligne (espaces et points-virgules acceptés ; virgule ou point décimal). De " + NMIN + " à " + NMAX + " valeurs : au-delà, seules les " + NMAX + " premières sont gardées. Les 80 premiers pour cent servent à l’apprentissage et à l’optimisation, les 20 derniers au test. Vos données restent dans votre navigateur : rien n’est envoyé.",
      "Paste a series with a regular time step, one value per line (spaces and semicolons accepted; decimal comma or point). From " + NMIN + " to " + NMAX + " values: beyond that, only the first " + NMAX + " are kept. The first 80 percent are used for training and optimisation, the last 20 percent for the test. Your data stay in your browser: nothing is sent.") + "</p>" +
    "<label>" + T("Pas de temps", "Time step") + ' <select id="el-spd"><option value="24">1 h</option><option value="48">30 min</option><option value="96">15 min</option><option value="144">10 min</option><option value="1">' + T("1 jour", "1 day") + "</option></select></label>" +
    '<textarea id="el-txt" rows="6" spellcheck="false" aria-label="' + T("Vos données", "Your data") + '" placeholder="412.5&#10;398.1&#10;…"></textarea>' +
    '<p><button type="button" id="el-use">' + T("Utiliser ces données", "Use these data") + '</button> <button type="button" id="el-back">' + T("Revenir à l’exemple", "Back to the example") + '</button></p><p class="el-msg" id="el-umsg" aria-live="polite"></p></details>';
  var NS = "http://www.w3.org/2000/svg", so = box.querySelector("#el-opt"), sp = box.querySelector("#el-plot");
  function q(s) { return box.querySelector(s); }
  function el(n, a, txt) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; }
  function clr(s) { while (s.firstChild) s.removeChild(s.firstChild); }
  function card(a, b, c) { return '<div class="el-card"><span>' + a + "</span><b>" + b + "</b><small>" + c + "</small></div>"; }
  function unit() { return st.user ? "" : " W"; }
  function drawOpt(vals, bestC, done) {
    clr(so); if (!vals.length) return;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), X0 = 56, X1 = 630, Y0 = 195, Y1 = 26, k, i;
    var top = Math.min(hi, lo * 2.2), span = Math.max(top - lo, lo * 0.02, 1e-9), a = lo - 0.08 * span, b = top + 0.08 * span;
    function py(v) { return Y0 - (Math.min(v, b) - a) / (b - a) * (Y0 - Y1); }
    for (k = 0; k <= 4; k++) { var v = a + (b - a) * k / 4; so.appendChild(el("line", { x1: X0, x2: X1, y1: py(v), y2: py(v), "class": "el-grid" })); so.appendChild(el("text", { x: X0 - 6, y: py(v) + 4, "class": "el-tick", "text-anchor": "end" }, fv(v))); }
    so.appendChild(el("text", { x: 4, y: 10, "class": "el-tick" }, T("RMSE de validation", "validation RMSE") + (st.user ? "" : " (W)")));
    so.appendChild(el("text", { x: (X0 + X1) / 2, y: 224, "class": "el-tick", "text-anchor": "middle" }, T("candidat n° 1 à 100", "candidate no. 1 to 100")));
    if (done) so.appendChild(el("line", { x1: X0, x2: X1, y1: py(vals[bestC]), y2: py(vals[bestC]), "class": "el-bestline" }));
    for (i = 0; i < vals.length; i++) {
      var cx = X0 + 6 + i / 99 * (X1 - X0 - 12);
      if (vals[i] > b) so.appendChild(el("path", { d: "M" + (cx - 3) + " " + (Y1 + 6) + "L" + cx + " " + Y1 + "L" + (cx + 3) + " " + (Y1 + 6) + "Z", "class": "el-cand" }));
      else so.appendChild(el("circle", { cx: cx, cy: py(vals[i]), r: i === bestC ? 6 : 3.2, "class": i === bestC ? "el-best" : "el-cand" }));
    }
  }
  function drawGrid(P) {
    var g = q("#el-grid"); if (P.lbs.length * P.nhs.length === 1) { g.innerHTML = ""; return; }
    var all = [], i, j; P.cv.forEach(function (r) { r.forEach(function (v) { if (v != null) all.push(v); }); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var h = '<table class="el-heat"><caption>' + T("RMSE de validation du meilleur candidat, pour chaque combinaison (plus clair = meilleur)", "Validation RMSE of the best candidate, for each combination (lighter = better)") + "</caption><thead><tr><th>" + T("entrées ↓ / neurones →", "inputs ↓ / neurons →") + "</th>" + P.nhs.map(function (v) { return "<th>" + v + "</th>"; }).join("") + "</tr></thead><tbody>";
    for (i = 0; i < P.lbs.length; i++) {
      h += "<tr><th>" + P.lbs[i] + "</th>";
      for (j = 0; j < P.nhs.length; j++) {
        var v = P.cv[i][j];
        if (v == null) h += '<td class="' + (P.cur && P.cur[0] === i && P.cur[1] === j ? "el-run" : "") + '">' + (P.cur && P.cur[0] === i && P.cur[1] === j ? "…" : "") + "</td>";
        else h += '<td style="background:rgba(8,107,148,' + (hi > lo ? 0.04 + 0.34 * (v - lo) / (hi - lo) : 0.04).toFixed(3) + ')"' + (P.best && P.best.i === i && P.best.j === j ? ' class="el-top"' : "") + ">" + fv(v) + "</td>";
      }
      h += "</tr>";
    }
    g.innerHTML = h + "</tbody></table>";
  }
  function drawPlot() {
    clr(sp); var R = st.res; if (!R) return;
    var S = R.S, D = S.D, spd = D.spd, n = Math.max(3 * spd, 60), a = st.view === "train" ? 0 : S.sp, b = st.view === "train" ? S.sp : S.m, i0 = a, i, k;
    n = Math.min(n, b - a);
    if (spd > 1) { var sh = (spd - ((a + S.off) % spd)) % spd; if (a + sh + n <= b) i0 = a + sh; }   // start at midnight when possible
    var stepn = spd > 1 ? spd : Math.max(1, Math.floor(n / 3)), maxk = Math.max(0, Math.floor((b - i0 - n) / stepn)), sl = q("#el-day");
    if (st.day > maxk) st.day = maxk; sl.max = maxk; sl.value = st.day; sl.disabled = maxk === 0; i0 += st.day * stepn;
    q("#el-daylab").textContent = spd > 1 ? T("jours ", "days ") + (Math.floor((i0 + S.off) / spd) + 1) + T(" à ", " to ") + (Math.floor((i0 + S.off + n - 1) / spd) + 1) + T(" sur ", " of ") + Math.ceil(D.data.length / spd)
      : T("valeurs ", "values ") + (i0 + S.off + 1) + T(" à ", " to ") + (i0 + S.off + n);
    var lo = Infinity, hi = -Infinity; for (i = 0; i < D.data.length; i++) { if (D.data[i] < lo) lo = D.data[i]; if (D.data[i] > hi) hi = D.data[i]; }
    if (lo > 0 && lo < 0.3 * hi) lo = 0; if (hi === lo) hi = lo + 1; hi += 0.05 * (hi - lo);
    var X0 = 56, X1 = 632, Y0 = 215, Y1 = 24;
    function px(i) { return X0 + (i - i0) / (n - 1) * (X1 - X0); } function py(v) { return Y0 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (Y0 - Y1); }
    for (k = 0; k <= 3; k++) { var v = lo + (hi - lo) * k / 3; sp.appendChild(el("line", { x1: X0, x2: X1, y1: py(v), y2: py(v), "class": "el-grid" })); sp.appendChild(el("text", { x: X0 - 6, y: py(v) + 4, "class": "el-tick", "text-anchor": "end" }, fv(v))); }
    if (!st.user) sp.appendChild(el("text", { x: 4, y: 10, "class": "el-tick" }, "W"));
    if (spd > 1) for (k = 0; k * spd < n; k++) {
      if (k) sp.appendChild(el("line", { x1: px(i0 + k * spd), x2: px(i0 + k * spd), y1: Y0, y2: Y1, "class": "el-grid" }));
      if ((k + 0.5) * spd <= n) sp.appendChild(el("text", { x: px(i0 + (k + 0.5) * spd), y: 238, "class": "el-tick", "text-anchor": "middle" }, T("jour ", "day ") + (Math.floor((i0 + S.off) / spd) + 1 + k)));
    } else sp.appendChild(el("text", { x: (X0 + X1) / 2, y: 238, "class": "el-tick", "text-anchor": "middle" }, T("valeurs n° ", "values no. ") + (i0 + S.off + 1) + T(" à ", " to ") + (i0 + S.off + n)));
    function path(fn) { var s = ""; for (i = i0; i < i0 + n; i++) s += (i === i0 ? "M" : "L") + px(i).toFixed(1) + " " + py(fn(i)).toFixed(1); return s; }
    function night(i, v) { return D.isday[i + S.off] ? v : 0; }
    sp.appendChild(el("path", { d: path(function (i) { return S.y[i]; }), "class": "el-true" }));
    sp.appendChild(el("path", { d: path(function (i) { return night(i, D.data[i + S.LB - 1]); }), "class": "el-pers" }));
    sp.appendChild(el("path", { d: path(function (i) { return night(i, R.ar.pred[i]); }), "class": "el-ar" }));
    sp.appendChild(el("path", { d: path(function (i) { return night(i, R.pred[i]); }), "class": "el-fit" }));
  }
  function drawNet(P) {            // diagram of the configuration kept: inputs, random frozen hidden layer, fitted output weights
    var sn = q("#el-net"); clr(sn); var B = P.best, lb = B.lb, nh = B.nh, ck = st.cyc ? 4 : 0, i, j;
    function column(n, max) { var a = [], k; if (n <= max) { for (k = 0; k < n; k++) a.push(k); } else { for (k = 0; k < max - 2; k++) a.push(k); a.push(-1); a.push(n - 1); } return a; }
    var past = column(lb, 5).map(function (k) { return { k: k, c: "el-n-in" }; }), clock = [], hid = column(nh, 8).map(function (k) { return { k: k, c: "el-n-h" }; });
    for (i = 0; i < ck; i++) clock.push({ k: i, c: "el-n-ck" });
    var ins = past.concat(clock), XI = 150, XH = 340, XO = 520, Y0 = 44, Y1 = 236;
    function place(a, x) { a.forEach(function (o, i) { o.x = x; o.y = a.length === 1 ? (Y0 + Y1) / 2 : Y0 + (Y1 - Y0) * i / (a.length - 1); }); }
    place(ins, XI); place(hid, XH); var out = { x: XO, y: (Y0 + Y1) / 2 };
    ins.forEach(function (a) { if (a.k < 0) return; hid.forEach(function (h) { if (h.k >= 0) sn.appendChild(el("line", { x1: a.x, y1: a.y, x2: h.x, y2: h.y, "class": "el-w-r" })); }); });
    hid.forEach(function (h) { if (h.k >= 0) sn.appendChild(el("line", { x1: h.x, y1: h.y, x2: out.x, y2: out.y, "class": "el-w-b" })); });
    var CL = ["sin h", "cos h", T("sin j", "sin d"), T("cos j", "cos d")];
    ins.forEach(function (a, i) {
      if (a.k < 0) { sn.appendChild(el("text", { x: a.x, y: a.y + 6, "class": "el-dots", "text-anchor": "middle" }, "⋮")); return; }
      sn.appendChild(el("circle", { cx: a.x, cy: a.y, r: 8, "class": a.c }));
      sn.appendChild(el("text", { x: a.x - 14, y: a.y + 4, "class": "el-tick", "text-anchor": "end" }, a.c === "el-n-ck" ? CL[a.k] : "y(t" + (lb - 1 - a.k ? " − " + (lb - 1 - a.k) : "") + ")"));
    });
    hid.forEach(function (h) {
      if (h.k < 0) { sn.appendChild(el("text", { x: h.x, y: h.y + 6, "class": "el-dots", "text-anchor": "middle" }, "⋮")); return; }
      sn.appendChild(el("circle", { cx: h.x, cy: h.y, r: 9, "class": h.c })); sn.appendChild(el("text", { x: h.x, y: h.y + 4, "class": "el-sig", "text-anchor": "middle" }, "σ"));
    });
    sn.appendChild(el("circle", { cx: out.x, cy: out.y, r: 11, "class": "el-n-out" }));
    sn.appendChild(el("text", { x: out.x + 18, y: out.y + 4, "class": "el-tick" }, "ŷ(t + 1)"));
    sn.appendChild(el("text", { x: XI, y: 18, "class": "el-cap", "text-anchor": "middle" }, lb + T(lb > 1 ? " valeurs passées" : " valeur passée", lb > 1 ? " past values" : " past value") + (ck ? T(" + 4 horloge", " + 4 clock") : "")));
    sn.appendChild(el("text", { x: XH, y: 18, "class": "el-cap", "text-anchor": "middle" }, nh + T(" neurones cachés", " hidden neurons")));
    sn.appendChild(el("text", { x: XO, y: 18, "class": "el-cap", "text-anchor": "middle" }, T("prévision", "forecast")));
    sn.appendChild(el("text", { x: (XI + XH) / 2, y: 262, "class": "el-cap el-cap-r", "text-anchor": "middle" }, f(nh * (lb + ck + 1), 0) + T(" nombres au hasard, figés", " random numbers, frozen")));
    sn.appendChild(el("text", { x: (XH + XO) / 2 + 20, y: 262, "class": "el-cap el-cap-b", "text-anchor": "middle" }, nh + T(" poids β ajustés, λ = ", " fitted weights β, λ = ") + lamTxt(B.lam)));
  }
  function finish(R, P, ms) {
    drawNet(P);
    var nh = P.best.nh, d = P.best.lb + (st.cyc ? 4 : 0), cols = [R.train, R.test, R.ar.test, R.pers], ok = R.test.mean > 0, msg;
    function row(name, get, fmt, mode) {      // the best of the three test columns is set in bold
      var v = cols.map(get), best = -1, bs = 0, i, sc;
      if (mode) for (i = 1; i < 4; i++) { if (!isFinite(v[i])) continue; sc = mode === "max" ? -v[i] : mode === "abs" ? Math.abs(v[i]) : v[i]; if (best < 0 || sc < bs) { best = i; bs = sc; } }
      return "<tr><th>" + name + "</th>" + v.map(function (x, i) { return "<td" + (i === best ? ' class="el-bestv"' : "") + ">" + fmt(x) + "</td>"; }).join("") + "</tr>";
    }
    function f3(x) { return ok ? f(x, 3) : "–"; }
    q("#el-met").innerHTML = '<table class="el-mt"><thead><tr><th></th><th>' + T("ELM, apprentissage", "ELM, training") + "</th><th>" + T("ELM, test", "ELM, test") + "</th><th>" + T("AR, test", "AR, test") + "</th><th>" + T("Persistance, test", "Persistence, test") + "</th></tr></thead><tbody>" +
      row("RMSE" + (st.user ? "" : " (W)"), function (m) { return m.rmse; }, fv, "min") +
      row("nRMSE", function (m) { return m.nrmse; }, f3, ok && "min") +
      row("nMAE", function (m) { return m.nmae; }, f3, ok && "min") +
      row("nMBE", function (m) { return m.nmbe; }, function (x) { return ok ? f(100 * x, 1) + " %" : "–"; }, ok && "abs") +
      row("R²", function (m) { return m.r2; }, function (x) { return f(x, 3); }, "max") +
      row(T("Moyenne des mesures", "Mean of the measurements") + (st.user ? "" : " (W)"), function (m) { return m.mean; }, fv, null) + "</tbody></table>" +
      '<p class="muted el-hint">' + T("En gras : le meilleur des trois modèles sur le test. AR : modèle linéaire sur les mêmes entrées (" + R.ar.coefs + " coefficients). nRMSE, nMAE et nMBE sont divisés par la moyenne des mesures de la période : l’apprentissage et le test n’ont pas la même moyenne, donc un RMSE plus grand peut donner un nRMSE plus petit. Pour comparer deux périodes, regardez le RMSE et le R² ; pour comparer deux modèles sur la même période, le nRMSE.",
        "In bold: the best of the three models on the test set. AR: linear model on the same inputs (" + R.ar.coefs + " coefficients). nRMSE, nMAE and nMBE are divided by the mean of the measurements of the period: training and test do not have the same mean, so a larger RMSE can give a smaller nRMSE. To compare two periods, look at RMSE and R²; to compare two models on the same period, nRMSE.") + "</p>";
    if (!isFinite(R.test.rmse)) msg = "";
    else if (R.test.rmse > R.pers.rmse) msg = T("Ici, l’ELM fait moins bien que la persistance sur le test.", "Here the ELM does worse than persistence on the test set.");
    else if (R.test.rmse > 1.25 * R.train.rmse) msg = T("L’erreur de test dépasse nettement l’erreur d’apprentissage : le modèle a appris du bruit (sur-apprentissage).", "The test error is well above the training error: the model has learnt noise (overfitting).");
    else msg = T("L’erreur de test reste proche de l’erreur d’apprentissage : le modèle généralise.", "The test error stays close to the training error: the model generalizes.");
    if (msg) msg += R.test.rmse < R.ar.test.rmse ? T(" Face au modèle linéaire AR, l’ELM gagne ", " Against the linear AR model, the ELM gains ") + fv(R.ar.test.rmse - R.test.rmse) + T(unit() + " de RMSE", unit() + " in RMSE") + (ok ? " (" + f(R.ar.test.nrmse - R.test.nrmse, 3) + T(" de nRMSE)", " in nRMSE)") : "") + "."
      : T(" Le modèle linéaire AR fait ici aussi bien ou mieux que l’ELM : la couche non linéaire n’apporte rien.", " The linear AR model does as well as or better than the ELM here: the non-linear layer brings nothing.");
    q("#el-met").insertAdjacentHTML("beforeend", '<p class="el-msg">' + msg + clipNote(R) + (ok ? "" : T(" La moyenne des mesures n’est pas positive : les erreurs normalisées ne sont pas affichées.", " The mean of the measurements is not positive: normalized errors are not shown.")) + "</p>");
    q(".el-cards").innerHTML =
      card(T("Réglages retenus", "Settings kept"), P.best.lb + " · " + nh + " · " + lamTxt(P.best.lam), T("entrées · neurones · λ", "inputs · neurons · λ")) +
      card(T("Coefficients ajustés", "Fitted coefficients"), String(nh), T("les poids de sortie β, un par neurone", "the output weights β, one per neuron")) +
      card(T("Nombres tirés au hasard", "Random numbers drawn"), f(nh * (d + 1), 0), nh + " × (" + P.best.lb + (st.cyc ? T(" passées + 4 horloge", " past + 4 clock") : T(" passées", " past")) + T(" + 1 biais), figés", " + 1 bias), frozen")) +
      card(T("Résolutions linéaires", "Linear solves"), f(P.solves + 1, 0), T("aucune descente de gradient", "no gradient descent")) +
      card(T("Temps de calcul", "Computing time"), f(ms / 1000, 1) + " s", T("toute l’optimisation, dans votre navigateur", "the whole optimisation, in your browser"));
  }
  function clipNote(R) {
    if (!st.user) return "";
    return " " + (R.S.D.clip ? T("Vos valeurs sont toutes positives ou nulles : les prévisions négatives sont ramenées à 0.", "Your values are all non-negative: negative forecasts are set to 0.") : T("Vos données contiennent des valeurs négatives : les prévisions ne sont pas bornées à 0.", "Your data contain negative values: forecasts are not bounded at 0."));
  }
  function start() {
    var id = ++st.run, D = st.D, grid = st.rg === "opt" ? GRID : [st.rg];
    var P = { lbs: st.lb === "opt" ? LBS : [st.lb], nhs: st.nh === "opt" ? NHS : [st.nh], cv: [], cur: null, best: null, solves: 0 };
    P.lbs.forEach(function () { P.cv.push(P.nhs.map(function () { return null; })); });
    var ci = 0, cj = 0, S = null, rnd = null, cell = null, vals = [], c = 0, t0 = performance.now(), msgEl = q("#el-optmsg"), multi = P.lbs.length * P.nhs.length > 1;
    st.res = null; st.day = 0; q("#el-optnote").textContent = ""; clr(sp); clr(so); clr(q("#el-net")); q(".el-cards").innerHTML = ""; q("#el-met").innerHTML = "";
    function slice() {
      if (id !== st.run) return;
      var t1 = performance.now(), L, row, k, m, lb = P.lbs[ci], nh = P.nhs[cj];
      if (!S || S.LB !== lb) S = prepare(D, lb, st.cyc);
      if (c === 0) { rnd = mulberry32(st.seed); cell = { cv: Infinity }; vals = []; P.cur = [ci, cj]; }
      do {
        L = layer(nh, S.d, rnd); row = scoreCandidate(S, L, grid); m = Infinity;
        for (k = 0; k < grid.length; k++) { if (row[k] < m) m = row[k]; if (row[k] < cell.cv) cell = { cv: row[k], L: L, lam: grid[k], c: c }; }
        vals.push(m); c++; P.solves += grid.length * (K - 1);
      } while (c < NCAND && performance.now() - t1 < 60);
      if (c < NCAND) {
        drawGrid(P); drawOpt(vals, cell.c, false);
        msgEl.textContent = (multi ? P.lbs[ci] + T(" entrées, ", " inputs, ") + nh + T(" neurones. ", " neurons. ") : "") + T("Candidat ", "Candidate ") + c + " / 100. " + T("Meilleur jusqu’ici : n° ", "Best so far: no. ") + (cell.c + 1) + ", " + fv(cell.cv) + unit() + ", λ = " + lamTxt(cell.lam) + ".";
        setTimeout(slice, 0); return;
      }
      P.cv[ci][cj] = cell.cv;
      if (!P.best || cell.cv < P.best.cv) P.best = { cv: cell.cv, L: cell.L, lam: cell.lam, c: cell.c, lb: lb, nh: nh, i: ci, j: cj, vals: vals, S: S };
      c = 0; cj++; if (cj === P.nhs.length) { cj = 0; ci++; }
      if (ci < P.lbs.length) { drawGrid(P); setTimeout(slice, 0); return; }
      P.cur = null; drawGrid(P); var B = P.best; drawOpt(B.vals, B.c, true);
      var R = refit(B.S, B.L, B.lam); st.res = R;
      var lo = Math.min.apply(null, B.vals), hi = Math.max.apply(null, B.vals);
      msgEl.innerHTML = "<strong>" + T("Retenu : ", "Kept: ") + B.lb + T(" entrées, ", " inputs, ") + B.nh + T(" neurones, λ = ", " neurons, λ = ") + lamTxt(B.lam) + T(", candidat n° ", ", candidate no. ") + (B.c + 1) + T(" sur 100", " of 100") + ".</strong>";
      q("#el-optnote").innerHTML =
        T("Pour ce réglage, l’erreur de validation va de ", "For this setting, the validation error ranges from ") + fv(lo) + T(" à ", " to ") + fv(hi) + unit() +
        T(" selon le tirage : le hasard compte, d’où les 100 candidats. Chaque point est la moyenne de 4 validations successives, toujours sur des valeurs postérieures à l’ajustement. Le test n’a servi à aucun de ces choix.", " depending on the draw: chance matters, hence the 100 candidates. Each dot is the mean of 4 successive validations, always on values later than the fit. The test set played no part in these choices.");
      drawPlot(); finish(R, P, performance.now() - t0);
    }
    slice();
  }
  function num(v) { return v === "opt" ? "opt" : +v; }
  q("#el-lb").addEventListener("change", function () { st.lb = num(this.value); start(); });
  q("#el-nh").addEventListener("change", function () { st.nh = num(this.value); start(); });
  q("#el-rg").addEventListener("change", function () { st.rg = num(this.value); start(); });
  q("#el-day").addEventListener("input", function () { st.day = +this.value; drawPlot(); });
  q("#el-cyc").addEventListener("change", function () { st.cyc = this.checked; start(); });
  q("#el-new").addEventListener("click", function () { st.seed += 1; start(); });
  Array.prototype.forEach.call(box.querySelectorAll(".el-tabs button"), function (b) {
    b.addEventListener("click", function () {
      st.view = b.getAttribute("data-v"); st.day = 0;
      Array.prototype.forEach.call(box.querySelectorAll(".el-tabs button"), function (o) { o.classList.toggle("on", o === b); o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      drawPlot();
    });
  });
  q("#el-use").addEventListener("click", function () {
    var p = parse(q("#el-txt").value), n = p.values.length, m = q("#el-umsg");
    if (n < NMIN) { m.textContent = T("Il faut au moins " + NMIN + " valeurs numériques ; " + n + " ont été lues.", "At least " + NMIN + " numeric values are needed; " + n + " were read."); return; }
    st.D = makeDataset(p.values, null, +q("#el-spd").value); st.user = true;
    var k = st.D.data.length, tr = Math.floor(RATIO * k);
    m.textContent = T(k + " valeurs utilisées" + (n > NMAX ? " (sur " + n + " collées)" : "") + " : environ " + tr + " pour l’apprentissage et l’optimisation, " + (k - tr) + " pour le test." + (p.bad ? " " + p.bad + " élément(s) non numérique(s) ignoré(s)." : "") + " Toutes les valeurs sont notées (pas de masque de nuit).",
      k + " values used" + (n > NMAX ? " (out of " + n + " pasted)" : "") + ": about " + tr + " for training and optimisation, " + (k - tr) + " for the test." + (p.bad ? " " + p.bad + " non-numeric item(s) ignored." : "") + " Every value is scored (no night mask).");
    start(); q("#el-optmsg").scrollIntoView({ block: "center", behavior: "smooth" });
  });
  q("#el-back").addEventListener("click", function () { st.D = SYN; st.user = false; q("#el-umsg").textContent = ""; start(); });
  start();
})(this);
