/* Sun, seasons, day and night, UTC (www, 25/10/2026). One date and one instant in UTC drive six views: the orbit and the tilt,
   the day/night map, the 24-hour ribbons of Paris and Sydney, the double seasonality of extraterrestrial irradiance, the daily
   and annual curves, and local clocks around daylight-saving changes.
   Formulas: Spencer (1971) declination and equation of time, as in the NOAA general solar position calculations; sunrise and
   sunset at a zenith angle of 90.833° (refraction and solar disc); horizontal extraterrestrial irradiance G0 = Gsc·E0·cos θz with
   Gsc = 1361 W/m² and E0 = 1 + 0.033 cos(2π n/365). Checked against pvlib 0.15.2 (NREL SPA): sunrise, noon and sunset within
   3 minutes for both cities on the equinoxes and solstices of 2026 (work/sun_seasons/check_sun.py). Legal times: the IANA time
   zones of the browser (Intl). Map: Natural Earth 1:110m land, public domain. No library. */
(function () {
  "use strict";
  var box = document.getElementById("sun");
  if (!box) return;
  var fr = box.getAttribute("data-lang") === "fr", NS = "http://www.w3.org/2000/svg", YEAR = 2026, RAD = Math.PI / 180;
  var CITIES = [
    { k: "paris", n: "Paris", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris", c: "#07569a" },
    { k: "sydney", n: fr ? "Sydney" : "Sydney", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney", c: "#ad5200" }
  ];
  var L = fr ? {
    date: "Date", time: "Instant (UTC)", year: "▶ Une année", day: "▶ Une journée", stop: "❚❚ Pause", months: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
    jun: "solstice de juin", sep: "équinoxe de septembre", dec: "solstice de décembre", mar: "équinoxe de mars", sun: "Soleil", north: "N",
    zen: "Le Soleil est au zénith à la latitude ", ns: ["N", "S"], seasonsN: ["printemps", "été", "automne", "hiver"], hemN: "hémisphère nord : ", hemS: "hémisphère sud : ",
    dist: "Distance au Soleil : facteur E0 = ", distNote: " (la Terre est la plus proche début janvier : ce n'est pas la distance qui fait les saisons, c'est l'inclinaison).",
    len: "durée du jour", rise: "lever", set: "coucher", noon: "midi solaire", local: "heure légale", now: "maintenant", elev: "hauteur du Soleil",
    night: "nuit", dayL: "jour", hm: function (m) { var h = Math.floor(m / 60), mn = Math.round(m - 60 * h); if (mn === 60) { h++; mn = 0; } return h ? h + " h " + String(mn).padStart(2, "0") : mn + " min"; },
    g0: "G0 hors atmosphère (W/m²)", h0: "énergie par jour hors atmosphère (kWh/m²)", utcAx: "heure UTC", dayAx: "jour de l'année", heat: "Hors atmosphère, sur un plan horizontal, selon la date (horizontal) et l'heure UTC (vertical)",
    ex: ["Aujourd'hui, 25/10/2026 : Paris passe à l'heure d'hiver", "29/03/2026 : Paris passe à l'heure d'été", "04/10/2026 : Sydney passe à l'heure d'été"],
    dup: "heure vue deux fois", miss: "une heure sautée juste avant", utcCol: "UTC (une seule horloge)", same: "même instant"
  } : {
    date: "Date", time: "Instant (UTC)", year: "▶ One year", day: "▶ One day", stop: "❚❚ Pause", months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    jun: "June solstice", sep: "September equinox", dec: "December solstice", mar: "March equinox", sun: "Sun", north: "N",
    zen: "The Sun is overhead at latitude ", ns: ["N", "S"], seasonsN: ["spring", "summer", "autumn", "winter"], hemN: "northern hemisphere: ", hemS: "southern hemisphere: ",
    dist: "Distance to the Sun: factor E0 = ", distNote: " (the Earth is closest in early January: the seasons come from the tilt, not from the distance).",
    len: "day length", rise: "sunrise", set: "sunset", noon: "solar noon", local: "legal time", now: "now", elev: "sun elevation",
    night: "night", dayL: "day", hm: function (m) { var h = Math.floor(m / 60), mn = Math.round(m - 60 * h); if (mn === 60) { h++; mn = 0; } return h ? h + " h " + String(mn).padStart(2, "0") : mn + " min"; },
    g0: "extraterrestrial G0 (W/m²)", h0: "extraterrestrial energy per day (kWh/m²)", utcAx: "UTC hour", dayAx: "day of the year", heat: "Outside the atmosphere, on a horizontal plane, by date (horizontal) and UTC hour (vertical)",
    ex: ["Today, 25/10/2026: Paris goes back to winter time", "29/03/2026: Paris moves to summer time", "04/10/2026: Sydney moves to summer time"],
    dup: "hour seen twice", miss: "one hour skipped just before", utcCol: "UTC (one single clock)", same: "same instant"
  };

  // ------------------------------------------------------------------ solar geometry (exposed for the test block)
  function spencer(n, hourUtc) {
    var g = 2 * Math.PI / 365 * (n - 1 + (hourUtc - 12) / 24);
    var eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    return { dec: dec, eot: eot };
  }
  function cosz(lat, lon, n, m) {
    var s = spencer(n, m / 60), h = ((m + s.eot + 4 * lon) / 4 - 180) * RAD, p = lat * RAD;
    return Math.sin(p) * Math.sin(s.dec) + Math.cos(p) * Math.cos(s.dec) * Math.cos(h);
  }
  function events(lat, lon, n) {               // minutes UTC of the same UTC date (may be < 0 or > 1440), two passes at the event time
    var p = lat * RAD;
    function at(sign) {
      var t = 720 - 4 * lon;
      for (var k = 0; k < 2; k++) {
        var s = spencer(n, t / 60), c = Math.cos(90.833 * RAD) / (Math.cos(p) * Math.cos(s.dec)) - Math.tan(p) * Math.tan(s.dec);
        t = 720 - 4 * lon - s.eot + sign * 4 * Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
      }
      return t;
    }
    var r = at(-1), s = at(1);
    return { rise: r, noon: at(0), set: s, len: s - r };
  }
  function e0(n) { return 1 + 0.033 * Math.cos(2 * Math.PI * n / 365); }
  function g0(lat, lon, n, m) { return 1361 * e0(n) * Math.max(0, cosz(lat, lon, n, m)); }
  function h0(lat, lon, n) { var s = 0; for (var m = 0; m < 1440; m += 10) s += g0(lat, lon, n, m + 5) / 6; return s / 1000; }
  window.SUN = { spencer: spencer, cosz: cosz, events: events, g0: g0, h0: h0 };

  // ------------------------------------------------------------------ helpers
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function tx(p, x, y, s, a) { var e = el("text", Object.assign({ x: x, y: y, "class": "sun-ax" }, a || {}), p); e.textContent = s; return e; }
  function clear(s) { while (s.firstChild) s.removeChild(s.firstChild); }
  function num(v, d) { var s = v.toFixed(d); return fr ? s.replace(".", ",") : s; }
  function hhmm(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function ms(n, m) { return Date.UTC(YEAR, 0, n) + m * 60000; }
  var fmtCache = {};
  function local(t, tz) {
    t = Math.round(t / 60000) * 60000;          // same rounding as the UTC labels
    var key = tz;
    if (!fmtCache[key]) {
      var o = { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23", day: "2-digit", month: "2-digit" };
      try { fmtCache[key] = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", Object.assign({ timeZoneName: "shortOffset" }, o)); }
      catch (e) { fmtCache[key] = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", Object.assign({ timeZoneName: "short" }, o)); }
    }
    var parts = {}; fmtCache[key].formatToParts(new Date(t)).forEach(function (p) { parts[p.type] = p.value; });
    return { hm: parts.hour + ":" + parts.minute, day: parts.day + "/" + parts.month, off: (parts.timeZoneName || "").replace("GMT", "UTC") };
  }
  function dateLabel(n) { var d = new Date(ms(n, 0)); return d.getUTCDate() + " " + L.months[d.getUTCMonth()]; }

  // ------------------------------------------------------------------ controls
  var st = { n: 298, m: 360 }, timer = null;
  var ctl = box.querySelector(".sun-ctl");
  ctl.innerHTML = '<label><span>' + L.date + ' <output class="sun-do"></output></span><input class="sun-d" type="range" min="1" max="365" step="1" value="' + st.n + '"></label>' +
    '<label><span>' + L.time + ' <output class="sun-to"></output></span><input class="sun-t" type="range" min="0" max="1435" step="5" value="' + st.m + '"></label>' +
    '<span class="sun-play"><button type="button" class="ct-btn" data-play="year">' + L.year + '</button> <button type="button" class="ct-btn" data-play="day">' + L.day + "</button></span>";
  var iD = ctl.querySelector(".sun-d"), iT = ctl.querySelector(".sun-t");
  iD.addEventListener("input", function () { st.n = +iD.value; draw(); });
  iT.addEventListener("input", function () { st.m = +iT.value; draw(); });
  ctl.querySelectorAll("[data-play]").forEach(function (b) {
    b.addEventListener("click", function () {
      var kind = b.getAttribute("data-play");
      if (timer) { clearInterval(timer); timer = null; ctl.querySelectorAll("[data-play]").forEach(function (x) { x.textContent = x.getAttribute("data-play") === "year" ? L.year : L.day; }); if (b.dataset.on) { delete b.dataset.on; return; } }
      ctl.querySelectorAll("[data-play]").forEach(function (x) { delete x.dataset.on; });
      b.dataset.on = "1"; b.textContent = L.stop;
      timer = setInterval(function () {
        if (kind === "year") { st.n = st.n % 365 + 1; iD.value = st.n; } else { st.m = (st.m + 10) % 1440; iT.value = st.m; }
        draw();
      }, kind === "year" ? 60 : 50);
    });
  });
  box.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { var v = b.getAttribute("data-goto").split(","); st.n = +v[0]; st.m = +v[1]; iD.value = st.n; iT.value = st.m; draw(); });
  });

  // ------------------------------------------------------------------ 1. the orbit
  var sO = box.querySelector(".sun-orbit"), oOut = box.querySelector(".sun-orbit-out");
  function orbit() {
    clear(sO);
    var W = 640, H = 230, cx = 320, cy = 112, rx = 250, ry = 78;
    var defs = el("defs", {}, sO), rg = el("radialGradient", { id: "sunglow" }, defs);
    el("stop", { offset: "0%", "stop-color": "#fff4c2" }, rg); el("stop", { offset: "60%", "stop-color": "#f0c75e" }, rg); el("stop", { offset: "100%", "stop-color": "#f0c75e", "stop-opacity": "0" }, rg);
    el("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry, fill: "none", stroke: "#9fb0c0", "stroke-dasharray": "4 4" }, sO);
    el("circle", { cx: cx, cy: cy, r: 46, fill: "url(#sunglow)" }, sO); el("circle", { cx: cx, cy: cy, r: 22, fill: "#f0c75e" }, sO);
    tx(sO, cx, cy + 4, L.sun, { "text-anchor": "middle", "font-weight": "700" });
    [[172, L.jun], [266, L.sep], [355, L.dec], [79, L.mar]].forEach(function (q) {
      var a = 2 * Math.PI * (q[0] - 172) / 365, x = cx + (rx + 12) * Math.cos(a), y = cy - (ry + 14) * Math.sin(a);
      tx(sO, x, y + (Math.sin(a) < -0.5 ? 12 : 0), q[1], { "text-anchor": Math.cos(a) > 0.5 ? "end" : Math.cos(a) < -0.5 ? "start" : "middle" });
    });
    var a = 2 * Math.PI * (st.n - 172) / 365, ex = cx + rx * Math.cos(a), ey = cy - ry * Math.sin(a), sc = 1 - 0.18 * Math.sin(a), r = 22 * sc;
    el("circle", { cx: ex, cy: ey, r: r, fill: "#172536" }, sO);
    var sa = Math.atan2(cy - ey, cx - ex), x1 = ex + r * Math.cos(sa - Math.PI / 2), y1 = ey + r * Math.sin(sa - Math.PI / 2), x2 = ex + r * Math.cos(sa + Math.PI / 2), y2 = ey + r * Math.sin(sa + Math.PI / 2);
    el("path", { d: "M" + x1 + " " + y1 + "A" + r + " " + r + " 0 0 1 " + x2 + " " + y2 + "Z", fill: "#8fc3ec" }, sO);
    var t = 23.44 * RAD, ax = Math.sin(t) * -1, ay = -Math.cos(t);     // the axis keeps the same direction in space all year
    el("line", { x1: ex - ax * r * 1.6, y1: ey - ay * r * 1.6, x2: ex + ax * r * 1.6, y2: ey + ay * r * 1.6, stroke: "#172536", "stroke-width": 2 }, sO);
    tx(sO, ex + ax * r * 1.9, ey + ay * r * 1.9, L.north, { "text-anchor": "middle", "font-weight": "700" });
    var s = spencer(st.n, st.m / 60), d = s.dec / RAD, k = st.n < 79 || st.n >= 355 ? 3 : st.n < 172 ? 0 : st.n < 266 ? 1 : 2, kS = (k + 2) % 4;
    oOut.innerHTML = "<b>" + dateLabel(st.n) + " " + YEAR + "</b> · " + L.zen + "<b>" + num(Math.abs(d), 1) + " ° " + (d >= 0 ? L.ns[0] : L.ns[1]) + "</b> (δ = " + num(d, 2) + " °). " +
      L.hemN + "<b>" + L.seasonsN[k] + "</b>, " + L.hemS + "<b>" + L.seasonsN[kS] + "</b>. " + L.dist + num(e0(st.n), 3) + L.distNote;
  }

  // ------------------------------------------------------------------ 1b. why the day is longer: the Earth seen from the side
  // Sun on the left. Axis n tilted towards the Sun by the declination; a point of latitude φ and hour angle h is
  // p = sin φ·n + cos φ·(cos h·u + sin h·v), lit when it faces the Sun (p·s > 0, s = towards the Sun). Seen from 18° above
  // the orbital plane. The lit share of each parallel is the share of the 24 hours spent in daylight.
  var sS = box.querySelector(".sun-side"), sOut = box.querySelector(".sun-side-out");
  function side() {
    if (!sS) return;
    clear(sS);
    var W = 480, H = 270, cx = 270, cy = 136, R = 104, ep = 18 * RAD, s = spencer(st.n, st.m / 60), d = s.dec;
    var n = [-Math.sin(d), 0, Math.cos(d)], u = [-Math.cos(d), 0, -Math.sin(d)], v = [0, 1, 0];
    function P(p) { return [cx + R * p[0], cy - R * (p[2] * Math.cos(ep) + p[1] * Math.sin(ep))]; }
    function front(p) { return -p[1] * Math.cos(ep) + p[2] * Math.sin(ep) > -1e-9; }
    for (var k = 0; k < 5; k++) {                     // sunlight from the left
      var y = cy - 80 + 40 * k;
      el("line", { x1: 18, x2: cx - R - 14, y1: y, y2: y, stroke: "#f0c75e", "stroke-width": 3 }, sS);
      el("path", { d: "M" + (cx - R - 14) + " " + (y - 5) + "L" + (cx - R - 4) + " " + y + "L" + (cx - R - 14) + " " + (y + 5) + "Z", fill: "#f0c75e" }, sS);
    }
    tx(sS, 18, cy - 94, fr ? "rayons du Soleil" : "sunlight", { "font-weight": "700", fill: "#b07d12" });
    el("path", { d: "M" + cx + " " + (cy - R) + "A" + R + " " + R + " 0 0 0 " + cx + " " + (cy + R) + "Z", fill: "#fff3cc" }, sS);   // lit half
    el("path", { d: "M" + cx + " " + (cy - R) + "A" + R + " " + R + " 0 0 1 " + cx + " " + (cy + R) + "Z", fill: "#24344b" }, sS);   // night half
    el("circle", { cx: cx, cy: cy, r: R, fill: "none", stroke: "#172536", "stroke-width": 1.5 }, sS);
    tx(sS, cx - R / 2, cy + R + 18, fr ? "jour" : "day", { "text-anchor": "middle", "font-weight": "700" });
    tx(sS, cx + R / 2, cy + R + 18, fr ? "nuit" : "night", { "text-anchor": "middle", "font-weight": "700" });
    var a1 = P([-1.25 * n[0], 0, -1.25 * n[2]]), a2 = P([1.25 * n[0], 0, 1.25 * n[2]]);
    el("line", { x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], stroke: "#172536", "stroke-width": 2 }, sS);
    tx(sS, a2[0], a2[1] - 6, L.north, { "text-anchor": "middle", "font-weight": "700" });
    var rows = [[0, fr ? "équateur" : "equator", "#9fb0c0", null]].concat(CITIES.map(function (c) { return [c.lat, c.n, c.c, c]; })), out = "";
    rows.forEach(function (r) {
      var phi = r[0] * RAD, lit = 0, seg = [];
      for (var h = 0; h <= 360; h += 3) {
        var hh = h * RAD, p = [0, 1, 2].map(function (q) { return Math.sin(phi) * n[q] + Math.cos(phi) * (Math.cos(hh) * u[q] + Math.sin(hh) * v[q]); });
        seg.push({ xy: P(p), lit: p[0] < 0, fr: front(p) }); if (h < 360 && p[0] < 0) lit++;
      }
      for (var q = 1; q < seg.length; q++) {
        var a = seg[q - 1], b = seg[q], on = a.lit && b.lit;
        el("line", { x1: a.xy[0], y1: a.xy[1], x2: b.xy[0], y2: b.xy[1], stroke: r[3] ? (on ? r[2] : "#9aa5b1") : r[2], "stroke-width": r[3] ? (a.fr ? 4 : 2) : 1.2,
          "stroke-dasharray": a.fr ? "" : "3 3", opacity: a.fr ? 1 : 0.7 }, sS);
      }
      if (r[3]) {
        var share = lit / 120, ev = events(r[3].lat, r[3].lon, st.n), lab = seg.reduce(function (m, z) { return z.xy[0] > m.xy[0] ? z : m; });
        tx(sS, cx + R + 8, lab.xy[1] + 4, r[1] + " · " + Math.round(100 * share) + " %", { fill: r[2], "font-weight": "700" });
        out += "<b style=\"color:" + r[2] + "\">" + r[1] + "</b> : " + (fr ? "le cercle de latitude passe " : "the circle of latitude spends ") + "<b>" + Math.round(100 * share) + " %</b>" +
          (fr ? " de son tour dans la lumière, soit " : " of its turn in the light, i.e. ") + L.hm(1440 * share) + (fr ? " ; durée du jour avec la réfraction : " : "; day length with refraction: ") + "<b>" + L.hm(ev.len) + "</b>.<br>";
      }
    });
    sOut.innerHTML = out;
  }

  // ------------------------------------------------------------------ 1c. the second effect of the tilt: the height of the Sun at noon
  // A beam of 1 m² cross-section reaching the ground at elevation e covers 1/sin e m²: the higher the Sun, the more energy per m².
  // Noon elevation = 90° − |φ − δ| (geometric). Energy per day outside the atmosphere: h0().
  var sB = box.querySelector(".sun-beam");
  function beam() {
    if (!sB) return;
    clear(sB);
    var d = spencer(st.n, 12).dec / RAD;
    CITIES.forEach(function (c, i) {
      var e = 90 - Math.abs(c.lat - d), x0 = 30 + i * 240, gy = 132, w = 46, er = e * RAD, foot = w / Math.sin(er);
      el("line", { x1: x0, x2: x0 + 210, y1: gy, y2: gy, stroke: "#8a6d3b", "stroke-width": 3 }, sB);
      var cx = x0 + 105, dx = Math.cos(er), dy = Math.sin(er), L0 = 110;
      // beam of fixed width arriving from the upper left at elevation e
      var ax = cx - foot / 2, bx = cx + foot / 2;
      el("path", { d: "M" + ax + " " + gy + "L" + (ax - L0 * dx) + " " + (gy - L0 * dy) + "L" + (bx - L0 * dx) + " " + (gy - L0 * dy) + "L" + bx + " " + gy + "Z", fill: "#f0c75e", opacity: .55 }, sB);
      el("line", { x1: ax, x2: bx, y1: gy, y2: gy, stroke: c.c, "stroke-width": 6 }, sB);
      tx(sB, x0, 16, c.n + (fr ? " à midi : Soleil à " : " at noon: Sun at ") + num(e, 0) + "°", { fill: c.c, "font-weight": "700" });
      tx(sB, x0, 148, (fr ? "1 m² de rayons → " : "1 m² of rays → ") + num(1 / Math.sin(er), 2) + (fr ? " m² de sol" : " m² of ground"), { fill: c.c });
      tx(sB, x0, 30, (fr ? "énergie du jour hors atmosphère : " : "daily energy outside the atmosphere: ") + num(h0(c.lat, c.lon, st.n), 1) + " kWh/m²", {});
    });
  }

  // ------------------------------------------------------------------ 2. day and night on the map
  var cv = box.querySelector(".sun-map"), cx2 = cv.getContext("2d"), land = null, off = document.createElement("canvas");
  off.width = 360; off.height = 180;
  fetch(box.getAttribute("data-land")).then(function (r) { return r.json(); }).then(function (j) { land = new Path2D(j.d); map(); }).catch(function () { map(); });
  function map() {
    var W = cv.width, H = cv.height, k = W / 360, oc = off.getContext("2d"), img = oc.createImageData(360, 180), s = spencer(st.n, st.m / 60);
    cx2.fillStyle = "#cfe3f5"; cx2.fillRect(0, 0, W, H);
    if (land) { cx2.save(); cx2.scale(k, k); cx2.fillStyle = "#e8e2cf"; cx2.strokeStyle = "#a89f84"; cx2.lineWidth = 0.4; cx2.fill(land); cx2.stroke(land); cx2.restore(); }
    for (var j = 0; j < 180; j++) for (var i = 0; i < 360; i++) {
      var lat = 89.5 - j, lon = i - 179.5, p = lat * RAD, h = ((st.m + s.eot + 4 * lon) / 4 - 180) * RAD;
      var e = Math.asin(Math.sin(p) * Math.sin(s.dec) + Math.cos(p) * Math.cos(s.dec) * Math.cos(h)) / RAD;
      var al = e > 0 ? 0 : e < -12 ? 0.62 : e < -6 ? 0.5 : 0.25 + 0.25 * (-e / 6), o = 4 * (j * 360 + i);
      img.data[o] = 12; img.data[o + 1] = 22; img.data[o + 2] = 48; img.data[o + 3] = Math.round(255 * al);
    }
    oc.putImageData(img, 0, 0); cx2.imageSmoothingEnabled = true; cx2.drawImage(off, 0, 0, W, H);
    cx2.strokeStyle = "rgba(23,37,54,.25)"; cx2.lineWidth = 1;
    for (var g = -150; g <= 150; g += 30) { cx2.beginPath(); cx2.moveTo((g + 180) * k, 0); cx2.lineTo((g + 180) * k, H); cx2.stroke(); }
    [-60, -30, 30, 60].forEach(function (g) { cx2.beginPath(); cx2.moveTo(0, (90 - g) * k); cx2.lineTo(W, (90 - g) * k); cx2.stroke(); });
    cx2.setLineDash([5, 4]); cx2.strokeStyle = "rgba(173,82,0,.6)";
    [23.44, -23.44].forEach(function (g) { cx2.beginPath(); cx2.moveTo(0, (90 - g) * k); cx2.lineTo(W, (90 - g) * k); cx2.stroke(); });
    cx2.setLineDash([]); cx2.strokeStyle = "rgba(23,37,54,.55)"; cx2.beginPath(); cx2.moveTo(0, 90 * k); cx2.lineTo(W, 90 * k); cx2.stroke();
    cx2.beginPath(); cx2.moveTo(180 * k, 0); cx2.lineTo(180 * k, H); cx2.stroke();
    cx2.font = (11 * k / 2) + "px system-ui, sans-serif"; cx2.fillStyle = "#172536";
    cx2.fillText(fr ? "méridien de Greenwich (UTC)" : "Greenwich meridian (UTC)", 180 * k + 4, 12 * k / 2 + 2);
    var slon = -(st.m - 720 + s.eot) / 4; slon = ((slon + 540) % 360) - 180;
    var sx = (slon + 180) * k, sy = (90 - s.dec / RAD) * k;
    cx2.fillStyle = "#f0c75e"; cx2.strokeStyle = "#ad5200"; cx2.lineWidth = 2; cx2.beginPath(); cx2.arc(sx, sy, 9 * k / 2, 0, 2 * Math.PI); cx2.fill(); cx2.stroke();
    CITIES.forEach(function (c) {
      var x = (c.lon + 180) * k, y = (90 - c.lat) * k, e = Math.asin(cosz(c.lat, c.lon, st.n, st.m)) / RAD, lt = local(ms(st.n, st.m), c.tz);
      cx2.fillStyle = c.c; cx2.beginPath(); cx2.arc(x, y, 6 * k / 2, 0, 2 * Math.PI); cx2.fill();
      cx2.font = "600 " + (13 * k / 2) + "px system-ui, sans-serif"; cx2.fillStyle = "#172536";
      var lab = c.n + " " + lt.hm + " (" + lt.off + ") · " + (e > 0 ? num(e, 0) + "°" : L.night);
      var w = cx2.measureText(lab).width, lx = Math.min(W - w - 6, x + 8 * k / 2);
      cx2.fillStyle = "rgba(255,255,255,.85)"; cx2.fillRect(lx - 3, y - 11 * k / 2 - 4, w + 6, 16 * k / 2); cx2.fillStyle = "#172536"; cx2.fillText(lab, lx, y);
    });
  }

  // ------------------------------------------------------------------ 3. 24-hour ribbons in UTC
  var sR = box.querySelector(".sun-ribbons"), rOut = box.querySelector(".sun-rib-out");
  function ribbons() {
    clear(sR);
    var x0 = 96, x1 = 630, X = function (m) { return x0 + (x1 - x0) * m / 1440; }, out = "", T0 = Date.UTC(YEAR, 0, st.n);
    function offset(c) {                         // legal time minus UTC, in minutes, at noon UTC of the chosen day
      var lt = local(T0 + 720 * 60000, c.tz).hm.split(":"), d = (+lt[0] * 60 + +lt[1]) - 720;
      return d <= -720 ? d + 1440 : d > 840 ? d - 1440 : d;
    }
    // ONE scale for everybody: UTC, at the top and at the bottom, with grid lines crossing both bands
    function utcAxis(y) {
      el("rect", { x: x0, y: y - 12, width: x1 - x0, height: 17, fill: "#eef1f4", rx: 4 }, sR);
      for (var h = 0; h <= 24; h += 3) tx(sR, X(60 * h), y + 1, String(h).padStart(2, "0") + ":00", { "text-anchor": h === 0 ? "start" : h === 24 ? "end" : "middle", "font-weight": "700" });
      tx(sR, x0 - 8, y + 1, "UTC", { "text-anchor": "end", "font-weight": "700" });
    }
    for (var g = 0; g <= 24; g += 3) el("line", { x1: X(60 * g), x2: X(60 * g), y1: 26, y2: 268, stroke: "#cfd8e3", "stroke-dasharray": "2 3" }, sR);
    utcAxis(16); utcAxis(282);
    CITIES.forEach(function (c, i) {
      var y = 72 + i * 104, ev = events(c.lat, c.lon, st.n), off = offset(c), o = (off >= 0 ? "+" : "−") + Math.abs(off / 60);
      // the city's own clock, just above its band
      for (var lh = 0; lh < 24; lh += 3) {
        var mu = ((lh * 60 - off) % 1440 + 1440) % 1440;
        el("line", { x1: X(mu), x2: X(mu), y1: y - 6, y2: y, stroke: c.c, "stroke-width": 1.5 }, sR);
        tx(sR, X(mu), y - 9, String(lh).padStart(2, "0") + ":00", { "text-anchor": mu < 20 ? "start" : mu > 1420 ? "end" : "middle", fill: c.c, "font-weight": "700" });
      }
      tx(sR, x0 - 8, y - 9, (fr ? "heure de " : "") + c.n + (fr ? "" : " time"), { "text-anchor": "end", fill: c.c, "font-weight": "700" });
      tx(sR, x0 - 8, y + 18, "= UTC " + o + " h", { "text-anchor": "end", fill: c.c });
      for (var m = 0; m < 1440; m += 10) {
        var e = Math.asin(cosz(c.lat, c.lon, st.n, m + 5)) / RAD;
        var col = e > 0 ? "rgb(240," + Math.round(199 + 40 * Math.min(1, e / 60)) + "," + Math.round(94 + 120 * Math.min(1, e / 60)) + ")" : e > -6 ? "#5d6f86" : "#172536";
        el("rect", { x: X(m), y: y, width: X(10) - X(0) + 0.6, height: 28, fill: col }, sR);
      }
      // sunrise, solar noon and sunset under the band, in the city's own time
      [[ev.rise, L.rise], [ev.noon, L.noon], [ev.set, L.set]].forEach(function (q, j) {
        var mm = ((q[0] % 1440) + 1440) % 1440, anc = mm < 90 ? "start" : mm > 1350 ? "end" : "middle", lt = local(T0 + q[0] * 60000, c.tz).hm;
        el("line", { x1: X(mm), x2: X(mm), y1: y, y2: y + 32, stroke: j === 1 ? "#ad5200" : "#fff", "stroke-width": 2 }, sR);
        tx(sR, X(mm), y + 44, q[1] + " " + lt, { "text-anchor": anc, fill: "#172536" });
      });
      var ltn = local(T0 + ev.noon * 60000, c.tz);
      out += "<b style=\"color:" + c.c + "\">" + c.n + "</b> : " + L.len + " <b>" + L.hm(ev.len) + "</b> · " + L.rise + " " + hhmm(ev.rise) + " UTC · " + L.noon + " <b>" + hhmm(ev.noon) + " UTC</b> = " + ltn.hm + " " + L.local + " · " + L.set + " " + hhmm(ev.set) + " UTC<br>";
    });
    el("line", { x1: X(st.m), x2: X(st.m), y1: 8, y2: 292, stroke: "#c0392b", "stroke-width": 2.5 }, sR);
    // what each city is living at the chosen instant: one UTC instant, two legal times, two skies
    function up(c, m) { return Math.asin(cosz(c.lat, c.lon, st.n, m)) / RAD > -0.833; }
    function gap(c, dir) { var a = up(c, st.m); for (var k = 1; k <= 1440; k++) if (up(c, st.m + dir * k) !== a) return k; return null; }
    var now = "<b>" + hhmm(st.m) + " UTC</b> " + (fr ? "(trait rouge) est le même instant pour les deux villes. " : "(red line) is the same instant for both cities. ");
    CITIES.forEach(function (c) {
      var off = offset(c), o = (off >= 0 ? "+" : "−") + Math.abs(off / 60), lt = local(T0 + st.m * 60000, c.tz).hm, isUp = up(c, st.m), b = gap(c, -1), a = gap(c, 1);
      now += "<br><b style=\"color:" + c.c + "\">" + c.n + "</b> : UTC " + o + " h = <b>" + lt + "</b> ; " +
        (isUp ? (fr ? "jour, Soleil levé depuis " : "day, Sun up for ") + L.hm(b) + (fr ? ", coucher dans " : ", sunset in ") + L.hm(a)
              : (fr ? "nuit, Soleil couché depuis " : "night, Sun down for ") + L.hm(b) + (fr ? ", lever dans " : ", sunrise in ") + L.hm(a)) + ".";
    });
    rOut.innerHTML = '<p class="sun-now">' + now + "</p>" + out;
  }

  // ------------------------------------------------------------------ 4. double seasonality: heat maps, then the two cycles
  var heats = box.querySelectorAll(".sun-heat"), heatImg = [];
  function heatColor(v) {                       // 0 → night blue, 1 → pale yellow
    var s = [[0, [23, 37, 54]], [0.25, [7, 86, 154]], [0.6, [240, 199, 94]], [1, [255, 244, 194]]];
    for (var i = 1; i < s.length; i++) if (v <= s[i][0]) { var a = s[i - 1], b = s[i], u = (v - a[0]) / (b[0] - a[0]); return a[1].map(function (x, k) { return Math.round(x + u * (b[1][k] - x)); }); }
    return s[s.length - 1][1];
  }
  CITIES.forEach(function (c, i) {
    var o = document.createElement("canvas"); o.width = 365; o.height = 96; var g = o.getContext("2d"), im = g.createImageData(365, 96);
    for (var n = 1; n <= 365; n++) for (var q = 0; q < 96; q++) {
      var v = g0(c.lat, c.lon, n, q * 15 + 7.5) / 1406, col = heatColor(v), p = 4 * ((95 - q) * 365 + n - 1);
      im.data[p] = col[0]; im.data[p + 1] = col[1]; im.data[p + 2] = col[2]; im.data[p + 3] = 255;
    }
    g.putImageData(im, 0, 0); heatImg[i] = o;
  });
  function heat() {
    heats.forEach(function (cvh, i) {
      var g = cvh.getContext("2d"), W = cvh.width, H = cvh.height, k = W / 640, l = 56 * k, r = 10 * k, t = 22 * k, b = 26 * k, c = CITIES[i];
      g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false; g.drawImage(heatImg[i], l, t, W - l - r, H - t - b);
      g.font = "600 " + 13 * k + "px system-ui, sans-serif"; g.fillStyle = c.c; g.fillText(c.n + " (" + num(Math.abs(c.lat), 1) + " ° " + (c.lat > 0 ? L.ns[0] : L.ns[1]) + ")", l, 15 * k);
      g.font = 11 * k + "px system-ui, sans-serif"; g.fillStyle = "#5a6b7d";
      [0, 6, 12, 18, 24].forEach(function (hh) { var y = t + (H - t - b) * (1 - hh / 24); g.fillText(String(hh).padStart(2, "0") + " h UTC", 2 * k, y + 4 * k); });
      for (var mo = 0; mo < 12; mo++) { var n = Math.round((Date.UTC(YEAR, mo, 1) - Date.UTC(YEAR, 0, 1)) / 864e5) + 1; g.fillText(L.months[mo], l + (W - l - r) * (n - 1) / 365, H - 8 * k); }
      var x = l + (W - l - r) * (st.n - 0.5) / 365, y = t + (H - t - b) * (1 - st.m / 1440);
      g.strokeStyle = "#c0392b"; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(x, t); g.lineTo(x, H - b); g.moveTo(l, y); g.lineTo(W - r, y); g.stroke();
    });
  }
  var sDay = box.querySelector(".sun-daily"), sYear = box.querySelector(".sun-annual");
  var H0 = CITIES.map(function (c) { var a = []; for (var n = 1; n <= 365; n++) a.push(h0(c.lat, c.lon, n)); return a; });
  function curves() {
    [[sDay, 0], [sYear, 1]].forEach(function (pair) {
      var s = pair[0], yr = pair[1], W = 640, H = 220, l = 56, r = 12, t = 12, b = 40;
      clear(s);
      var ymax = yr ? 12 : 1400, X = yr ? function (n) { return l + (W - l - r) * (n - 1) / 364; } : function (m) { return l + (W - l - r) * m / 1440; }, Y = function (v) { return H - b - (H - t - b) * v / ymax; };
      for (var gk = 0; gk <= 4; gk++) { var v = ymax * gk / 4; el("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), stroke: "#e3e8ee" }, s); tx(s, l - 6, Y(v) + 4, num(v, 0), { "text-anchor": "end" }); }
      if (yr) { for (var mo = 0; mo < 12; mo++) { var n = Math.round((Date.UTC(YEAR, mo, 1) - Date.UTC(YEAR, 0, 1)) / 864e5) + 1; tx(s, X(n), H - b + 16, L.months[mo]); } }
      else { for (var hh = 0; hh <= 24; hh += 3) tx(s, X(60 * hh), H - b + 16, String(hh).padStart(2, "0") + ":00", { "text-anchor": "middle" }); }
      tx(s, (l + W - r) / 2, H - 6, yr ? L.dayAx : L.utcAx, { "text-anchor": "middle" });
      tx(s, 14, (t + H - b) / 2, yr ? L.h0 : L.g0, { "text-anchor": "middle", transform: "rotate(-90 14 " + ((t + H - b) / 2) + ")" });
      CITIES.forEach(function (c, i) {
        var pts = [];
        if (yr) for (var n2 = 1; n2 <= 365; n2++) pts.push([X(n2), Y(H0[i][n2 - 1])]);
        else for (var m = 0; m <= 1440; m += 10) pts.push([X(m), Y(g0(c.lat, c.lon, st.n, m))]);
        el("path", { d: pts.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""), fill: "none", stroke: c.c, "stroke-width": 2.4 }, s);
        var mk = yr ? [X(st.n), Y(H0[i][st.n - 1])] : [X(st.m), Y(g0(c.lat, c.lon, st.n, st.m))];
        el("circle", { cx: mk[0], cy: mk[1], r: 5, fill: c.c }, s);
        el("rect", { x: W - r - 150 + 75 * i, y: t + 2, width: 14, height: 4, fill: c.c }, s);   // legend
        tx(s, W - r - 132 + 75 * i, t + 8, c.n, { fill: c.c, "font-weight": "700" });
      });
      el("line", { x1: yr ? X(st.n) : X(st.m), x2: yr ? X(st.n) : X(st.m), y1: t, y2: H - b, stroke: "#c0392b", "stroke-dasharray": "3 3" }, s);
    });
  }

  // ------------------------------------------------------------------ 5. one clock for all: UTC around daylight-saving changes
  var clk = box.querySelector(".sun-clock"), exs = [[Date.UTC(2026, 9, 24, 23, 30), 9], [Date.UTC(2026, 2, 28, 23, 30), 9], [Date.UTC(2026, 9, 3, 14, 30), 9]], exK = 0;
  function clock() {
    var t0 = exs[exK][0], seen = {}, rows = "";
    var tabs = '<p class="sun-exs">' + L.ex.map(function (s, k) { return '<button type="button" class="ct-btn" data-ex="' + k + '" aria-pressed="' + (k === exK) + '">' + s + "</button>"; }).join(" ") + "</p>";
    var list = []; for (var k = 0; k < exs[exK][1]; k++) list.push(t0 + k * 30 * 60000);
    var loc = list.map(function (t) { return CITIES.map(function (c) { return local(t, c.tz); }); });
    loc.forEach(function (lc) { CITIES.forEach(function (c, j) { var key = j + lc[j].day + lc[j].hm; seen[key] = (seen[key] || 0) + 1; }); });
    list.forEach(function (t, k) {
      var d = new Date(t), u = String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0") + " " + String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
      rows += "<tr><td><b>" + u + "</b></td>" + CITIES.map(function (c, j) {
        var lc = loc[k][j], dup = seen[j + lc.day + lc.hm] > 1, gap = k > 0 && (function () { var p = loc[k - 1][j].hm.split(":"), q = lc.hm.split(":"); var dm = (+q[0] * 60 + +q[1]) - (+p[0] * 60 + +p[1]); dm = (dm + 1440) % 1440; return dm === 90; })();
        return "<td" + (dup ? ' class="sun-dup"' : gap ? ' class="sun-gap"' : "") + ">" + lc.day + " " + lc.hm + " <span class=\"sun-mut\">" + lc.off + "</span>" + (dup ? " · " + L.dup : gap ? " · " + L.miss : "") + "</td>";
      }).join("") + "</tr>";
    });
    clk.innerHTML = tabs + '<div class="fc-tw"><table class="fc-t sun-t"><thead><tr><th>' + L.utcCol + "</th>" + CITIES.map(function (c) { return "<th>" + c.n + " (" + L.local + ")</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
    clk.querySelectorAll("[data-ex]").forEach(function (b) { b.addEventListener("click", function () { exK = +b.getAttribute("data-ex"); clock(); }); });
  }

  function draw() {
    box.querySelector(".sun-do").textContent = dateLabel(st.n) + " " + YEAR;
    box.querySelector(".sun-to").textContent = hhmm(st.m) + " UTC";
    orbit(); side(); beam(); map(); ribbons(); heat(); curves();
  }
  draw(); clock();
})();
