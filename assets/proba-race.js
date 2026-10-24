/* ELM vs persistence, probabilistic forecasts over three days (www home, 24/10/2026).
   Point forecasts: validated PV_ELM_pred code (ridge ELM) and simple persistence, precomputed (proba-race.json).
   Here, live: the look-up table turns each point forecast into quantiles 5-25-50-75-95 %, and the CRPS is accumulated
   as the cursor moves. At the end, the scores must equal json.check (computed by make_proba_anim.py).
   Canvas 2D, no library; loads only when visible; still image when the reader prefers reduced motion. */
(function () {
  "use strict";
  var box = document.getElementById("proba-race");
  if (!box || !window.fetch) return;
  var fr = box.getAttribute("data-lang") === "fr";
  var cv = box.querySelector("canvas"), ctx = cv.getContext("2d");
  var btn = box.querySelector(".pr-play"), rng = box.querySelector(".pr-range");
  var out = { elm: box.querySelector("[data-s=elm]"), pers: box.querySelector("[data-s=pers]"),
              bElm: box.querySelector("[data-b=elm]"), bPers: box.querySelector("[data-b=pers]"),
              gain: box.querySelector(".pr-gain"), cov: box.querySelector(".pr-cov"), mil: box.querySelector(".pr-mil") };
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var D = null, Q = {}, cur = 0, playing = false, last = 0, visible = false, W = 0, Hh = 0, dpr = 1;
  var SPEED = 9;                       // steps of 30 min per second: three days in 16 s

  function css(v, d) { var x = getComputedStyle(box).getPropertyValue(v).trim(); return x || d; }
  var C = {};
  function colours() {
    C = { ink: css("--ink", "#172536"), muted: css("--muted", "#46586a"), line: css("--line", "#ccd6e0"),
          elm: css("--link", "#07569a"), pers: css("--focus", "#ad5200"), soft: css("--soft", "#edf4fa"), paper: css("--paper", "#fff") };
  }

  /* LUT: interpolate the quantiles between bin centres (same as the Python test) */
  function quant(m, h, f) {
    var e = D.edges, x = f / D.pmax, t = D.lut[m][h], n = t.length, c = [], i, k, r = [];
    for (i = 0; i < n; i++) c.push((e[i] + Math.min(e[i + 1], 1)) / 2);
    for (k = 0; k < D.q.length; k++) {
      var y;
      if (x <= c[0]) y = t[0][k];
      else if (x >= c[n - 1]) y = t[n - 1][k];
      else { for (i = 0; x > c[i + 1]; i++); var a = (x - c[i]) / (c[i + 1] - c[i]); y = t[i][k] + a * (t[i + 1][k] - t[i][k]); }
      r.push(y * D.pmax);
    }
    return r;
  }
  function prep() {                    // quantiles of every forecast, once
    ["elm", "pers"].forEach(function (m) {
      Q[m] = [];
      for (var h = 0; h < D.H; h++) { var row = []; for (var i = 0; i < D.obs.length; i++) row.push(D.day[i] ? quant(m, h, D[m][h][i]) : [0, 0, 0, 0, 0]); Q[m].push(row); }
    });
  }
  /* CRPS from the five quantiles (mean pinball loss x 2), daytime targets <= i, all horizons; coverage of the 90 % band */
  function scores(upto) {
    var s = { elm: [0, 0, 0, 0], pers: [0, 0, 0, 0] };
    ["elm", "pers"].forEach(function (m) {
      for (var i = 0; i <= upto; i++) {
        if (!D.day[i]) continue;
        for (var h = 0; h < D.H; h++) {
          var q = Q[m][h][i], o = D.obs[i], p = 0;
          for (var k = 0; k < 5; k++) { var e = o - q[k]; p += 2 * Math.max(D.q[k] * e, (D.q[k] - 1) * e); }
          s[m][0] += p / 5; s[m][1] += 1; s[m][2] += (o >= q[0] && o <= q[4]) ? 1 : 0;
          s[m][3] += q[4] - q[0];
        }
      }
    });
    return s;
  }

  function size() {
    var w = cv.clientWidth; dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = w; Hh = Math.round(Math.max(190, Math.min(300, w * 0.36)));
    cv.style.height = Hh + "px"; cv.width = Math.round(w * dpr); cv.height = Math.round(Hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var PADL = 8, PADR = 8, PADT = 12, PADB = 22;
  function X(i) { return PADL + (W - PADL - PADR) * i / (D.obs.length - 1); }
  function Y(v) { return PADT + (Hh - PADT - PADB) * (1 - v / (D.pmax * 1.05)); }

  function band(m, c, lo, hi, col, alpha) {
    var h, i, n = Math.min(D.H, D.obs.length - 1 - c);
    if (n <= 0) return;
    ctx.beginPath(); ctx.moveTo(X(c), Y(D.obs[c]));
    for (h = 0; h < n; h++) { i = c + h + 1; ctx.lineTo(X(i), Y(Q[m][h][i][hi])); }
    for (h = n - 1; h >= 0; h--) { i = c + h + 1; ctx.lineTo(X(i), Y(Q[m][h][i][lo])); }
    ctx.closePath(); ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
  }
  function median(m, c, col) {
    var n = Math.min(D.H, D.obs.length - 1 - c);
    ctx.beginPath(); ctx.moveTo(X(c), Y(D.obs[c]));
    for (var h = 0; h < n; h++) { var i = c + h + 1; ctx.lineTo(X(i), Y(Q[m][h][i][2])); }
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
  }

  var t0 = 0, dayFmt = null;
  function draw() {
    if (!D) return;
    var n = D.obs.length, c = Math.min(n - 1, Math.floor(cur)), i;
    ctx.clearRect(0, 0, W, Hh);
    // nights
    ctx.fillStyle = C.soft;
    for (i = 0; i < n; i++) if (!D.day[i]) ctx.fillRect(X(i) - (X(1) - X(0)) / 2, PADT, X(1) - X(0) + 0.6, Hh - PADT - PADB);
    // days on the axis
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    for (i = 0; i < n; i += 48) {
      var d = new Date(t0 + (i + 24) * D.step_min * 60000);
      ctx.fillText(dayFmt.format(d), X(i + 24), Hh - 6);
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PADL, Y(0) + 0.5); ctx.lineTo(W - PADR, Y(0) + 0.5); ctx.stroke();
    // the future: what the models see coming (persistence first, ELM on top)
    band("pers", c, 0, 4, C.pers, 0.13); band("pers", c, 1, 3, C.pers, 0.22);
    band("elm", c, 0, 4, C.elm, 0.16); band("elm", c, 1, 3, C.elm, 0.28);
    median("pers", c, C.pers); median("elm", c, C.elm);
    // the past: the observed power, revealed as time goes by
    ctx.beginPath(); ctx.moveTo(X(0), Y(D.obs[0]));
    for (i = 1; i <= c; i++) ctx.lineTo(X(i), Y(D.obs[i]));
    var f = cur - c;
    if (c < n - 1 && f > 0) ctx.lineTo(X(c + f), Y(D.obs[c] + f * (D.obs[c + 1] - D.obs[c])));
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.stroke();
    // now
    var xn = X(cur);
    ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xn, PADT); ctx.lineTo(xn, Hh - PADB); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(xn, Y(D.obs[c]), 3.5, 0, 6.3); ctx.fillStyle = C.ink; ctx.fill();
    board(c);
    rng.value = String(c);
  }

  var lastC = -1;
  function board(c) {
    if (c === lastC) return; lastC = c;
    var s = scores(c), fmt = function (v) { return (v / 1000).toFixed(2).replace(".", fr ? "," : ".") + " kW"; };
    if (!s.elm[1]) { out.elm.textContent = out.pers.textContent = "–"; out.gain.textContent = ""; out.cov.textContent = ""; out.mil.textContent = ""; return; }
    var e = s.elm[0] / s.elm[1], p = s.pers[0] / s.pers[1], mx = Math.max(e, p);
    out.elm.textContent = fmt(e); out.pers.textContent = fmt(p);
    out.bElm.style.width = (mx ? 100 * e / mx : 0) + "%"; out.bPers.style.width = (mx ? 100 * p / mx : 0) + "%";
    var g = Math.round(100 * (1 - e / p));
    out.gain.textContent = (fr ? "ELM : erreur probabiliste " : "ELM: probabilistic error ") + (g >= 0 ? "−" + g : "+" + (-g)) + (fr ? " % par rapport à la persistance" : "% vs persistence");
    if (!p) out.gain.textContent = fr ? "Comparaison relative indéfinie : score de référence nul." : "Relative comparison undefined: reference score is zero.";
    out.cov.textContent = (fr ? "PICP — bande nominale à 90 % : " : "PICP — nominal 90% band: ") +
      Math.round(100 * s.elm[2] / s.elm[1]) + (fr ? " % du temps (ELM), " : "% of the time (ELM), ") +
      Math.round(100 * s.pers[2] / s.pers[1]) + (fr ? " % (persistance)" : "% (persistence)");
    out.mil.textContent = "MIL — " + fmt(s.elm[3] / s.elm[1]) + " (ELM), " + fmt(s.pers[3] / s.pers[1]) + (fr ? " (persistance). N = " : " (persistence). N = ") + s.elm[1];
    if (c === D.obs.length - 1) box.setAttribute("data-check", (Math.abs(e - D.check.crps_elm) < 0.5 && Math.abs(p - D.check.crps_pers) < 0.5) ? "ok" : "fail");
  }

  function tick(ts) {
    if (!playing || !visible) { last = 0; return; }
    if (last) cur += SPEED * Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (cur >= D.obs.length - 1) { cur = D.obs.length - 1; draw(); playing = false; setBtn(); setTimeout(function () { if (!playing && cur >= D.obs.length - 1 && !box.dataset.user) { cur = 0; lastC = -1; play(); } }, 2500); return; }
    draw(); requestAnimationFrame(tick);
  }
  function setBtn() { btn.textContent = playing ? (fr ? "Pause" : "Pause") : (fr ? "Lecture" : "Play"); btn.setAttribute("aria-pressed", playing ? "true" : "false"); }
  function play() { playing = true; setBtn(); last = 0; requestAnimationFrame(tick); }

  function start() {
    fetch(box.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (j) {
      D = j; t0 = Date.parse(j.start_utc + "Z");
      dayFmt = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" });
      colours(); prep(); size(); rng.max = String(D.obs.length - 1);
      box.classList.add("ready");
      if (still) { cur = D.obs.length - 1; draw(); setBtn(); } else { cur = 0; draw(); play(); }
    }).catch(function () { box.classList.add("failed"); });
  }
  btn.addEventListener("click", function () {
    if (!D) return; box.dataset.user = "1";
    if (playing) { playing = false; setBtn(); } else { if (cur >= D.obs.length - 1) { cur = 0; lastC = -1; } play(); }
  });
  rng.addEventListener("input", function () { if (!D) return; box.dataset.user = "1"; playing = false; setBtn(); cur = +rng.value; draw(); });
  window.addEventListener("resize", function () { if (D) { size(); lastC = -1; draw(); } });
  if (window.matchMedia) { var mq = window.matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", function () { colours(); draw(); }); }
  var io = new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible && !D && !box.classList.contains("loading")) { box.classList.add("loading"); start(); }
    else if (visible && playing) { last = 0; requestAnimationFrame(tick); }
  }, { rootMargin: "100px" });
  io.observe(box);
})();
