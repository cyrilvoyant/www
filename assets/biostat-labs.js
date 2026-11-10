/* Biostatistics labs (Cyril Voyant's PASS UE8 course), 10 November 2026.
   Z test, two-sample t test with a moving point, chi-square on categorical tables, regression (r, R², slope test, centring),
   Jarque-Bera, Shapiro-Wilk and Lilliefors normality tests. Vanilla JS, no dependency. Every number is checked against scipy
   (scripts/check_biostat_labs_20261110.py). Labs: <div data-bl="ztest|twosample|chi2|regression|jb"></div>. */
(function () {
  'use strict';
  var EN = (document.documentElement.lang || 'fr').slice(0, 2) === 'en';
  function T(fr, en) { return EN ? en : fr; }
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- numbers ---------- */
  function fmt(x, d) {
    if (!isFinite(x)) return '—';
    if (d == null) d = 3;
    var s = (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d);
    if (!EN) s = s.replace('.', ',');
    return s.replace('-', '−');
  }
  function fp(p) {
    if (!isFinite(p)) return '—';
    if (p < 1e-4) return EN ? '< 0.0001' : '< 0,0001';
    return fmt(p, p < 0.01 ? 4 : 3);
  }
  function pct(p) {
    if (p < 1e-4) return EN ? '< 0.01%' : '< 0,01 %';
    var v = p * 100, s = fmt(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : (v < 1 ? 2 : 1));
    return EN ? s + '%' : s + ' %';
  }

  /* ---------- special functions ---------- */
  var LC = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1; var a = LC[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LC[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function gser(a, x) {
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 0; n < 1000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  function gcf(a, x) {
    var b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (var i = 1; i < 1000; i++) {
      var an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function gammaQ(a, x) { if (x <= 0) return 1; return x < a + 1 ? 1 - gser(a, x) : gcf(a, x); }
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; var h = d;
    for (var m = 1; m < 1000; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; var del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  function ibeta(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function normSf(z) { var q = 0.5 * gammaQ(0.5, z * z / 2); return z >= 0 ? q : 1 - q; }
  function normCdf(z) { return normSf(-z); }
  function normPdf(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
  function tP2(t, df) { return ibeta(df / 2, 0.5, df / (df + t * t)); }           // two-sided p of Student t
  function tPdf(t, df) { return Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df)); }
  function chi2Sf(x, k) { return gammaQ(k / 2, x / 2); }
  function chi2Pdf(x, k) { if (x <= 0) return k < 2 ? Infinity : (k === 2 ? 0.5 : 0); return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - k / 2 * Math.LN2 - lgamma(k / 2)); }
  function solveDec(f, target, lo, hi) { for (var i = 0; i < 200; i++) { var m = (lo + hi) / 2; if (f(m) > target) lo = m; else hi = m; } return (lo + hi) / 2; }
  function chi2Crit(k, a) { return solveDec(function (x) { return chi2Sf(x, k); }, a, 0, 2000); }
  function tCrit(df, a) { return solveDec(function (t) { return tP2(t, df); }, a, 0, 1e4); }
  function zCrit(a) { return solveDec(function (z) { return normSf(z); }, a, 0, 40); }
  function normInv(p) { // Acklam, refined by one Newton step
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    var e = normCdf(x) - p; return x - e / normPdf(x);
  }
  function mean(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return s / v.length; }
  function sd(v) { var m = mean(v), s = 0; for (var i = 0; i < v.length; i++) s += (v[i] - m) * (v[i] - m); return Math.sqrt(s / (v.length - 1)); }

  /* ---------- statistics ---------- */
  function ttest2(a, b) { // Welch t test (unequal variances, course slides 94-97), B minus A
    var n1 = a.length, n2 = b.length, v1 = sd(a) * sd(a) / n1, v2 = sd(b) * sd(b) / n2, se = Math.sqrt(v1 + v2);
    var t = (mean(b) - mean(a)) / se, df = (v1 + v2) * (v1 + v2) / (v1 * v1 / (n1 - 1) + v2 * v2 / (n2 - 1));
    return { t: t, df: df, p: tP2(t, df), se: se, ma: mean(a), mb: mean(b) };
  }
  function regress(x, y) {
    var n = x.length, mx = mean(x), my = mean(y), sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < n; i++) { sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); sxy += (x[i] - mx) * (y[i] - my); }
    var a = sxy / sxx, b = my - a * mx, r = sxy / Math.sqrt(sxx * syy), scr = 0;
    for (i = 0; i < n; i++) { var e = y[i] - (a * x[i] + b); scr += e * e; }
    var s2 = scr / (n - 2), sa = Math.sqrt(s2 / sxx), tA = a / sa, tR = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
    return { n: n, mx: mx, my: my, a: a, b: b, r: r, r2: r * r, scy: syy, scr: scr, sce: syy - scr, s2: s2, sa: sa, tA: tA, tR: tR, df: n - 2, p: tP2(tA, n - 2) };
  }
  function chi2table(O, fit) { // O: rows x cols; fit: expected equal per cell (goodness of fit, one row)
    var R = O.length, C = O[0].length, N = 0, rs = [], cs = [], E = [], i, j;
    for (i = 0; i < R; i++) { rs[i] = 0; for (j = 0; j < C; j++) { rs[i] += O[i][j]; N += O[i][j]; } }
    for (j = 0; j < C; j++) { cs[j] = 0; for (i = 0; i < R; i++) cs[j] += O[i][j]; }
    var chi = 0, contrib = [];
    for (i = 0; i < R; i++) {
      E[i] = []; contrib[i] = [];
      for (j = 0; j < C; j++) {
        E[i][j] = fit ? N / (R * C) : rs[i] * cs[j] / N;
        contrib[i][j] = E[i][j] > 0 ? Math.pow(O[i][j] - E[i][j], 2) / E[i][j] : 0; chi += contrib[i][j];
      }
    }
    var df = fit ? R * C - 1 : (R - 1) * (C - 1);
    return { E: E, contrib: contrib, chi2: chi, df: df, p: chi2Sf(chi, df), N: N };
  }
  function jbStats(x) { // course convention (slide 50): s with n-1; scipy convention: moments with 1/n
    var n = x.length, m = mean(x), s = sd(x), m2 = 0, m3 = 0, m4 = 0;
    for (var i = 0; i < n; i++) { var d = x[i] - m; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; }
    m2 /= n; m3 /= n; m4 /= n;
    var S = m3 / Math.pow(s, 3), C = m4 / Math.pow(s, 4) - 3, JB = n / 6 * (S * S + C * C / 4);
    var S1 = m3 / Math.pow(m2, 1.5), C1 = m4 / (m2 * m2) - 3, JB1 = n / 6 * (S1 * S1 + C1 * C1 / 4);
    return { n: n, m: m, s: s, S: S, C: C, JB: JB, p: chi2Sf(JB, 2), partS: n / 6 * S * S, partC: n / 24 * C * C, S1: S1, C1: C1, JB1: JB1, p1: chi2Sf(JB1, 2) };
  }

  /* ---------- DOM helpers ---------- */
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html; return e;
  }
  var uid = 0;
  function slider(parent, label, min, max, step, value, fn, unit) {
    var id = 'bl-' + (++uid), w = h('label', { 'class': 'st-control', 'for': id });
    var sp = h('span', null, label + ' : '); var out = h('output', { 'for': id }); sp.appendChild(out);
    var inp = h('input', { type: 'range', id: id, min: min, max: max, step: step, value: value });
    w.appendChild(sp); w.appendChild(inp); parent.appendChild(w);
    var o = { input: inp, wrap: w, get: function () { return +inp.value; }, set: function (v) { inp.value = v; show(); } };
    function show() { out.textContent = fmt(+inp.value, (String(step).split('.')[1] || '').length) + (unit ? ' ' + unit : ''); }
    inp.addEventListener('input', function (ev) { show(); fn(ev); }); show(); return o;
  }
  function select(parent, label, opts, fn) {
    var id = 'bl-' + (++uid), w = h('label', { 'class': 'st-control', 'for': id }), sel = h('select', { id: id });
    w.appendChild(h('span', null, label)); opts.forEach(function (o) { sel.appendChild(h('option', { value: o[0] }, o[1])); });
    w.appendChild(sel); parent.appendChild(w); sel.addEventListener('change', fn); return sel;
  }
  function check(parent, label, val, fn) {
    var id = 'bl-' + (++uid), w = h('label', { 'class': 'bl-check', 'for': id }), c = h('input', { type: 'checkbox', id: id });
    c.checked = !!val; w.appendChild(c); w.appendChild(document.createTextNode(' ' + label)); parent.appendChild(w);
    c.addEventListener('change', fn); return c;
  }
  function presets(parent, list, fn) {
    var box = h('div', { 'class': 'st-presets', role: 'group', 'aria-label': T('Exemples', 'Examples') }), btns = [];
    list.forEach(function (p) {
      var b = h('button', { type: 'button', 'aria-pressed': 'false', 'data-key': p[0] }, p[1]);
      b.addEventListener('click', function () { fn(p[0]); }); box.appendChild(b); btns.push(b);
    });
    parent.appendChild(box);
    return function mark(key) { btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-key') === key ? 'true' : 'false'); }); };
  }
  function metrics(box, items) {
    box.innerHTML = items.map(function (it) {
      return '<div' + (it[3] ? ' class="' + it[3] + '"' : '') + '><span>' + it[0] + '</span><strong>' + it[1] + '</strong>' + (it[2] ? '<small>' + it[2] + '</small>' : '') + '</div>';
    }).join('');
  }
  function verdict(box, p, alpha, h0, h1) {
    var rej = p < alpha, max = Math.max(0.2, alpha * 2), w = Math.min(p, max) / max * 100, wa = alpha / max * 100;
    box.className = 'bl-verdict ' + (rej ? 'is-sig' : 'is-ns');
    box.innerHTML = '<div class="bl-gauge" role="img" aria-label="' +
      T('p-value ', 'p-value ') + pct(p) + T(', seuil α ', ', α threshold ') + pct(alpha) + '">' +
      '<span class="bl-gauge-fill" style="width:' + w.toFixed(1) + '%"></span><span class="bl-gauge-alpha" style="left:' + wa.toFixed(1) + '%"></span>' +
      '<span class="bl-gauge-lab" style="left:' + wa.toFixed(1) + '%">' + T('seuil α ', 'α threshold ') + pct(alpha) + '</span></div>' +
      '<div class="bl-gauge-scale"><span>0</span><span>' + (p > max ? '› ' : '') + pct(max) + '</span></div>' +
      '<p><strong>p = ' + fp(p) + ' (' + pct(p) + ')</strong>. ' +
      (rej ? T('p est sous le seuil de ' + pct(alpha) + ' : <strong>on rejette H₀</strong> (' + h0 + '). Le résultat est significatif (' + h1 + ').',
        'p is below the ' + pct(alpha) + ' threshold: <strong>reject H₀</strong> (' + h0 + '). The result is significant (' + h1 + ').')
        : T('p atteint ou dépasse le seuil de ' + pct(alpha) + ' : <strong>on ne rejette pas H₀</strong> (' + h0 + ').',
          'p meets or exceeds the ' + pct(alpha) + ' threshold: <strong>do not reject H₀</strong> (' + h0 + ').')) + '</p>';
  }

  /* ---------- SVG helpers ---------- */
  function svg(parent, w, hgt, label) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + hgt); s.setAttribute('class', 'st-svg'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label);
    parent.appendChild(s); return s;
  }
  function scale(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }
  function ticks(a, b, n) {
    var span = b - a, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(a / step) * step; for (; v <= b + 1e-9; v += step) out.push(+v.toFixed(10)); return { v: out, step: step };
  }
  function tk(v, step) { var d = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step))); return fmt(v, d); }
  function axes(X, Y, xd, yd, box, xlab, ylab, opt) {
    opt = opt || {}; var s = '', tx = ticks(xd[0], xd[1], opt.nx || 7), ty = ticks(yd[0], yd[1], opt.ny || 5);
    s += '<line x1="' + box[0] + '" y1="' + box[3] + '" x2="' + box[2] + '" y2="' + box[3] + '" stroke="#5a7180"/>';
    if (!opt.noY) s += '<line x1="' + box[0] + '" y1="' + box[1] + '" x2="' + box[0] + '" y2="' + box[3] + '" stroke="#5a7180"/>';
    tx.v.forEach(function (v) { var x = X(v); s += '<line x1="' + x + '" y1="' + box[3] + '" x2="' + x + '" y2="' + (box[3] + 5) + '" stroke="#5a7180"/><text class="st-axis" x="' + x + '" y="' + (box[3] + 20) + '" text-anchor="middle">' + tk(v, tx.step) + '</text>'; });
    if (!opt.noY) ty.v.forEach(function (v) { var y = Y(v); s += '<line x1="' + box[0] + '" y1="' + y + '" x2="' + box[2] + '" y2="' + y + '" stroke="#e3ebef"/><text class="st-axis" x="' + (box[0] - 7) + '" y="' + (y + 4) + '" text-anchor="end">' + tk(v, ty.step) + '</text>'; });
    s += '<text class="st-axis" x="' + ((box[0] + box[2]) / 2) + '" y="' + (box[3] + 40) + '" text-anchor="middle">' + xlab + '</text>';
    if (ylab) s += '<text class="st-axis" transform="translate(' + (box[0] - 46) + ',' + ((box[1] + box[3]) / 2) + ') rotate(-90)" text-anchor="middle">' + ylab + '</text>';
    return s;
  }
  function areaPath(f, a, b, X, Y, y0) {
    var n = 80, d = 'M' + X(a).toFixed(1) + ',' + Y(y0).toFixed(1);
    for (var i = 0; i <= n; i++) { var v = a + (b - a) * i / n; d += 'L' + X(v).toFixed(1) + ',' + Y(f(v)).toFixed(1); }
    return d + 'L' + X(b).toFixed(1) + ',' + Y(y0).toFixed(1) + 'Z';
  }
  /* density with rejection zone (red) and p area (blue hatch) and the observed statistic */
  function densityChart(el, f, xd, yMax, rej, parea, stat, xlab, statLab) {
    var W = 720, H = 300, box = [70, 20, 700, 240], X = scale(xd[0], xd[1], box[0], box[2]), Y = scale(0, yMax, box[3], box[1]), s = '';
    s += '<defs><pattern id="bl-hatch' + el.dataset.u + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#1d5f8a" stroke-width="3"/></pattern></defs>';
    s += axes(X, Y, xd, [0, yMax], box, xlab, T('densité de probabilité', 'probability density'), { ny: 3 });
    rej.forEach(function (r) { s += '<path d="' + areaPath(f, Math.max(r[0], xd[0]), Math.min(r[1], xd[1]), X, Y, 0) + '" fill="#e8a5a0" opacity=".75" clip-path="url(#bl-dclip' + el.dataset.u + ')"/>'; });
    parea.forEach(function (r) { var a = Math.max(r[0], xd[0]), b = Math.min(r[1], xd[1]); if (b > a) s += '<path d="' + areaPath(f, a, b, X, Y, 0) + '" fill="url(#bl-hatch' + el.dataset.u + ')" opacity=".55"/>'; });
    var d = ''; for (var i = 0; i <= 200; i++) { var v = xd[0] + (xd[1] - xd[0]) * i / 200, fv = Math.min(f(v), yMax * 3); d += (i ? 'L' : 'M') + X(v).toFixed(1) + ',' + Y(fv).toFixed(1); }
    s += '<clipPath id="bl-dclip' + el.dataset.u + '"><rect x="' + box[0] + '" y="' + box[1] + '" width="' + (box[2] - box[0]) + '" height="' + (box[3] - box[1]) + '"/></clipPath>';
    s += '<path d="' + d + '" fill="none" stroke="#193d5b" stroke-width="2.4" clip-path="url(#bl-dclip' + el.dataset.u + ')"/>';
    var sx = Math.max(xd[0], Math.min(xd[1], stat)), out = stat !== sx;
    s += '<line x1="' + X(sx) + '" y1="' + box[1] + '" x2="' + X(sx) + '" y2="' + box[3] + '" stroke="#c4581c" stroke-width="3"' + (out ? ' stroke-dasharray="6 4"' : '') + '/>';
    var anchor = X(sx) > box[2] - 120 ? 'end' : (X(sx) < box[0] + 120 ? 'start' : 'middle');
    s += '<text class="st-axis" x="' + X(sx) + '" y="' + (box[1] + 14) + '" text-anchor="' + anchor + '" style="fill:#a8471a;font-weight:700">' + statLab + (out ? (stat > sx ? ' →' : ' ←') : '') + '</text>';
    el.innerHTML = s;
  }
  /* p as a function of a moving value, log scale, with the 0.05 line and the significant zone */
  function pCurve(el, xs, ps, xcur, xlab, alpha) {
    var W = 720, H = 230, box = [70, 14, 700, 170], lo = -4, X = scale(xs[0], xs[xs.length - 1], box[0], box[2]);
    var Y = function (p) { var l = Math.log10(Math.max(p, 1e-4)); return box[3] + (l - lo) / (0 - lo) * (box[1] - box[3]); }, s = '';
    var tx = ticks(xs[0], xs[xs.length - 1], 7);
    s += '<line x1="' + box[0] + '" y1="' + box[3] + '" x2="' + box[2] + '" y2="' + box[3] + '" stroke="#5a7180"/><line x1="' + box[0] + '" y1="' + box[1] + '" x2="' + box[0] + '" y2="' + box[3] + '" stroke="#5a7180"/>';
    tx.v.forEach(function (v) { s += '<text class="st-axis" x="' + X(v) + '" y="' + (box[3] + 20) + '" text-anchor="middle">' + tk(v, tx.step) + '</text>'; });
    [1, 0.1, 0.01, 0.001, 0.0001].forEach(function (p) { s += '<line x1="' + box[0] + '" y1="' + Y(p) + '" x2="' + box[2] + '" y2="' + Y(p) + '" stroke="#e3ebef"/><text class="st-axis" x="' + (box[0] - 7) + '" y="' + (Y(p) + 4) + '" text-anchor="end">' + fmt(p, p >= 1 ? 0 : -Math.log10(p)) + '</text>'; });
    for (var i = 0; i < xs.length - 1; i++) if (ps[i] < alpha) s += '<rect x="' + X(xs[i]) + '" y="' + box[1] + '" width="' + Math.max(1, X(xs[i + 1]) - X(xs[i]) + 0.5) + '" height="' + (box[3] - box[1]) + '" fill="#cfe9e4"/>';
    s += '<line x1="' + box[0] + '" y1="' + Y(alpha) + '" x2="' + box[2] + '" y2="' + Y(alpha) + '" stroke="#b03a2e" stroke-width="2" stroke-dasharray="7 5"/>';
    s += '<text class="st-axis" x="' + (box[2] - 4) + '" y="' + (Y(alpha) - 6) + '" text-anchor="end" style="fill:#b03a2e">p = ' + fmt(alpha, 2) + '</text>';
    var d = ''; for (i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ',' + Y(ps[i]).toFixed(1);
    s += '<path d="' + d + '" fill="none" stroke="#087e8b" stroke-width="2.6"/>';
    var j = 0; for (i = 1; i < xs.length; i++) if (Math.abs(xs[i] - xcur) < Math.abs(xs[j] - xcur)) j = i;
    s += '<circle cx="' + X(xcur) + '" cy="' + Y(ps[j]) + '" r="7" fill="#e07b39" stroke="#fff" stroke-width="2"/>';
    s += '<text class="st-axis" x="' + ((box[0] + box[2]) / 2) + '" y="' + (box[3] + 42) + '" text-anchor="middle">' + xlab + '</text>';
    s += '<text class="st-axis" transform="translate(' + (box[0] - 52) + ',' + ((box[1] + box[3]) / 2) + ') rotate(-90)" text-anchor="middle">' + T('p (échelle log)', 'p (log scale)') + '</text>';
    el.innerHTML = s;
  }
  function sigRanges(xs, ps, alpha) {
    var out = [], st = null;
    for (var i = 0; i < xs.length; i++) {
      if (ps[i] < alpha && st === null) st = xs[i];
      if ((ps[i] >= alpha || i === xs.length - 1) && st !== null) { out.push([st, ps[i] < alpha ? xs[i] : xs[i - 1]]); st = null; }
    }
    return out;
  }
  function rangesText(r, unit, d) {
    if (!r.length) return T('aucune position du curseur ne rend le résultat significatif', 'no position of the slider makes the result significant');
    return r.map(function (x) { return T('de ', 'from ') + fmt(x[0], d) + T(' à ', ' to ') + fmt(x[1], d) + (unit ? ' ' + unit : ''); }).join(T(' et ', ' and '));
  }
  function svgPoint(s, ev) { var p = s.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(s.getScreenCTM().inverse()); }
  function block(lab, cls, title) { var d = h('div', { 'class': cls }); if (title) d.appendChild(h('h3', { 'class': 'bl-h' }, title)); lab.appendChild(d); return d; }

  var LABS = {};

  /* ======================= 1. Z test against a population value ======================= */
  LABS.ztest = function (lab) {
    lab.appendChild(h('p', { 'class': 'st-intro' }, T(
      'On compare la moyenne observée <b>X̄</b> d’un échantillon de <b>n</b> patients à une valeur de référence de la population <b>μ₀</b>, dont l’écart-type <b>σ</b> est connu. L’écart X̄ − μ₀ est divisé par l’erreur standard <b>σ/√n</b> (la dispersion attendue d’une moyenne de n valeurs) : c’est le score <b>z</b>. Sous H₀ (μ = μ₀), z suit la loi normale centrée réduite.',
      'We compare the observed mean <b>X̄</b> of a sample of <b>n</b> patients with a population reference value <b>μ₀</b> whose standard deviation <b>σ</b> is known. The gap X̄ − μ₀ is divided by the standard error <b>σ/√n</b> (the expected spread of a mean of n values): this is the score <b>z</b>. Under H₀ (μ = μ₀), z follows the standard normal law.')));
    var mark = presets(lab, [['pam', T('Pression artérielle, n = 36 (cours)', 'Blood pressure, n = 36 (course)')], ['read1', T('Lecture, patient 1 (cours)', 'Reading, patient 1 (course)')], ['read2', T('Patient 2', 'Patient 2')], ['read3', T('Patient 3', 'Patient 3')]], preset);
    var ctl = block(lab, 'st-controls');
    var mu = slider(ctl, T('μ₀, valeur de référence', 'μ₀, reference value'), 0, 200, 1, 100, upd);
    var xb = slider(ctl, T('X̄, moyenne observée', 'X̄, observed mean'), 0, 200, 0.5, 92, upd);
    var sg = slider(ctl, T('σ, écart-type de la population', 'σ, population standard deviation'), 1, 50, 0.5, 15, upd);
    var nn = slider(ctl, T('n, nombre de patients', 'n, number of patients'), 1, 200, 1, 36, upd);
    var side = select(ctl, T('Hypothèse H₁', 'Hypothesis H₁'), [['two', T('μ ≠ μ₀ (bilatéral)', 'μ ≠ μ₀ (two-sided)')], ['left', T('μ < μ₀ (unilatéral à gauche)', 'μ < μ₀ (one-sided, left)')], ['right', T('μ > μ₀ (unilatéral à droite)', 'μ > μ₀ (one-sided, right)')]], upd);
    var al = select(ctl, T('Risque accepté α', 'Accepted risk α'), [['0.05', '5 %'], ['0.01', '1 %'], ['0.1', '10 %']], upd);
    var chart = svg(lab, 720, 300, T('Loi normale centrée réduite, zone de rejet et score z observé', 'Standard normal law, rejection zone and observed z score')); chart.dataset.u = ++uid;
    lab.appendChild(h('p', { 'class': 'st-legend' }, '<span><i style="background:#e8a5a0"></i>' + T('zone de rejet : aire totale α', 'rejection zone: total area α') + '</span><span><i style="background:repeating-linear-gradient(45deg,#1d5f8a 0 2px,#fff 2px 5px)"></i>' + T('aire p au-delà du z observé', 'area p beyond the observed z') + '</span><span><i style="background:#c4581c"></i>' + T('z observé', 'observed z') + '</span>'));
    var unitsLine = h('p', { 'class': 'st-note' }); lab.appendChild(unitsLine);
    var met = block(lab, 'st-metrics'), ver = h('div'); lab.appendChild(ver);
    function preset(k) {
      var P = { pam: [100, 92, 15, 36, 'two'], read1: [50, 40, 10, 1, 'left'], read2: [50, 35, 10, 1, 'left'], read3: [50, 30, 10, 1, 'left'] }[k];
      mu.set(P[0]); xb.set(P[1]); sg.set(P[2]); nn.set(P[3]); side.value = P[4]; al.value = '0.05'; upd(); mark(k);
    }
    function upd(e) {
      if (e) mark('');
      var m0 = mu.get(), x = xb.get(), s = sg.get(), n = nn.get(), a = +al.value, se = s / Math.sqrt(n), z = (x - m0) / se, sd2 = side.value;
      var p = sd2 === 'two' ? 2 * normSf(Math.abs(z)) : (sd2 === 'left' ? normCdf(z) : normSf(z));
      var zc = sd2 === 'two' ? zCrit(a / 2) : zCrit(a), L = 4.5, rej, pa;
      if (sd2 === 'two') { rej = [[-L, -zc], [zc, L]]; pa = [[-L, -Math.abs(z)], [Math.abs(z), L]]; }
      else if (sd2 === 'left') { rej = [[-L, -zc]]; pa = [[-L, z]]; } else { rej = [[zc, L]]; pa = [[z, L]]; }
      densityChart(chart, normPdf, [-L, L], 0.42, rej, pa, z, T('score z (écarts à μ₀ en erreurs standard σ/√n)', 'z score (gap to μ₀ in standard errors σ/√n)'), 'z = ' + fmt(z, 2));
      unitsLine.innerHTML = T('Lecture dans l’unité de mesure : z = −2, 0 et +2 correspondent à X̄ = ', 'In the unit of measurement: z = −2, 0 and +2 correspond to X̄ = ') + fmt(m0 - 2 * se, 1) + ', ' + fmt(m0, 1) + T(' et ', ' and ') + fmt(m0 + 2 * se, 1) + '.';
      metrics(met, [[T('Erreur standard σ/√n', 'Standard error σ/√n'), fmt(se, 2)], [T('Score z', 'z score'), fmt(z, 2), T('z = (X̄ − μ₀)/(σ/√n)', 'z = (X̄ − μ₀)/(σ/√n)')],
        [T('Valeur critique', 'Critical value'), (sd2 === 'two' ? '±' : (sd2 === 'left' ? '−' : '+')) + fmt(zc, 2), T('limite de la zone de rejet', 'edge of the rejection zone')], ['p-value', fp(p)]]);
      verdict(ver, p, a, 'μ = μ₀ = ' + fmt(m0, 0), sd2 === 'two' ? 'μ ≠ μ₀' : (sd2 === 'left' ? 'μ < μ₀' : 'μ > μ₀'));
    }
    preset('pam');
    return { preset: preset };
  };

  /* ======================= 2. Two-sample comparison, Student t test, moving point ======================= */
  LABS.twosample = function (lab) {
    var A = [118, 121, 124, 126, 128, 130, 133, 136], B0 = [125, 128, 131, 133, 135, 138, 141];
    lab.appendChild(h('p', { 'class': 'st-intro' }, T(
      'Deux groupes de 8 patients : la pression artérielle systolique (en mmHg, millimètres de mercure) sous traitement A et sous traitement B (valeurs construites pour l’exemple). Le test de Student compare l’écart des moyennes à sa dispersion. <b>Déplacez le point orange</b> du groupe B (curseur ou glisser) : la courbe du bas montre pour quelles positions p passe sous 0,05.',
      'Two groups of 8 patients: systolic blood pressure (in mmHg, millimetres of mercury) under treatment A and under treatment B (values built for the example). The Student t test compares the gap between the means with their spread. <b>Move the orange point</b> of group B (slider or drag): the bottom curve shows for which positions p falls below 0.05.')));
    var ctl = block(lab, 'st-controls');
    var mv = slider(ctl, T('Point orange du groupe B', 'Orange point of group B'), 100, 220, 0.5, 128, upd, 'mmHg');
    var chart = svg(lab, 720, 210, T('Les deux groupes, leurs moyennes et le point mobile', 'The two groups, their means and the moving point'));
    var met = block(lab, 'st-metrics'), ver = h('div'); lab.appendChild(ver);
    lab.appendChild(h('h3', { 'class': 'bl-h' }, T('Pour quelles positions du point le résultat est-il significatif ?', 'For which positions of the point is the result significant?')));
    var pc = svg(lab, 720, 230, T('p en fonction de la position du point orange', 'p as a function of the orange point position'));
    var note = h('p', { 'class': 'st-reading' }); lab.appendChild(note);
    var xs = [], ps = []; for (var v = 100; v <= 220.001; v += 0.5) { xs.push(v); ps.push(ttest2(A, B0.concat([v])).p); }
    var R = sigRanges(xs, ps, 0.05);
    var box = [70, 20, 700, 150], X = scale(100, 220, box[0], box[2]), drag = false;
    chart.addEventListener('pointerdown', function (e) { drag = true; chart.setPointerCapture(e.pointerId); move(e); });
    chart.addEventListener('pointermove', function (e) { if (drag) move(e); });
    chart.addEventListener('pointerup', function () { drag = false; });
    function move(e) { var p = svgPoint(chart, e), v = 100 + (p.x - box[0]) / (box[2] - box[0]) * 120; mv.set(Math.round(Math.max(100, Math.min(220, v)) * 2) / 2); upd(); }
    function upd() {
      var x = mv.get(), B = B0.concat([x]), r = ttest2(A, B), s = '';
      s += axes(X, null, [100, 220], [0, 1], box, T('pression artérielle systolique (mmHg)', 'systolic blood pressure (mmHg)'), null, { noY: true });
      [[A, 55, 'A', '#5b7f95'], [B0, 115, 'B', '#087e8b']].forEach(function (g) {
        g[0].forEach(function (v) { s += '<circle cx="' + X(v) + '" cy="' + g[1] + '" r="7" fill="' + g[3] + '" opacity=".85"/>'; });
        var m = g[2] === 'A' ? r.ma : r.mb;
        s += '<line x1="' + X(m) + '" y1="' + (g[1] - 22) + '" x2="' + X(m) + '" y2="' + (g[1] + 22) + '" stroke="#193d5b" stroke-width="3"/>';
        s += '<text class="st-axis" x="' + (box[0] - 8) + '" y="' + (g[1] + 5) + '" text-anchor="end">' + T('groupe ', 'group ') + g[2] + '</text>';
        s += '<text class="st-axis" x="' + X(m) + '" y="' + (g[1] - 27) + '" text-anchor="middle">' + T('moyenne ', 'mean ') + fmt(m, 1) + '</text>';
      });
      s += '<circle cx="' + X(x) + '" cy="115" r="10" fill="#e07b39" stroke="#fff" stroke-width="2" style="cursor:grab"/>';
      chart.innerHTML = s;
      metrics(met, [[T('Moyenne A', 'Mean A'), fmt(r.ma, 1)], [T('Moyenne B', 'Mean B'), fmt(r.mb, 1)], [T('Écart des moyennes Δ', 'Gap between means Δ'), fmt(r.mb - r.ma, 2), 'X̄_B − X̄_A'],
        [T('Erreur standard de Δ', 'Standard error of Δ'), fmt(r.se, 2), '√(s²_A/n_A + s²_B/n_B)'],
        ['t', fmt(r.t, 3), T('Δ / erreur standard', 'Δ / standard error')], [T('ddl de Welch ν', 'Welch df ν'), fmt(r.df, 1), T('degrés de liberté', 'degrees of freedom')], ['p-value', fp(r.p)]]);
      verdict(ver, r.p, 0.05, T('mêmes moyennes', 'equal means'), T('les moyennes diffèrent', 'the means differ'));
      pCurve(pc, xs, ps, x, T('position du point orange (mmHg)', 'position of the orange point (mmHg)'), 0.05);
      note.innerHTML = T('Le résultat est significatif quand le point orange est ', 'The result is significant when the orange point is ') + rangesText(R, 'mmHg', 1) +
        T('. Plus loin, le point creuse encore l’écart des moyennes mais gonfle davantage la dispersion : p remonte au-dessus de 0,05. Un seul point peut donc créer ou effacer un résultat : regardez toujours les données.',
          '. Further away, the point still widens the gap between the means but inflates the spread even more: p rises above 0.05 again. A single point can create or erase a result: always look at the data.');
    }
    upd(); return { preset: function () { mv.set(128); upd(); } };
  };

  /* ======================= 3. Chi-square on categorical data ======================= */
  LABS.chi2 = function (lab) {
    var P = {
      serum: { fit: false, rows: T(['Groupe A (sérum)', 'Groupe B (sans sérum)'], ['Group A (serum)', 'Group B (no serum)']), cols: T(['Guérit', 'Ne guérit pas'], ['Healed', 'Not healed']), O: [[75, 25], [65, 35]], cell: [0, 0], max: 100,
        h0: T('guérison indépendante du sérum', 'healing independent of the serum'), h1: T('la guérison dépend du sérum', 'healing depends on the serum') },
      cancer: { fit: false, rows: T(['Hommes', 'Femmes'], ['Men', 'Women']), cols: T(['Pylore', 'Estomac', 'Cardia'], ['Pylorus', 'Stomach body', 'Cardia']), O: [[53, 66, 75], [48, 33, 23]], cell: [1, 2], max: 80,
        h0: T('localisation indépendante du sexe', 'location independent of sex'), h1: T('la localisation dépend du sexe', 'location depends on sex') },
      digits: { fit: true, rows: [T('Effectif observé', 'Observed count')], cols: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], O: [[17, 31, 29, 18, 14, 20, 35, 30, 20, 36]], cell: [0, 9], max: 60,
        h0: T('chiffres équiprobables', 'equally likely digits'), h1: T('chiffres non équiprobables', 'digits not equally likely') }
    }, cur = null, key = 'serum';
    lab.appendChild(h('p', { 'class': 'st-intro' }, T(
      'Pour des variables qualitatives (catégories), on compare les effectifs observés <b>O</b> aux effectifs attendus <b>E</b> sous H₀. Chaque case apporte (O − E)²/E ; leur somme est le <b>χ²</b>, comparé à la loi du χ² à <b>ddl</b> degrés de liberté. Cliquez une case pour la relier au curseur.',
      'For qualitative variables (categories), observed counts <b>O</b> are compared with the counts <b>E</b> expected under H₀. Each cell contributes (O − E)²/E; their sum is the <b>χ²</b>, compared with the χ² law with <b>df</b> degrees of freedom. Click a cell to link it to the slider.')));
    var mark = presets(lab, [['serum', T('Sérum et guérison (cours)', 'Serum and healing (course)')], ['cancer', T('Cancer de l’estomac et sexe (cours)', 'Stomach cancer and sex (course)')], ['digits', T('Table de chiffres au hasard (cours)', 'Random digit table (course)')]], preset);
    var tbl = h('div', { 'class': 'st-table bl-ctable' }); lab.appendChild(tbl);
    var ctl = block(lab, 'st-controls'), sl = slider(ctl, T('Effectif de la case choisie', 'Count in the chosen cell'), 0, 100, 1, 75, function () { setCell(cur.O, sl.get()); mark(''); draw(true); });
    /* two-column independence table: the group (row) size stays fixed, the other cell of the row takes the rest */
    function pairOf() { return !cur.fit && cur.O[0].length === 2; }
    function rowTot(O) { return O[cur.cell[0]][0] + O[cur.cell[0]][1]; }
    function setCell(O, v) { var i = cur.cell[0], j = cur.cell[1]; if (pairOf()) { var tot = rowTot(O); O[i][1 - j] = tot - v; } O[i][j] = v; }
    var chart = svg(lab, 720, 300, T('Loi du χ², zone de rejet et χ² observé', 'χ² law, rejection zone and observed χ²')); chart.dataset.u = ++uid;
    lab.appendChild(h('p', { 'class': 'st-legend' }, '<span><i style="background:#e8a5a0"></i>' + T('zone de rejet (aire 5 %)', 'rejection zone (area 5%)') + '</span><span><i style="background:repeating-linear-gradient(45deg,#1d5f8a 0 2px,#fff 2px 5px)"></i>' + T('aire p au-delà du χ² observé', 'area p beyond the observed χ²') + '</span>'));
    var met = block(lab, 'st-metrics'), ver = h('div'); lab.appendChild(ver);
    lab.appendChild(h('h3', { 'class': 'bl-h' }, T('À partir de quel effectif le résultat devient-il significatif ?', 'From which count does the result become significant?')));
    var pc = svg(lab, 720, 230, T('p en fonction de l’effectif de la case choisie', 'p as a function of the chosen cell count')), note = h('p', { 'class': 'st-reading' }); lab.appendChild(note);
    function preset(k) { key = k; var p = P[k]; cur = JSON.parse(JSON.stringify(p)); cur.rows = p.rows; cur.cols = p.cols; mark(k); draw(false); }
    function draw(fromSlider) {
      var r = chi2table(cur.O, cur.fit), i, j, html = '<table><thead><tr><th></th>';
      cur.cols.forEach(function (c) { html += '<th scope="col">' + c + '</th>'; }); html += '</tr></thead><tbody>';
      for (i = 0; i < cur.O.length; i++) {
        html += '<tr><th scope="row">' + cur.rows[i] + '</th>';
        for (j = 0; j < cur.O[0].length; j++) {
          var on = cur.cell[0] === i && cur.cell[1] === j, w = Math.min(100, r.contrib[i][j] / Math.max(r.chi2, 1e-9) * 100);
          html += '<td><button type="button" class="bl-cell" aria-pressed="' + on + '" data-i="' + i + '" data-j="' + j + '"><b>' + cur.O[i][j] + '</b><small>E = ' + fmt(r.E[i][j], 1) + '</small><small>' + T('contribution ', 'contribution ') + fmt(r.contrib[i][j], 2) + '</small><span class="st-contribution" style="width:' + w.toFixed(0) + '%"></span></button></td>';
        }
        html += '</tr>';
      }
      tbl.innerHTML = html + '</tbody></table>';
      tbl.querySelectorAll('.bl-cell').forEach(function (b) { b.addEventListener('click', function () { cur.cell = [+b.dataset.i, +b.dataset.j]; draw(false); }); });
      if (!fromSlider) { sl.input.max = pairOf() ? rowTot(cur.O) : cur.max; sl.set(cur.O[cur.cell[0]][cur.cell[1]]); }
      var cr = chi2Crit(r.df, 0.05), xmax = Math.max(cr * 2.2, Math.min(r.chi2 * 1.15, cr * 4)), ymax = r.df <= 2 ? 0.5 : chi2Pdf(r.df - 2, r.df) * 1.25;
      densityChart(chart, function (x) { return chi2Pdf(x, r.df); }, [0, xmax], ymax, [[cr, xmax]], [[r.chi2, xmax]], r.chi2, T('valeur du χ² (somme des contributions)', 'χ² value (sum of contributions)'), 'χ² = ' + fmt(r.chi2, 2));
      metrics(met, [[T('Effectif total N', 'Total count N'), r.N + ''], ['χ²', fmt(r.chi2, 3)], [T('Degrés de liberté', 'Degrees of freedom'), r.df + '', cur.fit ? T('cases − 1', 'cells − 1') : T('(lignes − 1)(colonnes − 1)', '(rows − 1)(columns − 1)')],
        [T('χ² critique (5 %)', 'Critical χ² (5%)'), fmt(cr, 3), T('lu dans la table', 'read in the table')], ['p-value', fp(r.p)]]);
      verdict(ver, r.p, 0.05, P[key].h0, P[key].h1);
      var xs = [], ps = [], keep = cur.O[cur.cell[0]][cur.cell[1]], vmax = pairOf() ? rowTot(cur.O) : cur.max, O2 = JSON.parse(JSON.stringify(cur.O));
      for (var v = 0; v <= vmax; v++) { setCell(O2, v); var q = chi2table(O2, cur.fit); xs.push(v); ps.push(isFinite(q.p) ? q.p : 1); }
      var lab2 = cur.rows[cur.cell[0]] + ' × ' + cur.cols[cur.cell[1]];
      pCurve(pc, xs, ps, keep, T('effectif de la case « ', 'count of the cell “') + lab2 + T(' »', '”'), 0.05);
      note.innerHTML = (pairOf() ? T('L’effectif du groupe restant fixe (l’autre case de la ligne prend le reste), le résultat est significatif quand cette case vaut ', 'With the group size fixed (the other cell of the row takes the rest), the result is significant when this cell is ') : T('Toutes les autres cases restant fixes, le résultat est significatif quand cette case vaut ', 'With all other cells fixed, the result is significant when this cell is ')) + rangesText(sigRanges(xs, ps, 0.05), '', 0) + '.';
    }
    preset('serum'); return { preset: preset };
  };

  /* ======================= 4. Regression: r, R², slope test, outlier, centring ======================= */
  LABS.regression = function (lab) {
    var X0 = [18, 20, 22, 25, 28, 30, 34, 40, 41, 42, 45, 48, 50, 51, 52, 54, 58, 60, 62], Y0 = [20, 19, 15, 20, 15, 18, 17, 18, 20, 12, 18, 17, 13, 18, 17, 14, 11, 18, 17];
    var slope = lab.getAttribute('data-focus') === 'slope';
    lab.appendChild(h('p', { 'class': 'st-intro' }, T(
      '19 patients : l’âge <b>X</b> (en années) et un score de lecture <b>Y</b> (en points), nuage reconstitué à partir de la diapo 32 du cours. Le <b>point orange</b> est un patient extrême : déplacez-le (curseurs ou glisser), retirez-le, et suivez la droite des moindres carrés <b>Ŷ = aX + b</b>, la corrélation <b>r</b>, le <b>R²</b> et le test de Student sur la pente.',
      '19 patients: age <b>X</b> (in years) and a reading score <b>Y</b> (in points), point cloud reconstructed from course slide 32. The <b>orange point</b> is an extreme patient: move it (sliders or drag), remove it, and follow the least-squares line <b>Ŷ = aX + b</b>, the correlation <b>r</b>, <b>R²</b> and the Student t test on the slope.')));
    var mark = presets(lab, [['high', T('Point extrême en haut (r ≈ 0)', 'Extreme point at the top (r ≈ 0)')], ['low', T('Point extrême en bas (p ≈ 0,04)', 'Extreme point at the bottom (p ≈ 0.04)')], ['none', T('Sans le point extrême', 'Without the extreme point')]], preset);
    var ctl = block(lab, 'st-controls');
    var ox = slider(ctl, T('Âge du point orange', 'Age of the orange point'), 10, 75, 1, 65, upd, T('ans', 'years'));
    var oy = slider(ctl, T('Score du point orange', 'Score of the orange point'), 0, 30, 0.5, 25, upd);
    var opts = block(lab, 'bl-checks');
    var inc = check(opts, T('Inclure le point orange', 'Include the orange point'), true, upd);
    var cx = check(opts, T('Centrer X (soustraire X̄)', 'Centre X (subtract X̄)'), false, upd);
    var cy = check(opts, T('Centrer Y (soustraire Ȳ)', 'Centre Y (subtract Ȳ)'), false, upd);
    var mode = slope ? 'res' : 'dec', seg = h('div', { 'class': 'bl-seg', role: 'group', 'aria-label': T('Que montrer sur le nuage ?', 'What to show on the scatter?') }, '<span>' + T('Sur le nuage, montrer :', 'On the scatter, show:') + '</span>'), segB = [];
    [['dec', T('la décomposition des écarts', 'the split of the deviations')], ['res', T('les résidus', 'the residuals')], ['none', T('le nuage seul', 'the scatter only')]].forEach(function (m) {
      var bt = h('button', { type: 'button', 'aria-pressed': m[0] === mode ? 'true' : 'false', 'data-k': m[0] }, m[1]); seg.appendChild(bt); segB.push(bt);
      bt.addEventListener('click', function () { mode = m[0]; segB.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-k') === mode ? 'true' : 'false'); }); upd(); });
    });
    lab.appendChild(seg);
    var chart = svg(lab, 720, 380, T('Nuage de points, droite de régression et point extrême', 'Scatter plot, regression line and extreme point'));
    var key = h('p', { 'class': 'st-legend' }); lab.appendChild(key);
    var cnote = h('p', { 'class': 'st-reading bl-centre' }); lab.appendChild(cnote);
    var met = block(lab, 'st-metrics');
    var vb = h('div', { 'class': 'bl-var' }); lab.appendChild(vb);
    var ver = h('div'); lab.appendChild(ver);
    lab.appendChild(h('p', { 'class': 'st-note' }, T('En régression simple, tester r = 0 et tester la pente a = 0 est <b>le même test</b> : les deux statistiques t sont égales, avec n − 2 degrés de liberté (ce n’est plus vrai en régression multiple).',
      'In simple regression, testing r = 0 and testing the slope a = 0 is <b>the same test</b>: both t statistics are equal, with n − 2 degrees of freedom (this no longer holds in multiple regression).')));
    lab.appendChild(h('h3', { 'class': 'bl-h' }, T('Pour quels scores du point orange la pente est-elle significative ?', 'For which scores of the orange point is the slope significant?')));
    var pc = svg(lab, 720, 230, T('p du test de la pente en fonction du score du point orange', 'p of the slope test as a function of the orange point score')), note = h('p', { 'class': 'st-reading' }); lab.appendChild(note);
    var box = [70, 20, 700, 320], st = {}, drag = false;
    chart.addEventListener('pointerdown', function (e) { if (cx.checked || cy.checked || !inc.checked) return; drag = true; chart.setPointerCapture(e.pointerId); move(e); });
    chart.addEventListener('pointermove', function (e) { if (drag) move(e); });
    chart.addEventListener('pointerup', function () { drag = false; });
    function move(e) { var p = svgPoint(chart, e); ox.set(Math.round(Math.max(10, Math.min(75, st.ix(p.x))))); oy.set(Math.round(Math.max(0, Math.min(30, st.iy(p.y))) * 2) / 2); mark(''); upd(); }
    function preset(k) { if (k === 'none') { inc.checked = false; } else { inc.checked = true; ox.set(65); oy.set(k === 'high' ? 25 : 12); } mark(k); upd(); }
    function upd(e) {
      if (e && e.type) mark('');
      var X = X0.slice(), Y = Y0.slice(); if (inc.checked) { X.push(ox.get()); Y.push(oy.get()); }
      var raw = regress(X, Y), dx = cx.checked ? raw.mx : 0, dy = cy.checked ? raw.my : 0;
      var Xc = X.map(function (v) { return v - dx; }), Yc = Y.map(function (v) { return v - dy; }), r = regress(Xc, Yc);
      var xd = cx.checked ? [-35, 35] : [0, 80], yd = cy.checked ? [-18, 15] : [0, 32];
      var Xs = scale(xd[0], xd[1], box[0], box[2]), Ys = scale(yd[0], yd[1], box[3], box[1]);
      st.ix = function (px) { return xd[0] + (px - box[0]) / (box[2] - box[0]) * (xd[1] - xd[0]); }; st.iy = function (py) { return yd[0] + (box[3] - py) / (box[1] - box[3]) * (yd[1] - yd[0]); };
      var s = axes(Xs, Ys, xd, yd, box, T('âge X', 'age X') + (cx.checked ? ' − X̄' : '') + T(' (ans)', ' (years)'), T('score de lecture Y', 'reading score Y') + (cy.checked ? ' − Ȳ' : ''));
      if (xd[0] < 0) s += '<line x1="' + Xs(0) + '" y1="' + box[1] + '" x2="' + Xs(0) + '" y2="' + box[3] + '" stroke="#8aa3b1" stroke-dasharray="4 4"/>';
      if (yd[0] < 0) s += '<line x1="' + box[0] + '" y1="' + Ys(0) + '" x2="' + box[2] + '" y2="' + Ys(0) + '" stroke="#8aa3b1" stroke-dasharray="4 4"/>';
      s += '<clipPath id="bl-clip' + uid + '"><rect x="' + box[0] + '" y="' + box[1] + '" width="' + (box[2] - box[0]) + '" height="' + (box[3] - box[1]) + '"/></clipPath><g clip-path="url(#bl-clip' + uid + ')">';
      var my = mean(Yc), i;
      if (mode !== 'none') s += '<line x1="' + box[0] + '" y1="' + Ys(my) + '" x2="' + box[2] + '" y2="' + Ys(my) + '" stroke="#193d5b" stroke-width="1.4" stroke-dasharray="6 5"/><text class="st-axis" x="' + (box[2] - 4) + '" y="' + (Ys(my) - 7) + '" text-anchor="end">Ȳ</text>';
      for (i = 0; i < Xc.length; i++) {
        var fi = r.a * Xc[i] + r.b, px = Xs(Xc[i]);
        if (mode === 'res') s += '<line x1="' + px + '" y1="' + Ys(Yc[i]) + '" x2="' + px + '" y2="' + Ys(fi) + '" stroke="#d6873e" stroke-width="2.4"/>';
        if (mode === 'dec') s += '<line x1="' + (px - 2.5) + '" y1="' + Ys(my) + '" x2="' + (px - 2.5) + '" y2="' + Ys(fi) + '" stroke="#087e8b" stroke-width="3.4"/><line x1="' + (px + 2.5) + '" y1="' + Ys(fi) + '" x2="' + (px + 2.5) + '" y2="' + Ys(Yc[i]) + '" stroke="#d6873e" stroke-width="3.4"/>';
      }
      s += '<line x1="' + Xs(xd[0]) + '" y1="' + Ys(r.a * xd[0] + r.b) + '" x2="' + Xs(xd[1]) + '" y2="' + Ys(r.a * xd[1] + r.b) + '" stroke="#087e8b" stroke-width="3"/>';
      for (i = 0; i < X0.length; i++) s += '<circle cx="' + Xs(Xc[i]) + '" cy="' + Ys(Yc[i]) + '" r="6" fill="#5b7f95" opacity=".85"/>';
      if (inc.checked) s += '<circle cx="' + Xs(Xc[Xc.length - 1]) + '" cy="' + Ys(Yc[Yc.length - 1]) + '" r="9" fill="#e07b39" stroke="#fff" stroke-width="2" style="cursor:grab"/>';
      if (xd[0] <= 0 && xd[1] >= 0) s += '<circle cx="' + Xs(0) + '" cy="' + Ys(r.b) + '" r="6" fill="#fff" stroke="#193d5b" stroke-width="2.5"/><text class="st-axis" x="' + (Xs(0) + 10) + '" y="' + (Ys(r.b) - 10) + '">b = ' + fmt(r.b, 2) + '</text>';
      s += '</g>'; chart.innerHTML = s;
      var msg;
      if (cx.checked && cy.checked) msg = T('X et Y centrés : la droite passe par l’origine, <b>b = 0</b>. On peut retirer la constante du modèle sans rien changer à la pente ni à r.', 'X and Y centred: the line goes through the origin, <b>b = 0</b>. The constant can be removed from the model without changing the slope or r.');
      else if (cx.checked) msg = T('Seul X est centré : b = Ȳ = ' + fmt(raw.my, 2) + ', pas 0. Centrer X seul ne suffit pas.', 'Only X is centred: b = Ȳ = ' + fmt(raw.my, 2) + ', not 0. Centring X alone is not enough.');
      else if (cy.checked) msg = T('Seul Y est centré : b = −aX̄ = ' + fmt(-raw.a * raw.mx, 2) + ', pas 0 en général. Centrer Y seul ne suffit pas.', 'Only Y is centred: b = −aX̄ = ' + fmt(-raw.a * raw.mx, 2) + ', not 0 in general. Centring Y alone is not enough.');
      else msg = T('Données brutes : b = Ȳ − aX̄ = ' + fmt(r.b, 2) + ' (l’ordonnée à l’origine, valeur de la droite en X = 0). Cochez « Centrer X » et « Centrer Y » pour la faire disparaître.', 'Raw data: b = Ȳ − aX̄ = ' + fmt(r.b, 2) + ' (the intercept, value of the line at X = 0). Tick “Centre X” and “Centre Y” to make it vanish.');
      cnote.innerHTML = msg;
      var M = [[T('Corrélation r', 'Correlation r'), fmt(r.r, 3), T('de −1 à 1', 'from −1 to 1')], ['R² = r²', fmt(r.r2, 3), pct(r.r2) + T(' de la variabilité totale de Y expliquée', ' of the total variability of Y explained')],
        [T('Pente a', 'Slope a'), fmt(r.a, 4), 'a = cov(X,Y)/s²ₓ'], [T('Ordonnée à l’origine b', 'Intercept b'), fmt(r.b, 2), 'b = Ȳ − aX̄'],
        [T('t du test de r', 't of the test on r'), fmt(r.tR, 3), 'r√(n−2)/√(1−r²)'], [T('t du test de la pente', 't of the slope test'), fmt(r.tA, 3), 'a/σ̂ₐ'], [T('n et ddl', 'n and df'), r.n + ' ; ' + r.df, 'ddl = n − 2'], ['p-value', fp(r.p)]];
      if (slope) M = [M[2], M[5], M[4], M[6], M[7], M[0], M[1], M[3]];
      metrics(met, M);
      var e = r.sce / r.scy * 100;
      var SY = T('SC<sub>Y</sub>', 'SST'), SR = T('SC<sub>Ŷ</sub>', 'SSR'), SE = T('SC<sub>rés</sub>', 'SSE');
      vb.innerHTML = '<div class="bl-vt"><p class="bl-vt-title"><b>' + SY + ' = Σ(Y − Ȳ)² = ' + fmt(r.scy, 1) + '</b> ' + T('variation totale des scores autour de Ȳ', 'total variation of the scores around Ȳ') + ' <span>= ' + SR + ' + ' + SE + '</span></p>' +
        '<div class="bl-vt-bar" role="img" aria-label="R² ' + pct(r.r2) + '"><span style="width:' + e.toFixed(2) + '%;background:#087e8b"></span><span style="width:' + (100 - e).toFixed(2) + '%;background:#d6873e"></span></div>' +
        '<div class="bl-vt-lab"><span style="color:#087e8b"><b>' + SR + ' = Σ(Ŷ − Ȳ)² = ' + fmt(r.sce, 1) + '</b><br>' + T('expliquée par la droite : ', 'explained by the line: ') + pct(r.r2) + ' = R²</span><span style="color:#a8571b;text-align:right"><b>' + SE + ' = Σe² = ' + fmt(r.scr, 1) + '</b><br>' + T('résiduelle : ', 'residual: ') + pct(1 - r.r2) + '</span></div></div>';
      key.innerHTML = '<span><i style="background:#087e8b;height:4px"></i>' + T('droite Ŷ = aX + b', 'line Ŷ = aX + b') + '</span>' + (mode === 'none' ? '' : '<span><i style="border-top:2px dashed #193d5b;height:0;background:none"></i>' + T('moyenne Ȳ', 'mean Ȳ') + '</span>') +
        (mode === 'dec' ? '<span><i style="background:#087e8b"></i>Ŷᵢ − Ȳ : ' + T('ce que la droite explique', 'what the line explains') + '</span><span><i style="background:#d6873e"></i>eᵢ = Yᵢ − Ŷᵢ : ' + T('le résidu', 'the residual') + '</span><span class="bl-keynote">' + T('Pour chaque patient, Yᵢ − Ȳ = (Ŷᵢ − Ȳ) + (Yᵢ − Ŷᵢ). Élevés au carré et additionnés, ces traits donnent la barre ci-dessous : R² est la part bleu-vert.', 'For each patient, Yᵢ − Ȳ = (Ŷᵢ − Ȳ) + (Yᵢ − Ŷᵢ). Squared and summed, these segments make the bar below: R² is the teal share.') + '</span>'
        : mode === 'res' ? '<span><i style="background:#d6873e"></i>' + T('résidus eᵢ = Yᵢ − Ŷᵢ', 'residuals eᵢ = Yᵢ − Ŷᵢ') + '</span>' : '');
      verdict(ver, r.p, 0.05, T('pente nulle a = 0, pas de lien linéaire', 'zero slope a = 0, no linear link'), T('la pente n’est pas nulle', 'the slope is not zero'));
      if (inc.checked) {
        var xs = [], ps = []; for (var v = 0; v <= 30.001; v += 0.25) { xs.push(v); ps.push(regress(X0.concat([ox.get()]), Y0.concat([v])).p); }
        pCurve(pc, xs, ps, oy.get(), T('score du point orange (âge fixé à ', 'score of the orange point (age fixed at ') + ox.get() + T(' ans)', ' years)'), 0.05);
        note.innerHTML = T('À cet âge, la pente est significative quand le score du point orange va ', 'At this age, the slope is significant when the orange point score goes ') + rangesText(sigRanges(xs, ps, 0.05), '', 1) + T('. Sans lui, p = ', '. Without it, p = ') + fp(regress(X0, Y0).p) + '.';
      } else { pc.innerHTML = ''; note.innerHTML = T('Point orange retiré : 19 patients, p = ', 'Orange point removed: 19 patients, p = ') + fp(r.p) + '.'; }
    }
    preset('high'); return { preset: preset };
  };

  /* ======================= 5. Normality: Jarque-Bera, Shapiro-Wilk, Lilliefors ======================= */
  // Shapiro-Wilk W and p-value, Royston (1992, 1995) algorithm AS R94, as in scipy.stats.shapiro.
  var SWC = {};
  function swPoly(c, x) { var r = 0; for (var i = c.length - 1; i >= 0; i--) r = r * x + c[i]; return r; }
  function swCoef(n) {
    if (SWC[n]) return SWC[n];
    var n2 = Math.floor(n / 2), a = [];
    if (n === 3) a = [Math.SQRT1_2];
    else {
      var an25 = n + 0.25, m = [], summ2 = 0, i;
      for (i = 1; i <= n2; i++) { m.push(normInv((i - 0.375) / an25)); summ2 += m[i - 1] * m[i - 1]; }
      summ2 *= 2; var ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n), fac, i1;
      var a1 = swPoly([0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], rsn) - m[0] / ssumm2;
      if (n > 5) {
        var a2 = -m[1] / ssumm2 + swPoly([0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], rsn);
        fac = Math.sqrt((summ2 - 2 * m[0] * m[0] - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
        a[1] = a2; i1 = 3;
      } else { fac = Math.sqrt((summ2 - 2 * m[0] * m[0]) / (1 - 2 * a1 * a1)); i1 = 2; }
      a[0] = a1; for (i = i1; i <= n2; i++) a[i - 1] = -m[i - 1] / fac;
    }
    SWC[n] = a; return a;
  }
  function shapiro(x) {
    var n = x.length, y = x.slice().sort(function (p, q) { return p - q; }), a = swCoef(n), m = mean(y), ss = 0, num = 0, i;
    for (i = 0; i < n; i++) ss += (y[i] - m) * (y[i] - m);
    for (i = 0; i < a.length; i++) num += a[i] * (y[n - 1 - i] - y[i]);
    var W = Math.min(1, num * num / ss), w1 = 1 - W, p, mu, sg, yy;
    if (n === 3) p = Math.max(0, 6 / Math.PI * (Math.asin(Math.sqrt(W)) - Math.PI / 3));
    else if (w1 <= 0) p = 1;
    else {
      yy = Math.log(w1);
      if (n <= 11) {
        var gam = swPoly([-2.273, 0.459], n);
        if (yy >= gam) return { W: W, p: 1e-99 };
        yy = -Math.log(gam - yy); mu = swPoly([0.544, -0.39978, 0.025054, -6.714e-4], n); sg = Math.exp(swPoly([1.3822, -0.77857, 0.062767, -0.0020322], n));
      } else { var ln = Math.log(n); mu = swPoly([-1.5861, -0.31082, -0.083751, 0.0038915], ln); sg = Math.exp(swPoly([-0.4803, -0.082676, 0.0030302], ln)); }
      p = normSf((yy - mu) / sg);
    }
    return { W: W, p: p };
  }
  // Lilliefors (Kolmogorov-Smirnov with estimated mean and s): D and the Dallal-Wilkinson (1986) p-value,
  // valid for p < 0.10, as statsmodels.stats.diagnostic.lilliefors(pvalmethod='approx'); above 0.10 we only report "p > 0.10".
  function dwP(D, n) {
    if (n > 100) { D *= Math.pow(n / 100, 0.49); n = 100; }
    return Math.exp(-7.01256 * D * D * (n + 2.78019) + 2.99587 * D * Math.sqrt(n + 2.78019) - 0.122119 + 0.974598 / Math.sqrt(n) + 1.67997 / n);
  }
  function lilliefors(x) {
    var n = x.length, y = x.slice().sort(function (p, q) { return p - q; }), m = mean(y), s = sd(y), D = 0;
    for (var i = 0; i < n; i++) { var F = 1 - normSf((y[i] - m) / s); D = Math.max(D, (i + 1) / n - F, F - i / n); }
    var p = dwP(D, n), lo = 0, hi = 1;
    for (var k = 0; k < 60; k++) { var md = (lo + hi) / 2; if (dwP(md, n) > 0.05) lo = md; else hi = md; }
    return { D: D, p: p > 0.1 ? null : p, pr: Math.min(p, 0.1), crit: (lo + hi) / 2 };
  }
  // Reproducible samples: mulberry32 generator, Box-Muller normals; the same draws are reused when n or the shape changes.
  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var DRAWS = {};
  function draws(seed) {
    if (DRAWS[seed]) return DRAWS[seed];
    var r = mulberry(seed), z = [], u = [], sg = [];
    for (var i = 0; i < 1000; i++) {
      var u1 = r(), u2 = r(); z.push(Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2)); u.push(r()); sg.push(r() < 0.5 ? -1 : 1);
    }
    return (DRAWS[seed] = { z: z, u: u, s: sg });
  }
  function jbSample(shape, k, n, seed) {
    var d = draws(seed), out = [];
    for (var i = 0; i < n; i++) {
      var z = d.z[i], t = z;
      if (shape === 'skew' && k > 0) { var g = 1.2 * k; t = (Math.exp(g * z) - 1) / g; }
      else if (shape === 'tails') t = z * Math.exp(0.35 * k * z * z / 2);
      else if (shape === 'flat') t = (1 - k) * z + k * (2 * d.u[i] - 1) * Math.sqrt(3);
      else if (shape === 'bimodal') { var dd = 0.95 * k; t = d.s[i] * dd + z * Math.sqrt(1 - dd * dd); }
      out.push(+(50 + 10 * t).toFixed(10));
    }
    return out;
  }
  function normality(x) { return { jb: jbStats(x), sw: shapiro(x), lf: lilliefors(x) }; }

  LABS.jb = function (lab) {
    var shape = 'normal', seed = 1, added = [], ALPHA = 0.05;
    var GREEN = '#2e8b57', AMBER = '#c77c11', RED = '#c0392b', FILL = { ok: '#a9d8bd', mid: '#f3d08f', no: '#f2aaa0' };
    lab.appendChild(h('div', { 'class': 'bl-key bl-h0' }, T(
      '<p><b>Hypothèse nulle H₀ : les données suivent une loi normale.</b> Hypothèse alternative H₁ : elles ne suivent pas une loi normale.<br>Règle : on rejette H₀ (« pas normale ») si la p-value est inférieure à α = 5 %. Sinon, les données sont dites <i>compatibles</i> avec la loi normale.</p>',
      '<p><b>Null hypothesis H₀: the data follow a normal law.</b> Alternative H₁: they do not follow a normal law.<br>Rule: reject H₀ (“not normal”) when the p-value is below α = 5%. Otherwise the data are called <i>compatible</i> with the normal law.</p>')));
    var mark = presets(lab, [['normal', T('Normale', 'Normal')], ['skew', T('Asymétrique (queue à droite)', 'Skewed (right tail)')], ['tails', T('Queues épaisses', 'Heavy tails')], ['flat', T('Plate (uniforme)', 'Flat (uniform)')], ['bimodal', T('Deux bosses', 'Two humps')]], preset);
    var ctl = block(lab, 'st-controls');
    var nn = slider(ctl, T('Nombre de points n', 'Number of points n'), 10, 1000, 1, 100, upd);
    var kk = slider(ctl, T('Écart à la loi normale (0 = aucun)', 'Departure from normality (0 = none)'), 0, 1, 0.05, 0, upd);
    var ov = slider(ctl, T('Point extrême, en écarts-types de la moyenne', 'Extreme point, in standard deviations from the mean'), -8, 8, 0.1, 4, upd);
    var row = block(lab, 'bl-checks');
    var add = check(row, T('Ajouter le point extrême (orange)', 'Add the extreme point (orange)'), false, upd);
    var bNew = h('button', { type: 'button', 'class': 'bl-btn' }, T('Nouveau tirage', 'New draw')); row.appendChild(bNew);
    var bClr = h('button', { type: 'button', 'class': 'bl-btn' }, T('Retirer les points cliqués', 'Remove clicked points')); row.appendChild(bClr);
    bNew.addEventListener('click', function () { seed++; upd(); });
    bClr.addEventListener('click', function () { added = []; upd(); });
    var banner = h('div', { 'class': 'bl-banner', role: 'status', 'aria-live': 'polite' }); lab.appendChild(banner);
    var grid = block(lab, 'bl-jbgrid');
    var hist = svg(grid, 600, 320, T('Histogramme de l’échantillon et loi normale de même moyenne et même écart-type', 'Sample histogram and normal law with the same mean and standard deviation'));
    var qq = svg(grid, 380, 320, T('Droite de Henry : quantiles observés contre quantiles de la loi normale', 'Normal Q-Q plot: observed quantiles against normal quantiles'));
    hist.style.cursor = 'crosshair';
    lab.appendChild(h('p', { 'class': 'st-legend' }, '<span><i class="bl-swatch"></i>' + T('histogramme (couleur du verdict)', 'histogram (verdict colour)') + '</span><span><i style="background:#193d5b"></i>' + T('loi normale de même x̄ et s', 'normal law with the same x̄ and s') + '</span><span><i style="background:#e07b39"></i>' + T('points ajoutés', 'added points') + '</span>'));
    lab.appendChild(h('p', { 'class': 'st-note' }, T('Cliquez sur l’histogramme pour ajouter un point à cet endroit. Sur le second graphique, la droite de Henry : si les données sont normales, les points suivent la droite.', 'Click on the histogram to add a point there. On the second chart, the normal Q-Q plot: if the data are normal, the points follow the line.')));
    lab.appendChild(h('h3', { 'class': 'bl-h' }, T('Trois tests de normalité, côte à côte', 'Three normality tests, side by side')));
    var cmp = h('div', { 'class': 'bl-tablewrap' }); lab.appendChild(cmp);
    lab.appendChild(h('h3', { 'class': 'bl-h' }, T('Le test de Jarque-Bera en détail', 'The Jarque-Bera test in detail')));
    var met = block(lab, 'st-metrics');
    var parts = h('div', { 'class': 'bl-var' }); lab.appendChild(parts);
    var chart = svg(lab, 720, 260, T('Loi du χ² à 2 degrés de liberté et statistique JB', 'χ² law with 2 degrees of freedom and JB statistic')); chart.dataset.u = ++uid;
    var ver = h('div'); lab.appendChild(ver);
    var warn = h('p', { 'class': 'st-note' }); lab.appendChild(warn);
    var conv = h('p', { 'class': 'st-note' }); lab.appendChild(conv);
    lab.appendChild(h('h3', { 'class': 'bl-h' }, T('Un seul point extrême suffit-il à rejeter la normalité ?', 'Is a single extreme point enough to reject normality?')));
    var pc = svg(lab, 720, 250, T('p des trois tests en fonction de la position du point extrême', 'p of the three tests as a function of the extreme point position'));
    var note = h('p', { 'class': 'st-reading' }); lab.appendChild(note);
    var view = null;
    hist.addEventListener('click', function (ev) {
      if (!view) return; var pt = svgPoint(hist, ev);
      if (pt.x < view.box[0] || pt.x > view.box[2] || pt.y < view.box[1] || pt.y > view.box[3]) return;
      added.push(+view.inv(pt.x).toFixed(2)); upd();
    });
    function preset(k) {
      shape = k; added = []; add.checked = false; seed = 1;
      kk.set({ normal: 0, skew: 0.6, tails: 0.6, flat: 1, bimodal: 0.9 }[k]); nn.set(100); mark(k); upd();
    }
    function state(R) {
      var rej = [R.jb.p < ALPHA, R.sw.p < ALPHA, R.lf.p !== null && R.lf.p < ALPHA], c = rej.filter(Boolean).length;
      return { c: c, key: c === 0 ? 'ok' : c === 3 ? 'no' : 'mid', rej: rej };
    }
    function chip(r) { return r ? '<span class="bl-chip is-no">' + T('rejette H₀', 'rejects H₀') + '</span>' : '<span class="bl-chip is-ok">' + T('ne rejette pas H₀', 'does not reject H₀') + '</span>'; }
    function upd() {
      var n = nn.get(), x0 = jbSample(shape, kk.get(), n, seed), m0 = mean(x0), s0 = sd(x0), x = x0.concat(added), ext = null;
      if (add.checked) { ext = +(m0 + ov.get() * s0).toFixed(10); x.push(ext); }
      var R = normality(x), r = R.jb, st = state(R), col = st.key === 'ok' ? GREEN : st.key === 'no' ? RED : AMBER;
      // banner
      banner.className = 'bl-banner is-' + st.key; banner.style.borderColor = col;
      banner.innerHTML = '<strong style="color:' + col + '">' + (st.key === 'ok' ? T('✔ Distribution compatible avec une loi normale', '✔ Distribution compatible with a normal law')
        : st.key === 'no' ? T('✘ Distribution non normale', '✘ Distribution not normal') : T('≈ Cas limite : les tests ne sont pas d’accord', '≈ Borderline: the tests disagree')) + '</strong>' +
        '<span>' + (st.key === 'ok' ? T('Aucun des trois tests ne rejette H₀ (toutes les p-values ≥ 5 %). Cela ne prouve pas la normalité : rien ne permet de la rejeter.', 'None of the three tests rejects H₀ (all p-values ≥ 5%). This does not prove normality: nothing allows rejecting it.')
          : st.key === 'no' ? T('Les trois tests rejettent H₀ (p < 5 %) : les données ne suivent pas une loi normale.', 'All three tests reject H₀ (p < 5%): the data do not follow a normal law.')
            : T(st.c + ' test' + (st.c > 1 ? 's' : '') + ' sur 3 rejette' + (st.c > 1 ? 'nt' : '') + ' H₀. Regardez l’histogramme et la droite de Henry avant de conclure.', st.c + ' test' + (st.c > 1 ? 's' : '') + ' out of 3 reject' + (st.c > 1 ? '' : 's') + ' H₀. Look at the histogram and the Q-Q plot before concluding.')) + ' (n = ' + x.length + ')</span>';
      // histogram
      var lo = Math.min.apply(null, x), hi = Math.max.apply(null, x), pad = (hi - lo) * 0.06 || 1, a = lo - pad, b = hi + pad;
      var k = Math.max(6, Math.min(30, Math.round(2 * Math.pow(x.length, 1 / 3) + 2))), wb = (b - a) / k, cnt = [], i;
      for (i = 0; i < k; i++) cnt.push(0); x.forEach(function (v) { cnt[Math.min(k - 1, Math.floor((v - a) / wb))]++; });
      var dens = cnt.map(function (c) { return c / (x.length * wb); }), ym = Math.max(Math.max.apply(null, dens), normPdf(0) / r.s) * 1.12;
      var box = [56, 16, 588, 262], Xs = scale(a, b, box[0], box[2]), Ys = scale(0, ym, box[3], box[1]);
      view = { box: box, inv: scale(box[0], box[2], a, b) };
      var s = axes(Xs, Ys, [a, b], [0, ym], box, T('valeur mesurée x', 'measured value x'), '', { ny: 3, nx: 6, noY: true });
      for (i = 0; i < k; i++) s += '<rect x="' + (Xs(a + i * wb) + 0.5) + '" y="' + Ys(dens[i]) + '" width="' + Math.max(1, Xs(a + wb) - Xs(a) - 1) + '" height="' + (box[3] - Ys(dens[i])) + '" fill="' + FILL[st.key] + '" stroke="' + col + '" stroke-opacity=".55"/>';
      var d = ''; for (i = 0; i <= 160; i++) { var v = a + (b - a) * i / 160; d += (i ? 'L' : 'M') + Xs(v).toFixed(1) + ',' + Ys(normPdf((v - r.m) / r.s) / r.s).toFixed(1); }
      s += '<path d="' + d + '" fill="none" stroke="#193d5b" stroke-width="2.6"/>';
      added.concat(ext === null ? [] : [ext]).forEach(function (v) { s += '<circle cx="' + Xs(v) + '" cy="' + (box[3] - 9) + '" r="7" fill="#e07b39" stroke="#fff" stroke-width="2"/>'; });
      hist.innerHTML = s;
      // Q-Q plot (droite de Henry)
      var ys = x.slice().sort(function (p, q) { return p - q; }), N = ys.length, zq = ys.map(function (_, j) { return normInv((j + 1 - 0.375) / (N + 0.25)); });
      var zl = Math.max(3, Math.abs(zq[0]) + 0.2), qb = [52, 16, 368, 262], Zx = scale(-zl, zl, qb[0], qb[2]), Vy = scale(a, b, qb[3], qb[1]);
      var q = axes(Zx, Vy, [-zl, zl], [a, b], qb, T('quantile de la loi normale (z)', 'normal quantile (z)'), '', { nx: 5, ny: 5 });
      q += '<line x1="' + Zx(-zl) + '" y1="' + Vy(r.m - zl * r.s) + '" x2="' + Zx(zl) + '" y2="' + Vy(r.m + zl * r.s) + '" stroke="#193d5b" stroke-width="2.2" clip-path="url(#qqc' + chart.dataset.u + ')"/>';
      q = '<defs><clipPath id="qqc' + chart.dataset.u + '"><rect x="' + qb[0] + '" y="' + qb[1] + '" width="' + (qb[2] - qb[0]) + '" height="' + (qb[3] - qb[1]) + '"/></clipPath></defs>' + q;
      var hl = {}; added.concat(ext === null ? [] : [ext]).forEach(function (v) { hl[v] = (hl[v] || 0) + 1; });
      ys.forEach(function (v, j) {
        var o = hl[v] > 0; if (o) hl[v]--;
        q += '<circle cx="' + Zx(zq[j]).toFixed(1) + '" cy="' + Vy(v).toFixed(1) + '" r="' + (o ? 6 : N > 300 ? 2.2 : 3.2) + '" fill="' + (o ? '#e07b39' : '#2f6f8f') + '" fill-opacity="' + (o ? 1 : 0.7) + '"' + (o ? ' stroke="#fff" stroke-width="1.5"' : '') + '/>';
      });
      qq.innerHTML = q;
      // comparison table
      var lf = R.lf;
      cmp.innerHTML = '<table class="bl-cmp"><thead><tr><th>' + T('Test', 'Test') + '</th><th>' + T('Ce qu’il compare', 'What it compares') + '</th><th>' + T('Statistique', 'Statistic') + '</th><th>p</th><th>' + T('Verdict à 5 %', 'Verdict at 5%') + '</th></tr></thead><tbody>' +
        '<tr><td><b>Jarque-Bera</b></td><td>' + T('asymétrie S et aplatissement C', 'skewness S and kurtosis C') + '</td><td>JB = ' + fmt(r.JB, 2) + '</td><td>' + fp(r.p) + '</td><td>' + chip(st.rej[0]) + '</td></tr>' +
        '<tr><td><b>Shapiro-Wilk</b></td><td>' + T('valeurs triées et quantiles normaux (droite de Henry)', 'sorted values and normal quantiles (Q-Q line)') + '</td><td>W = ' + fmt(R.sw.W, 4) + '</td><td>' + fp(R.sw.p) + '</td><td>' + chip(st.rej[1]) + '</td></tr>' +
        '<tr><td><b>Kolmogorov-Smirnov</b> <small>(Lilliefors)</small></td><td>' + T('plus grand écart entre la fonction de répartition observée et la normale', 'largest gap between the observed and normal cumulative distributions') + '</td><td>D = ' + fmt(lf.D, 3) + '<small> (' + T('seuil ', 'cutoff ') + fmt(lf.crit, 3) + ')</small></td><td>' + (lf.p === null ? '&gt; ' + fmt(0.1, 2) : fp(lf.p)) + '</td><td>' + chip(st.rej[2]) + '</td></tr></tbody></table>';
      // Jarque-Bera detail
      metrics(met, [['n', r.n + ''], [T('Moyenne x̄', 'Mean x̄'), fmt(r.m, 2)], [T('Écart-type s', 'Standard deviation s'), fmt(r.s, 3), T('dénominateur n − 1', 'denominator n − 1')],
        [T('Asymétrie S', 'Skewness S'), fmt(r.S, 3), T('S > 0 : queue à droite', 'S > 0: right tail')], [T('Excès d’aplatissement C', 'Excess kurtosis C'), fmt(r.C, 3), T('C > 0 : queues épaisses', 'C > 0: heavy tails')], ['JB', fmt(r.JB, 3), T('seuil 5,99', 'threshold 5.99')], ['p-value', fp(r.p)]]);
      var tot = Math.max(r.JB, 5.991), wS = r.partS / tot * 100, wC = r.partC / tot * 100, wc = 5.991 / tot * 100;
      parts.innerHTML = '<p class="bl-h4">' + T('De quoi est fait JB ?', 'What is JB made of?') + '</p><div class="st-variance bl-jbbar" role="img" aria-label="JB ' + fmt(r.JB, 2) + '"><span style="width:' + wS.toFixed(1) + '%;background:#087e8b"></span><span style="width:' + wC.toFixed(1) + '%;background:#e0a066"></span><i style="left:' + wc.toFixed(1) + '%"></i></div>' +
        '<p class="st-legend"><span><i style="background:#087e8b"></i>' + T('part de l’asymétrie (n/6)S² = ', 'skewness part (n/6)S² = ') + fmt(r.partS, 2) + '</span><span><i style="background:#e0a066"></i>' + T('part de l’aplatissement (n/24)C² = ', 'kurtosis part (n/24)C² = ') + fmt(r.partC, 2) + '</span><span><i style="background:#b03a2e"></i>' + T('seuil 5,99', 'threshold 5.99') + '</span></p>';
      var xmax = Math.max(14, Math.min(r.JB * 1.15, 40));
      densityChart(chart, function (v) { return chi2Pdf(v, 2); }, [0, xmax], 0.52, [[5.991, xmax]], [[r.JB, xmax]], r.JB, T('valeur de JB', 'value of JB'), 'JB = ' + fmt(r.JB, 2));
      verdict(ver, r.p, ALPHA, T('données issues d’une loi normale', 'data drawn from a normal law'), T('les données ne suivent pas une loi normale', 'the data do not follow a normal law'));
      warn.textContent = T('Le seuil 5,99 (loi du χ² à 2 ddl) est asymptotique : fiable pour les grands échantillons, seulement indicatif avec quelques dizaines de valeurs (le cours demande n > 20). Avec n = ' + r.n + (r.n < 100 ? ', lire le verdict de Jarque-Bera avec prudence ; Shapiro-Wilk est mieux calibré pour les petits échantillons.' : '.'),
        'The 5.99 cutoff (χ² law with 2 df) is asymptotic: reliable for large samples, only indicative with a few dozen values (the course asks for n > 20). With n = ' + r.n + (r.n < 100 ? ', read the Jarque-Bera verdict with care; Shapiro-Wilk is better calibrated for small samples.' : '.'));
      conv.innerHTML = T('Convention des logiciels (scipy, R) : moments divisés par n au lieu de s calculé avec n − 1. Ici : S = ', 'Software convention (scipy, R): moments divided by n instead of s computed with n − 1. Here: S = ') + fmt(r.S1, 3) + ', C = ' + fmt(r.C1, 3) + ', JB = ' + fmt(r.JB1, 3) + ', p = ' + fp(r.p1) + T('. L’écart diminue quand n grandit.', '. The gap shrinks as n grows.');
      // p of the three tests against the extreme point position
      var base = x0.concat(added), xs = [], pj = [], ps = [], pl = [];
      for (var t = -8; t <= 8.0001; t += 0.2) { var xx = base.concat([m0 + t * s0]), RR = normality(xx); xs.push(+t.toFixed(1)); pj.push(RR.jb.p); ps.push(RR.sw.p); pl.push(RR.lf.pr); }
      pCurveN(pc, xs, [[pj, '#087e8b', 'Jarque-Bera', ''], [ps, '#6a4c93', 'Shapiro-Wilk', '8 4'], [pl, '#8a6d1d', T('Kolmogorov-Smirnov (Lilliefors, plafonné à 0,10)', 'Kolmogorov-Smirnov (Lilliefors, capped at 0.10)'), '3 4']], add.checked ? ov.get() : null,
        T('position du point extrême (écarts-types s depuis la moyenne)', 'position of the extreme point (standard deviations s from the mean)'), ALPHA);
      note.innerHTML = (add.checked ? '' : T('Cochez « Ajouter le point extrême » pour le placer. ', 'Tick “Add the extreme point” to place it. ')) +
        T('Avec ces ' + base.length + ' valeurs, Jarque-Bera devient significatif ', 'With these ' + base.length + ' values, Jarque-Bera becomes significant ') + rangesText(sigRanges(xs, pj, ALPHA), T('écarts-types', 'standard deviations'), 1) +
        T(' ; Shapiro-Wilk ', '; Shapiro-Wilk ') + rangesText(sigRanges(xs, ps, ALPHA), T('écarts-types', 'standard deviations'), 1) + '.';
    }
    preset('normal'); return { preset: preset };
  };
  function pCurveN(el, xs, series, xcur, xlab, alpha) {
    var box = [70, 14, 700, 170], lo = -4, X = scale(xs[0], xs[xs.length - 1], box[0], box[2]);
    var Y = function (p) { var l = Math.log10(Math.max(p, 1e-4)); return box[3] + (l - lo) / (0 - lo) * (box[1] - box[3]); }, s = '', i;
    var tx = ticks(xs[0], xs[xs.length - 1], 8);
    s += '<line x1="' + box[0] + '" y1="' + box[3] + '" x2="' + box[2] + '" y2="' + box[3] + '" stroke="#5a7180"/><line x1="' + box[0] + '" y1="' + box[1] + '" x2="' + box[0] + '" y2="' + box[3] + '" stroke="#5a7180"/>';
    tx.v.forEach(function (v) { s += '<text class="st-axis" x="' + X(v) + '" y="' + (box[3] + 20) + '" text-anchor="middle">' + tk(v, tx.step) + '</text>'; });
    [1, 0.1, 0.01, 0.001, 0.0001].forEach(function (p) { s += '<line x1="' + box[0] + '" y1="' + Y(p) + '" x2="' + box[2] + '" y2="' + Y(p) + '" stroke="#e3ebef"/><text class="st-axis" x="' + (box[0] - 7) + '" y="' + (Y(p) + 4) + '" text-anchor="end">' + fmt(p, p >= 1 ? 0 : -Math.log10(p)) + '</text>'; });
    s += '<line x1="' + box[0] + '" y1="' + Y(alpha) + '" x2="' + box[2] + '" y2="' + Y(alpha) + '" stroke="#b03a2e" stroke-width="2" stroke-dasharray="7 5"/>';
    s += '<text class="st-axis" x="' + (box[2] - 4) + '" y="' + (Y(alpha) - 6) + '" text-anchor="end" style="fill:#b03a2e">α = ' + fmt(alpha, 2) + '</text>';
    series.forEach(function (se) {
      var d = ''; for (i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ',' + Y(se[0][i]).toFixed(1);
      s += '<path d="' + d + '" fill="none" stroke="' + se[1] + '" stroke-width="2.6"' + (se[3] ? ' stroke-dasharray="' + se[3] + '"' : '') + '/>';
    });
    if (xcur !== null) s += '<line x1="' + X(xcur) + '" y1="' + box[1] + '" x2="' + X(xcur) + '" y2="' + box[3] + '" stroke="#e07b39" stroke-width="2"/><circle cx="' + X(xcur) + '" cy="' + box[3] + '" r="6" fill="#e07b39" stroke="#fff" stroke-width="2"/>';
    s += '<text class="st-axis" x="' + ((box[0] + box[2]) / 2) + '" y="' + (box[3] + 42) + '" text-anchor="middle">' + xlab + '</text>';
    s += '<text class="st-axis" transform="translate(' + (box[0] - 52) + ',' + ((box[1] + box[3]) / 2) + ') rotate(-90)" text-anchor="middle">' + T('p (échelle log)', 'p (log scale)') + '</text>';
    el.innerHTML = s;
    var lg = el.nextSibling && el.nextSibling.classList && el.nextSibling.classList.contains('bl-pleg') ? el.nextSibling : null;
    if (!lg) { lg = h('p', { 'class': 'st-legend bl-pleg' }); el.parentNode.insertBefore(lg, el.nextSibling); }
    lg.innerHTML = series.map(function (se) { return '<span><i style="background:' + se[1] + '"></i>' + se[2] + '</span>'; }).join('');
  }

  /* ---------- boot ---------- */
  var REG = {};
  document.querySelectorAll('[data-bl]').forEach(function (el) {
    var f = LABS[el.getAttribute('data-bl')]; if (!f) return;
    el.classList.add('st-lab', 'bl-lab'); el.innerHTML = ''; REG[el.getAttribute('data-bl')] = f(el);
  });
  document.querySelectorAll('[data-bl-load]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-bl-load').split(':'), lab = document.querySelector('[data-bl="' + p[0] + '"]');
      if (REG[p[0]] && lab) { REG[p[0]].preset(p[1]); lab.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
  document.querySelectorAll('.bl-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var pre = document.getElementById(b.getAttribute('data-target')); if (!pre || !navigator.clipboard) return;
      navigator.clipboard.writeText(pre.textContent).then(function () { var t = b.textContent; b.textContent = T('Copié', 'Copied'); setTimeout(function () { b.textContent = t; }, 1500); }, function () {});
    });
  });
  window.BiostatLabs = { normSf: normSf, tP2: tP2, chi2Sf: chi2Sf, chi2Crit: chi2Crit, tCrit: tCrit, zCrit: zCrit, normInv: normInv, ttest2: ttest2, regress: regress, chi2table: chi2table, jbStats: jbStats, shapiro: shapiro, lilliefors: lilliefors, jbSample: jbSample };
})();
