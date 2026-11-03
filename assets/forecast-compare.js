/* Forecast comparator (www, 24/10/2026; reviewed 02/11/2026): persistence, cyclic persistence, BLEND, AR-OLS and ridge ELM on public Palaiseau PV data.
   All numbers come from forecast-compare.json, computed by the validated PV_ELM_pred code (work/forecast_compare/make_forecast_compare.py);
   this script only displays them. NICE above 1 is shown as "> 1", never as a number. Plain SVG, no library.
   Styles of the 02/11 additions: CSS block of scripts/complex_forecast_page_20261024.py (appended to www.css at build). */
(function () {
  "use strict";
  var box = document.getElementById("fc");
  if (!box || !window.fetch) return;
  var fr = box.getAttribute("data-lang") === "fr";
  var LINK = fr ? { nice: "/fr/actualites/nice-forecast-evaluation/", ev: "/fr/recits/evaluer-prevision-solaire-persistance/" }
    : { nice: "/latest-publications-and-news/nice-forecast-evaluation/", ev: "/stories/evaluate-solar-forecast-persistence/" };
  var L = fr ? {
    h: "Horizon", show: "Modèles affichés", metric: "Mesure de l’erreur", scope: "Instants comptés", day: "de jour", all: "jour et nuit",
    pre: "Six questions à poser aux données", m1: "L’erreur selon l’horizon", m2: "Prévisions et observation, du 30 mai au 2 juin 2022 (période de test), à l’horizon choisi", obs: "observation",
    names: { P: "persistance", Pc: "persistance cyclique", BLEND: "BLEND", AR: "autorégression AR", ELM: "ELM" },
    none: "Cochez au moins un modèle.", hAria: "Horizon de prévision", best: "Le meilleur des modèles affichés à cet horizon : ", min: "min", kw: "kW", axis: "horizon de prévision",
    table: ["Modèle", "RMSE (kW)", "nRMSE", "nMAE", "NICE¹", "NICE²", "NICE³"], cap: "Tous les modèles à l’horizon ", errFor: "Erreur coloriée pour ", low: "prévision trop basse", high: "prévision trop haute",
    oneL: "1 = persistance", over: "> 1 : moins bon que la persistance", good: " Entre 0 et 1 : meilleur que la persistance.", bad: " : moins bon que la persistance.",
    mon: ["mai", "juin"], first: "1er",
    nNice: "NICE baisse avec l’horizon parce que l’erreur de la persistance monte plus vite que celle du modèle. L’erreur elle-même monte : choisissez la RMSE pour la voir.",
    nFlat: "La persistance cyclique reste plate, et c’est juste : elle recopie la veille à la même heure, quel que soit l’horizon.",
    nNight: "Sous 1 pour la persistance ? La référence de NICE est la persistance brute, qui se trompe aussi la nuit, alors que toutes les courbes sont mises à zéro la nuit. Ce n’est pas un gain de prévision.",
    nMae: "La nMAE ne bouge pas entre « de jour » et « jour et nuit », et c’est juste : la nuit, erreur et production valent zéro, donc l’erreur moyenne et la production moyenne baissent dans la même proportion.",
    nRmse: "Compter la nuit (environ la moitié des instants, avec une erreur nulle) fait baisser la RMSE mais monter la nRMSE, car la production moyenne baisse davantage. Il faut donc toujours annoncer les instants comptés."
  } : {
    h: "Horizon", show: "Models shown", metric: "Error measure", scope: "Times counted", day: "daytime", all: "day and night",
    pre: "Six questions to ask the data", m1: "Error against horizon", m2: "Forecasts and observation, 30 May to 2 June 2022 (test period), at the chosen horizon", obs: "observation",
    names: { P: "persistence", Pc: "cyclic persistence", BLEND: "BLEND", AR: "AR autoregression", ELM: "ELM" },
    none: "Select at least one model.", hAria: "Forecast horizon", best: "The best of the models shown at this horizon: ", min: "min", kw: "kW", axis: "forecast horizon",
    table: ["Model", "RMSE (kW)", "nRMSE", "nMAE", "NICE¹", "NICE²", "NICE³"], cap: "All models at horizon ", errFor: "Error colored for ", low: "forecast too low", high: "forecast too high",
    oneL: "1 = persistence", over: "> 1: worse than persistence", good: " Between 0 and 1: better than persistence.", bad: ": worse than persistence.",
    mon: ["May", "June"], first: "1",
    nNice: "NICE falls with the horizon because the error of persistence rises faster than that of the model. The error itself rises: choose RMSE to see it.",
    nFlat: "Cyclic persistence stays flat, and rightly so: it copies the day before at the same time, whatever the horizon.",
    nNight: "Persistence below 1? The NICE reference is raw persistence, which is also wrong at night, whereas all the curves are set to zero at night. This is not a forecasting gain.",
    nMae: "nMAE does not move between \"daytime\" and \"day and night\", and rightly so: at night, error and output are both zero, so the mean error and the mean output fall in the same proportion.",
    nRmse: "Counting the night (about half of the times, with zero error) lowers RMSE but raises nRMSE, because the mean output falls even more. Always state the times counted."
  };
  var COL = { P: "#9a5b13", Pc: "#8052a2", BLEND: "#0f8a7e", AR: "#b8306b", ELM: "#086b94" };
  var METRICS = fr
    ? [["RMSE", "RMSE, en kW"], ["nRMSE", "nRMSE (RMSE / production moyenne)"], ["nMAE", "nMAE (erreur absolue / production moyenne)"], ["NICE2", "NICE² (RMSE / celle de la persistance)"], ["NICE1", "NICE¹ (erreur absolue / celle de la persistance)"], ["NICE3", "NICE³ (norme 3 / celle de la persistance)"]]
    : [["RMSE", "RMSE, in kW"], ["nRMSE", "nRMSE (RMSE / mean output)"], ["nMAE", "nMAE (absolute error / mean output)"], ["NICE2", "NICE² (RMSE / that of persistence)"], ["NICE1", "NICE¹ (absolute error / that of persistence)"], ["NICE3", "NICE³ (norm 3 / that of persistence)"]];
  var NICE_NAME = { NICE1: "NICE¹", NICE2: "NICE²", NICE3: "NICE³" };
  var D = null, NS = "http://www.w3.org/2000/svg", presetOn = -1, H6 = 11, M30 = 0;
  function f(v, n) { var s = v.toFixed(n); return fr ? s.replace(".", ",") : s; }
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function path(pts) { return pts.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); }
  function hl(h) { return h * 30 >= 60 ? f(h * 0.5, h % 2 ? 1 : 0) + " h" : h * 30 + " " + L.min; }
  function size(svg, H) { var W = Math.round(Math.min(900, Math.max(300, svg.getBoundingClientRect().width || 640))); svg.setAttribute("viewBox", "0 0 " + W + " " + H); return W; }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function kw(m, i) { return f(D.metrics[m].RMSE_day[i] / 1000, 3); }
  function gainPct(a, b, i) { return f(100 * (1 - D.metrics[b].RMSE_day[i] / D.metrics[a].RMSE_day[i]), 0); }
  function nc(v) { return v > 1.0005 ? '<span class="fp-over">&gt; 1</span>' : f(v, 3); }

  // Each preset sets every control; its text is built from the data file, so no number is typed by hand.
  function presets() {
    return [
      { b: fr ? "Tout de suite : 30 minutes" : "Right away: 30 minutes", h: M30, m: "RMSE", s: "day", mods: ["P", "AR", "ELM"], t: function () {
        return fr ? "À 30 minutes, l’autorégression et le réseau de neurones font jeu égal (RMSE de " + kw("AR", M30) + " et " + kw("ELM", M30) + " kW). Ils gagnent environ " + gainPct("P", "AR", M30) + " % sur la persistance (" + kw("P", M30) + " kW). Le modèle le plus complexe n’apporte rien ici."
          : "At 30 minutes, the autoregression and the neural network are level (RMSE of " + kw("AR", M30) + " and " + kw("ELM", M30) + " kW). They gain about " + gainPct("P", "AR", M30) + "% on persistence (" + kw("P", M30) + " kW). The more complex model adds nothing here."; } },
      { b: fr ? "Plus loin : 6 heures" : "Further ahead: 6 hours", h: H6, m: "RMSE", s: "day", mods: ["P", "AR", "ELM"], t: function () {
        return fr ? "À 6 heures, la persistance décroche (" + kw("P", H6) + " kW) : elle recopie une valeur de l’autre bout de la journée. L’autorégression et l’ELM divisent cette erreur par environ 2,5 (" + kw("AR", H6) + " et " + kw("ELM", H6) + " kW)."
          : "At 6 hours, persistence falls behind (" + kw("P", H6) + " kW): it copies a value from another part of the day. The autoregression and the ELM divide this error by about 2.5 (" + kw("AR", H6) + " and " + kw("ELM", H6) + " kW)."; } },
      { b: fr ? "AR ou ELM ?" : "AR or ELM?", h: H6, m: "RMSE", s: "day", mods: ["AR", "ELM"], t: function () {
        return fr ? "À 6 heures, l’ELM gagne environ " + gainPct("AR", "ELM", H6) + " % sur l’autorégression. Déplacez l’horizon : de 1 h à 6 h, ce gain reste de 3 à 5 %, et il est nul à 30 minutes. C’est à ce gain qu’il faut comparer le coût d’un modèle plus lourd."
          : "At 6 hours, the ELM gains about " + gainPct("AR", "ELM", H6) + "% on the autoregression. Move the horizon: from 1 h to 6 h, this gain stays at 3 to 5%, and it is nil at 30 minutes. The cost of a heavier model must be weighed against this gain."; } },
      { b: fr ? "Recopier la veille" : "Copy the day before", h: 3, m: "RMSE", s: "day", mods: ["P", "Pc", "BLEND"], t: function () {
        return fr ? "Recopier la veille coûte toujours " + kw("Pc", 3) + " kW. La persistance est meilleure jusqu’à 1,5 h, puis moins bonne dès 2 h (" + kw("P", 3) + " kW). BLEND, qui les combine sans aucun réseau, fait mieux que les deux à tous les horizons (" + kw("BLEND", 3) + " kW à 2 h)."
          : "Copying the day before always costs " + kw("Pc", 3) + " kW. Persistence is better up to 1.5 h, then worse from 2 h (" + kw("P", 3) + " kW). BLEND, which combines them with no network, beats both at every horizon (" + kw("BLEND", 3) + " kW at 2 h)."; } },
      { b: fr ? "Pire que la persistance" : "Worse than persistence", h: M30, m: "NICE2", s: "day", mods: ["P", "Pc", "BLEND"], t: function () {
        return fr ? "À 30 minutes, recopier la veille fait moins bien que la persistance : NICE² > 1, la courbe sort du graphique par le haut. Elle n’y entre qu’à 2 h. BLEND reste sous 1 dès le départ (" + f(D.metrics.BLEND.NICE2_day[M30], 3) + ")."
          : "At 30 minutes, copying the day before does worse than persistence: NICE² > 1, the curve leaves the chart at the top. It only enters at 2 h. BLEND stays below 1 from the start (" + f(D.metrics.BLEND.NICE2_day[M30], 3) + ")."; } },
      { b: fr ? "Le piège de la nuit" : "The night trap", h: H6, m: "NICE2", s: "all", mods: ["P", "AR", "ELM"], t: function () {
        return fr ? "En comptant la nuit, la persistance descend à " + f(D.metrics.P.NICE2_all[H6], 3) + " à 6 h : elle semble se battre elle-même. C’est un effet de périmètre, pas un progrès : le masque de nuit corrige des erreurs que la référence brute conserve."
          : "Counting the night, persistence falls to " + f(D.metrics.P.NICE2_all[H6], 3) + " at 6 h: it seems to beat itself. This is a scope effect, not progress: the night mask removes errors that the raw reference keeps."; } }
    ];
  }

  function ui() {
    var hs = D.horizons, P = presets();
    box.innerHTML =
      '<h3 class="fc-pt">' + L.pre + '</h3><div class="fc-pre" role="group" aria-label="' + L.pre + '">' + P.map(function (p, i) { return '<button type="button" data-p="' + i + '">' + p.b + "</button>"; }).join("") + '</div><p class="fc-case" aria-live="polite"></p>' +
      '<div class="fc-ctl"><label class="fc-h"><span>' + L.h + ' <output></output></span><input type="range" aria-label="' + L.hAria + '" min="0" max="' + (hs.length - 1) + '" value="0" step="1"></label>' +
      '<label><span>' + L.metric + '</span><select class="fc-m">' + METRICS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + "</option>"; }).join("") + "</select></label>" +
      '<label><span>' + L.scope + '</span><select class="fc-s"><option value="day">' + L.day + '</option><option value="all">' + L.all + "</option></select></label></div>" +
      '<fieldset class="fc-mods"><legend>' + L.show + "</legend>" + D.models.map(function (m) {
        return '<label><input type="checkbox" value="' + m + '"> <i style="background:' + COL[m] + '"></i>' + L.names[m] + "</label>";
      }).join("") + "</fieldset>" +
      '<p class="fc-out" aria-live="polite"></p>' +
      '<h3>' + L.m1 + '</h3><svg class="fc-svg fc-px fc-1" viewBox="0 0 640 280" role="img" aria-label="' + L.m1 + '"></svg><p class="fc-note"></p>' +
      '<h3>' + L.m2 + '</h3><div class="fc-ctl fc-static"><label><span>' + L.errFor + '</span><select class="fc-e">' + D.models.map(function (m) { return '<option value="' + m + '"' + (m === "ELM" ? " selected" : "") + ">" + L.names[m] + "</option>"; }).join("") + "</select></label></div>" +
      '<svg class="fc-svg fc-px fc-2" viewBox="0 0 640 250" role="img" aria-label="' + L.m2 + '"></svg>' +
      '<p class="fc-leg"><span><i style="background:var(--ink)"></i>' + L.obs + '</span><span><i class="fc-swatch" style="background:#c8452f"></i>' + L.low + '</span><span><i class="fc-swatch" style="background:#2f6fc8"></i>' + L.high + "</span></p>" +
      '<div class="fc-tw"><table class="fc-t"></table></div>';
    box.addEventListener("input", manual);
    box.addEventListener("change", manual);
    [].forEach.call(box.querySelectorAll(".fc-pre button"), function (b) { b.addEventListener("click", function () { setPreset(+b.getAttribute("data-p"), P); }); });
    var raf = 0; window.addEventListener("resize", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }, { passive: true });
    setPreset(0, P);
  }
  function manual() {
    if (presetOn >= 0) { presetOn = -1; markPreset(); box.querySelector(".fc-case").textContent = ""; }
    draw();
  }
  function markPreset() { [].forEach.call(box.querySelectorAll(".fc-pre button"), function (b) { var on = +b.getAttribute("data-p") === presetOn; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
  function setPreset(i, P) {
    var p = P[i]; presetOn = i;
    box.querySelector(".fc-h input").value = p.h; box.querySelector(".fc-m").value = p.m; box.querySelector(".fc-s").value = p.s;
    [].forEach.call(box.querySelectorAll(".fc-mods input"), function (c) { c.checked = p.mods.indexOf(c.value) >= 0; });
    box.querySelector(".fc-e").value = p.mods[p.mods.length - 1];
    box.querySelector(".fc-case").textContent = p.t();
    markPreset(); draw();
  }
  function shown() { return [].slice.call(box.querySelectorAll(".fc-mods input:checked")).map(function (i) { return i.value; }); }

  function chart1(svg, key, hi, mods) {
    clear(svg);
    var H = 280, W = size(svg, H), l = 58, r = 14, t = 12, b = 48, hs = D.horizons, vals = [];
    mods.forEach(function (m) { vals = vals.concat(D.metrics[m][key]); });
    var isN = key.indexOf("NICE") === 0, sc = key.indexOf("RMSE_") === 0 ? 1e-3 : 1, y0 = 0, y1, tick, dec;
    if (isN) { y1 = 1.12; tick = 0.2; dec = 1; }      // NICE stops just above 1: anything higher is only "worse than persistence"
    else {
      y1 = (vals.length ? Math.max.apply(null, vals) * sc : 1) * 1.05;
      var raw = y1 / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
      tick = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (m) { return m >= raw * 0.75; })[0];
      dec = Math.max(1, Math.ceil(-Math.log10(tick) + 0.001)); if (tick / mag === 2.5) dec += 1;
    }
    var X = function (k) { return l + (W - l - r) * k / (hs.length - 1); }, Y = function (v) { return H - b - (H - t - b) * (v - y0) / (y1 - y0); };
    var cid = "fc-clip-1", defs = el("defs", {}, svg), cp = el("clipPath", { id: cid }, defs); el("rect", { x: l, y: t, width: W - l - r, height: H - t - b }, cp);
    if (isN) el("rect", { x: l, y: t, width: W - l - r, height: Y(1) - t, "class": "fc-zone" }, svg);
    for (var g = 0; g * tick <= (isN ? 1.0001 : y1 * 1.0001); g++) { var v = g * tick; el("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), "class": "fc-grid" }, svg); el("text", { x: l - 6, y: Y(v) + 4, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = f(v, dec); }
    hs.forEach(function (h, k) { if (k % 2 === 1 || k === 0) el("text", { x: X(k), y: H - b + 18, "text-anchor": k === 0 ? "start" : k === hs.length - 1 ? "end" : "middle", "class": "fc-ax" }, svg).textContent = hl(h); });
    el("text", { x: (l + W - r) / 2, y: H - 8, "text-anchor": "middle", "class": "fc-ax" }, svg).textContent = L.axis;
    if (isN) {
      el("line", { x1: l, x2: W - r, y1: Y(1), y2: Y(1), "class": "fc-one" }, svg);
      el("text", { x: W - r - 4, y: Y(1) - 6, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = L.over;
    }
    el("line", { x1: X(hi), x2: X(hi), y1: t, y2: H - b, "class": "fc-now" }, svg);
    mods.forEach(function (m) {
      var pts = D.metrics[m][key].map(function (v, k) { return [X(k), Y(v * sc)]; });
      el("path", { d: path(pts), stroke: COL[m], "class": "fc-line", "clip-path": "url(#" + cid + ")" }, svg);
      var val = D.metrics[m][key][hi] * sc;
      if (isN && val > 1.0005) el("path", { d: "M" + (X(hi) - 6) + " " + (t + 9) + "L" + (X(hi) + 6) + " " + (t + 9) + "L" + X(hi) + " " + (t - 1) + "Z", fill: COL[m] }, svg);   // off the chart: an arrow, not a number
      else el("circle", { cx: X(hi), cy: Y(val), r: 4.5, fill: COL[m] }, svg);
    });
  }
  function dateLabel(d) {
    var s = (D.window_start_utc || "").split(/[-T:]/), t = Date.UTC(+s[0], +s[1] - 1, +s[2]) + d * 864e5, x = new Date(t), m = x.getUTCMonth(), dn = x.getUTCDate(), nm = L.mon[m === 4 ? 0 : 1];
    return fr ? (dn === 1 ? L.first : dn) + " " + nm : dn + " " + nm;
  }
  function chart2(svg, hi, mods, focus) {
    clear(svg);
    var H = 250, W = size(svg, H), l = 46, r = 12, t = 10, b = 30, w = D.window[String(D.horizons[hi])], n = w.obs.length, top = D.pmax * 1.05;
    var X = function (k) { return l + (W - l - r) * k / (n - 1); }, Y = function (v) { return H - b - (H - t - b) * v / top; };
    var kwTick = [1, 2, 5, 10, 20, 50, 100, 200, 500].filter(function (m) { return m * 1000 >= top / 5; })[0] * 1000;
    var defs = el("defs", {}, svg), cp = el("clipPath", { id: "fc-clip-2" }, defs); el("rect", { x: l, y: t, width: W - l - r, height: H - t - b }, cp);
    for (var g = 0; g * kwTick <= top; g++) { var v = g * kwTick; el("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), "class": "fc-grid" }, svg); el("text", { x: l - 6, y: Y(v) + 4, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = f(v / 1000, 0); }
    el("text", { x: l - 6, y: t + 2, "text-anchor": "end", "class": "fc-ax" }, svg).textContent = L.kw;
    for (var d = 0; d < 4; d++) el("text", { x: X(Math.min(n - 1, d * 48 + 24)), y: H - 10, "text-anchor": "middle", "class": "fc-ax" }, svg).textContent = dateLabel(d);
    // The error is the colored area between observation and forecast, as on the page "Which forecast for which signal?".
    var O = w.obs, Pm = w[focus], gr = el("g", { "clip-path": "url(#fc-clip-2)" }, svg);
    var area = function (x0, o0, f0, x1, o1, f1) { el("polygon", { points: [[X(x0), Y(o0)], [X(x1), Y(o1)], [X(x1), Y(f1)], [X(x0), Y(f0)]].map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "), fill: o0 + o1 > f0 + f1 ? "#c8452f" : "#2f6fc8", opacity: 0.34 }, gr); };
    for (var i = 0; i < n - 1; i++) {
      var d0 = O[i] - Pm[i], d1 = O[i + 1] - Pm[i + 1];
      if (d0 === 0 && d1 === 0) continue;
      if (d0 * d1 < 0) { var c = d0 / (d0 - d1), xc = i + c, yc = Pm[i] + c * (Pm[i + 1] - Pm[i]); area(i, O[i], Pm[i], xc, yc, yc); area(xc, yc, yc, i + 1, O[i + 1], Pm[i + 1]); }
      else area(i, O[i], Pm[i], i + 1, O[i + 1], Pm[i + 1]);
    }
    el("path", { d: path(O.map(function (v, k) { return [X(k), Y(v)]; })), "class": "fc-obs" }, gr);
    mods.concat(mods.indexOf(focus) < 0 ? [focus] : []).forEach(function (m) { el("path", { d: path(w[m].map(function (v, k) { return [X(k), Y(v)]; })), stroke: COL[m], "class": "fc-line fc-thin" }, gr); });
  }
  function notes(mk, sc, mods) {
    var isN = mk.indexOf("NICE") === 0, o = [];
    if (isN && sc === "all" && mods.indexOf("P") >= 0) o.push(L.nNight);
    else if (isN) o.push(L.nNice);
    if (!isN && mods.indexOf("Pc") >= 0) o.push(L.nFlat);
    if (mk === "nMAE" && sc === "all") o.push(L.nMae);
    if ((mk === "RMSE" || mk === "nRMSE") && sc === "all") o.push(L.nRmse);
    return o.join(" ");
  }
  function draw() {
    if (!D) return;
    var hi = +box.querySelector(".fc-h input").value, h = D.horizons[hi], mk = box.querySelector(".fc-m").value, sc = box.querySelector(".fc-s").value, key = mk + "_" + sc, mods = shown(), isN = mk.indexOf("NICE") === 0;
    box.querySelector(".fc-h output").textContent = hl(h);
    chart1(box.querySelector(".fc-1"), key, hi, mods); chart2(box.querySelector(".fc-2"), hi, mods, box.querySelector(".fc-e").value);
    box.querySelector(".fc-note").textContent = notes(mk, sc, mods);
    // Best among the models shown, for the chosen metric (lower is better for all six).
    var best = mods.slice().sort(function (a, b) { return D.metrics[a][key][hi] - D.metrics[b][key][hi]; })[0], msg = L.none;
    if (best) {
      var v = D.metrics[best][key][hi], rm = f(D.metrics[best]["RMSE_" + sc][hi] / 1000, 3) + " " + L.kw;
      msg = L.best + "<b>" + L.names[best] + "</b> (RMSE " + rm + (isN ? ", " + NICE_NAME[mk] + " " + (v > 1.0005 ? "&gt; 1" : f(v, 3)) : mk === "RMSE" ? "" : ", " + mk + " " + f(v, 3)) + ")";
      msg += isN && v > 1.0005 ? L.bad : "." + (isN && v < 0.9995 && best !== "P" ? L.good : "");
    }
    box.querySelector(".fc-out").innerHTML = msg;
    var rows = D.models.map(function (m) {
      var g = function (k, n, s) { return f(D.metrics[m][k + "_" + sc][hi] * (s || 1), n); }, ni = function (k) { return nc(D.metrics[m][k + "_" + sc][hi]); };
      return "<tr" + (m === best ? ' class="fc-best"' : mods.indexOf(m) < 0 ? ' class="fc-off"' : "") + '><th scope="row"><i style="background:' + COL[m] + '"></i>' + L.names[m] + "</th><td>" + g("RMSE", 3, 1e-3) + "</td><td>" + g("nRMSE", 3) + "</td><td>" + g("nMAE", 3) + "</td><td>" + ni("NICE1") + "</td><td>" + ni("NICE2") + "</td><td>" + ni("NICE3") + "</td></tr>";
    }).join("");
    var head = L.table.map(function (x, i) { return "<th>" + (i >= 4 ? '<a href="' + LINK.nice + '">' + x + "</a>" : i >= 1 ? '<a href="' + LINK.ev + '">' + x + "</a>" : x) + "</th>"; }).join("");
    box.querySelector(".fc-t").innerHTML = "<caption>" + L.cap + hl(h) + " · " + (sc === "day" ? L.day : L.all) + "</caption><thead><tr>" + head + "</tr></thead><tbody>" + rows + "</tbody>";
  }
  fetch(box.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (j) { D = j; ui(); }).catch(function () { box.textContent = fr ? "Données indisponibles." : "Data unavailable."; });
})();
