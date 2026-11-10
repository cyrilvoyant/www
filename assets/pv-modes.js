/* PV forecasting modes (www, 10/11/2026): PV direct, GTI then PV, GHI then GTI then PV, on open SOLETE data (DTU, CC BY 4.0).
   Forecasts are precomputed once (work/pv_modes/make_pv_modes.py, frozen training, PV_ELM_pred models) and read from pv-modes.json.
   Every error shown here is computed live by the core below, which mirrors work/pv_modes/pvm_check.py line by line;
   check_pv_modes.cjs runs this core in Node and compares it with Python. NICE above 1 is shown as "> 1", never as a number.
   Plain SVG, no library. */
(function () {
  "use strict";

  // ---------------------------------------------------------------- computation core (no DOM)
  var core = (function () {
    var KCAP = { 0.5: "0.5", 2: "2.0" }, SKEY = { 0.6: "0.6", 0.3: "0.3", 0: "0.0" };

    function prep(D) {
      var n = D.n, S = { D: D, n: n, pc: D.pc_kw, cache: {} };
      S.P = Float64Array.from(D.P, function (v) { return v / 100; });
      S.day = Int32Array.from(D.day);
      S.pos = new Int32Array(n).fill(-1);
      for (var i = 0; i < S.day.length; i++) S.pos[S.day[i]] = i;
      S.CT = Float64Array.from(D.CT, function (v) { return v / 100; });
      S.CG = Float64Array.from(D.CG, function (v) { return v / 100; });
      var t0 = Date.parse(D.t0.replace(" ", "T") + "Z");
      S.t0 = t0;
      S.month = Int8Array.from(D.day, function (d) { return new Date(t0 + d * 1800e3).getUTCMonth(); });
      return S;
    }
    function arr(S, sec, key) {
      var c = S.cache[sec + "#" + key];
      if (!c) { c = S.cache[sec + "#" + key] = Float64Array.from(S.D[sec][key], function (v) { return v / 100; }); }
      return c;
    }
    function Lk(e, k) { var s = 0; for (var i = 0; i < e.length; i++) s += Math.pow(Math.abs(e[i]), k); return Math.pow(s / e.length, 1 / k); }
    function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
    function diff(a, b) { var o = new Float64Array(a.length); for (var i = 0; i < a.length; i++) o[i] = a[i] - b[i]; return o; }
    function scores(y, f, ref) {
      var e = diff(f, y), er = diff(ref, y), r = Lk(e, 2), n = [1, 2, 3].map(function (k) { return Lk(e, k) / Lk(er, k); });
      return { RMSE: r, nRMSE: r / mean(y), NICE1: n[0], NICE2: n[1], NICE3: n[2], NICES: (n[0] + n[1] + n[2]) / 3 };
    }
    // the year: one mode (pv | gti | ghi), one model, one horizon H (steps of 30 min), capacity factor k, PV direct on P/Pc (norm)
    function year(S, md, m, H, k, norm) {
      var idx = [], i;
      for (i = 0; i < S.day.length; i++) if (S.day[i] - H >= 0) idx.push(i);
      var L = idx.length, y = new Float64Array(L), ref = new Float64Array(L), f = new Float64Array(L), ct = new Float64Array(L), cg = new Float64Array(L);
      var raw = md === "pv" && k !== 1 && (m === "AR" || m === "ELM") && !norm;
      var src = raw ? arr(S, "cap", KCAP[k] + "|" + m + "|" + H) : arr(S, "fc", md + "|" + m + "|" + H), fk = raw ? 1 : k;
      for (var j = 0; j < L; j++) {
        i = idx[j];
        y[j] = k * S.P[S.day[i]]; ref[j] = k * S.P[S.day[i] - H]; f[j] = fk * src[i]; ct[j] = k * S.CT[i]; cg[j] = k * S.CG[i];
      }
      var out = scores(y, f, ref), terms;
      if (md === "ghi") terms = [diff(f, ct), diff(ct, cg), diff(cg, y)];
      else if (md === "gti") terms = [diff(f, cg), diff(cg, y)];
      else terms = [diff(f, y)];
      var mse = terms.map(function (t) { var s = 0; for (var q = 0; q < t.length; q++) s += t[q] * t[q]; return s / t.length; });
      var tot = mse.reduce(function (a, b) { return a + b; }, 0);
      out.stage_rmse = mse.map(Math.sqrt);
      out.share = mse.map(function (v) { return v / tot; });
      out.inter = (out.RMSE * out.RMSE - tot) / (out.RMSE * out.RMSE);
      out.monthly_nrmse = [];
      for (var mo = 0; mo < 12; mo++) {
        var se = 0, sy = 0, c = 0;
        for (j = 0; j < L; j++) if (S.month[idx[j]] === mo) { se += (f[j] - y[j]) * (f[j] - y[j]); sy += y[j]; c++; }
        out.monthly_nrmse.push(Math.sqrt(se / c) / (sy / c));
      }
      out.f = f; out.idx = idx;
      return out;
    }
    // curtailment: limit s (share of Pc), announcement (d1 | h2 | none), PV direct variant (raw | divA | mask), model, horizon
    function curtSeries(S, s, ann, v, m, H) {
      var CU = S.D.curt, W0 = CU.w0, W1 = CU.w1, IK = CU.i_known, SPAN = CU.span, pc = S.pc, sk = SKEY[s];
      var raw = S.D.curt.fc["raw|" + sk + "|" + m + "|" + H];
      var alt = (v === "divA" || (v === "mask" && s > 0)) ? CU.fc["divA|" + sk + "|" + m + "|" + H] : v === "mask" ? CU.fc["mask|" + sk + "|" + m + "|" + H] : null;
      var fg = arr(S, "fc", "gti|" + m + "|" + H), fh = arr(S, "fc", "ghi|" + m + "|" + H);
      var o = { y: [], pv: [], gti: [], ghi: [], ref: [], j: [], tau: [], known: [] };
      CU.events.forEach(function (ev, e) {
        for (var j = 0; j < SPAN; j++) {
          var tau = ev + j, i = tau - H, rel = i - ev;
          var known = ann === "d1" || (ann === "h2" && rel >= IK), win = j >= W0 && j < W1, A = win ? s * pc : pc;
          o.y.push(win ? Math.min(S.P[tau], s * pc) : S.P[tau]);
          var r = i - ev;
          o.ref.push(r >= W0 && r < W1 ? Math.min(S.P[i], s * pc) : S.P[i]);
          var p = S.pos[tau], a = p >= 0 ? fg[p] : 0, b = p >= 0 ? fh[p] : 0;
          o.gti.push(known ? Math.min(a, A) : a); o.ghi.push(known ? Math.min(b, A) : b);
          var z = (alt === null || !known) ? raw[e * SPAN + j] : alt[e * SPAN + j], f = z === null ? NaN : z / 100;
          o.pv.push(known && isFinite(f) ? Math.min(f, A) : f);
          o.j.push(j); o.tau.push(tau); o.known.push(known);
        }
      });
      return o;
    }
    function curt(S, s, ann, v, m, H) {
      var CU = S.D.curt, o = curtSeries(S, s, ann, v, m, H), res = {};
      [["during", function (k) { return o.j[k] >= CU.w0 && o.j[k] < CU.w1; }], ["after", function (k) { return o.j[k] >= CU.w1 && S.pos[o.tau[k]] >= 0; }]].forEach(function (pp) {
        var sel = []; for (var k = 0; k < o.j.length; k++) if (pp[1](k)) sel.push(k);
        ["pv", "gti", "ghi"].forEach(function (md) {
          var f = sel.map(function (k) { return o[md][k]; }), fail = f.filter(function (x) { return !isFinite(x); }).length;
          if (fail) { res[pp[0] + "|" + md] = { fail: fail, n: sel.length }; return; }
          var r = scores(Float64Array.from(sel.map(function (k) { return o.y[k]; })), Float64Array.from(f), Float64Array.from(sel.map(function (k) { return o.ref[k]; })));
          res[pp[0] + "|" + md] = { RMSE: r.RMSE, NICE2: r.NICE2, fail: 0, n: sel.length };
        });
      });
      return res;
    }
    return { prep: prep, year: year, curt: curt, curtSeries: curtSeries, arr: arr };
  })();

  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }

  // ---------------------------------------------------------------- interface
  var box = document.getElementById("pvm");
  if (!box || !window.fetch) return;
  var cutBox = document.getElementById("pvm-cut");
  var fr = box.getAttribute("data-lang") === "fr";
  var NS = "http://www.w3.org/2000/svg";
  var LINK = fr
    ? { P: "/fr/actualites/forecasting-with-less/", BLEND: "/fr/outils/blend/", AR: "/fr/outils/comparateur-previsions/", ELM: "/fr/actualites/why-extreme-learning-machines/", nice: "/fr/outils/nice/" }
    : { P: "/latest-publications-and-news/forecasting-with-less/", BLEND: "https://cyrilvoyant.github.io/methods/persistence-blend.html", AR: "/tools/forecast-comparison/", ELM: "/latest-publications-and-news/why-extreme-learning-machines/", nice: "/latest-publications-and-news/nice-forecast-evaluation/" };
  var L = fr ? {
    load: "Chargement des prévisions (1 Mo environ)…", fail: "Les données n’ont pas pu être chargées.",
    model: "Modèle de prévision", hz: "Horizon", cap: "Puissance crête installée", norm: "PV direct sur P / P<sub>c</sub>",
    models: { P: "persistance", BLEND: "BLEND", AR: "autorégression AR", ELM: "ELM" },
    about: "Ces modèles sont expliqués ailleurs : ",
    capo: [["0.5", "divisée par 2 (5 kW)"], ["1", "telle quelle (10 kW)"], ["2", "doublée (20 kW)"]],
    modes: { pv: "PV direct", gti: "GTI puis PV", ghi: "GHI puis GTI puis PV" },
    t1: "L’erreur des trois voies sur l’année d’évaluation", th: ["Voie", "RMSE (kW)", "nRMSE", "NICE¹", "NICE²", "NICE³", "NICE<sup>Σ</sup>"],
    cap1: "Les trois voies, même modèle, même horizon, instants de jour du 1er septembre 2018 au 31 août 2019",
    t2: "D’où vient l’erreur finale ?", t3: "Trois jours : mesure et prévisions", t4: "Mois par mois : la nRMSE des trois voies",
    stages: { ghi: "prévision de GHI", tr: "transposition GHI → GTI", gti: "prévision de GTI", conv: "conversion GTI → PV", pv: "prévision de PV" },
    unitW: "W/m²", kw: "kW", meas: "mesure", day: "Premier jour affiché",
    inter: function (v) { return v >= 0 ? "Termes croisés : +" + pct(v) + " de l’erreur quadratique finale (les erreurs des étapes vont un peu dans le même sens)." : "Termes croisés : −" + pct(-v) + " de l’erreur quadratique finale (les erreurs des étapes se compensent en partie)."; },
    one: "Une seule étape : toute l’erreur vient de la prévision de la puissance.",
    sh: "part de l’erreur quadratique", rm: "erreur propre (RMSE, en kW de PV)", nat: "dans son unité",
    over: "> 1", best: "La voie la plus juste ici : ",
    capNote: {
      same: "Puissance crête inchangée : diviser par P<sub>c</sub> ne change rien, les prévisions sont identiques.",
      norm: "PV direct travaille sur P / P<sub>c</sub> avec la nouvelle P<sub>c</sub> : le modèle figé revoit des valeurs familières, et l’erreur relative (nRMSE, NICE) revient à celle de la centrale d’origine. Les voies par l’éclairement, elles, n’ont besoin que de la nouvelle P<sub>c</sub> dans la conversion.",
      raw: "PV direct reçoit des kilowatts qu’il n’a jamais vus : son apprentissage est figé sur une centrale de 10 kW. La persistance et BLEND n’en souffrent pas (elles recopient les valeurs) ; l’AR, presque linéaire, un peu ; l’ELM, non linéaire, davantage. Cochez « PV direct sur P / P<sub>c</sub> » pour corriger. Les voies par l’éclairement ne bougent pas : il suffit de changer P<sub>c</sub> dans la conversion."
    },
    mon: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
    monNote: "En hiver, le soleil est bas, la production faible, et l’apprentissage figé n’a vu qu’un été : l’erreur relative monte pour toutes les voies, et davantage pour la voie GHI, car la transposition amplifie les erreurs quand le soleil est bas.",
    cutT: "Écrêtement : la centrale doit limiter sa puissance", lim: "Limite imposée", limo: [["0.6", "60 % de P<sub>c</sub> (6 kW)"], ["0.3", "30 % de P<sub>c</sub> (3 kW)"], ["0", "0 (arrêt)"]],
    ann: "Annonce", anno: [["d1", "la veille"], ["h2", "2 h avant"], ["none", "non annoncée"]],
    var: "PV direct", varo: [["raw", "en kW mesurés"], ["divA", "divisé par la puissance disponible annoncée"], ["mask", "divisé par la puissance disponible, heures à 0 masquées"]],
    ev: "Événement", evs: "8 journées ensoleillées de l’été 2019, écrêtées de 10 h à 14 h UTC",
    sameCtl: function (m, h) { return "Modèle et horizon : ceux du panneau du haut (" + m + ", " + h + ")."; },
    start: "début de l’écrêtement", end: "fin", annMark: "annonce (2 h avant)", annD1: "annoncé la veille",
    th2: ["Voie", "pendant (RMSE, kW)", "après, jusqu’au soir du lendemain (RMSE, kW)"],
    noNice: "NICE n’est pas affiché ici : pendant et juste après un écrêtement, la persistance recopie une valeur d’une autre heure du jour (par exemple celle du petit matin à 6 h d’horizon), et le rapport ne dit plus rien de la qualité de la prévision.",
    capT: "Sur les 8 événements, au modèle et à l’horizon choisis",
    failT: function (a, b) { return "échoue : " + a + " prévisions sur " + b + " impossibles (division par zéro)"; },
    measC: "mesure (écrêtée)"
  } : {
    load: "Loading the forecasts (about 1 MB)…", fail: "The data could not be loaded.",
    model: "Forecasting model", hz: "Horizon", cap: "Installed peak power", norm: "PV direct on P / P<sub>c</sub>",
    models: { P: "persistence", BLEND: "BLEND", AR: "AR autoregression", ELM: "ELM" },
    about: "These models are explained elsewhere: ",
    capo: [["0.5", "halved (5 kW)"], ["1", "as is (10 kW)"], ["2", "doubled (20 kW)"]],
    modes: { pv: "PV direct", gti: "GTI then PV", ghi: "GHI then GTI then PV" },
    t1: "The error of the three routes over the evaluation year", th: ["Route", "RMSE (kW)", "nRMSE", "NICE¹", "NICE²", "NICE³", "NICE<sup>Σ</sup>"],
    cap1: "The three routes, same model, same horizon, daytime from 1 September 2018 to 31 August 2019",
    t2: "Where does the final error come from?", t3: "Three days: measurement and forecasts", t4: "Month by month: the nRMSE of the three routes",
    stages: { ghi: "GHI forecast", tr: "transposition GHI → GTI", gti: "GTI forecast", conv: "conversion GTI → PV", pv: "PV forecast" },
    unitW: "W/m²", kw: "kW", meas: "measurement", day: "First day shown",
    inter: function (v) { return v >= 0 ? "Cross terms: +" + pct(v) + " of the final squared error (the stage errors lean slightly the same way)." : "Cross terms: −" + pct(-v) + " of the final squared error (the stage errors partly cancel)."; },
    one: "One stage only: all the error comes from the power forecast.",
    sh: "share of the squared error", rm: "own error (RMSE, in kW of PV)", nat: "in its own unit",
    over: "> 1", best: "The most accurate route here: ",
    capNote: {
      same: "Peak power unchanged: dividing by P<sub>c</sub> changes nothing, the forecasts are identical.",
      norm: "PV direct works on P / P<sub>c</sub> with the new P<sub>c</sub>: the frozen model sees familiar values again, and the relative error (nRMSE, NICE) returns to that of the original plant. The irradiance routes only need the new P<sub>c</sub> in the conversion.",
      raw: "PV direct receives kilowatts it has never seen: its training is frozen on a 10 kW plant. Persistence and BLEND do not suffer (they copy values); AR, almost linear, a little; ELM, nonlinear, more. Tick \"PV direct on P / P<sub>c</sub>\" to fix it. The irradiance routes do not move: changing P<sub>c</sub> in the conversion is enough."
    },
    mon: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    monNote: "In winter the sun is low, the output small, and the frozen training has only seen one summer: the relative error rises for every route, and more for the GHI route, because the transposition amplifies errors when the sun is low.",
    cutT: "Curtailment: the plant must limit its power", lim: "Imposed limit", limo: [["0.6", "60% of P<sub>c</sub> (6 kW)"], ["0.3", "30% of P<sub>c</sub> (3 kW)"], ["0", "0 (shut down)"]],
    ann: "Announcement", anno: [["d1", "the day before"], ["h2", "2 h before"], ["none", "not announced"]],
    var: "PV direct", varo: [["raw", "in measured kW"], ["divA", "divided by the announced available power"], ["mask", "divided by the available power, zero hours masked"]],
    ev: "Event", evs: "8 sunny days of summer 2019, curtailed from 10:00 to 14:00 UTC",
    sameCtl: function (m, h) { return "Model and horizon: those of the panel above (" + m + ", " + h + ")."; },
    start: "start of curtailment", end: "end", annMark: "announcement (2 h before)", annD1: "announced the day before",
    th2: ["Route", "during (RMSE, kW)", "after, until the next evening (RMSE, kW)"],
    noNice: "NICE is not shown here: during and just after a curtailment, persistence copies a value from another time of day (for instance the early morning at a 6-hour horizon), and the ratio no longer says anything about the quality of the forecast.",
    capT: "Over the 8 events, at the chosen model and horizon",
    failT: function (a, b) { return "fails: " + a + " of " + b + " forecasts impossible (division by zero)"; },
    measC: "measurement (curtailed)"
  };
  var COL = { pv: "#086b94", gti: "#0f8a7e", ghi: "#b8306b", meas: "var(--ink)" };
  var SCOL = { ghi: "#b8306b", tr: "#c27c0e", gti: "#0f8a7e", conv: "#8052a2", pv: "#086b94" };
  var STAGES = { pv: ["pv"], gti: ["gti", "conv"], ghi: ["ghi", "tr", "conv"] };
  var MODES = ["pv", "gti", "ghi"];

  var SEP = fr ? " : " : ": ";
  function num(v, n) { var s = v.toFixed(n); return fr ? s.replace(".", ",").replace("-", "−") : s.replace("-", "−"); }
  function pct(v) { return num(100 * v, 0) + (fr ? " %" : "%"); }
  function nice(v) { return !isFinite(v) ? "–" : v > 1.0005 ? '<span class="fp-over">' + L.over + "</span>" : num(v, 3); }
  function hl(H) { return H * 30 >= 60 ? num(H / 2, H % 2 ? 1 : 0) + " h" : H * 30 + " min"; }
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function txt(t, a, p, s) { var e = el(t, a, p); e.textContent = s; return e; }
  function size(svg, H) { var W = Math.round(Math.min(900, Math.max(640, svg.getBoundingClientRect().width || 640))); svg.setAttribute("viewBox", "0 0 " + W + " " + H); return W; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function path(pts) { var s = "", up = false; pts.forEach(function (p) { if (!isFinite(p[1])) { up = false; return; } s += (up ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); up = true; }); return s; }
  function sel(id, opts, val) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? " selected" : "") + ">" + o[1].replace(/<[^>]+>/g, "") + "</option>"; }).join("") + "</select>"; }

  var S = null, st = { m: "AR", hi: 1, k: 1, norm: false, d: 0, s: 0, ann: "d1", v: "raw", e: 0 };
  box.innerHTML = '<p class="fc-note">' + L.load + "</p>";
  fetch(box.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (D) {
    S = core.prep(D); st.d = D.profile_day; build(); if (cutBox) buildCut();
  }).catch(function () { box.innerHTML = '<p class="fc-note">' + L.fail + "</p>"; });

  function H() { return S.D.horizons[st.hi]; }
  function build() {
    var D = S.D;
    box.innerHTML =
      '<div class="fc-ctl">' +
      "<label>" + L.model + sel("pvm-m", D.models.map(function (m) { return [m, L.models[m]]; }), st.m) + "</label>" +
      '<label class="fc-h">' + L.hz + SEP + '<output id="pvm-ho"></output><input id="pvm-h" type="range" min="0" max="' + (D.horizons.length - 1) + '" step="1" value="' + st.hi + '" aria-label="' + L.hz + '"></label>' +
      "<label>" + L.cap + sel("pvm-k", L.capo, "1") + "</label>" +
      '<label class="pvm-chk"><span><input id="pvm-n" type="checkbox"> ' + L.norm + "</span></label></div>" +
      '<p class="fc-note">' + L.about + D.models.map(function (m) { return '<a href="' + LINK[m] + '">' + L.models[m] + "</a>"; }).join(" · ") + "</p>" +
      '<h3 class="fc-pt">' + L.t1 + '</h3><div class="fc-tw"><table class="fc-t" id="pvm-t"></table></div><p class="fc-out" id="pvm-best"></p><p class="fc-note" id="pvm-capn"></p>' +
      "<h3>" + L.t2 + '</h3><div class="pvm-cards" id="pvm-cards"></div>' +
      "<h3>" + L.t3 + '</h3><div class="fc-leg" id="pvm-leg"></div><label class="fc-h pvm-day">' + L.day + SEP + '<output id="pvm-do"></output><input id="pvm-d" type="range" min="0" max="' + (Math.floor(S.n / 48) - 3) + '" step="1" value="' + st.d + '"></label><svg class="fc-svg" id="pvm-prof" role="img"></svg>' +
      "<h3>" + L.t4 + '</h3><svg class="fc-svg" id="pvm-mon" role="img"></svg><p class="fc-note">' + L.monNote + "</p>";
    var on = function (id, ev, f) { document.getElementById(id).addEventListener(ev, f); };
    on("pvm-m", "change", function (e) { st.m = e.target.value; draw(); });
    on("pvm-h", "input", function (e) { st.hi = +e.target.value; draw(); });
    on("pvm-k", "change", function (e) { st.k = +e.target.value; draw(); });
    on("pvm-n", "change", function (e) { st.norm = e.target.checked; draw(); });
    on("pvm-d", "input", function (e) { st.d = +e.target.value; drawProfile(); });
    document.getElementById("pvm-leg").innerHTML = '<span><i style="background:var(--ink)"></i>' + L.meas + "</span>" + MODES.map(function (md) { return '<span><i style="background:' + COL[md] + '"></i>' + L.modes[md] + "</span>"; }).join("");
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { draw(); if (cutBox) drawCut(); }, 150); });
    draw();
  }

  var R = {};
  function draw() {
    document.getElementById("pvm-ho").textContent = hl(H());
    MODES.forEach(function (md) { R[md] = core.year(S, md, st.m, H(), st.k, st.norm); });
    var best = MODES.reduce(function (a, b) { return R[b].RMSE < R[a].RMSE ? b : a; });
    document.getElementById("pvm-t").innerHTML = "<caption>" + L.cap1 + "</caption><thead><tr>" + L.th.map(function (h) { return '<th scope="col">' + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
      MODES.map(function (md) {
        var r = R[md];
        return "<tr" + (md === best ? ' class="fc-best"' : "") + '><th scope="row"><i style="background:' + COL[md] + '"></i>' + L.modes[md] + "</th><td>" + num(r.RMSE, 3) + "</td><td>" + num(r.nRMSE, 3) + "</td><td>" + nice(r.NICE1) + "</td><td>" + nice(r.NICE2) + "</td><td>" + nice(r.NICE3) + "</td><td>" + nice(r.NICES) + "</td></tr>";
      }).join("") + "</tbody>";
    document.getElementById("pvm-best").innerHTML = L.best + "<strong>" + L.modes[best] + "</strong> (" + L.models[st.m] + ", " + hl(H()) + ").";
    document.getElementById("pvm-capn").innerHTML = st.k === 1 ? L.capNote.same : st.norm ? L.capNote.norm : L.capNote.raw;
    drawCards(); drawProfile(); drawMonths();
    if (cutBox && cutBox.firstChild && document.getElementById("pvm-cs")) drawCut();
  }

  function pie(svg, shares, cols) {
    clear(svg); svg.setAttribute("viewBox", "0 0 120 120");
    var cx = 60, cy = 60, r = 52, a0 = -Math.PI / 2;
    el("circle", { cx: cx, cy: cy, r: r, style: "fill:var(--soft);stroke:var(--line)" }, svg);
    shares.forEach(function (s, i) {
      if (s <= 0) return;
      if (s >= 0.9999) { el("circle", { cx: cx, cy: cy, r: r, fill: cols[i] }, svg); return; }
      var a1 = a0 + 2 * Math.PI * s, big = s > 0.5 ? 1 : 0;
      el("path", { d: "M" + cx + " " + cy + "L" + (cx + r * Math.cos(a0)).toFixed(2) + " " + (cy + r * Math.sin(a0)).toFixed(2) + "A" + r + " " + r + " 0 " + big + " 1 " + (cx + r * Math.cos(a1)).toFixed(2) + " " + (cy + r * Math.sin(a1)).toFixed(2) + "Z", fill: cols[i] }, svg);
      a0 = a1;
    });
    for (var q = 0; q < 4; q++) { var a = -Math.PI / 2 + q * Math.PI / 2; el("line", { x1: cx, y1: cy, x2: cx + r * Math.cos(a), y2: cy + r * Math.sin(a), style: "stroke:var(--paper)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.8 }, svg); }
    el("circle", { cx: cx, cy: cy, r: r, style: "fill:none;stroke:var(--line)" }, svg);
  }
  function drawCards() {
    var c = document.getElementById("pvm-cards"), D = S.D, h = H();
    c.innerHTML = MODES.map(function (md) {
      var r = R[md], st_ = STAGES[md];
      var rows = st_.map(function (sg, i) {
        var nat = sg === "ghi" ? D.native["GHI|" + st.m + "|" + h] + " " + L.unitW : sg === "gti" ? D.native["GTI|" + st.m + "|" + h] + " " + L.unitW : sg === "tr" ? D.native_stage.transposition_wm2 + " " + L.unitW : sg === "conv" ? num(D.native_stage.conversion_kw * st.k, 3) + " " + L.kw : null;
        return '<li><i style="background:' + SCOL[sg] + '"></i><strong>' + L.stages[sg] + "</strong>" + SEP + pct(r.share[i]) + '<br><span class="pvm-sm">' + L.rm + " " + num(r.stage_rmse[i], 3) + (nat && sg !== "conv" ? " · " + L.nat + " " + (fr ? nat.replace(".", ",") : nat) : "") + "</span></li>";
      }).join("");
      return '<div class="pvm-card"><p class="pvm-ct" style="border-color:' + COL[md] + '">' + L.modes[md] + '</p><div class="pvm-pie"><svg id="pvm-pie-' + md + '" role="img" aria-label="' + L.sh + '"></svg><ul>' + rows + '</ul></div><p class="pvm-sm">' + (md === "pv" ? L.one : L.inter(r.inter)) + "</p></div>";
    }).join("");
    MODES.forEach(function (md) { pie(document.getElementById("pvm-pie-" + md), R[md].share, STAGES[md].map(function (s) { return SCOL[s]; })); });
  }

  function dateLabel(t, withYear) {
    var d = new Date(t);
    return d.toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: withYear ? "numeric" : undefined, timeZone: "UTC" });
  }
  function profileChart(svg, series, t0idx, ndays, opt) {
    var W = size(svg, 280), Hh = 280, pl = 42, pr = 10, pt = 12, pb = 30, n = ndays * 48;
    clear(svg);
    var ymax = 0; series.forEach(function (s) { s.v.forEach(function (v) { if (isFinite(v) && v > ymax) ymax = v; }); });
    ymax = Math.max(1, Math.ceil(ymax));
    var X = function (i) { return pl + (W - pl - pr) * i / n; }, Y = function (v) { return pt + (Hh - pt - pb) * (1 - v / ymax); };
    if (opt && opt.zone) opt.zone.forEach(function (z) { el("rect", { x: X(z[0]), y: pt, width: X(z[1]) - X(z[0]), height: Hh - pt - pb, "class": "fc-zone" }, svg); });
    var step = ymax > 8 ? Math.ceil(ymax / 5) : ymax > 4 ? 2 : 1;
    for (var v = 0; v <= ymax; v += step) { el("line", { x1: pl, x2: W - pr, y1: Y(v), y2: Y(v), "class": "fc-grid" }, svg); txt("text", { x: pl - 6, y: Y(v) + 4, "text-anchor": "end", "class": "fc-ax" }, svg, num(v, 0)); }
    txt("text", { x: 4, y: pt + 2, "class": "fc-ax", "dominant-baseline": "hanging", transform: "rotate(-90 4 " + (pt + 2) + ")", "text-anchor": "end" }, svg, L.kw);
    for (var d = 0; d <= ndays; d++) { el("line", { x1: X(d * 48), x2: X(d * 48), y1: pt, y2: Hh - pb, "class": "fc-grid" }, svg); if (d < ndays) txt("text", { x: X(d * 48 + 24), y: Hh - 10, "text-anchor": "middle", "class": "fc-ax" }, svg, dateLabel(S.t0 + (t0idx + d * 48) * 1800e3, d === 0)); }
    if (opt && opt.marks) opt.marks.forEach(function (mk) {
      el("line", { x1: X(mk.i), x2: X(mk.i), y1: pt, y2: Hh - pb, style: "stroke:" + mk.c, "stroke-width": mk.w || 2, "stroke-dasharray": mk.dash || "none" }, svg);
      txt("text", { x: X(mk.i) + (mk.left ? -4 : 4), y: pt + 12 + (mk.dy || 0), "text-anchor": mk.left ? "end" : "start", "class": "fc-ax pvm-mk", style: "fill:" + mk.c }, svg, mk.t);
    });
    series.forEach(function (s) {
      el("path", { d: path(s.v.map(function (v, i) { return [X(i + 0.5), Y(v)]; })), "class": s.obs ? "fc-obs" : "fc-line fc-thin", style: s.obs ? "" : "stroke:" + s.c }, svg);
    });
  }
  function drawProfile() {
    var d0 = st.d * 48, n = 144, k = st.k;
    document.getElementById("pvm-do").textContent = dateLabel(S.t0 + d0 * 1800e3, true);
    var meas = [], fc = { pv: [], gti: [], ghi: [] };
    for (var i = 0; i < n; i++) {
      var t = d0 + i;
      meas.push(k * S.P[t]);
    }
    // forecasts of the current settings: R[md].f is indexed like R[md].idx (positions in the daytime list)
    MODES.forEach(function (md) {
      var r = R[md], off = r.idx[0], arrv = fc[md];
      for (var i = 0; i < n; i++) { var p = S.pos[d0 + i]; arrv[i] = p >= off ? r.f[p - off] : 0; }
    });
    var svg = document.getElementById("pvm-prof");
    svg.setAttribute("aria-label", L.t3);
    profileChart(svg, MODES.map(function (md) { return { v: fc[md], c: COL[md] }; }).concat([{ v: meas, c: "var(--ink)", obs: true }]), d0, 3);
  }
  function drawMonths() {
    var svg = document.getElementById("pvm-mon"), W = size(svg, 240), Hh = 240, pl = 42, pr = 10, pt = 12, pb = 28;
    clear(svg); svg.setAttribute("aria-label", L.t4);
    var order = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7], ymax = 0;
    MODES.forEach(function (md) { R[md].monthly_nrmse.forEach(function (v) { ymax = Math.max(ymax, v); }); });
    ymax = Math.ceil(ymax * 2) / 2;
    var X = function (i) { return pl + (W - pl - pr) * (i + 0.5) / 12; }, Y = function (v) { return pt + (Hh - pt - pb) * (1 - v / ymax); };
    var stp = ymax > 6 ? 2 : ymax > 3 ? 1 : 0.5;
    for (var v = 0; v <= ymax + 1e-9; v += stp) { el("line", { x1: pl, x2: W - pr, y1: Y(v), y2: Y(v), "class": "fc-grid" }, svg); txt("text", { x: pl - 6, y: Y(v) + 4, "text-anchor": "end", "class": "fc-ax" }, svg, num(v, stp < 1 ? 1 : 0)); }
    txt("text", { x: 4, y: pt + 2, "class": "fc-ax", transform: "rotate(-90 4 " + (pt + 2) + ")", "text-anchor": "end", "dominant-baseline": "hanging" }, svg, "nRMSE");
    order.forEach(function (mo, i) { txt("text", { x: X(i), y: Hh - 8, "text-anchor": "middle", "class": "fc-ax" }, svg, L.mon[mo]); });
    MODES.forEach(function (md) {
      var pts = order.map(function (mo, i) { return [X(i), Y(R[md].monthly_nrmse[mo])]; });
      el("path", { d: path(pts), "class": "fc-line", stroke: COL[md] }, svg);
      pts.forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 3, fill: COL[md] }, svg); });
    });
  }

  // ---------------------------------------------------------------- curtailment panel
  function buildCut() {
    var CU = S.D.curt;
    cutBox.innerHTML = '<div class="fc-ctl fc-static">' +
      "<label>" + L.lim + sel("pvm-cs", L.limo, "0") + "</label>" +
      "<label>" + L.ann + sel("pvm-ca", L.anno, "d1") + "</label>" +
      "<label>" + L.var + sel("pvm-cv", L.varo, "raw") + "</label>" +
      '<label class="fc-h">' + L.ev + SEP + '<output id="pvm-eo"></output><input id="pvm-ce" type="range" min="0" max="' + (CU.events.length - 1) + '" step="1" value="0"></label></div>' +
      '<p class="fc-note" id="pvm-cctl"></p><div class="fc-leg" id="pvm-cleg"></div><svg class="fc-svg" id="pvm-cprof" role="img"></svg>' +
      '<div class="fc-tw"><table class="fc-t" id="pvm-ct"></table></div><div class="fc-out" id="pvm-cnote"></div>';
    var on = function (id, f) { document.getElementById(id).addEventListener(id === "pvm-ce" ? "input" : "change", f); };
    on("pvm-cs", function (e) { st.s = +e.target.value; drawCut(); });
    on("pvm-ca", function (e) { st.ann = e.target.value; drawCut(); });
    on("pvm-cv", function (e) { st.v = e.target.value; drawCut(); });
    on("pvm-ce", function (e) { st.e = +e.target.value; drawCut(); });
    document.getElementById("pvm-cleg").innerHTML = '<span><i style="background:var(--ink)"></i>' + L.measC + "</span>" + MODES.map(function (md) { return '<span><i style="background:' + COL[md] + '"></i>' + L.modes[md] + "</span>"; }).join("") + '<span><i class="fc-swatch" style="background:#a8431f"></i>' + L.start + " – " + L.end + "</span>";
    drawCut();
  }
  function drawCut() {
    var CU = S.D.curt, h = H(), o = core.curtSeries(S, st.s, st.ann, st.v, st.m, h), res = core.curt(S, st.s, st.ann, st.v, st.m, h);
    document.getElementById("pvm-cctl").textContent = L.sameCtl(L.models[st.m], hl(h)) + " " + L.evs + ".";
    var ev = CU.events[st.e], d0 = ev - 48;
    document.getElementById("pvm-eo").textContent = dateLabel(S.t0 + ev * 1800e3, true);
    // day before: no curtailment yet, the year forecasts apply; event day and next day: the curtailment series
    var meas = [], fc = { pv: [], gti: [], ghi: [] }, i, md;
    for (i = 0; i < 48; i++) {
      var t = d0 + i, p = S.pos[t];
      meas.push(S.P[t]);
      MODES.forEach(function (m2) { fc[m2].push(p >= 0 ? core.arr(S, "fc", m2 + "|" + st.m + "|" + h)[p] : 0); });
    }
    var base = st.e * CU.span;
    for (i = 0; i < CU.span; i++) { meas.push(o.y[base + i]); for (var q = 0; q < 3; q++) { md = MODES[q]; fc[md].push(o[md][base + i]); } }
    var marks = [{ i: 48 + CU.w0, c: "#a8431f", t: L.start + " (10:00 UTC)", w: 2.5 }, { i: 48 + CU.w1, c: "#a8431f", t: L.end, w: 1.2, dy: 14 }];
    if (st.ann === "h2") marks.push({ i: 48 + CU.i_known + 1, c: "var(--focus)", t: L.annMark, dash: "4 3", w: 1.5, dy: 28 });
    if (st.ann === "d1") marks.push({ i: 0, c: "var(--focus)", t: L.annD1, dash: "4 3", w: 1.5, dy: 28 });
    var svg = document.getElementById("pvm-cprof"); svg.setAttribute("aria-label", L.cutT);
    profileChart(svg, MODES.map(function (m2) { return { v: fc[m2], c: COL[m2] }; }).concat([{ v: meas, c: "var(--ink)", obs: true }]), d0, 3, { zone: [[48 + CU.w0, 48 + CU.w1]], marks: marks });
    var cell = function (r) { return r.fail ? '<td class="pvm-fail">' + L.failT(r.fail, r.n) + "</td>" : "<td>" + num(r.RMSE, 3) + "</td>"; };
    var bestOf = function (per) { var b = null; MODES.forEach(function (m2) { var r = res[per + "|" + m2]; if (!r.fail && (b === null || r.RMSE < res[per + "|" + b].RMSE - 1e-9)) b = m2; }); return b; };
    var bd = bestOf("during"), ba = bestOf("after");
    document.getElementById("pvm-ct").innerHTML = "<caption>" + L.capT + "</caption><thead><tr>" + L.th2.map(function (x) { return '<th scope="col">' + x + "</th>"; }).join("") + "</tr></thead><tbody>" +
      MODES.map(function (m2) { return '<tr><th scope="row"><i style="background:' + COL[m2] + '"></i>' + L.modes[m2] + "</th>" + cell(res["during|" + m2]).replace("<td>", m2 === bd ? '<td class="pvm-b">' : "<td>") + cell(res["after|" + m2]).replace("<td>", m2 === ba ? '<td class="pvm-b">' : "<td>") + "</tr>"; }).join("") + "</tbody>";
    document.getElementById("pvm-cnote").innerHTML = cutNote(res, bd, ba) + '<p class="fc-note">' + L.noNice + "</p>";
  }
  function cutNote(res, bd, ba) {
    var f = fr, s = st.s, a = st.ann, v = st.v, out = [];
    var rp = res["after|pv"], rg = res["after|gti"];
    var CU = S.D.curt, nw = CU.w1 - CU.w0, seen = Math.max(0, nw - H());
    if (a === "none") {
      out.push(f ? "Non annoncée : aucune prévision ne connaît la limite à l’avance. " : "Not announced: no forecast knows the limit in advance. ");
      if (seen === 0) out.push(f ? "À " + hl(H()) + " d’horizon, toutes les prévisions des 4 heures d’écrêtement ont été émises avant son début : aucune voie ne peut le voir, toutes prévoient la production habituelle. Les écarts entre voies ne reflètent ici que le niveau de chaque prévision, pas une information sur l’écrêtement." : "At a " + hl(H()) + " horizon, every forecast of the 4 curtailed hours was issued before it started: no route can see it, and all forecast the usual output. The gaps between routes here only reflect the level of each forecast, not any information about the curtailment.");
      else out.push(f ? "À " + hl(H()) + " d’horizon, " + seen + " des " + nw + " demi-heures écrêtées sont prévues après le début de l’écrêtement : pour celles-là, la dernière valeur de PV direct porte déjà la réduction, alors que les voies par l’éclairement prévoient la production habituelle. Pendant l’écrêtement, la voie la plus juste est ici <strong>" + L.modes[bd] + "</strong>." : "At a " + hl(H()) + " horizon, " + seen + " of the " + nw + " curtailed half-hours are forecast after the curtailment started: for those, the last value of PV direct already carries the reduction, while the irradiance routes forecast the usual output. During the curtailment, the most accurate route here is <strong>" + L.modes[bd] + "</strong>.");
    }
    else out.push(f ? "Annoncée : chaque prévision émise après l’annonce est plafonnée à la puissance disponible. Les voies par l’éclairement s’ajustent par la puissance crête et la consigne connue : leurs entrées (l’éclairement) ne sont pas touchées par l’écrêtement. " : "Announced: every forecast issued after the announcement is capped at the available power. The irradiance routes adjust through the peak power and the known set-point: their inputs (irradiance) are not touched by the curtailment. ");
    if (a === "h2") out.push(f ? "Annoncée 2 h avant : une prévision émise plus tôt, à un horizon plus long, ne le sait pas encore. " : "Announced 2 h before: a forecast issued earlier, at a longer horizon, does not know it yet. ");
    if (v === "raw" && s === 0 && a !== "none") out.push(f ? "Après l’écrêtement, PV direct en kW garde des zéros dans ses 24 h d’entrées : il prévoit trop bas jusqu’au lendemain (" + num(rp.RMSE, 3) + " kW après, contre " + num(rg.RMSE, 3) + " kW pour GTI puis PV)." : "After the curtailment, PV direct in kW keeps zeros in its 24 h of inputs: it forecasts too low until the next day (" + num(rp.RMSE, 3) + " kW after, against " + num(rg.RMSE, 3) + " kW for GTI then PV).");
    if (v === "divA" && s === 0 && a !== "none") out.push(f ? "Diviser par la puissance disponible, c’est diviser par 0 pendant l’arrêt : toute prévision dont les 24 h d’entrées touchent l’arrêt devient impossible." : "Dividing by the available power means dividing by 0 during the shutdown: every forecast whose 24 h of inputs touch the shutdown becomes impossible.");
    if (v === "mask" && s === 0 && a !== "none") out.push(f ? "Proposition testée : diviser par la puissance disponible annoncée et masquer les heures à 0 (remplacées par la valeur de la veille, divisée de même). Plus de division par zéro, et après l’écrêtement PV direct retrouve le niveau des autres voies (" + num(rp.RMSE, 3) + " kW contre " + num(rg.RMSE, 3) + " kW pour GTI puis PV)." : "Tested proposal: divide by the announced available power and mask the zero hours (replaced by the value of the day before, divided the same way). No more division by zero, and after the curtailment PV direct is back to the level of the other routes (" + num(rp.RMSE, 3) + " kW against " + num(rg.RMSE, 3) + " kW for GTI then PV).");
    if (v !== "raw" && s > 0 && a !== "none") out.push(f ? "Avec une limite non nulle, diviser par la puissance disponible gonfle les valeurs qui n’atteignaient pas la limite : la centrale semble produire à plein, et PV direct se trompe davantage (" + num(res["during|pv"].RMSE, 3) + " kW pendant, contre " + num(res["during|gti"].RMSE, 3) + " kW pour GTI puis PV). Ici, les données ne soutiennent pas cette division." : "With a non-zero limit, dividing by the available power inflates the values that did not reach the limit: the plant seems to run at full output, and PV direct errs more (" + num(res["during|pv"].RMSE, 3) + " kW during, against " + num(res["during|gti"].RMSE, 3) + " kW for GTI then PV). Here, the data do not support this division.");
    if (v === "raw" && s > 0 && a !== "none") out.push(f ? "À " + (s === 0.6 ? "60" : "30") + " %, la limite ne coupe que le haut de la courbe ; les entrées de PV direct gardent l’essentiel de la forme du jour." : "At " + (s === 0.6 ? "60" : "30") + "%, the limit only cuts the top of the curve; the inputs of PV direct keep most of the shape of the day.");
    return "<p>" + out.join(" ") + "</p>";
  }
})();
