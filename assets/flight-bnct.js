/* Voyant et al., RPOR 16 (2011), 21–31. DOI 10.1016/j.rpor.2010.11.002.
   Rounded reference scaling, conditional Table 2 and mean free paths of Table 4 only. Not a transport or treatment planner. */
(function (root) {
  'use strict';
  var M = {
    result: function (hours, boron) {
      if (!Number.isFinite(hours) || !Number.isFinite(boron) || hours < 0 || boron < 0) throw new RangeError('Non-negative finite inputs required');
      return {tumourReferenceMicroGy: hours, captureIndex: 100 * hours * boron / 20, flightModelMicroSv: 4.37 * hours, flightReferenceMicroSv: 6.1 * hours};
    },
    reactions: {BSH: [1, 94, 0, 5], BPA: [1, 88, 0, 11]},
    // Distance to the first collision in a homogeneous medium: l = -L ln(U), U uniform on ]0,1]. Mulberry32, seeded.
    freePaths: function (L, n, seed) {
      var s = seed >>> 0, out = new Float64Array(n);
      for (var i = 0; i < n; i++) {
        s = (s + 0x6D2B79F5) >>> 0;
        var z = s; z = Math.imul(z ^ z >>> 15, z | 1); z ^= z + Math.imul(z ^ z >>> 7, z | 61);
        out[i] = -L * Math.log(1 - ((z ^ z >>> 14) >>> 0) / 4294967296);
      }
      return out;
    }
  };
  root.FlightBNCT = M;
  if (typeof document === 'undefined') return;
  var NS = 'http://www.w3.org/2000/svg';
  function node(parent, tag, a, text) { var e = document.createElementNS(NS, tag); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (text !== undefined) e.textContent = text; parent.appendChild(e); return e; }

  function mount(box) {
    if (box.dataset.ready) return; box.dataset.ready = 'true';
    var fr = box.dataset.lang === 'fr', tr = function (a, b) { return fr ? a : b; };
    var fmt = function (n, d) { return n.toLocaleString(fr ? 'fr-FR' : 'en-GB', {maximumFractionDigits: d === undefined ? 2 : d}); };
    var PRESETS = [
      [tr('Le cas de l’article', 'The paper’s case'), 1, 20, tr('Une heure, 20 µg de bore-10 par gramme : le seul point où la dose est chiffrée.', 'One hour, 20 µg of boron-10 per gram: the only point where the dose is quantified.')],
      [tr('Un long vol de 12 h', 'A long 12 h flight'), 12, 20, tr('Douze fois plus d’exposition, et la dose reste à peine au-dessus de 10 µGy.', 'Twelve times more exposure, and the dose stays barely above 10 µGy.')],
      [tr('Plus de bore', 'More boron'), 1, 50, tr('50 µg/g, valeur que l’article juge atteignable : 2,5 fois plus d’interactions sur le bore.', '50 µg/g, a value the paper considers reachable: 2.5 times more boron interactions.')],
      [tr('Sans bore', 'No boron'), 1, 0, tr('Sans bore, pas de capture sur le bore : le mécanisme disparaît, le vol reste.', 'Without boron there is no boron capture: the mechanism vanishes, the flight remains.')]
    ];
    var STAGES = [tr('1. Le ciel', '1. The sky'), tr('2. Le modèle', '2. The model'), tr('3. La capture', '3. The capture'), tr('4. La cellule voisine', '4. The neighbouring cell')];
    box.innerHTML =
      '<div class="bnct-presets" role="group" aria-label="' + tr('Réglages à essayer', 'Settings to try') + '">' + PRESETS.map(function (p, i) { return '<button type="button" data-preset="' + i + '">' + p[0] + '</button>'; }).join('') + '</div><p class="bnct-note" aria-live="polite"></p>' +
      '<div class="bnct-ctl"><label>' + tr('Durée de vol : ', 'Flight duration: ') + '<output data-hours></output><input aria-label="' + tr('Durée en heures', 'Duration in hours') + '" data-time type="range" min="0.5" max="12" step="0.5" value="1"></label><label>' + tr('Bore-10 dans le modèle : ', 'Boron-10 in the model: ') + '<output data-boron></output><input aria-label="' + tr('Concentration de bore-10 du modèle', 'Boron-10 concentration in the model') + '" data-b type="range" min="0" max="50" step="1" value="20"></label></div>' +
      '<div class="bnct-verdict" aria-live="polite"></div><div class="bnct-metrics"></div>' +
      '<figure class="bnct-fig"><h3>' + tr('Il faudrait un million d’heures pour atteindre 1 Gy', 'It would take a million hours to reach 1 Gy') + '</h3><svg data-log viewBox="0 0 640 262" role="img" aria-label="' + tr('Dose cumulée selon la durée, à 1 µGy par heure', 'Cumulative dose against duration, at 1 µGy per hour') + '"></svg><figcaption>' + tr('Échelles logarithmiques : chaque graduation multiplie par 1000. Dose à 20 µg/g. 1 Gy (un million de µGy) est un simple repère de calcul, pas une dose de traitement.', 'Logarithmic scales: each tick multiplies by 1000. Dose at 20 µg/g. 1 Gy (a million µGy) is a plain calculation landmark, not a treatment dose.') + '</figcaption></figure>' +
      '<h3>' + tr('Du ciel à la cellule, en quatre étapes', 'From the sky to the cell, in four stages') + '</h3><div class="bnct-presets" role="group" aria-label="' + tr('Étapes du schéma', 'Stages of the diagram') + '">' + STAGES.map(function (s, i) { return '<button type="button" data-stage="' + i + '">' + s + '</button>'; }).join('') + '</div>' +
      '<div class="bnct-scroll"><svg data-scene viewBox="0 0 760 330" role="img" aria-label="' + tr('Cascade atmosphérique, avion et capture du bore', 'Atmospheric cascade, aircraft and boron capture') + '"></svg></div><p class="bnct-step" aria-live="polite"></p>' +
      '<h3>' + tr('BSH ou BPA : que devient le neutron qui frappe la molécule ?', 'BSH or BPA: what happens to the neutron hitting the molecule?') + '</h3><p><label for="bnct-carrier">' + tr('Molécule qui porte le bore (tableau 2 de l’article) ', 'Molecule carrying the boron (Table 2 of the paper) ') + '</label><select id="bnct-carrier"><option>BSH</option><option>BPA</option></select></p><div class="bnct-bars"></div><p class="bnct-foot">' + tr('Ces parts ne bougent ni avec la durée ni avec la concentration : ce sont des probabilités conditionnelles (tableau 2), fixées par la molécule. Le choix de la molécule change cette répartition, pas les chiffres du haut : à concentration de bore-10 égale, l’outil n’applique aucun multiplicateur. Ces parts décrivent les réactions une fois le neutron arrivé sur la molécule, pas la chance qu’il y arrive.', 'These shares move with neither the duration nor the concentration: they are conditional probabilities (Table 2), set by the molecule. The choice of molecule changes this distribution, not the figures above: at equal boron-10 concentration the tool applies no multiplier. These shares describe the reactions once a neutron has reached the molecule, not its chance of getting there.') + '</p>';
    var sv = box.querySelector('[data-scene]'), step = 0, travel = 1, anim = 0, target = sv;
    var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var desc = [
      tr('Des particules cosmiques énergétiques rencontrent l’atmosphère et produisent des particules secondaires, dont des neutrons. Le vent solaire module ce fond galactique ; un événement solaire énergétique est autre chose.', 'Energetic cosmic particles meet the atmosphere and produce secondary particles, including neutrons. Solar wind modulates this galactic background; a solar energetic event is something else.'),
      tr('Le modèle fixe 12 km d’altitude, 45° de latitude et 14,7 neutrons par cm² et par seconde. Une couche d’eau de 10 cm ralentit les neutrons avant le crâne et la tumeur numérique. Il ne décrit pas toutes les routes aériennes.', 'The model fixes 12 km altitude, 45° latitude and 14.7 neutrons per cm² per second. A 10 cm water layer slows the neutrons before the skull and the numerical tumour. It does not describe every flight route.'),
      tr('Une capture par le bore-10 émet du lithium-7 et une particule alpha, sur quelques micromètres. L’énergie est très localisée, mais les événements sont rares : la dose moyenne reste de l’ordre du µGy par heure.', 'Boron-10 capture emits lithium-7 and an alpha particle, over a few micrometres. The energy is highly local, but the events are rare: the mean dose remains of the order of µGy per hour.'),
      tr('Une cellule touchée peut envoyer des signaux à ses voisines : c’est l’effet bystander. Le trait violet est un signal biologique, pas une trajectoire alpha ni une dose de plus. La réponse de la voisine n’est pas prédite ici.', 'A hit cell may signal to its neighbours: the bystander effect. The purple line is a biological signal, not an alpha track or extra dose. The neighbour’s response is not predicted here.')
    ];
    function el(tag, a, text) { return node(target, tag, a, text); }
    function txt(x, y, s, size, color) { return el('text', {x: x, y: y, 'font-size': size || 16, fill: color || 'currentColor', 'font-family': 'system-ui'}, s); }
    function line(x, y, x2, y2, color, w) { el('line', {x1: x, y1: y, x2: x2, y2: y2, stroke: color, 'stroke-width': w || 3, 'stroke-linecap': 'round'}); }
    function circle(x, y, r, color) { el('circle', {cx: x, cy: y, r: r, fill: color}); }
    function panel(i) { var active = step === i || (i === 2 && step === 3); target = node(sv, 'g', {opacity: active ? 1 : .32}); }
    function draw() {
      sv.replaceChildren(); target = sv;
      el('rect', {x: 0, y: 0, width: 760, height: 330, fill: '#f1f7fb', rx: 12});
      panel(0);
      txt(24, 30, tr('LE CIEL', 'THE SKY'), 15, '#13405d');
      el('path', {d: 'M0 215 Q110 160 245 215 L245 330 L0 330Z', fill: '#c3dce8'});
      txt(20, 310, tr('Cascade secondaire', 'Secondary cascade'), 15, '#13405d');
      var t0 = step === 0 ? travel : 1;
      line(98, 48, 128, 112, '#ad5916', 4); circle(98 + 30 * Math.min(1, 2 * t0), 48 + 64 * Math.min(1, 2 * t0), 6, '#ad5916');
      [[50, 192], [142, 202], [211, 189]].forEach(function (p) { var u = Math.max(0, 2 * t0 - 1); line(128, 112, p[0], p[1], '#287c99', 2); circle(128 + (p[0] - 128) * u, 112 + (p[1] - 112) * u, 4, '#287c99'); });
      txt(150, 76, tr('particule cosmique', 'cosmic particle'), 14, '#8a4510');
      txt(30, 150, 'neutrons', 14, '#1c6079');
      panel(1);
      txt(272, 30, tr('LE MODÈLE À 12 km', 'THE MODEL AT 12 km'), 15, '#13405d');
      el('path', {d: 'M295 110 L345 106 L375 80 L388 80 L374 106 L433 110 L374 117 L387 143 L374 143 L345 118 L295 115Z', fill: '#326c88'});
      txt(292, 171, tr('Eau', 'Water'), 14, '#13405d');
      el('rect', {x: 286, y: 178, width: 60, height: 78, fill: '#b1dfef', rx: 5}); txt(296, 275, '10 cm', 14, '#13405d');
      // Skull thickness is annotated numerically; its width is exaggerated for legibility.
      txt(346, 171, tr('Crâne', 'Skull'), 14, '#13405d');
      el('rect', {x: 352, y: 178, width: 16, height: 78, fill: '#8e8067', stroke: '#564a36', 'stroke-width': 1}); txt(344, 275, tr('0,5 cm', '0.5 cm'), 14, '#13405d');
      txt(392, 171, tr('Cerveau', 'Brain'), 14, '#13405d');
      el('ellipse', {cx: 412, cy: 216, rx: 36, ry: 43, fill: '#f0dcd6'});
      circle(412, 218, 16, '#cb8f86'); txt(392, 275, tr('Tumeur ~1 g', 'Tumour ~1 g'), 14, '#13405d');
      if (step >= 1) { var t1 = step === 1 ? travel : 1; line(270, 216, 404, 216, '#287c99', 2); circle(270 + 134 * t1, 216, 5, '#287c99'); }
      panel(2);
      txt(497, 30, tr('ZOOM : UNE CAPTURE', 'ZOOM: ONE CAPTURE'), 15, '#13405d');
      circle(620, 170, 79, '#e5eff5'); el('circle', {cx: 620, cy: 170, r: 79, fill: 'none', stroke: '#7197ac'});
      circle(620, 170, 12, '#ba6217'); txt(599, 151, '¹⁰B', 20, '#13405d');
      if (step >= 2) {
        var t2 = step === 2 ? travel : 1, r = 70 * t2;
        line(620, 170, 620 + r, 170 - r / 2, '#b94631', 4); line(620, 170, 620 - r / 2, 170 + r / 4, '#7a419c', 4); circle(620 + r, 170 - r / 2, 6, '#b94631'); circle(620 - r / 2, 170 + r / 4, 6, '#7a419c');
        txt(668, 118, 'α ~8 µm', 15, '#9e3020'); txt(502, 232, '⁷Li ~4 µm', 15, '#70338c');
      }
      if (step === 3) {
        circle(721, 229, 18, '#d4e1e9'); txt(716, 235, '?', 19, '#70338c');
        line(667, 202, 667 + 38 * travel, 202 + 22 * travel, '#8052a2', 2);
        txt(680, 266, tr('voisine', 'neighbour'), 14, '#70338c');
        txt(501, 62, tr('Bystander : réponse à vérifier', 'Bystander: response to check'), 14, '#70338c');
      }
      txt(498, 290, '¹⁰B + n → ⁷Li + α', 20, '#13405d');
      txt(498, 314, tr('Schéma, distances non à l’échelle', 'Schematic, distances not to scale'), 14, '#13405d');
      target = sv;
    }
    function setStage(i) {
      step = i; box.querySelector('.bnct-step').textContent = desc[step];
      box.querySelectorAll('[data-stage]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.stage === i)); });
      cancelAnimationFrame(anim);
      if (still) { travel = 1; draw(); return; }
      var t0 = null;
      (function tick(now) { if (t0 === null) t0 = now || 0; travel = Math.min(1, ((now || 0) - t0) / 1100); draw(); if (travel < 1) anim = requestAnimationFrame(tick); })();
    }
    function logChart(t, b) {
      var s = box.querySelector('[data-log]'), x0 = 72, x1 = 626, y0 = 214, y1 = 12, lo = -0.5, hi = 7;
      s.replaceChildren();
      var X = function (h) { return x0 + (x1 - x0) * (Math.log10(h) - lo) / (hi - lo); }, Y = function (d) { return y0 - (y0 - y1) * (Math.log10(d) - lo) / (hi - lo); }, label = function (x, y, c, a) { return node(s, 'text', Object.assign({x: x, y: y, 'font-size': 13.5, fill: '#3f5163', 'font-family': 'system-ui'}, a || {}), c); };
      [[1, tr('1 h', '1 h')], [1000, tr('1000 h', '1000 h')], [1e6, tr('114 ans', '114 years')]].forEach(function (q) { node(s, 'line', {x1: X(q[0]), x2: X(q[0]), y1: y1, y2: y0, stroke: '#e3e8ee'}); label(X(q[0]), y0 + 18, q[1], {'text-anchor': 'middle'}); });
      [[1, '1 µGy'], [1000, '1 mGy']].forEach(function (q) { node(s, 'line', {x1: x0, x2: x1, y1: Y(q[0]), y2: Y(q[0]), stroke: '#e3e8ee'}); label(x0 - 6, Y(q[0]) + 5, q[1], {'text-anchor': 'end'}); });
      node(s, 'line', {x1: x0, x2: x1, y1: Y(1e6), y2: Y(1e6), stroke: '#a8431f', 'stroke-width': 2}); label(x0 - 6, Y(1e6) + 5, '1 Gy', {'text-anchor': 'end', fill: '#a8431f', 'font-weight': 700});
      node(s, 'line', {x1: X(Math.pow(10, lo)), x2: X(1e7), y1: Y(Math.pow(10, lo)), y2: Y(1e7), stroke: '#086a91', 'stroke-width': 2.6});
      node(s, 'circle', {cx: X(1e6), cy: Y(1e6), r: 5, fill: '#a8431f'});
      node(s, 'circle', {cx: X(t), cy: Y(t), r: 7, fill: '#bc690d', stroke: '#fff', 'stroke-width': 2});
      label(X(t) + 12, Y(t) + 5, tr('votre réglage : ', 'your setting: ') + fmt(t) + ' h', {fill: '#8a4510', 'font-weight': 700});
      if (b !== 20) label(X(t) + 12, Y(t) + 23, tr('dose lue à 20 µg/g : l’article ne la chiffre pas à ', 'dose read at 20 µg/g: the paper does not quantify it at ') + fmt(b) + ' µg/g', {fill: '#8a4510', 'font-size': 12});
      label((x0 + x1) / 2, y0 + 40, tr('durée d’exposition', 'exposure duration'), {'text-anchor': 'middle'});
    }
    function values() {
      var t = +box.querySelector('[data-time]').value, b = +box.querySelector('[data-b]').value, v = M.result(t, b);
      box.querySelector('[data-hours]').textContent = fmt(t) + ' h'; box.querySelector('[data-boron]').textContent = fmt(b) + ' µg/g';
      box.querySelectorAll('[data-preset]').forEach(function (e) { var p = PRESETS[+e.dataset.preset]; e.setAttribute('aria-pressed', String(p[1] === t && p[2] === b)); });
      var active = PRESETS.filter(function (p) { return p[1] === t && p[2] === b; })[0];
      box.querySelector('.bnct-note').textContent = active ? active[3] : '';
      var left = fmt(Math.round(1e6 / t / 1000) * 1000, 0), verdict;
      if (b === 0) verdict = tr('<b>Sans bore, plus de capture sur le bore : les interactions tombent à 0 %.</b> Le vol expose toujours le corps. La carte de dose reste le repère de l’article à 20 µg/g, pas une dose sans bore.', '<b>Without boron, no more boron capture: the interactions fall to 0%.</b> The flight still exposes the body. The dose card remains the paper’s reference at 20 µg/g, not a dose without boron.');
      else if (b === 20) verdict = tr('<b>' + fmt(t) + ' h à 20 µg/g : environ ' + fmt(v.tumourReferenceMicroGy) + ' µGy en moyenne.</b> Pour atteindre 1 Gy, il faudrait une exposition environ ' + left + ' fois plus longue.', '<b>' + fmt(t) + ' h at 20 µg/g: about ' + fmt(v.tumourReferenceMicroGy) + ' µGy on average.</b> Reaching 1 Gy would take an exposure about ' + left + ' times longer.');
      else verdict = tr('<b>' + fmt(t) + ' h à ' + fmt(b) + ' µg/g : ' + fmt(v.captureIndex) + ' % des interactions sur le bore du cas de l’article.</b> La dose, elle, n’est chiffrée par l’article qu’à 20 µg/g : elle ne bouge donc pas avec ce curseur.', '<b>' + fmt(t) + ' h at ' + fmt(b) + ' µg/g: ' + fmt(v.captureIndex) + '% of the boron interactions of the paper’s case.</b> The dose is quantified by the paper only at 20 µg/g, so it does not move with this slider.');
      box.querySelector('.bnct-verdict').innerHTML = verdict;
      box.querySelector('.bnct-metrics').innerHTML = '<article>' + tr('Dose moyenne dans la tumeur, à 20 µg/g', 'Mean dose in the tumour, at 20 µg/g') + '<strong>≈ ' + fmt(v.tumourReferenceMicroGy) + ' µGy</strong><small>' + tr('1 µGy par heure × durée. Le gray (Gy) mesure l’énergie absorbée par kilogramme.', '1 µGy per hour × duration. The gray (Gy) measures energy absorbed per kilogram.') + '</small></article>' +
        '<article>' + tr('Interactions sur le bore, par rapport au cas de l’article', 'Boron interactions, relative to the paper’s case') + '<strong>' + fmt(v.captureIndex) + tr(' %', '%') + '</strong><small>' + tr('100 % = 1 h à 20 µg/g ; proportionnel à la durée et au bore. Ni une part de neutrons capturés, ni une dose.', '100% = 1 h at 20 µg/g; proportional to duration and boron. Neither a share of neutrons captured nor a dose.') + '</small></article>' +
        '<article>' + tr('Exposition du corps en vol, notre modèle', 'Body exposure in flight, our model') + '<strong>' + fmt(v.flightModelMicroSv) + ' µSv</strong><small>' + tr('4,37 µSv par heure × durée. Le sievert (Sv) pondère l’exposition : il ne se convertit pas directement en gray.', '4.37 µSv per hour × duration. The sievert (Sv) weights exposure: it does not convert directly into gray.') + '</small></article>' +
        '<article>' + tr('Même vol, référence SIEVERT', 'Same flight, SIEVERT reference') + '<strong>' + fmt(v.flightReferenceMicroSv) + ' µSv</strong><small>' + tr('6,1 µSv par heure × durée : l’outil SIEVERT de l’IRSN sur un Paris–New York, chiffre de l’article. Pas une estimation personnelle.', '6.1 µSv per hour × duration: IRSN’s SIEVERT tool on a Paris–New York flight, as in the paper. Not a personal estimate.') + '</small></article>';
      var a = M.reactions[box.querySelector('select').value], names = [tr('(n,γ) : absorbé, un photon part', '(n,γ): absorbed, a photon leaves'), tr('(n,α) : absorbé, une particule alpha part', '(n,α): absorbed, an alpha particle leaves'), tr('(n,p) : un proton part', '(n,p): a proton leaves'), tr('(n,n) : le neutron rebondit', '(n,n): the neutron bounces off')];
      box.querySelector('.bnct-bars').innerHTML = a.map(function (n, i) { return '<div class="bnct-bar"><span>' + names[i] + '</span><i style="width:' + Math.max(n, .5) + '%"></i><b>' + (i === 2 ? '≈ ' : '') + n + tr(' %', '%') + '</b></div>'; }).join('');
      logChart(t, b);
    }
    box.querySelectorAll('[data-preset]').forEach(function (e) { e.onclick = function () { var p = PRESETS[+e.dataset.preset]; box.querySelector('[data-time]').value = p[1]; box.querySelector('[data-b]').value = p[2]; values(); }; });
    box.querySelectorAll('[data-stage]').forEach(function (e) { e.onclick = function () { setStage(+e.dataset.stage); }; });
    box.querySelectorAll('input,select').forEach(function (e) { e.addEventListener('input', values); });
    setStage(0); values();
  }

  // Monte Carlo: how many histories does a stable answer take?
  function mountMC(box) {
    if (box.dataset.ready) return; box.dataset.ready = 'true';
    var fr = box.dataset.lang === 'fr', tr = function (a, b) { return fr ? a : b; }, seed = 2011, N = 6000, band = 1;
    var fmt = function (n, d) { return n.toLocaleString(fr ? 'fr-FR' : 'en-GB', {maximumFractionDigits: d, minimumFractionDigits: d}); };
    var BANDS = [[tr('Neutrons lents (0,025 à 0,5 eV)', 'Slow neutrons (0.025 to 0.5 eV)'), 0.811], [tr('Intermédiaires (1 à 500 keV)', 'Intermediate (1 to 500 keV)'), 1.54], [tr('Rapides (500 keV à 50 MeV)', 'Fast (500 keV to 50 MeV)'), 8.58]], NS_ = [10, 100, 6000, 60000];
    box.innerHTML = '<h3>' + tr('Tirer au sort la distance avant le premier rebond', 'Draw the distance before the first bounce') + '</h3><div class="bnct-presets bnct-mc-n" role="group" aria-label="' + tr('Nombre de neutrons tirés', 'Number of neutrons drawn') + '">' + NS_.map(function (n) { return '<button type="button" data-n="' + n + '">' + n.toLocaleString(fr ? 'fr-FR' : 'en-GB') + ' ' + tr('neutrons', 'neutrons') + '</button>'; }).join('') + '<button type="button" data-redraw>' + tr('Nouveau tirage', 'New draw') + '</button></div><label>' + tr('Énergie des neutrons ', 'Neutron energy ') + '<select aria-label="' + tr('Énergie des neutrons', 'Neutron energy') + '">' + BANDS.map(function (b, i) { return '<option value="' + i + '"' + (i === band ? ' selected' : '') + '>' + b[0] + '</option>'; }).join('') + '</select></label><div class="bnct-verdict bnct-mc-out" aria-live="polite"></div><svg viewBox="0 0 640 250" role="img" aria-label="' + tr('Histogramme des distances tirées et courbe attendue', 'Histogram of drawn distances and expected curve') + '"></svg><p class="bnct-foot"><span style="color:#086a91">▮ ' + tr('distances tirées', 'drawn distances') + '</span> · <span style="color:#a8431f">▬ ' + tr('courbe attendue', 'expected curve') + '</span>. ' + tr('Libres parcours élastiques dans le cerveau : tableau 4 de l’article. Un seul pas du transport complet, pour un milieu homogène, avec une valeur moyenne par bande d’énergie : ce tirage ne refait pas le calcul de l’article.', 'Elastic mean free paths in the brain: Table 4 of the paper. One single step of the full transport, for a homogeneous medium, with one mean value per energy band: this draw does not redo the paper’s calculation.') + '</p>';
    var s = box.querySelector('svg');
    function draw() {
      var L = BANDS[band][1], d = M.freePaths(L, N, seed + N), sum = 0, sq = 0, bins = new Array(25).fill(0), W = 5 * L / 25, i;
      for (i = 0; i < N; i++) { sum += d[i]; sq += d[i] * d[i]; var k = Math.floor(d[i] / W); if (k < 25) bins[k]++; }
      var mean = sum / N, se = Math.sqrt(Math.max(0, sq / N - mean * mean) / N), share = bins.map(function (c) { return 100 * c / N; }), exp = function (x) { return 100 * (Math.exp(-x / L) - Math.exp(-(x + W) / L)); };
      var ymax = Math.max(30, Math.max.apply(null, share)) * 1.05, x0 = 56, x1 = 626, y0 = 204, y1 = 10, X = function (v) { return x0 + (x1 - x0) * v / (5 * L); }, Y = function (v) { return y0 - (y0 - y1) * v / ymax; };
      s.replaceChildren();
      var tx = function (x, y, c, a) { return node(s, 'text', Object.assign({x: x, y: y, 'font-size': 13.5, fill: '#3f5163', 'font-family': 'system-ui'}, a || {}), c); };
      for (i = 0; i <= 3; i++) { var yv = 10 * i; if (yv > ymax) break; node(s, 'line', {x1: x0, x2: x1, y1: Y(yv), y2: Y(yv), stroke: '#e3e8ee'}); tx(x0 - 6, Y(yv) + 5, yv + (fr ? ' %' : '%'), {'text-anchor': 'end'}); }
      share.forEach(function (v, j) { node(s, 'rect', {x: X(j * W) + 1, y: Y(v), width: X(W) - X(0) - 2, height: y0 - Y(v), fill: '#086a91', opacity: .75}); });
      node(s, 'path', {d: bins.map(function (_, j) { return (j ? 'L' : 'M') + X((j + .5) * W).toFixed(1) + ' ' + Y(exp(j * W)).toFixed(1); }).join(''), fill: 'none', stroke: '#a8431f', 'stroke-width': 2.6});
      [0, 1, 2, 3, 4, 5].forEach(function (q) { tx(X(q * L), y0 + 18, fmt(q * L, L < 1 ? 1 : 1), {'text-anchor': 'middle'}); });
      tx((x0 + x1) / 2, y0 + 40, tr('distance avant le premier rebond (cm)', 'distance before the first bounce (cm)'), {'text-anchor': 'middle'});
      var dig = se < .01 ? 3 : 2;
      box.querySelector('.bnct-mc-out').innerHTML = tr('<b>Distance moyenne tirée : ' + fmt(mean, dig) + ' cm, à ± ' + fmt(se, dig) + ' cm</b> (erreur-type). Valeur du tableau : ' + fmt(L, L < 1 ? 3 : 2) + ' cm. Cent fois plus de neutrons : une erreur dix fois plus petite.', '<b>Mean drawn distance: ' + fmt(mean, dig) + ' cm, within ± ' + fmt(se, dig) + ' cm</b> (standard error). Table value: ' + fmt(L, L < 1 ? 3 : 2) + ' cm. A hundred times more neutrons: an error ten times smaller.');
      box.querySelectorAll('[data-n]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.n === N)); });
    }
    box.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { N = +b.dataset.n; draw(); }; });
    box.querySelector('[data-redraw]').onclick = function () { seed += 7919; draw(); };
    box.querySelector('select').addEventListener('input', function () { band = +this.value; draw(); });
    draw();
  }
  function init() { document.querySelectorAll('.bnct-lab').forEach(mount); document.querySelectorAll('.bnct-mc').forEach(mountMC); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
