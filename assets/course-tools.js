/* Interactive tools of the open courses (www, 24/10/2026): ROC curve, normal law table, attenuation.
   Plain SVG + JS, no library. The formulas are those of the chapters; window.CT exposes the maths for the test page.
   ROC: binormal model, healthy ~ N(0,1), sick ~ N(d,1); Se = 1 - Φ(s - d), Sp = Φ(s), AUC = Φ(d/√2); VPP/VPN by Bayes.
   Normal: Φ by the Cody-type rational erf (error < 1.2e-7), inverse by Acklam's algorithm refined by one Newton step.
   Attenuation: N/N0 = exp(-μx) = 2^(-x/CDA). */
(function () {
  "use strict";
  var EN = document.documentElement.lang === "en";
  var TEXT_EN = {"Courbe ROC : déplacez le seuil": "ROC curve: move the threshold", "Résultats du test chez les non-malades N(0, 1) et chez les malades N(d, 1). Le seuil classe positif tout résultat au-dessus ; la prévalence change les valeurs prédictives, pas la courbe.": "Test results without disease follow N(0, 1), and with disease N(d, 1). Results above the threshold are positive. Prevalence changes predictive values, not the curve.", "Distributions des résultats et seuil": "Test-result distributions and threshold", "Courbe ROC": "ROC curve", "Séparation d": "Separation d", "Seuil s": "Threshold s", "Prévalence": "Prevalence", "non-malades": "without disease", "malades": "with disease", "</b><br>VPP = <b>": "</b><br>PPV = <b>", "</b> · VPN = <b>": "</b> · NPV = <b>", "</b> pour une prévalence de ": "</b> at a prevalence of ", " · indice de Youden Se + Sp − 1 = ": " · Youden index Se + Sp − 1 = ", "Table de la loi normale, interactive": "Interactive normal distribution table", "Choisissez une valeur et lisez l'aire, ou choisissez une probabilité et lisez la borne. Tout se fait avec z = (x − μ)/σ.": "Choose a value and read its area, or choose a probability and find its threshold. Both use z = (x − μ)/σ.", "Densité de la loi normale et aire": "Normal density and probability area", "Aire cherchée": "Area to calculate", "probabilité": "probability", "Aire": "Area", " pour N(": " for N(", "</b> · aire = <b>": "</b> · area = <b>", "</b> · densité φ(z) = ": "</b> · density φ(z) = ", "Atténuation d'un faisceau : la couche de demi-atténuation": "Beam attenuation: the half-value layer", "N(x) = N₀ e<sup>−μx</sup> = N₀ / 2<sup>x/CDA</sup>. Sur mille photons qui entrent, combien sortent ?": "N(x) = N₀ e<sup>−μx</sup> = N₀ / 2<sup>x/HVL</sup>. Out of a thousand incident photons, how many are transmitted?", "Courbe d'atténuation et épaisseur traversée": "Attenuation curve and material thickness", "CDA (cm)": "HVL (cm)", "Épaisseur x (cm)": "Thickness x (cm)", "μ = ln 2 / CDA = <b>": "μ = ln 2 / HVL = <b>", " CDA · N/N₀ = <b>": " HVL · N/N₀ = <b>", "</b> · sur 1000 photons, <b>": "</b> · out of 1000 photons, <b>", "</b> sortent": "</b> are transmitted", " (10 CDA ≈ 1 sur 1000)": " (10 HVLs ≈ 1 in 1000)"};
  Object.assign(TEXT_EN, {"Aucun écart de température entre l'aliment et son milieu : il n'y a rien à refroidir.": "No temperature gap between the food and its surroundings: there is nothing to cool.", "<b>Ti est inférieure à T∞ : l'aliment se réchauffe</b> au lieu de refroidir ; lisez les temps ci-dessous comme des temps de réchauffement.<br>": "<b>Ti is below T∞: the food warms up</b> instead of cooling; read the times below as warming times.<br>", "Refroidir un aliment : nombre de Biot, température moyenne et température à cœur": "Cooling food: Biot number, mean and core temperatures", "Bi = h·Lc/λ compare la résistance interne (Lc/λ) à la résistance de surface (1/h). Modèle simple, température uniforme : T(t) = T∞ + (Ti − T∞)·e<sup>−t/τ</sup>, τ = ρ·cp·Lc/h, où λ n'intervient pas. Courbe à cœur : conduction transitoire dans une plaque d'épaisseur 2·Lc (premier terme de la série), qui dépend de λ.": "Bi = h·Lc/λ compares internal resistance (Lc/λ) with surface resistance (1/h). Uniform-temperature model: T(t) = T∞ + (Ti − T∞)·e<sup>−t/τ</sup>, τ = ρ·cp·Lc/h; λ does not enter this expression. Core curve: transient conduction through a slab of thickness 2·Lc (first series term), which depends on λ.", "Température moyenne et à cœur de l'aliment au cours du temps": "Mean and core food temperatures over time", "<span class=\"sw2\"></span> température uniforme (modèle simple) &nbsp; <span class=\"sw3\"></span> à cœur (conduction) &nbsp; <span class=\"sw4\"></span> en surface": "<span class=\"sw2\"></span> uniform temperature (simple model) &nbsp; <span class=\"sw3\"></span> core (conduction) &nbsp; <span class=\"sw4\"></span> surface", "</b> · 90 % de l'écart rattrapé : <b>": "</b> · 90% of the temperature gap covered: <b>", " min</b> selon le modèle simple, <b>": " min</b> in the simple model, <b>", " min</b> à cœur.<br>": " min</b> at the core.<br>", "Bi &lt; 0,1 : la température reste presque uniforme ; les deux courbes se confondent et le modèle simple suffit.": "Bi &lt; 0.1: temperature is nearly uniform; the two curves almost coincide and the simple model is adequate.", "<b>Bi ≥ 0,1 : le cœur reste en retard sur la surface</b> ; le modèle simple sous-estime le temps à cœur. Augmentez λ ou diminuez Lc pour voir les courbes se rapprocher.": "<b>Bi ≥ 0.1: the core lags behind the surface</b>; the simple model underestimates the core cooling time. Increase λ or decrease Lc to bring the curves closer.", " (ρ = 1050 kg/m³, cp = 3,6 kJ/kg·K ; la courbe à cœur, premier terme de la série, n'est exacte qu'après le tout début du refroidissement, Fo &gt; 0,2.)": " (ρ = 1050 kg/m³, cp = 3.6 kJ/kg·K; the first-term core approximation is applicable after the initial cooling stage, Fo &gt; 0.2.)", "Congeler : suivez le produit, du frais au congelé": "Freezing: follow the product from fresh to frozen", "Appuyez sur ▶ : le produit cède sa chaleur kilojoule par kilojoule. La courbe donne sa température selon l'énergie déjà extraite par kilo : ": "Press ▶: the product releases heat kilojoule by kilojoule. The curve shows its temperature against energy already removed per kilogram: ", "trois étapes, Δh = cp,frais·(Ti − Tc) + w·g·L + cp,congelé·(Tc − Tf). w : teneur en eau, g : part de l'eau qui gèle (toute l'eau ne gèle pas), L = 333 kJ/kg.": "three stages, Δh = cp,fresh·(Ti − Tc) + w·g·L + cp,frozen·(Tc − Tf). w: water content; g: fraction of water that freezes (not all water freezes); L = 333 kJ/kg.", "Température du produit selon l'énergie extraite, et le produit qui gèle": "Product temperature against energy removed, and the freezing product", "▶ Congeler": "▶ Freeze", "Masse (kg)": "Mass (kg)", "Teneur en eau w": "Water content w", "Part de l'eau gelée g": "Fraction of water frozen g", "Début de congélation Tc (°C)": "Freezing onset Tc (°C)", "Température finale Tf (°C)": "Final temperature Tf (°C)", "Durée Δt (h)": "Duration Δt (h)", "<span class=\"k1\"></span>1. refroidir le produit frais &nbsp; <span class=\"k2\"></span>2. geler l'eau (chaleur latente) &nbsp; <span class=\"k3\"></span>3. refroidir le produit congelé": "<span class=\"k1\"></span>1. cool the fresh product &nbsp; <span class=\"k2\"></span>2. freeze water (latent heat) &nbsp; <span class=\"k3\"></span>3. cool the frozen product", "énergie déjà extraite (kJ par kg de produit)": "energy removed (kJ per kg of product)", "température du produit (°C)": "product temperature (°C)", "1. le produit frais refroidit": "1. fresh product cooling", "2. l'eau gèle : ": "2. water freezing: ", "3. le produit congelé refroidit": "3. frozen product cooling", " kJ/kg</b> : 1. produit frais ": " kJ/kg</b>: 1. fresh product ", "), <b>2. chaleur latente ": "), <b>2. latent heat ", ")</b>, 3. produit congelé ": ")</b>, 3. frozen product ", "Ici, geler l'eau coûte plus que tout le reste": "Here, freezing water requires more energy removal than all other stages combined", "Ici, geler l'eau coûte moins que les deux refroidissements réunis": "Here, freezing water requires less energy removal than the two cooling stages combined", " ; pendant le palier, la température ne bouge pas dans ce modèle.": "; during the plateau, temperature is constant in this model.", "<br>Pour ": "<br>For ", " kg en ": " kg in ", " h, puissance frigorifique moyenne : <b>": " h, average cooling power: <b>", "</b> (cp,frais = 3,6 et cp,congelé = 1,8 kJ/kg·K, valeurs typiques ; modèle à palier franc, pertes de l'installation non comptées).": "</b> (cp,fresh = 3.6 and cp,frozen = 1.8 kJ/kg·K, typical values; idealized plateau model, plant losses excluded).", "▶ Recommencer": "▶ Restart", "Machine frigorifique : combien de travail pour extraire 1 kJ de chaleur au froid ?": "Refrigerator: how much work removes 1 kJ of heat from the cold side?", "Une machine frigorifique pompe la chaleur du côté froid (évaporateur, Tf) vers le côté chaud (condenseur, Tc), en dépensant du travail W. ": "A refrigerator pumps heat from the cold side (evaporator, Tcold) to the hot side (condenser, Thot), using work W. ", "Le COP compare la chaleur extraite au travail : COP = Q<sub>f</sub>/W. La borne de Carnot, COP<sub>C</sub> = Tf/(Tc − Tf) en kelvins, est le meilleur COP possible ; aucune machine réelle ne l'atteint.": "The coefficient of performance compares heat removed with work: COP = Q<sub>cold</sub>/W. The Carnot limit, COP<sub>C</sub> = Tcold/(Thot − Tcold), with temperatures in kelvins, is the highest possible COP; no real machine attains it.", "La courbe montre la source froide de −40 à +10 °C, pour la source chaude choisie. Par défaut : froid −10 °C, chaud +40 °C, soit 263,15 K et 313,15 K : COP maximal = 263,15/50 = 5,26. Cela signifie au plus 5,26 J extraits pour 1 J de travail. Autre couple de sources : froid −40 °C, chaud +20 °C → 233,15/60 = 3,89. Les curseurs de ce graphique gardent la source chaude entre +20 et +60 °C.": "The curve shows the cold side from −40 to +10 °C, for the chosen hot side. Defaults: cold −10 °C, hot +40 °C, or 263.15 K and 313.15 K: maximum COP = 263.15/50 = 5.26. This means at most 5.26 J removed per 1 J of work. Another pair: cold −40 °C, hot +20 °C → 233.15/60 = 3.89. This chart keeps the hot reservoir between +20 and +60 °C.", "COP de Carnot selon la température d'évaporation, et bilan d'énergie": "Carnot COP against cold-side temperature, and energy balance", "Source froide Tf (°C)": "Cold reservoir Tcold (°C)", "Source chaude Tc (°C)": "Hot reservoir Thot (°C)", "température de la source froide Tf": "cold reservoir temperature Tcold", "COP de Carnot": "Carnot COP", "conserver à 0 °C": "store at 0 °C", "surgeler à −30 °C": "deep-freeze at −30 °C", "chaud ": "hot ", "froid ": "cold ", "machine": "machine", "travail W = ": "work W = ", "COP de Carnot = <b>": "Carnot COP = <b>", "</b> : pour extraire 1 kJ au froid, il faut au moins <b>": "</b>: removing 1 kJ from the cold side requires at least <b>", " kJ de travail</b>, et le condenseur rejette ": " kJ of work</b>, and the condenser rejects ", " kJ au chaud. Écart Tc − Tf = ": " kJ on the hot side. Temperature difference Thot − Tcold = ", " K : plus l'écart grandit, plus la flèche verte (travail) s'épaissit. Surgeler coûte donc plus cher que conserver au frais.": " K: as the gap grows, the green arrow (work) gets thicker. Deep-freezing therefore requires more work per unit of heat removed than chilled storage.", "Corrélation et régression : déplacez un point": "Correlation and regression: move one point", "Douze mesures (points bleus) et un point que vous déplacez (orange). r = cov(x, y)/(s<sub>x</sub>·s<sub>y</sub>), droite des moindres carrés y = b<sub>0</sub> + b<sub>1</sub>·x, test de r : t = r·√(n − 2)/√(1 − r²) à n − 2 degrés de liberté.": "Twelve example points (blue) and one movable point (orange). r = cov(x, y)/(s<sub>x</sub>·s<sub>y</sub>), least-squares line y = b<sub>0</sub> + b<sub>1</sub>·x; test of r: t = r·√(n − 2)/√(1 − r²), with n − 2 degrees of freedom.", "Nuage de points et droite de régression": "Scatter plot and regression line", "x du point orange": "Orange point x", "y du point orange": "Orange point y", "<span>Inclure le point orange</span>": "<span>Include the orange point</span>", "</b> · droite y = ": "</b> · line y = ", " ddl) · p = <b>": " df) · p = <b>", "(lien significatif au risque 5 %)": "(statistically significant at the 5% level)", "(pas significatif au risque 5 %)": "(not statistically significant at the 5% level)", "<br>Sans le point orange : r = ": "<br>Without the orange point: r = ", ". Un seul point loin en x tire la droite (bras de levier) : regardez toujours le nuage avant de conclure.": ". One point far away in x can pull the fitted line (leverage): always inspect the scatter plot before drawing conclusions."});
  Object.assign(TEXT_EN, {"Qf = 1 kJ": "Qcold = 1 kJ", "Qc = ": "Qhot = ", " ; ": "; ", " : ": ": ", "σ doit être strictement positif.": "σ must be positive.", "Saisir une probabilité entre 0 et 1, bornes exclues.": "Enter a probability between 0 and 1 (excluded).", "Saisir une valeur pour ": "Enter a value for ", "moins de 1": "fewer than 1", "</b> sort": "</b> is transmitted", "température (°C)": "temperature (°C)"});
  function tr(s) { return EN && Object.prototype.hasOwnProperty.call(TEXT_EN,s) ? TEXT_EN[s] : s; }
  var PC = EN ? "%" : " %", SMALL = !!(window.matchMedia && window.matchMedia("(max-width:560px)").matches);   // phones: larger text in wide charts (www.css)
  function ht(b) { return b.closest("#experience") ? "h2" : "h3"; }   // standalone experiment pages: H1 then H2; inside a chapter: H3
  var CT = window.CT = {};
  function erf(x) {                    // W. J. Cody-type rational approximation via erfc (Numerical Recipes erfcc), |err| < 1.2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
            t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? 1 - r : r - 1;
  }
  var Phi = CT.Phi = function (z) { return 0.5 * (1 + erf(z / Math.SQRT2)); };
  CT.phi = function (z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); };
  CT.invPhi = function (p) {           // Acklam + one Newton step
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239],
        b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
        c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
        d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    return x - (Phi(x) - p) / CT.phi(x);
  };
  CT.roc = function (d, s, prev) {
    var se = 1 - Phi(s - d), sp = Phi(s);
    return { se: se, sp: sp, auc: Phi(d / Math.SQRT2),
             vpp: se * prev / (se * prev + (1 - sp) * (1 - prev)), vpn: sp * (1 - prev) / (sp * (1 - prev) + (1 - se) * prev) };
  };
  CT.atten = function (mu, x) { return Math.exp(-mu * x); };

  var NS = "http://www.w3.org/2000/svg";
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function h(t, a, html) { var e = document.createElement(t); for (var k in a) e.setAttribute(k, a[k]); if (html != null) e.innerHTML = html; return e; }
  function f(v, n) { return v.toFixed(n === undefined ? 2 : n).replace(".", EN ? "." : ","); }
  function pct(v) { return (100 * v).toFixed(1).replace(".", EN ? "." : ",") + PC; }
  function slider(lab, min, max, step, val, fmt) {
    var w = h("label", { "class": "ct-sl" }), s = h("span", {}, lab), i = h("input", { type: "range", min: min, max: max, step: step, value: val }), o = h("output", {});
    w.appendChild(s); w.appendChild(i); w.appendChild(o);
    var upd = function () { o.textContent = fmt(+i.value); }; i.addEventListener("input", upd); upd();
    return { w: w, i: i };
  }
  function path(pts) { return pts.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); }

  /* ROC: two distributions, a threshold, the ROC curve with the current point, Se/Sp/VPP/VPN at a prevalence */
  function roc(box) {
    box.appendChild(h(ht(box), {}, tr("Courbe ROC : déplacez le seuil")));
    box.appendChild(h("p", { "class": "muted" }, tr("Résultats du test chez les non-malades N(0, 1) et chez les malades N(d, 1). Le seuil classe positif tout résultat au-dessus ; la prévalence change les valeurs prédictives, pas la courbe.")));
    var g = h("div", { "class": "ct-grid" }); box.appendChild(g);
    var W = 300, H = 170, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Distributions des résultats et seuil") }, g);
    var R = 170, sr = el("svg", { viewBox: "0 0 " + R + " " + R, "class": "ct-svg ct-sq", role: "img", "aria-label": tr("Courbe ROC") }, g);
    var cD = slider(tr("Séparation d"), 0, 4, 0.05, 1.8, function (v) { return f(v); }),
        cS = slider(tr("Seuil s"), -3, 6, 0.05, 1, function (v) { return f(v); }),
        cP = slider(tr("Prévalence"), 0.001, 0.5, 0.001, 0.1, function (v) { return pct(v); });
    var ctl = h("div", { "class": "ct-ctl" }); [cD, cS, cP].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var X = function (z) { return 10 + (W - 20) * (z + 3.5) / 10; }, Y = function (v) { return H - 18 - (H - 30) * v / 0.42; };
    el("line", { x1: 10, y1: H - 18, x2: W - 10, y2: H - 18, "class": "ct-ax" }, sv);
    var aH = el("path", { "class": "ct-a1" }, sv), aS = el("path", { "class": "ct-a2" }, sv), lH = el("path", { "class": "ct-l1" }, sv), lS = el("path", { "class": "ct-l2" }, sv);
    var th = el("line", { "class": "ct-th", y1: 6, y2: H - 18 }, sv);
    el("text", { x: 14, y: 14, "class": "ct-tx1" }, sv).textContent = tr("non-malades");
    var tS = el("text", { y: 14, "class": "ct-tx2" }, sv); tS.textContent = tr("malades");
    var P = function (v) { return 14 + (R - 24) * v; }, Q = function (v) { return R - 14 - (R - 24) * v; };
    el("rect", { x: P(0), y: Q(1), width: P(1) - P(0), height: Q(0) - Q(1), "class": "ct-frame" }, sr);
    el("line", { x1: P(0), y1: Q(0), x2: P(1), y2: Q(1), "class": "ct-diag" }, sr);
    var aR = el("path", { "class": "ct-a2" }, sr), cR = el("path", { "class": "ct-l2" }, sr), pt = el("circle", { r: 4.5, "class": "ct-pt" }, sr);
    el("text", { x: P(0.5), y: R - 2, "class": "ct-axl", "text-anchor": "middle" }, sr).textContent = "1 − Sp";
    el("text", { x: 4, y: Q(0.5), "class": "ct-axl", transform: "rotate(-90 9 " + Q(0.5) + ")", "text-anchor": "middle" }, sr).textContent = "Se";
    function draw() {
      var d = +cD.i.value, s = +cS.i.value, p = +cP.i.value, z, k, A = [], B = [], C = [], D = [];
      for (k = 0; k <= 120; k++) { z = -3.5 + 10 * k / 120; A.push([X(z), Y(CT.phi(z))]); B.push([X(z), Y(CT.phi(z - d))]); }
      lH.setAttribute("d", path(A)); lS.setAttribute("d", path(B));
      for (k = 0; k <= 60; k++) { z = s + (6.5 - s) * k / 60; C.push([X(z), Y(CT.phi(z))]); D.push([X(z), Y(CT.phi(z - d))]); }
      aH.setAttribute("d", path([[X(s), Y(0)]].concat(C, [[X(6.5), Y(0)]])) + "Z");
      aS.setAttribute("d", path([[X(s), Y(0)]].concat(D, [[X(6.5), Y(0)]])) + "Z");
      th.setAttribute("x1", X(s)); th.setAttribute("x2", X(s)); tS.setAttribute("x", Math.min(W - 60, X(d) - 20));
      var E = [[P(0), Q(0)]];
      for (k = 0; k <= 80; k++) { z = 6.5 - 10 * k / 80; E.push([P(1 - Phi(z)), Q(1 - Phi(z - d))]); }
      cR.setAttribute("d", path(E)); aR.setAttribute("d", path(E.concat([[P(1), Q(0)]])) + "Z");
      var r = CT.roc(d, s, p); pt.setAttribute("cx", P(1 - r.sp)); pt.setAttribute("cy", Q(r.se));
      out.innerHTML = "Se = <b>" + pct(r.se) + "</b> · Sp = <b>" + pct(r.sp) + "</b> · AUC = <b>" + f(r.auc, 3) + tr("</b><br>VPP = <b>") + pct(r.vpp) +
        tr("</b> · VPN = <b>") + pct(r.vpn) + tr("</b> pour une prévalence de ") + pct(p) + tr(" · indice de Youden Se + Sp − 1 = ") + f(r.se + r.sp - 1, 3);
    }
    [cD, cS, cP].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }

  /* Normal law: from z to P(Z < z) and back, with the shaded area; or from x, μ, σ */
  function normal(box) {
    box.appendChild(h(ht(box), {}, tr("Table de la loi normale, interactive")));
    box.appendChild(h("p", { "class": "muted" }, tr("Choisissez une valeur et lisez l'aire, ou choisissez une probabilité et lisez la borne. Tout se fait avec z = (x − μ)/σ.")));
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + (H + 12), "class": "ct-svg", role: "img", "aria-label": tr("Densité de la loi normale et aire") }, box);
    var X = function (z) { return 10 + (W - 20) * (z + 4) / 8; }, Y = function (v) { return H - 20 - (H - 30) * v / 0.4; };
    var ar = el("path", { "class": "ct-a2" }, sv), ln = el("path", { "class": "ct-l2" }, sv);
    el("line", { x1: 10, y1: H - 20, x2: W - 10, y2: H - 20, "class": "ct-ax" }, sv);
    var xl = [];
    for (var t = -3; t <= 3; t++) { el("text", { x: X(t), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = t;
      xl.push(el("text", { x: X(t), y: H + 6, "class": "ct-axl ct-xl", "text-anchor": "middle" }, sv)); }
    el("text", { x: 6, y: H - 8, "class": "ct-axl" }, sv).textContent = "z"; el("text", { x: 6, y: H + 6, "class": "ct-axl ct-xl" }, sv).textContent = "x";
    var A = []; for (var k = 0; k <= 120; k++) { var z0 = -4 + 8 * k / 120; A.push([X(z0), Y(CT.phi(z0))]); } ln.setAttribute("d", path(A));
    var row = h("div", { "class": "ct-ctl ct-num" });
    var mode = h("select", { "aria-label": tr("Aire cherchée") }, '<option value="lt">P(Z &lt; z)</option><option value="gt">P(Z &gt; z)</option><option value="two">P(−|z| &lt; Z &lt; |z|)</option>');
    var iz = h("input", { type: "number", step: "0.01", value: "1.96", "aria-label": "z" }), ip = h("input", { type: "number", step: "0.0001", min: "0.0001", max: "0.9999", value: "0.975", "aria-label": tr("probabilité") });
    var im = h("input", { type: "number", step: "any", value: "0", "aria-label": "μ" }), is = h("input", { type: "number", step: "any", min: "0", value: "1", "aria-label": "σ" }), ix = h("input", { type: "number", step: "any", value: "1.96", "aria-label": "x" });
    [[tr("Aire"), mode], ["z", iz], [tr("probabilité"), ip], ["x", ix], ["μ", im], ["σ", is]].forEach(function (p) { var l = h("label", {}, "<span>" + p[0] + "</span>"); l.appendChild(p[1]); row.appendChild(l); });
    box.appendChild(row);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    function area(z) {
      var m = mode.value, pts = [], a, b, lo, hi;
      if (m === "lt") { a = -4; b = Math.max(-4, Math.min(4, z)); }
      else if (m === "gt") { a = Math.max(-4, Math.min(4, z)); b = 4; }
      else { a = -Math.min(4, Math.abs(z)); b = -a; }
      for (var k = 0; k <= 60; k++) { var u = a + (b - a) * k / 60; pts.push([X(u), Y(CT.phi(u))]); }
      ar.setAttribute("d", path([[X(a), Y(0)]].concat(pts, [[X(b), Y(0)]])) + "Z");
    }
    function P(z) { var m = mode.value; return m === "lt" ? Phi(z) : m === "gt" ? 1 - Phi(z) : 2 * Phi(Math.abs(z)) - 1; }
    function area0(v) { return Math.abs(v) < 5e-5 ? 0 : v; }   // no "-0.0000" from the rational erf
    // Invalid input: compute nothing and say why. Valid inputs follow the same formulas as before.
    function invalid(main, name) {
      var bl = function (i) { return i.value.trim() === "" || !Number.isFinite(+i.value); }, m = "";
      if (main === ip) { if (!(+ip.value > 0 && +ip.value < 1)) m = tr("Saisir une probabilité entre 0 et 1, bornes exclues."); }
      else if (bl(main)) m = tr("Saisir une valeur pour ") + name + ".";
      if (!m && bl(im)) m = tr("Saisir une valeur pour ") + "μ.";
      if (!m && !(+is.value > 0 && Number.isFinite(+is.value))) m = tr("σ doit être strictement positif.");
      if (m) { ar.setAttribute("d", ""); out.textContent = m; }
      return !!m;
    }
    function fromZ() { if (invalid(iz, "z")) return; var z = +iz.value, s = +is.value || 1; ip.value = area0(P(z)).toFixed(4); ix.value = (+im.value + z * s).toPrecision(6) * 1; show(z); }
    function fromP() {
      if (invalid(ip)) return;
      var p = Math.min(0.99999, Math.max(0.00001, +ip.value)), m = mode.value, z = m === "lt" ? CT.invPhi(p) : m === "gt" ? CT.invPhi(1 - p) : CT.invPhi((1 + p) / 2);
      iz.value = z.toFixed(4); ix.value = (+im.value + z * (+is.value || 1)).toPrecision(6) * 1; show(z);
    }
    function fromX() { if (invalid(ix, "x")) return; var z = (+ix.value - +im.value) / (+is.value || 1); iz.value = z.toFixed(4); ip.value = area0(P(z)).toFixed(4); show(z); }
    function show(z) {
      area(z); var mu = +im.value, sg = +is.value || 1;
      for (var k = 0; k < xl.length; k++) xl[k].textContent = +(mu + (k - 3) * sg).toPrecision(4);
      out.innerHTML = "x = " + f(+ix.value, 3) + tr(" pour N(") + f(mu, 3) + tr(" ; ") + f(sg, 3) + ") → z = (x − μ)/σ = <b>" + f(z, 4) + tr("</b> · aire = <b>") + f(area0(P(z)), 4) + tr("</b> · densité φ(z) = ") + f(CT.phi(z), 4);
    }
    iz.addEventListener("input", fromZ); ip.addEventListener("input", fromP); ix.addEventListener("input", fromX);
    // μ and σ describe the population: the measured value x stays, z and the area follow
    im.addEventListener("input", fromX); is.addEventListener("input", fromX); mode.addEventListener("change", fromZ); fromZ();
  }

  /* Attenuation: a beam crossing a slab, N/N0, the CDA, 1000 photons */
  function atten(box) {
    box.appendChild(h(ht(box), {}, tr("Atténuation d'un faisceau : la couche de demi-atténuation")));
    box.appendChild(h("p", { "class": "muted" }, tr("N(x) = N₀ e<sup>−μx</sup> = N₀ / 2<sup>x/CDA</sup>. Sur mille photons qui entrent, combien sortent ?")));
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Courbe d'atténuation et épaisseur traversée") }, box);
    var cC = slider(tr("CDA (cm)"), 0.1, 10, 0.1, 2, function (v) { return f(v, 1) + " cm"; }),
        cX = slider(tr("Épaisseur x (cm)"), 0, 30, 0.1, 6, function (v) { return f(v, 1) + " cm"; });
    var ctl = h("div", { "class": "ct-ctl" }); ctl.appendChild(cC.w); ctl.appendChild(cX.w); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var X = function (x) { return 34 + (W - 44) * x / 30; }, Y = function (v) { return 10 + (H - 34) * (1 - v); };
    el("line", { x1: 34, y1: Y(0), x2: W - 10, y2: Y(0), "class": "ct-ax" }, sv); el("line", { x1: 34, y1: Y(0), x2: 34, y2: Y(1), "class": "ct-ax" }, sv);
    [0, 0.5, 1].forEach(function (v) { el("text", { x: 28, y: Y(v) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = f(v, 1); });
    [0, 10, 20, 30].forEach(function (v) { el("text", { x: X(v), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = v + " cm"; });
    var slab = el("rect", { y: Y(1), height: Y(0) - Y(1), x: X(0), "class": "ct-slab" }, sv), cur = el("path", { "class": "ct-l2" }, sv), pt = el("circle", { r: 4.5, "class": "ct-pt" }, sv);
    var ticks = el("g", {}, sv);
    var dots = h("div", { "class": "ct-dots", "aria-hidden": "true" }); box.appendChild(dots);
    for (var k = 0; k < 1000; k++) dots.appendChild(h("i", {}));
    function draw() {
      var c = +cC.i.value, x = +cX.i.value, mu = Math.LN2 / c, A = [], k;
      for (k = 0; k <= 120; k++) { var u = 30 * k / 120; A.push([X(u), Y(CT.atten(mu, u))]); }
      cur.setAttribute("d", path(A)); slab.setAttribute("width", X(x) - X(0));
      var r = CT.atten(mu, x); pt.setAttribute("cx", X(x)); pt.setAttribute("cy", Y(r));
      while (ticks.firstChild) ticks.removeChild(ticks.firstChild);
      for (k = 1; k * c <= 30 && k <= 12; k++) el("line", { x1: X(k * c), x2: X(k * c), y1: Y(0), y2: Y(0) + 5, "class": "ct-ax" }, ticks);
      var n = Math.round(1000 * r), ds = dots.children;
      for (k = 0; k < 1000; k++) ds[k].className = k < n ? "on" : "";
      var sci = function (v) { var p = v.toExponential(2).split("e"), sup = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
        return p[0].replace(".", EN ? "." : ",") + " × 10" + p[1].replace("+", "").split("").map(function (d) { return sup[d]; }).join(""); };
      out.innerHTML = tr("μ = ln 2 / CDA = <b>") + f(mu, 3) + " cm⁻¹</b> · x = " + f(x / c, 2) + tr(" CDA · N/N₀ = <b>") + (r < 0.001 ? sci(r) : f(r, 4)) +
        tr("</b> · sur 1000 photons, <b>") + (n === 0 ? tr("moins de 1") + tr("</b> sort") : n + tr("</b> sortent")) + (x / c >= 9.95 ? tr(" (10 CDA ≈ 1 sur 1000)") : "");
    }
    [cC, cX].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }


  /* ---- Thermal tools (24/10/2026), for the courses "Bases thermiques des aliments" and "Physique industrielle".
     Formulas of the course: Bi = h Lc / λ ; uniform temperature (Bi < 0.1): T(t) = T∞ + (Ti − T∞) e^(−t/τ), τ = ρ cp Lc / h ;
     freezing: Δh = cp,frais (Ti − Tc) + w·g·L + cp,congelé (Tc − Tf), P = m Δh / Δt ; Carnot bound of a refrigerator: COP = Tf/(Tc − Tf). */
  CT.lumped = function (h, lam, Lc, rho, cp, Ti, Tinf, t) {
    var tau = rho * cp * Lc / h;
    return { bi: h * Lc / lam, tau: tau, T: Tinf + (Ti - Tinf) * Math.exp(-t / tau) };
  };
  CT.freeze = function (m, w, g, Ti, Tc, Tf, cpf, cpc, L, dt) {   // kJ/kg/K, kJ/kg, h
    var a = cpf * (Ti - Tc), b = w * g * L, c = cpc * (Tc - Tf), dh = a + b + c;
    return { a: a, b: b, c: c, dh: dh, P: m * dh / (dt * 3600) };   // kW
  };
  CT.copCarnot = function (tf, tc) { var Tf = tf + 273.15, Tc = tc + 273.15; return Tf / (Tc - Tf); };

  /* core temperature of a slab of half-thickness L (= V/A), first term of the series:
     θ/θi = C1·exp(−ζ1²·Fo)·cos(ζ1·x/L), ζ1·tan ζ1 = Bi, C1 = 4 sin ζ1/(2ζ1 + sin 2ζ1), Fo = α t/L², α = λ/(ρ cp). Valid for Fo > 0.2. */
  CT.slab = function (bi) {
    var a = 1e-9, b = Math.PI / 2 - 1e-9;
    for (var k = 0; k < 80; k++) { var m = (a + b) / 2; if (m * Math.tan(m) < bi) a = m; else b = m; }
    var z = (a + b) / 2;
    return { z: z, C: 4 * Math.sin(z) / (2 * z + Math.sin(2 * z)) };
  };
  CT.core = function (h, lam, L, rho, cp, Ti, Tinf, t) {
    var s = CT.slab(h * L / lam), fo = lam / (rho * cp) * t / (L * L), th = Math.min(1, s.C * Math.exp(-s.z * s.z * fo));
    return { T: Tinf + (Ti - Tinf) * th, Ts: Tinf + (Ti - Tinf) * th * Math.cos(s.z), fo: fo };
  };

  function biot(box) {
    box.appendChild(h(ht(box), {}, tr("Refroidir un aliment : nombre de Biot, température moyenne et température à cœur")));
    box.appendChild(h("p", { "class": "muted" }, tr("Bi = h·Lc/λ compare la résistance interne (Lc/λ) à la résistance de surface (1/h). Modèle simple, température uniforme : T(t) = T∞ + (Ti − T∞)·e<sup>−t/τ</sup>, τ = ρ·cp·Lc/h, où λ n'intervient pas. Courbe à cœur : conduction transitoire dans une plaque d'épaisseur 2·Lc (premier terme de la série), qui dépend de λ.")));
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Température moyenne et à cœur de l'aliment au cours du temps") }, box);
    var cH = slider("h (W/m²·K)", 5, 300, 1, 25, function (v) { return f(v, 0); }),
        cL = slider("Lc = V/A (cm)", 0.2, 10, 0.1, 2, function (v) { return f(v, 1) + " cm"; }),
        cK = slider("λ (W/m·K)", 0.1, 2, 0.05, 0.5, function (v) { return f(v, 2); }),
        cTi = slider("Ti (°C)", 0, 90, 1, 60, function (v) { return f(v, 0) + " °C"; }),
        cTe = slider("T∞ (°C)", -30, 20, 1, 2, function (v) { return f(v, 0) + " °C"; });
    var ctl = h("div", { "class": "ct-ctl" }); [cH, cL, cK, cTi, cTe].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var leg = h("p", { "class": "muted ct-leg" }, tr('<span class="sw2"></span> température uniforme (modèle simple) &nbsp; <span class="sw3"></span> à cœur (conduction) &nbsp; <span class="sw4"></span> en surface'));
    box.appendChild(leg);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var rho = 1050, cp = 3600;
    var cur = el("path", { "class": "ct-l2" }, sv), core = el("path", { "class": "ct-l3" }, sv), surf = el("path", { "class": "ct-l4" }, sv), ax = el("g", {}, sv);
    function t90core(hh, lam, L, Ti, Te) {          // first time the core has covered 90 % of the gap
      var s = CT.slab(hh * L / lam), a = lam / (rho * cp);
      return Math.max(0, Math.log(s.C / 0.1) / (s.z * s.z)) * L * L / a;
    }
    function draw() {
      var hh = +cH.i.value, Lc = +cL.i.value / 100, lam = +cK.i.value, Ti = +cTi.i.value, Te = +cTe.i.value;
      var r0 = CT.lumped(hh, lam, Lc, rho, cp, Ti, Te, 0), t90 = r0.tau * Math.log(10), tc90 = t90core(hh, lam, Lc, Ti, Te);
      var tmax = 1.6 * Math.max(t90, tc90), lo = Math.min(Ti, Te), hi = Math.max(Ti, Te);
      var X = function (t) { return 36 + (W - 46) * t / tmax; }, Y = function (T) { return 10 + (H - 34) * (hi - T) / ((hi - lo) || 1); };
      var A = [], B = [], C = [];
      for (var k = 0; k <= 120; k++) {
        var t = tmax * k / 120, c = CT.core(hh, lam, Lc, rho, cp, Ti, Te, t);
        A.push([X(t), Y(CT.lumped(hh, lam, Lc, rho, cp, Ti, Te, t).T)]); B.push([X(t), Y(c.T)]); C.push([X(t), Y(c.Ts)]);
      }
      cur.setAttribute("d", path(A)); core.setAttribute("d", path(B)); surf.setAttribute("d", path(C));
      while (ax.firstChild) ax.removeChild(ax.firstChild);
      el("line", { x1: 36, y1: Y(lo), x2: W - 10, y2: Y(lo), "class": "ct-ax" }, ax);
      [hi, lo].forEach(function (T) { el("text", { x: 32, y: Y(T) + 4, "class": "ct-axl", "text-anchor": "end" }, ax).textContent = f(T, 0) + "°"; });
      el("text", { x: W - 10, y: H - 6, "class": "ct-axl", "text-anchor": "end" }, ax).textContent = f(tmax / 3600, 1) + " h";
      var ok = r0.bi < 0.1;
      out.innerHTML = "Bi = <b>" + f(r0.bi, 3) + tr("</b> · 90 % de l'écart rattrapé : <b>") + f(t90 / 60, 0) + tr(" min</b> selon le modèle simple, <b>") + f(tc90 / 60, 0) +
        tr(" min</b> à cœur.<br>") + (ok ? tr("Bi &lt; 0,1 : la température reste presque uniforme ; les deux courbes se confondent et le modèle simple suffit.")
        : tr("<b>Bi ≥ 0,1 : le cœur reste en retard sur la surface</b> ; le modèle simple sous-estime le temps à cœur. Augmentez λ ou diminuez Lc pour voir les courbes se rapprocher.")) +
        tr(" (ρ = 1050 kg/m³, cp = 3,6 kJ/kg·K ; la courbe à cœur, premier terme de la série, n'est exacte qu'après le tout début du refroidissement, Fo &gt; 0,2.)");
      if (Ti === Te) out.innerHTML = tr("Aucun écart de température entre l'aliment et son milieu : il n'y a rien à refroidir.");
      else if (Ti < Te) out.innerHTML = tr("<b>Ti est inférieure à T∞ : l'aliment se réchauffe</b> au lieu de refroidir ; lisez les temps ci-dessous comme des temps de réchauffement.<br>") + out.innerHTML;
      box.classList.toggle("ct-warn", !ok);
    }
    [cH, cL, cK, cTi, cTe].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }

  function congel(box) {
    box.appendChild(h(ht(box), {}, tr("Congeler : suivez le produit, du frais au congelé")));
    box.appendChild(h("p", { "class": "muted" }, tr("Appuyez sur ▶ : le produit cède sa chaleur kilojoule par kilojoule. La courbe donne sa température selon l'énergie déjà extraite par kilo : ") +
      tr("trois étapes, Δh = cp,frais·(Ti − Tc) + w·g·L + cp,congelé·(Tc − Tf). w : teneur en eau, g : part de l'eau qui gèle (toute l'eau ne gèle pas), L = 333 kJ/kg.")));
    var W = 640, H = 250, L0 = 60, R0 = 150, T0 = 16, B0 = 46;
    var sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg ct-wide", role: "img", "aria-label": tr("Température du produit selon l'énergie extraite, et le produit qui gèle") }, box);
    var play = h("button", { type: "button", "class": "ct-btn" }, tr("▶ Congeler"));
    var cM = slider(tr("Masse (kg)"), 10, 2000, 10, 500, function (v) { return f(v, 0) + " kg"; }),
        cW = slider(tr("Teneur en eau w"), 0.5, 0.95, 0.01, 0.75, function (v) { return f(v * 100, 0) + PC; }),
        cG = slider(tr("Part de l'eau gelée g"), 0.6, 1, 0.01, 0.9, function (v) { return f(v * 100, 0) + PC; }),
        cTi = slider("Ti (°C)", 0, 40, 1, 15, function (v) { return f(v, 0) + " °C"; }),
        cTc = slider(tr("Début de congélation Tc (°C)"), -5, 0, 0.1, -1.5, function (v) { return f(v, 1) + " °C"; }),
        cTf = slider(tr("Température finale Tf (°C)"), -40, -5, 1, -18, function (v) { return f(v, 0) + " °C"; }),
        cDt = slider(tr("Durée Δt (h)"), 0.5, 24, 0.5, 4, function (v) { return f(v, 1) + " h"; });
    var ctl = h("div", { "class": "ct-ctl" }); ctl.appendChild(play); [cM, cW, cG, cTi, cTc, cTf, cDt].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var bar = h("div", { "class": "ct-stack", "aria-hidden": "true" }); box.appendChild(bar);
    var leg = h("p", { "class": "muted ct-leg3" }, tr('<span class="k1"></span>1. refroidir le produit frais &nbsp; <span class="k2"></span>2. geler l\'eau (chaleur latente) &nbsp; <span class="k3"></span>3. refroidir le produit congelé'));
    box.appendChild(leg);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var u = 1, timer = null, r, Ti, Tc, Tf, g;
    function T(e) {                       // temperature after extracting e kJ/kg (the three straight pieces of the model)
      if (e <= r.a) return Ti - e / 3.6;
      if (e <= r.a + r.b) return Tc;
      return Tc - (e - r.a - r.b) / 1.8;
    }
    function draw() {
      Ti = +cTi.i.value; Tc = +cTc.i.value; Tf = +cTf.i.value; g = +cG.i.value;
      r = CT.freeze(+cM.i.value, +cW.i.value, g, Ti, Tc, Tf, 3.6, 1.8, 333, +cDt.i.value);
      var hi = Math.max(Ti, 1), lo = Tf, X = function (e) { return L0 + (W - L0 - R0) * e / r.dh; }, Y = function (t) { return T0 + (H - T0 - B0) * (hi - t) / (hi - lo); };
      while (sv.firstChild) sv.removeChild(sv.firstChild);
      [[0, r.a, "#8a96a3"], [r.a, r.a + r.b, "#07569a"], [r.a + r.b, r.dh, "#ad5200"]].forEach(function (s) {     // shaded steps
        el("rect", { x: X(s[0]), y: T0, width: Math.max(0, X(s[1]) - X(s[0])), height: H - T0 - B0, fill: s[2], opacity: 0.07 }, sv); });
      el("line", { x1: L0, x2: W - R0, y1: Y(0), y2: Y(0), stroke: "#9fb0c0", "stroke-dasharray": "3 3" }, sv);
      el("text", { x: W - R0 + 4, y: Y(0) + 4, "class": "ct-axl" }, sv).textContent = "0 °C";
      [hi, Tc, lo].forEach(function (t) { el("text", { x: L0 - 6, y: Y(t) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = f(t, t === Tc ? 1 : 0) + "°"; });
      [0, r.a, r.a + r.b, r.dh].forEach(function (e, k) { el("text", { x: X(e), y: H - B0 + 16, "class": "ct-axl", "text-anchor": k === 3 ? "end" : "middle" }, sv).textContent = f(e, 0); });
      el("text", { x: (L0 + W - R0) / 2, y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = tr("énergie déjà extraite (kJ par kg de produit)");
      el("text", { x: 14, y: (T0 + H - B0) / 2, "class": "ct-axl", "text-anchor": "middle", transform: "rotate(-90 14 " + ((T0 + H - B0) / 2) + ")" }, sv).textContent = SMALL ? tr("température (°C)") : tr("température du produit (°C)");
      var e1 = u * r.dh, pts = [];
      for (var k = 0; k <= 200; k++) { var e = r.dh * k / 200; pts.push([X(e), Y(T(e))]); }
      el("path", { d: path(pts), fill: "none", stroke: "#9fb0c0", "stroke-width": 2 }, sv);
      var done = pts.filter(function (p) { return p[0] <= X(e1) + 0.01; });
      el("path", { d: path(done), fill: "none", stroke: "#07569a", "stroke-width": 3.2 }, sv);
      el("circle", { cx: X(e1), cy: Y(T(e1)), r: 6, fill: "#07569a" }, sv);
      // the product: a crate whose colour goes from warm to frozen, ice crystals growing during step 2
      var fz = e1 <= r.a ? 0 : e1 >= r.a + r.b ? 1 : (e1 - r.a) / r.b, cx0 = W - R0 + 30, cy0 = 70, s = 90;
      var warm = Math.max(0, Math.min(1, (T(e1) - Tc) / Math.max(1, Ti - Tc)));
      var col = fz >= 1 ? "#cfe3f5" : "rgb(" + Math.round(240 - 40 * fz) + "," + Math.round(180 + 40 * fz - 60 * warm) + "," + Math.round(150 + 90 * fz - 60 * warm) + ")";
      el("rect", { x: cx0, y: cy0, width: s, height: s, rx: 10, fill: col, stroke: "#172536", "stroke-width": 1.5 }, sv);
      var n = Math.round(24 * fz * g);
      for (var i = 0; i < n; i++) {
        var px = cx0 + 12 + (i * 37) % (s - 24), py = cy0 + 12 + (i * 53) % (s - 24), d = 5;
        el("path", { d: "M" + (px - d) + " " + py + "L" + (px + d) + " " + py + "M" + px + " " + (py - d) + "L" + px + " " + (py + d) + "M" + (px - 3.5) + " " + (py - 3.5) + "L" + (px + 3.5) + " " + (py + 3.5) + "M" + (px - 3.5) + " " + (py + 3.5) + "L" + (px + 3.5) + " " + (py - 3.5),
          stroke: "#07569a", "stroke-width": 1.2 }, sv);
      }
      el("text", { x: cx0 + s / 2, y: cy0 - 10, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = f(T(e1), 1) + " °C";
      var step = e1 < r.a ? tr("1. le produit frais refroidit") : e1 < r.a + r.b ? tr("2. l'eau gèle : ") + f(100 * fz, 0) + PC : tr("3. le produit congelé refroidit");
      if (SMALL) step = e1 < r.a ? "1." : e1 < r.a + r.b ? "2. " + f(100 * fz, 0) + PC : "3.";   // the coloured legend under the chart names the steps
      el("text", { x: cx0 + s / 2, y: cy0 + s + 20, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = step;
      var p = function (x) { return (100 * x / r.dh).toFixed(1) + "%"; }, q = function (x) { return (100 * x / r.dh).toFixed(0) + PC; };
      bar.innerHTML = '<i class="s1" style="width:' + p(r.a) + '"></i><i class="s2" style="width:' + p(r.b) + '"></i><i class="s3" style="width:' + p(r.c) + '"></i>';
      out.innerHTML = "Δh = <b>" + f(r.dh, 0) + tr(" kJ/kg</b> : 1. produit frais ") + f(r.a, 0) + " (" + q(r.a) + tr("), <b>2. chaleur latente ") + f(r.b, 0) +
        " (" + q(r.b) + tr(")</b>, 3. produit congelé ") + f(r.c, 0) + " (" + q(r.c) + "). " + (r.b > r.a + r.c ? tr("Ici, geler l'eau coûte plus que tout le reste") : tr("Ici, geler l'eau coûte moins que les deux refroidissements réunis")) + tr(" ; pendant le palier, la température ne bouge pas dans ce modèle.") +
        tr("<br>Pour ") + f(+cM.i.value, 0) + tr(" kg en ") + f(+cDt.i.value, 1) + tr(" h, puissance frigorifique moyenne : <b>") + (r.P < 1 ? (r.P * 1000).toFixed(0) + " W" : f(r.P, 1) + " kW") +
        tr("</b> (cp,frais = 3,6 et cp,congelé = 1,8 kJ/kg·K, valeurs typiques ; modèle à palier franc, pertes de l'installation non comptées).");
    }
    play.addEventListener("click", function () {
      if (timer) { clearInterval(timer); timer = null; play.textContent = tr("▶ Congeler"); return; }
      u = 0; play.textContent = "❚❚ Pause";
      timer = setInterval(function () { u = Math.min(1, u + 0.006); draw(); if (u >= 1) { clearInterval(timer); timer = null; play.textContent = tr("▶ Recommencer"); } }, 30);
    });
    [cM, cW, cG, cTi, cTc, cTf, cDt].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }

  function cop(box) {
    box.appendChild(h(ht(box), {}, tr("Machine frigorifique : combien de travail pour extraire 1 kJ de chaleur au froid ?")));
    box.appendChild(h("p", { "class": "muted" }, tr("Une machine frigorifique pompe la chaleur du côté froid (évaporateur, Tf) vers le côté chaud (condenseur, Tc), en dépensant du travail W. ") +
      tr("Le COP compare la chaleur extraite au travail : COP = Q<sub>f</sub>/W. La borne de Carnot, COP<sub>C</sub> = Tf/(Tc − Tf) en kelvins, est le meilleur COP possible ; aucune machine réelle ne l'atteint.")));
    box.appendChild(h("p", {}, tr("La courbe montre la source froide de −40 à +10 °C, pour la source chaude choisie. Par défaut : froid −10 °C, chaud +40 °C, soit 263,15 K et 313,15 K : COP maximal = 263,15/50 = 5,26. Cela signifie au plus 5,26 J extraits pour 1 J de travail. Autre couple de sources : froid −40 °C, chaud +20 °C → 233,15/60 = 3,89. Les curseurs de ce graphique gardent la source chaude entre +20 et +60 °C.")));
    var W = 640, H = 230, L0 = 60, R0 = 240, T0 = 14, B0 = 46;
    var sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg ct-wide", role: "img", "aria-label": tr("COP de Carnot selon la température d'évaporation, et bilan d'énergie") }, box);
    var cF = slider(tr("Source froide Tf (°C)"), -40, 10, 1, -10, function (v) { return f(v, 0) + " °C"; }),
        cC = slider(tr("Source chaude Tc (°C)"), 20, 60, 1, 40, function (v) { return f(v, 0) + " °C"; });
    var ctl = h("div", { "class": "ct-ctl" }); ctl.appendChild(cF.w); ctl.appendChild(cC.w); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var plotMax = 15;
    var X = function (t) { return L0 + (W - L0 - R0) * (t + 40) / 50; }, Y = function (c) { return T0 + (H - T0 - B0) * (1 - c / plotMax); };
    function draw() {
      var tf = +cF.i.value, tc = +cC.i.value, A = [];
      plotMax = 15 * Math.ceil(CT.copCarnot(10, tc) / 15);
      while (sv.firstChild) sv.removeChild(sv.firstChild);
      [0, plotMax / 3, 2 * plotMax / 3, plotMax].forEach(function (c) { el("line", { x1: L0, x2: W - R0, y1: Y(c), y2: Y(c), stroke: "#e3e8ee" }, sv);
        el("text", { x: L0 - 6, y: Y(c) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = c; });
      [-40, -30, -20, -10, 0, 10].forEach(function (t) { el("text", { x: X(t), y: H - B0 + 16, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = t + (SMALL ? "°" : " °C"); });
      el("text", { x: (L0 + W - R0) / 2, y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = tr("température de la source froide Tf");
      el("text", { x: 14, y: (T0 + H - B0) / 2, "class": "ct-axl", "text-anchor": "middle", transform: "rotate(-90 14 " + ((T0 + H - B0) / 2) + ")" }, sv).textContent = tr("COP de Carnot");
      for (var k = 0; k <= 100; k++) { var t = -40 + 50 * k / 100; A.push([X(t), Y(CT.copCarnot(t, tc))]); }
      el("path", { d: path(A), fill: "none", stroke: "#07569a", "stroke-width": 2.6 }, sv);
      [[0, tr("conserver à 0 °C")], [-30, tr("surgeler à −30 °C")]].forEach(function (m) {
        var c0 = CT.copCarnot(m[0], tc); el("circle", { cx: X(m[0]), cy: Y(c0), r: 3.5, fill: "#8a96a3" }, sv);
        el("text", { x: X(m[0]) + (m[0] ? -6 : 6), y: Y(c0) + (m[0] ? 16 : -8), "class": "ct-axl", "text-anchor": m[0] ? "start" : "end" }, sv).textContent = m[1] + tr(" : ") + f(c0, 1); });
      var c = CT.copCarnot(tf, tc); el("circle", { cx: X(tf), cy: Y(c), r: 6, fill: "#ad5200" }, sv);
      // energy balance for 1 kJ extracted: arrows whose widths are the energies
      var bx = W - R0 + 80, w1 = 1 / c, sc = 22, wq = 1 * sc, ww = Math.min(4, w1) * sc, wc = Math.min(5, 1 + w1) * sc;
      el("rect", { x: bx, y: 8, width: 150, height: 30, rx: 6, fill: "#f6dccb" }, sv);
      el("text", { x: bx + 75, y: 28, "text-anchor": "middle", "class": "ct-axl" }, sv).textContent = tr("chaud ") + tc + " °C";
      el("rect", { x: bx, y: 150, width: 150, height: 30, rx: 6, fill: "#d6e6f5" }, sv);
      el("text", { x: bx + 75, y: 170, "text-anchor": "middle", "class": "ct-axl" }, sv).textContent = tr("froid ") + tf + " °C";
      el("rect", { x: bx + 45, y: 78, width: 60, height: 34, rx: 6, fill: "#eef1f4", stroke: "#9fb0c0" }, sv);
      el("text", { x: bx + 75, y: 99, "text-anchor": "middle", "class": "ct-axl" }, sv).textContent = tr("machine");
      el("rect", { x: bx + 60 - wq / 2 + 15, y: 112, width: wq, height: 38, fill: "#07569a", opacity: .75 }, sv);
      el("text", SMALL ? { x: bx + 75 - wq / 2 - 6, y: 147, "class": "ct-axl", "text-anchor": "end" } : { x: bx + 75 + wq / 2 + 6, y: 136, "class": "ct-axl" }, sv).textContent = tr("Qf = 1 kJ");
      el("rect", { x: bx + 75 - wc / 2, y: 38, width: wc, height: 40, fill: "#ad5200", opacity: .7 }, sv);
      el("text", SMALL ? { x: bx + 75 - wc / 2 - 6, y: 62, "class": "ct-axl", "text-anchor": "end" } : { x: bx + 75 + wc / 2 + 6, y: 62, "class": "ct-axl" }, sv).textContent = tr("Qc = ") + f(1 + w1, 2) + " kJ";
      el("rect", { x: bx - 40, y: 95 - ww / 2, width: 85, height: ww, fill: "#3c8d5a", opacity: .8 }, sv);
      el("text", SMALL ? { x: bx + 28, y: 95 + ww / 2 + 18, "class": "ct-axl", "text-anchor": "end" } : { x: bx - 40, y: 95 + ww / 2 + 14, "class": "ct-axl" }, sv).textContent = tr("travail W = ") + f(w1, 2) + " kJ";
      out.innerHTML = tr("COP de Carnot = <b>") + f(c, 2) + tr("</b> : pour extraire 1 kJ au froid, il faut au moins <b>") + f(w1, 2) + tr(" kJ de travail</b>, et le condenseur rejette ") + f(1 + w1, 2) +
        tr(" kJ au chaud. Écart Tc − Tf = ") + f(tc - tf, 0) + tr(" K : plus l'écart grandit, plus la flèche verte (travail) s'épaissit. Surgeler coûte donc plus cher que conserver au frais.");
    }
    [cF, cC].forEach(function (c) { c.i.addEventListener("input", draw); }); draw();
  }


  /* ---- Regression and correlation (biostatistics, chapter 3). r = cov/(sx sy), b1 = cov/sx², b0 = ȳ − b1 x̄,
     t = r √(n−2)/√(1−r²), two-sided p from Student's law with n − 2 df (regularized incomplete beta, Numerical Recipes betacf). */
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap, m, m2, aa, del, h;
    if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; h = d;
    for (m = 1; m <= 200; m++) {
      m2 = 2 * m; aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function lgamma(z) {
    var g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5], x = z, y = z,
        t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (var j = 0; j < 6; j++) s += g[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  CT.ibeta = function (a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  CT.tTwoSided = function (t, df) { return CT.ibeta(df / 2, 0.5, df / (df + t * t)); };
  CT.regress = function (X, Y) {
    var n = X.length, mx = 0, my = 0, sxx = 0, syy = 0, sxy = 0, i;
    for (i = 0; i < n; i++) { mx += X[i]; my += Y[i]; } mx /= n; my /= n;
    for (i = 0; i < n; i++) { sxx += (X[i] - mx) * (X[i] - mx); syy += (Y[i] - my) * (Y[i] - my); sxy += (X[i] - mx) * (Y[i] - my); }
    var r = sxy / Math.sqrt(sxx * syy), b1 = sxy / sxx, b0 = my - b1 * mx, t = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
    return { r: r, r2: r * r, b1: b1, b0: b0, t: t, p: CT.tTwoSided(t, n - 2), n: n };
  };

  function regr(box) {
    box.appendChild(h(ht(box), {}, tr("Corrélation et régression : déplacez un point")));
    box.appendChild(h("p", { "class": "muted" }, tr("Douze mesures (points bleus) et un point que vous déplacez (orange). r = cov(x, y)/(s<sub>x</sub>·s<sub>y</sub>), droite des moindres carrés y = b<sub>0</sub> + b<sub>1</sub>·x, test de r : t = r·√(n − 2)/√(1 − r²) à n − 2 degrés de liberté.")));
    var W = 320, H = 210, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Nuage de points et droite de régression") }, box);
    var BX = [1.2, 1.9, 2.4, 3.1, 3.6, 4.2, 4.9, 5.5, 6.1, 6.8, 7.4, 8.0],
        BY = [2.6, 2.1, 3.5, 3.2, 4.4, 3.9, 5.1, 4.6, 5.9, 5.4, 6.6, 6.2];
    var cX = slider(tr("x du point orange"), 0, 10, 0.1, 9.5, function (v) { return f(v, 1); }),
        cY = slider(tr("y du point orange"), 0, 10, 0.1, 1, function (v) { return f(v, 1); }),
        cOn = h("label", { "class": "ct-sl" }, tr('<span>Inclure le point orange</span>'));
    var chk = h("input", { type: "checkbox", checked: "" }); cOn.appendChild(chk);
    var ctl = h("div", { "class": "ct-ctl" }); [cX, cY].forEach(function (c) { ctl.appendChild(c.w); }); ctl.appendChild(cOn); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var X = function (v) { return 30 + (W - 40) * v / 10; }, Y = function (v) { return H - 24 - (H - 34) * v / 10; };
    el("line", { x1: 30, y1: Y(0), x2: W - 10, y2: Y(0), "class": "ct-ax" }, sv); el("line", { x1: 30, y1: Y(0), x2: 30, y2: Y(10), "class": "ct-ax" }, sv);
    [0, 5, 10].forEach(function (v) { el("text", { x: X(v), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = v; el("text", { x: 24, y: Y(v) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = v; });
    var base = el("line", { "class": "ct-l1" }, sv), line = el("line", { "class": "ct-l2" }, sv);
    BX.forEach(function (x, i) { el("circle", { cx: X(x), cy: Y(BY[i]), r: 4, "class": "ct-dot" }, sv); });
    var pt = el("circle", { r: 6, "class": "ct-pt" }, sv);
    var r0 = CT.regress(BX, BY);
    base.setAttribute("x1", X(0)); base.setAttribute("x2", X(10)); base.setAttribute("y1", Y(r0.b0)); base.setAttribute("y2", Y(r0.b0 + 10 * r0.b1));
    function draw() {
      var on = chk.checked, px = +cX.i.value, py = +cY.i.value;
      var XS = on ? BX.concat([px]) : BX, YS = on ? BY.concat([py]) : BY, r = CT.regress(XS, YS);
      line.setAttribute("x1", X(0)); line.setAttribute("x2", X(10)); line.setAttribute("y1", Y(r.b0)); line.setAttribute("y2", Y(r.b0 + 10 * r.b1));
      pt.setAttribute("cx", X(px)); pt.setAttribute("cy", Y(py)); pt.style.opacity = on ? 1 : 0.25;
      var pv = r.p < 1e-4 ? r.p.toExponential(1).replace(".", EN ? "." : ",") : f(r.p, 4);
      out.innerHTML = "n = " + r.n + " · r = <b>" + f(r.r, 3) + "</b> · r² = <b>" + f(r.r2, 3) + tr("</b> · droite y = ") + f(r.b0, 2) + " + " + f(r.b1, 3) + "·x<br>t = " + f(r.t, 2) +
        " (" + (r.n - 2) + tr(" ddl) · p = <b>") + pv + "</b> " + (r.p < 0.05 ? tr("(lien significatif au risque 5 %)") : tr("(pas significatif au risque 5 %)")) +
        tr("<br>Sans le point orange : r = ") + f(r0.r, 3) + tr(". Un seul point loin en x tire la droite (bras de levier) : regardez toujours le nuage avant de conclure.");
    }
    [cX, cY].forEach(function (c) { c.i.addEventListener("input", draw); }); chk.addEventListener("change", draw); draw();
  }

  var T = { roc: roc, normal: normal, atten: atten, biot: biot, congel: congel, cop: cop, regr: regr };
  function init() {
    var bs = document.querySelectorAll(".ctool[data-tool]");
    for (var i = 0; i < bs.length; i++) { var b = bs[i], fn = T[b.getAttribute("data-tool")]; if (fn && !b.childNodes.length) fn(b); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
