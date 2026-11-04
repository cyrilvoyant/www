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
  Object.assign(TEXT_EN, {"p doit être strictement entre 0 et 1.": "p must lie strictly between 0 and 1.", "Qf = 1 kJ": "Qcold = 1 kJ", "Qc = ": "Qhot = ", " ; ": "; ", " : ": ": ", "σ doit être strictement positif.": "σ must be positive.", "Saisir une probabilité entre 0 et 1, bornes exclues.": "Enter a probability between 0 and 1 (excluded).", "Saisir une valeur pour ": "Enter a value for ", "moins de 1": "fewer than 1", "</b> sort": "</b> is transmitted", "température (°C)": "temperature (°C)"});
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
    return p < 1e-4 || p > 1 - 1e-4 ? x : x - (Phi(x) - p) / CT.phi(x);  // in the far tails Acklam alone (1e-9) beats a Newton step on a 1e-7 erf
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

  function t2(fr, en) { return EN ? en : fr; }
  function setv(c, v) { c.i.value = v; c.i.dispatchEvent(new Event("input")); }
  // Presets set the controls by themselves and say, in one sentence, what the reader should conclude.
  function presets(box, items) {
    var w = h("div", { role: "group", "aria-label": t2("Cas à essayer", "Cases to try"), style: "display:flex;flex-wrap:wrap;gap:6px 8px;margin:10px 0 4px" }), say = h("p", { "class": "muted", style: "margin:4px 0 10px;font-weight:600", hidden: "" }), bs = [];
    function mark(b, text) { bs.forEach(function (x) { var on = x === b; x.setAttribute("aria-pressed", on ? "true" : "false"); x.style.background = on ? "var(--link)" : ""; x.style.color = on ? "#fff" : ""; }); say.textContent = text || ""; say.hidden = !text; }
    items.forEach(function (it) { var b = h("button", { type: "button", "class": "ct-btn", "aria-pressed": "false", style: "margin:0" }); b.textContent = it[0]; b.addEventListener("click", function () { it[1](); mark(b, it[2]); }); bs.push(b); w.appendChild(b); });
    box.appendChild(w); box.appendChild(say);
    return { clear: function () { mark(null, ""); }, select: function (i) { mark(bs[i], items[i][2]); } };
  }
  // Definitions next to the tool: native details, so keyboard and touch work without any script.
  function symbols(box, text) { var d = h("details", { style: "margin:8px 0;font-size:.9rem" }), s = h("summary", { style: "cursor:pointer;font-weight:600" }), p = h("p", { "class": "muted", style: "margin:6px 0 0" }); s.textContent = t2("Que veut dire chaque symbole ?", "What does each symbol mean?"); p.textContent = text; d.appendChild(s); d.appendChild(p); box.appendChild(d); }
  function seeAlso(box, items) { var p = h("p", { "class": "muted", style: "margin:10px 0 0" }), s = t2("À relier : ", "Related: "); p.textContent = s; items.forEach(function (it, i) { if (i) p.appendChild(document.createTextNode(" · ")); var a = h("a", { href: EN ? "/tools/" + it[1] + "/" : "/fr/animations/" + it[0] + "/" }); a.textContent = EN ? it[3] : it[2]; p.appendChild(a); }); box.appendChild(p); }
  var LINK = { student: ["test-student", "student-t-test", "test de Student", "Student t-test"], corr: ["correlation-significativite-r2", "correlation-significance-r-squared", "corrélation et R²", "correlation and R²"], normal: ["loi-normale", "normal-distribution", "loi normale", "normal distribution"], roc: ["courbe-roc", "roc-curve", "courbe ROC", "ROC curve"], interv: ["intervalles-regression", "regression-intervals", "intervalles de régression", "regression intervals"], compton: ["effet-compton", "compton-scattering", "effet Compton", "Compton scattering"], wave: ["onde-electromagnetique", "electromagnetic-wave", "onde électromagnétique", "electromagnetic wave"], engine: ["moteur-carnot", "carnot-heat-engine", "moteur et limite de Carnot", "heat engine and Carnot limit"], biot: ["refroidissement-biot", "biot-cooling", "refroidissement et nombre de Biot", "cooling and Biot number"], congel: ["congelation-energie-puissance", "freezing-energy-power", "congélation", "freezing"], cop: ["cop-carnot-machine-frigorifique", "refrigerator-carnot-cop", "machine frigorifique", "refrigerator"] };
  function plain(v) { return String(+(+v).toPrecision(6)).replace(".", EN ? "." : ","); }

  /* ROC: two distributions, a threshold, the ROC curve with the current point, Se/Sp/VPP/VPN at a prevalence */
  function roc(box) {
    box.appendChild(h(ht(box), {}, tr("Courbe ROC : déplacez le seuil")));
    box.appendChild(h("p", { "class": "muted" }, t2("Un bon test peut surtout donner de fausses alertes : quand la maladie est rare, la majorité des résultats positifs peut être fausse, alors que la sensibilité (la part des malades détectés) et la spécificité (la part des non-malades écartés) n’ont pas changé. La prévalence est la proportion de malades dans la population. Ici, les résultats suivent deux lois normales, décalées de d écarts-types entre non-malades et malades ; tout résultat au-dessus du seuil (la valeur choisie pour déclarer le test positif) est positif. La VPP (valeur prédictive positive) est la probabilité d’être malade quand le test est positif ; l’AUC, l’aire sous la courbe ROC, résume le test sans choisir de seuil (0,5 : sans valeur ; 1 : parfait).", "A good test can still produce mostly false alarms: when a disease is rare, most positive results can be false, although sensitivity (the share of people with the disease who are detected) and specificity (the share of people without it who are cleared) have not changed. Prevalence is the proportion of people with the disease in the population. Here, results follow two normal distributions, shifted by d standard deviations between people without and with the disease; any result above the threshold (the value chosen to call the test positive) is positive. The PPV (positive predictive value) is the probability of having the disease when the test is positive; the AUC, the area under the ROC curve, summarizes the test without choosing a threshold (0.5: worthless; 1: perfect).")));
    symbols(box, EN ? "d separates the means of two normal distributions with the same standard deviation; s is the test threshold in these standardized units. Se is sensitivity, Sp specificity, and 1−Sp the false-positive rate. ROC means Receiver Operating Characteristic and AUC its area. PPV and NPV are positive and negative predictive values. Youden’s index combines sensitivity and specificity; it is not a diagnostic probability." : "d sépare les moyennes de deux lois normales de même écart-type ; s est le seuil du test dans ces unités standardisées. Se est la sensibilité, Sp la spécificité et 1−Sp le taux de faux positifs. ROC signifie Receiver Operating Characteristic et AUC son aire. VPP et VPN sont les valeurs prédictives positive et négative. L’indice de Youden combine sensibilité et spécificité ; ce n’est pas une probabilité diagnostique.");
    function go(d, s, p) { return function () { setv(cD, d); setv(cS, s); setv(cP, p); }; }
    var bar = presets(box, [
      [t2("Réglage de départ : prévalence 10 %", "Starting setting: 10% prevalence"), go(1.8, 1, 0.1), t2("78,8 % de sensibilité, 84,1 % de spécificité, et seulement 35,6 % de malades parmi les résultats positifs.", "78.8% sensitivity, 84.1% specificity, and only 35.6% of people with the disease among positive results.")],
      [t2("Bon test, maladie rare (1 %)", "Good test, rare disease (1%)"), go(2.55, 1.3, 0.01), t2("Sensibilité et spécificité proches de 90 %, et pourtant la majorité des résultats positifs sont de fausses alertes.", "Sensitivity and specificity close to 90%, yet most positive results are false alarms.")],
      [t2("Même test, prévalence 30 %", "Same test, 30% prevalence"), go(2.55, 1.3, 0.3), t2("Seule la prévalence a changé : le point ne bouge pas sur la courbe, mais la VPP remonte fortement.", "Only prevalence has changed: the point stays put on the curve, but the PPV rises sharply.")],
      [t2("Seuil bas : peu de malades manqués", "Low threshold: few missed cases"), go(2.55, 0.5, 0.1), t2("Le point monte sur la courbe : moins de malades manqués, mais plus de fausses alertes.", "The point moves up the curve: fewer missed cases, but more false alarms.")],
      [t2("Seuil haut : peu de fausses alertes", "High threshold: few false alarms"), go(2.55, 2.5, 0.1), t2("Le point descend : peu de fausses alertes, mais près d’un malade sur deux est manqué.", "The point moves down: few false alarms, but nearly one case in two is missed.")],
      [t2("Test sans valeur : d = 0", "Useless test: d = 0"), go(0, 0, 0.1), t2("Les deux courbes coïncident : la ROC suit la diagonale, l’AUC vaut 0,5 et la VPP égale la prévalence.", "The two curves coincide: the ROC follows the diagonal, AUC is 0.5 and PPV equals prevalence.")],
      [t2("Test très séparé : d = 4", "Well separated test: d = 4"), go(4, 2, 0.1), t2("Les populations se séparent : la courbe longe le coin supérieur gauche et l’AUC approche 1.", "The populations separate: the curve hugs the upper-left corner and AUC approaches 1.")]
    ]);
    var g = h("div", { "class": "ct-grid" }); box.appendChild(g);
    var W = 300, H = 170, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Distributions des résultats et seuil") }, g);
    var R = 170, sr = el("svg", { viewBox: "0 0 " + R + " " + R, "class": "ct-svg ct-sq", role: "img", "aria-label": tr("Courbe ROC") }, g);
    box.appendChild(h("p", { "class": "muted", style: "margin:4px 0" }, t2("Graphique des distributions : abscisse = résultat du test, en écarts-types depuis la moyenne des non-malades ; ordonnée = densité de probabilité (hauteur relative, sans graduation). Courbe ROC : les deux axes vont de 0 à 1.", "Distribution chart: x-axis = test result, in standard deviations from the mean of people without the disease; y-axis = probability density (relative height, not graduated). ROC curve: both axes run from 0 to 1.")));
    var cD = slider(t2("Séparation d (écarts-types)", "Separation d (standard deviations)"), 0, 4, 0.05, 1.8, function (v) { return f(v); }),
        cS = slider(t2("Seuil s du test (en écarts-types depuis la moyenne des non-malades)", "Test threshold s (in standard deviations from the healthy mean)"), -3, 6, 0.05, 1, function (v) { return f(v); }),
        cP = slider(t2("Prévalence (part de malades)", "Prevalence (share with disease)"), 0.001, 0.5, 0.001, 0.1, function (v) { return pct(v); });
    var ctl = h("div", { "class": "ct-ctl" }); [cD, cS, cP].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    seeAlso(box, [LINK.normal, LINK.student]);
    var X = function (z) { return 10 + (W - 20) * (z + 3.5) / 10; }, Y = function (v) { return H - 18 - (H - 30) * v / 0.42; };
    el("line", { x1: 10, y1: H - 18, x2: W - 10, y2: H - 18, "class": "ct-ax" }, sv);
    el("text", { x: W / 2, y: H - 4, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = t2("résultat du test ; surface colorée : résultats positifs", "test result; shaded area: positive results");
    var aH = el("path", { "class": "ct-a1" }, sv), aS = el("path", { "class": "ct-a2" }, sv), lH = el("path", { "class": "ct-l1" }, sv), lS = el("path", { "class": "ct-l2" }, sv);
    var th = el("line", { "class": "ct-th", y1: 6, y2: H - 18 }, sv);
    el("text", { x: 14, y: 14, "class": "ct-tx1" }, sv).textContent = tr("non-malades");
    var tS = el("text", { y: 14, "class": "ct-tx2" }, sv); tS.textContent = tr("malades");
    var P = function (v) { return 14 + (R - 24) * v; }, Q = function (v) { return R - 14 - (R - 24) * v; };
    el("rect", { x: P(0), y: Q(1), width: P(1) - P(0), height: Q(0) - Q(1), "class": "ct-frame" }, sr);
    var dg = el("line", { x1: P(0), y1: Q(0), x2: P(1), y2: Q(1), "class": "ct-diag" }, sr); dg.style.strokeDasharray = "none"; dg.style.stroke = "var(--muted)";
    el("text", { x: P(0.56), y: Q(0.42), "class": "ct-axl", transform: "rotate(-45 " + P(0.56) + " " + Q(0.42) + ")" }, sr).textContent = t2("hasard", "chance");
    var aR = el("path", { "class": "ct-a2" }, sr), cR = el("path", { "class": "ct-l2" }, sr), pt = el("circle", { r: 4.5, "class": "ct-pt" }, sr);
    el("text", { x: P(0.5), y: R - 2, "class": "ct-axl", "text-anchor": "middle" }, sr).textContent = t2("1 − Sp (faux positifs)", "1 − Sp (false positives)");
    el("text", { x: 4, y: Q(0.5), "class": "ct-axl", transform: "rotate(-90 9 " + Q(0.5) + ")", "text-anchor": "middle" }, sr).textContent = t2("Se (sensibilité)", "Se (sensitivity)");
    function count(v) { return v > 0 && v < 0.5 ? tr("moins de 1") : String(Math.round(v)); }
    function draw() {
      var d = +cD.i.value, s = +cS.i.value, p = +cP.i.value, z, k, A = [], B = [], C = [], D = [];
      for (k = 0; k <= 120; k++) { z = -3.5 + 10 * k / 120; A.push([X(z), Y(CT.phi(z))]); B.push([X(z), Y(CT.phi(z - d))]); }
      lH.setAttribute("d", path(A)); lS.setAttribute("d", path(B));
      for (k = 0; k <= 60; k++) { z = s + (6.5 - s) * k / 60; C.push([X(z), Y(CT.phi(z))]); D.push([X(z), Y(CT.phi(z - d))]); }
      aH.setAttribute("d", path([[X(s), Y(0)]].concat(C, [[X(6.5), Y(0)]])) + "Z");
      aS.setAttribute("d", path([[X(s), Y(0)]].concat(D, [[X(6.5), Y(0)]])) + "Z");
      th.setAttribute("x1", X(s)); th.setAttribute("x2", X(s)); tS.setAttribute("x", Math.max(90, Math.min(W - 60, X(d) - 20)));
      var E = [[P(0), Q(0)]];
      for (k = 0; k <= 80; k++) { z = 6.5 - 10 * k / 80; E.push([P(1 - Phi(z)), Q(1 - Phi(z - d))]); }
      cR.setAttribute("d", path(E)); aR.setAttribute("d", path(E.concat([[P(1), Q(0)]])) + "Z");
      var r = CT.roc(d, s, p); pt.setAttribute("cx", P(1 - r.sp)); pt.setAttribute("cy", Q(r.se));
      out.innerHTML = t2("Sensibilité Se (malades détectés) = <b>", "Sensitivity Se (cases detected) = <b>") + pct(r.se) + t2("</b> · spécificité Sp (non-malades écartés) = <b>", "</b> · specificity Sp (people without disease cleared) = <b>") + pct(r.sp) + t2("</b> · AUC (aire sous la courbe) = <b>", "</b> · AUC (area under the curve) = <b>") + f(r.auc, 3) +
        t2("</b><br>Test positif : VPP = <b>", "</b><br>Positive test: PPV = <b>") + pct(r.vpp) + t2("</b> de vrais malades · test négatif : VPN = <b>", "</b> truly have the disease · negative test: NPV = <b>") + pct(r.vpn) + t2("</b> de vrais non-malades, pour une prévalence de ", "</b> truly do not, at a prevalence of ") + pct(p) +
        t2("<br>Sur 1 000 personnes testées, environ : malades détectés <b>", "<br>Out of 1,000 people tested, about: cases detected <b>") + count(1000 * p * r.se) + t2("</b> · malades manqués <b>", "</b> · cases missed <b>") + count(1000 * p * (1 - r.se)) + t2("</b> · fausses alertes <b>", "</b> · false alarms <b>") + count(1000 * (1 - p) * (1 - r.sp)) + "</b>" + tr(" · indice de Youden Se + Sp − 1 = ") + f(r.se + r.sp - 1, 3);
    }
    [cD, cS, cP].forEach(function (c) { c.i.addEventListener("input", draw); c.i.addEventListener("input", bar.clear); }); draw(); bar.select(0);
  }

  /* Normal law: from z to P(Z < z) and back, with the shaded area; or from x, μ, σ */
  function normal(box) {
    box.appendChild(h(ht(box), {}, tr("Table de la loi normale, interactive")));
    box.appendChild(h("p", { "class": "muted" }, t2("À 1,96 écart-type de la moyenne, il reste 2,5 % de chaque côté et 95 % au centre. Choisissez une valeur et lisez l’aire, ou choisissez une probabilité et lisez la borne ; z = (x − μ)/σ ramène tout à la même échelle : x est la valeur, μ la moyenne, σ l’écart-type (la dispersion typique) et z le nombre d’écarts-types entre x et la moyenne.", "At 1.96 standard deviations from the mean, 2.5% remains on each side and 95% in the center. Choose a value and read its area, or choose a probability and find its threshold; z = (x − μ)/σ puts everything on the same scale: x is the value, μ the mean, σ the standard deviation (the typical spread) and z the number of standard deviations between x and the mean.")));
    symbols(box, EN ? "x is a value, μ the mean and σ the standard deviation. z expresses the distance from μ in standard-deviation units. Z is a standard normal variable; P denotes probability. The shaded area is a probability, whereas φ(z) is a density height, not a probability at a point." : "x est une valeur, μ la moyenne et σ l’écart-type. z exprime la distance à μ en nombre d’écarts-types. Z est une variable normale centrée réduite ; P désigne une probabilité. L’aire colorée est une probabilité, tandis que φ(z) est une hauteur de densité, pas une probabilité en un point.");
    function go(m, o) { return function () { mode.value = m; im.value = o.mu || 0; is.value = o.sg || 1; if ("z" in o) { iz.value = o.z; fromZ(); } else if ("p" in o) { ip.value = o.p; fromP(); } else { ix.value = o.x; fromX(); } }; }
    var bar = presets(box, [
      [t2("97,5 % à gauche de 1,96", "97.5% to the left of 1.96"), go("lt", { z: 1.96 }), t2("L’aire à gauche de z = 1,96 vaut environ 0,975.", "The area to the left of z = 1.96 is about 0.975.")],
      [t2("95 % au centre", "95% in the center"), go("two", { p: 0.95 }), t2("Calcul inverse : partir de 95 % au centre redonne la borne z ≈ 1,96.", "Inverse calculation: starting from 95% in the center gives back the bound z ≈ 1.96.")],
      [t2("Au-delà de 2 écarts-types", "Beyond 2 standard deviations"), go("gt", { z: 2 }), t2("Environ 2,3 % des valeurs dépassent la moyenne de plus de 2 écarts-types.", "About 2.3% of values exceed the mean by more than 2 standard deviations.")],
      [t2("Seuil des 10 % les plus hauts", "Threshold of the top 10%"), go("gt", { p: 0.1 }), t2("Une probabilité donne une borne : les 10 % les plus hauts commencent vers z = 1,28.", "A probability gives a bound: the top 10% starts near z = 1.28.")],
      [t2("Exemple : x = 130, μ = 100, σ = 15", "Example: x = 130, μ = 100, σ = 15"), go("lt", { mu: 100, sg: 15, x: 130 }), t2("Exemple d’école : 130 est à 2 écarts-types de 100. Le score z vaut 2 quelle que soit l’unité.", "Textbook example: 130 is 2 standard deviations from 100. The z-score is 2 whatever the unit.")]
    ]);
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + (H + 12), "class": "ct-svg", role: "img", "aria-label": tr("Densité de la loi normale et aire") }, box);
    box.appendChild(h("p", { "class": "muted", style: "margin:4px 0" }, t2("Ordonnée : densité φ(z), sans graduation ; c’est l’aire colorée qui est une probabilité. Abscisse : z en écarts-types et, dessous, x dans l’unité de μ et σ.", "Y-axis: density φ(z), not graduated; the shaded area is the probability. X-axis: z in standard deviations and, below, x in the unit of μ and σ.")));
    var X = function (z) { return 10 + (W - 20) * (z + 4) / 8; }, Y = function (v) { return H - 20 - (H - 30) * v / 0.4; };
    var ar = el("path", { "class": "ct-a2" }, sv), ln = el("path", { "class": "ct-l2" }, sv);
    el("line", { x1: 10, y1: H - 20, x2: W - 10, y2: H - 20, "class": "ct-ax" }, sv);
    var xl = [];
    for (var t = -3; t <= 3; t++) { el("text", { x: X(t), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = t;
      xl.push(el("text", { x: X(t), y: H + 6, "class": "ct-axl ct-xl", "text-anchor": "middle" }, sv)); }
    el("text", { x: 6, y: H - 8, "class": "ct-axl" }, sv).textContent = "z"; el("text", { x: 6, y: H + 6, "class": "ct-axl ct-xl" }, sv).textContent = "x";
    var A = []; for (var k = 0; k <= 120; k++) { var z0 = -4 + 8 * k / 120; A.push([X(z0), Y(CT.phi(z0))]); } ln.setAttribute("d", path(A));
    var row = h("div", { "class": "ct-ctl ct-num" });
    var mode = h("select", { "aria-label": tr("Aire cherchée"), style: "width:auto" }, t2('<option value="lt">À gauche : P(Z &lt; z)</option><option value="gt">À droite : P(Z &gt; z)</option><option value="two">Au centre : P(−|z| &lt; Z &lt; |z|)</option>', '<option value="lt">Left: P(Z &lt; z)</option><option value="gt">Right: P(Z &gt; z)</option><option value="two">Center: P(−|z| &lt; Z &lt; |z|)</option>'));
    var iz = h("input", { type: "number", step: "0.01", value: "1.96", "aria-label": "z" }), ip = h("input", { type: "number", step: "0.0001", min: "0.0001", max: "0.9999", value: "0.975", "aria-label": tr("probabilité") });
    var im = h("input", { type: "number", step: "any", value: "0", "aria-label": "μ" }), is = h("input", { type: "number", step: "any", min: "0", value: "1", "aria-label": "σ" }), ix = h("input", { type: "number", step: "any", value: "1.96", "aria-label": "x" });
    [[tr("Aire"), mode], [t2("z (en écarts-types)", "z (standard deviations)"), iz], [t2("probabilité (aire)", "probability (area)"), ip], [t2("x (valeur)", "x (value)"), ix], [t2("μ (moyenne)", "μ (mean)"), im], [t2("σ (écart-type)", "σ (standard deviation)"), is]].forEach(function (p) { var l = h("label", {}, "<span>" + p[0] + "</span>"); l.appendChild(p[1]); row.appendChild(l); });
    box.appendChild(row);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    seeAlso(box, [LINK.student, LINK.roc, LINK.interv]);
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
      var p = +ip.value, m = mode.value;
      if (!(p > 0 && p < 1)) { ar.setAttribute("d", ""); out.textContent = tr("p doit être strictement entre 0 et 1."); return; }
      var z = m === "lt" ? CT.invPhi(p) : m === "gt" ? CT.invPhi(1 - p) : CT.invPhi((1 + p) / 2);
      iz.value = z.toFixed(4); ix.value = (+im.value + z * (+is.value || 1)).toPrecision(6) * 1; show(z);
    }
    function fromX() { if (invalid(ix, "x")) return; var z = (+ix.value - +im.value) / (+is.value || 1); iz.value = z.toFixed(4); ip.value = area0(P(z)).toFixed(4); show(z); }
    function show(z) {
      area(z); var mu = +im.value, sg = +is.value || 1, a = area0(P(z)), share = f(100 * a, 2) + PC, az = Math.abs(z), m = mode.value;
      for (var k = 0; k < xl.length; k++) xl[k].textContent = plain(mu + (k - 3) * sg);
      var reading = m === "two" ? t2(share + " des valeurs sont entre " + plain(mu - az * sg) + " et " + plain(mu + az * sg) + ".", share + " of values lie between " + plain(mu - az * sg) + " and " + plain(mu + az * sg) + ".")
        : m === "gt" ? t2(share + " des valeurs sont au-dessus de " + plain(mu + z * sg) + ".", share + " of values lie above " + plain(mu + z * sg) + ".")
        : t2(share + " des valeurs sont en dessous de " + plain(mu + z * sg) + ".", share + " of values lie below " + plain(mu + z * sg) + ".");
      out.innerHTML = "<b>" + reading + "</b><br>" + t2("Moyenne μ = ", "Mean μ = ") + plain(mu) + t2(", écart-type σ = ", ", standard deviation σ = ") + plain(sg) + " → z = (x − μ)/σ = <b>" + f(z, 4) + tr("</b> · aire = <b>") + f(a, 4) + tr("</b> · densité φ(z) = ") + f(CT.phi(z), 4);
    }
    iz.addEventListener("input", fromZ); ip.addEventListener("input", fromP); ix.addEventListener("input", fromX);
    // μ and σ describe the population: the measured value x stays, z and the area follow
    im.addEventListener("input", fromX); is.addEventListener("input", fromX); mode.addEventListener("change", fromZ); fromZ();
    [iz, ip, ix, im, is].forEach(function (i) { i.addEventListener("input", bar.clear); }); mode.addEventListener("change", bar.clear); bar.select(0);
  }

  /* Attenuation: a beam crossing a slab, N/N0, the CDA, 1000 photons */
  function atten(box) {
    box.appendChild(h(ht(box), {}, tr("Atténuation d'un faisceau : la couche de demi-atténuation")));
    box.appendChild(h("p", { "class": "muted" }, t2("Chaque couche de demi-atténuation (CDA) divise le faisceau par deux : après trois couches il en reste 12,5 %, et jamais exactement zéro. On lit sur le graphique la part transmise N/N₀ (N : photons sortants, N₀ : photons entrants). Ce n’est pas une soustraction : doubler l’épaisseur ne double pas ce qui est arrêté, cela élève la fraction transmise au carré.", "Each half-value layer (HVL) halves the beam: after three layers 12.5% remains, and never exactly zero. The graph shows the transmitted fraction N/N₀ (N: photons out, N₀: photons in). This is not a subtraction: doubling the thickness does not double what is stopped, it squares the transmitted fraction.")));
    symbols(box, EN ? "N(x) = N₀ e^(−μx) = N₀ / 2^(x/HVL). N₀ is the incoming photon count, N the transmitted uncollided count and x the material thickness. μ is the linear attenuation coefficient; HVL is the half-value layer, the thickness that halves transmission. This illustration assumes a narrow monoenergetic beam and homogeneous material; it does not calculate shielding or clinical dose." : "N(x) = N₀ e^(−μx) = N₀ / 2^(x/CDA). N₀ est le nombre de photons entrants, N le nombre transmis sans diffusion et x l’épaisseur du matériau. μ est le coefficient d’atténuation linéique ; la CDA est l’épaisseur qui divise la transmission par deux. Cette illustration suppose un faisceau étroit monoénergétique et un matériau homogène ; elle ne calcule ni une protection ni une dose clinique.");
    function go(c, x) { return function () { setv(cC, c); setv(cX, x); }; }
    var bar = presets(box, [
      [t2("Trois couches : 6 cm, CDA de 2 cm", "Three layers: 6 cm, 2 cm HVL"), go(2, 6), t2("Trois divisions par deux : 1/8 transmis, soit 125 photons sur 1000.", "Three halvings: 1/8 transmitted, or 125 photons out of 1000.")],
      [t2("Une seule couche", "One layer"), go(2, 2), t2("Par définition de la CDA, la moitié passe.", "By definition of the HVL, half passes through.")],
      [t2("Épaisseur doublée : 12 cm", "Thickness doubled: 12 cm"), go(2, 12), t2("Pas 1/16 mais 1/64 : deux fois plus de matière élève la fraction transmise au carré.", "Not 1/16 but 1/64: twice the material squares the transmitted fraction.")],
      [t2("Dix couches", "Ten layers"), go(2, 20), t2("Environ 1 photon sur 1000 : c’est peu, mais ce n’est pas zéro.", "About 1 photon in 1000: little, but not zero.")],
      [t2("Matériau peu atténuant", "Weakly attenuating material"), go(10, 6), t2("À épaisseur égale, une CDA de 10 cm laisse passer près des deux tiers du faisceau.", "For the same thickness, a 10 cm HVL lets through nearly two thirds of the beam.")]
    ]);
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Courbe d'atténuation et épaisseur traversée") }, box);
    var cC = slider(t2("Couche de demi-atténuation CDA (cm)", "Half-value layer HVL (cm)"), 0.1, 10, 0.1, 2, function (v) { return f(v, 1) + " cm"; }),
        cX = slider(tr("Épaisseur x (cm)"), 0, 30, 0.1, 6, function (v) { return f(v, 1) + " cm"; });
    var ctl = h("div", { "class": "ct-ctl" }); ctl.appendChild(cC.w); ctl.appendChild(cX.w); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    var X = function (x) { return 34 + (W - 44) * x / 30; }, Y = function (v) { return 10 + (H - 34) * (1 - v); };
    el("line", { x1: 34, y1: Y(0), x2: W - 10, y2: Y(0), "class": "ct-ax" }, sv); el("line", { x1: 34, y1: Y(0), x2: 34, y2: Y(1), "class": "ct-ax" }, sv);
    [0, 0.5, 1].forEach(function (v) { el("text", { x: 28, y: Y(v) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = f(v, 1); });
    [0, 10, 20, 30].forEach(function (v) { el("text", { x: X(v), y: H - 8, "class": "ct-axl", "text-anchor": v === 30 ? "end" : "middle" }, sv).textContent = v + " cm"; });
    el("text", { x: X(15), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = t2("épaisseur", "thickness");
    el("text", { x: 8, y: Y(0.5), "class": "ct-axl", "text-anchor": "middle", transform: "rotate(-90 8 " + Y(0.5) + ")" }, sv).textContent = t2("part transmise N/N₀", "transmitted N/N₀");
    var slab = el("rect", { y: Y(1), height: Y(0) - Y(1), x: X(0), "class": "ct-slab" }, sv), cur = el("path", { "class": "ct-l2" }, sv), pt = el("circle", { r: 4.5, "class": "ct-pt" }, sv);
    var ticks = el("g", {}, sv);
    box.appendChild(h("p", { "class": "muted", style: "margin:6px 0 0" }, t2("Zone colorée : matériau traversé. Petits traits sur l’axe : une CDA de plus. Grille de points : 1000 photons entrants, en bleu ceux qui sortent.", "Shaded area: material crossed. Small ticks on the axis: one more HVL. Dot grid: 1000 incoming photons, those transmitted in blue.")));
    var dots = h("div", { "class": "ct-dots", "aria-hidden": "true" }); box.appendChild(dots);
    for (var k = 0; k < 1000; k++) dots.appendChild(h("i", {}));
    seeAlso(box, [LINK.compton, LINK.wave]);
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
        tr("</b> · sur 1000 photons, <b>") + (n === 0 ? tr("moins de 1") + tr("</b> sort") : n + tr("</b> sortent")) + (x / c >= 9.95 && x / c < 10.5 ? tr(" (10 CDA ≈ 1 sur 1000)") : "");
    }
    [cC, cX].forEach(function (c) { c.i.addEventListener("input", draw); c.i.addEventListener("input", bar.clear); }); draw(); bar.select(0);
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
    box.appendChild(h("p", { "class": "muted" }, t2("À Bi = 1 (nombre de Biot, sans unité), le modèle à température uniforme (une seule température pour tout l’aliment) annonce 116 min pour rattraper 90 % de l’écart ; le cœur de l’aliment en demande 164 min. Le nombre de Biot dit si une seule température suffit : il compare la résistance de l’intérieur à celle de la surface.", "At Bi = 1 (the Biot number, unitless), the uniform-temperature model (one temperature for the whole food) announces 116 min to close 90% of the gap; the core of the food needs 164 min. The Biot number says whether one temperature is enough: it compares the resistance of the interior with that of the surface.")));
    symbols(box, EN ? "Bi = h·Lc/λ. h describes surface convection, λ thermal conductivity and Lc = V/A the characteristic length (volume divided by exchange area). Ti is the initial temperature and T∞ the surrounding temperature. Uniform model: T(t) = T∞ + (Ti − T∞)·e^(−t/τ), τ = ρ·cp·Lc/h, with density ρ, specific heat capacity cp and time constant τ. Core and surface curves: transient conduction through a slab of thickness 2·Lc (first series term). Fo is the Fourier number: elapsed time compared with the internal diffusion timescale." : "Bi = h·Lc/λ. h décrit la convection en surface, λ la conductivité thermique et Lc = V/A la longueur caractéristique (volume divisé par la surface d’échange). Ti est la température initiale et T∞ celle du milieu extérieur. Modèle uniforme : T(t) = T∞ + (Ti − T∞)·e^(−t/τ), τ = ρ·cp·Lc/h, avec la masse volumique ρ, la capacité thermique massique cp et le temps caractéristique τ. Courbes à cœur et en surface : conduction transitoire dans une plaque d’épaisseur 2·Lc (premier terme de la série). Fo est le nombre de Fourier : le temps écoulé rapporté à l’échelle de diffusion interne.");
    function go(hh, L, k, Ti, Te) { return function () { setv(cH, hh); setv(cL, L); setv(cK, k); setv(cTi, Ti); setv(cTe, Te); }; }
    var bar = presets(box, [
      [t2("Aliment épais : Bi = 1", "Thick food: Bi = 1"), go(25, 2, 0.5, 60, 2), t2("Le cœur reste nettement en retard sur la surface : une seule température tromperait.", "The core clearly lags behind the surface: a single temperature would mislead.")],
      [t2("Tranche fine : Bi petit", "Thin slice: small Bi"), go(10, 0.5, 2, 60, 2), t2("Les courbes se confondent : la température reste presque uniforme et le modèle simple suffit.", "The curves merge: temperature stays nearly uniform and the simple model is adequate.")],
      [t2("Seule la conductivité λ augmente", "Only conductivity λ increases"), go(25, 2, 2, 60, 2), t2("Le temps du modèle simple ne bouge pas : c’est juste, λ n’y intervient pas. Seul le cœur se rapproche.", "The simple-model time does not move: this is correct, since λ is absent from it. Only the core gets closer.")],
      [t2("Air très brassé : h = 100", "Strong air flow: h = 100"), go(100, 2, 0.5, 60, 2), t2("La surface refroidit vite, mais le cœur est limité par la conduction : Bi = 4.", "The surface cools fast, but the core is limited by conduction: Bi = 4.")],
      [t2("Gros morceau : Lc = 6 cm", "Large piece: Lc = 6 cm"), go(25, 6, 0.5, 60, 2), t2("Trois fois plus épais : le temps à cœur devient bien plus long que le modèle simple ne l’annonce.", "Three times thicker: the core time becomes much longer than the simple model announces.")],
      [t2("Réchauffement : Ti sous T∞", "Warming: Ti below T∞"), go(25, 2, 0.5, 2, 20), t2("Mêmes équations, écart de signe opposé : l’aliment se réchauffe.", "Same equations, opposite gap: the food warms up.")]
    ]);
    var W = 320, H = 150, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Température moyenne et à cœur de l'aliment au cours du temps") }, box);
    var cH = slider(t2("Échange en surface h (W/m²·K)", "Surface heat transfer h (W/m²·K)"), 5, 300, 1, 25, function (v) { return f(v, 0); }),
        cL = slider(t2("Longueur Lc = volume/surface (cm)", "Length Lc = volume/surface (cm)"), 0.2, 10, 0.1, 2, function (v) { return f(v, 1) + " cm"; }),
        cK = slider(t2("Conductivité thermique λ (W/m·K)", "Thermal conductivity λ (W/m·K)"), 0.1, 2, 0.05, 0.5, function (v) { return f(v, 2); }),
        cTi = slider(t2("Température initiale Ti", "Initial temperature Ti"), 0, 90, 1, 60, function (v) { return f(v, 0) + " °C"; }),
        cTe = slider(t2("Milieu extérieur T∞ (air ou liquide)", "Surroundings T∞ (air or liquid)"), -30, 20, 1, 2, function (v) { return f(v, 0) + " °C"; });
    var ctl = h("div", { "class": "ct-ctl" }); [cH, cL, cK, cTi, cTe].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var leg = h("p", { "class": "muted ct-leg" }, tr('<span class="sw2"></span> température uniforme (modèle simple) &nbsp; <span class="sw3"></span> à cœur (conduction) &nbsp; <span class="sw4"></span> en surface'));
    leg.querySelector(".sw4").style.borderTop = "2px solid var(--muted)";
    box.appendChild(leg);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    seeAlso(box, [LINK.congel, LINK.cop]);
    var rho = 1050, cp = 3600;
    var cur = el("path", { "class": "ct-l2" }, sv), core = el("path", { "class": "ct-l3" }, sv), surf = el("path", { "class": "ct-l4" }, sv), ax = el("g", {}, sv);
    surf.style.strokeDasharray = "none"; surf.style.stroke = "var(--muted)"; surf.style.opacity = "1";
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
        A.push([X(t), Y(CT.lumped(hh, lam, Lc, rho, cp, Ti, Te, t).T)]); if (c.fo >= 0.2) { B.push([X(t), Y(c.T)]); C.push([X(t), Y(c.Ts)]); }   // first series term: drawn only where it is valid
      }
      cur.setAttribute("d", path(A)); core.setAttribute("d", path(B)); surf.setAttribute("d", path(C));
      while (ax.firstChild) ax.removeChild(ax.firstChild);
      el("line", { x1: 36, y1: Y(lo), x2: W - 10, y2: Y(lo), "class": "ct-ax" }, ax);
      [hi, lo].forEach(function (T) { el("text", { x: 32, y: Y(T) + 4, "class": "ct-axl", "text-anchor": "end" }, ax).textContent = f(T, 0) + "°"; });
      el("text", { x: 36, y: H - 6, "class": "ct-axl" }, ax).textContent = "0";
      el("text", { x: (36 + W - 10) / 2, y: H - 6, "class": "ct-axl", "text-anchor": "middle" }, ax).textContent = t2("temps", "time");
      el("text", { x: W - 10, y: H - 6, "class": "ct-axl", "text-anchor": "end" }, ax).textContent = f(tmax / 3600, 1) + " h";
      el("text", { x: 8, y: (10 + H - 24) / 2, "class": "ct-axl", "text-anchor": "middle", transform: "rotate(-90 8 " + ((10 + H - 24) / 2) + ")" }, ax).textContent = t2("température", "temperature");
      var ok = r0.bi < 0.1;
      out.innerHTML = "Bi = <b>" + f(r0.bi, 3) + tr("</b> · 90 % de l'écart rattrapé : <b>") + f(t90 / 60, 0) + tr(" min</b> selon le modèle simple, <b>") + f(tc90 / 60, 0) +
        tr(" min</b> à cœur.<br>") + (ok ? tr("Bi &lt; 0,1 : la température reste presque uniforme ; les deux courbes se confondent et le modèle simple suffit.")
        : tr("<b>Bi ≥ 0,1 : le cœur reste en retard sur la surface</b> ; le modèle simple sous-estime le temps à cœur. Augmentez λ ou diminuez Lc pour voir les courbes se rapprocher.")) +
        t2(" (ρ = 1050 kg/m³, cp = 3,6 kJ/kg·K ; les courbes à cœur et en surface, premier terme de la série, ne sont tracées que là où elles sont exactes, Fo &gt; 0,2.)", " (ρ = 1050 kg/m³, cp = 3.6 kJ/kg·K; the core and surface curves, first series term, are drawn only where they are accurate, Fo &gt; 0.2.)");
      if (Ti === Te) out.innerHTML = tr("Aucun écart de température entre l'aliment et son milieu : il n'y a rien à refroidir.");
      else if (Ti < Te) out.innerHTML = t2("<b>Ti est inférieure à T∞ : l’aliment se réchauffe</b> au lieu de refroidir ; lisez les temps comme des temps de réchauffement.<br>", "<b>Ti is below T∞: the food warms up</b> instead of cooling; read the times as warming times.<br>") + out.innerHTML;
      box.classList.toggle("ct-warn", !ok);
    }
    [cH, cL, cK, cTi, cTe].forEach(function (c) { c.i.addEventListener("input", draw); c.i.addEventListener("input", bar.clear); }); draw(); bar.select(0);
  }

  function congel(box) {
    box.appendChild(h(ht(box), {}, tr("Congeler : suivez le produit, du frais au congelé")));
    box.appendChild(h("p", { "class": "muted" }, t2("Dans cet exemple, geler l’eau représente 72 % de l’énergie à retirer : c’est ce que le calcul mcΔT (masse × capacité thermique × variation de température) oublie. Pour 500 kg en 4 h, la puissance moyenne atteint 10,9 kW. Appuyez sur ▶ : le produit cède sa chaleur, et sa température s’arrête pendant le gel.", "In this example, freezing the water accounts for 72% of the energy to remove: this is what the mcΔT calculation (mass × specific heat × temperature change) leaves out. For 500 kg in 4 h, the average power reaches 10.9 kW. Press ▶: the product releases its heat, and its temperature stops during freezing.")));
    symbols(box, EN ? "Δh = cp,fresh·(Ti − Tc) + w·g·L + cp,frozen·(Tc − Tf) is energy removed per unit mass. Ti is the initial temperature, Tc the onset of freezing and Tf the final temperature; cp,fresh and cp,frozen are the specific heat capacities before and after freezing. w is water content and g the fraction of water that freezes (not all water freezes). L = 333 kJ/kg is the latent heat per kilogram of frozen water. For mass m, average refrigeration power P is total energy divided by duration Δt." : "Δh = cp,frais·(Ti − Tc) + w·g·L + cp,congelé·(Tc − Tf) est l’énergie retirée par unité de masse. Ti est la température initiale, Tc celle du début de congélation et Tf la température finale ; cp,frais et cp,congelé sont les capacités thermiques massiques avant et après congélation. w est la teneur en eau et g la part de l’eau qui gèle (toute l’eau ne gèle pas). L = 333 kJ/kg est la chaleur latente par kilogramme d’eau gelée. Pour une masse m, la puissance frigorifique moyenne P est l’énergie totale divisée par la durée Δt.");
    function go(m, w, gg, ti, tc, tf, dt) { return function () { stop(); u = 1; setv(cM, m); setv(cW, w); setv(cG, gg); setv(cTi, ti); setv(cTc, tc); setv(cTf, tf); setv(cDt, dt); }; }
    var bar0 = presets(box, [
      [t2("500 kg en 4 h, 75 % d’eau", "500 kg in 4 h, 75% water"), go(500, 0.75, 0.9, 15, -1.5, -18, 4), t2("La chaleur latente domine le bilan.", "Latent heat dominates the balance.")],
      [t2("Deux fois plus de temps : 8 h", "Twice the time: 8 h"), go(500, 0.75, 0.9, 15, -1.5, -18, 8), t2("L’énergie à retirer n’a pas bougé, c’est juste : seule la puissance moyenne est divisée par deux.", "The energy to remove has not moved, which is correct: only the average power is halved.")],
      [t2("Deux fois moins de masse", "Half the mass"), go(250, 0.75, 0.9, 15, -1.5, -18, 4), t2("Δh est par kilo et ne change pas : seule la puissance est divisée par deux.", "Δh is per kilogram and does not change: only the power is halved.")],
      [t2("Produit pauvre en eau : 50 %", "Low-water product: 50%"), go(500, 0.5, 0.9, 15, -1.5, -18, 4), t2("Moins d’eau à geler : le palier raccourcit et la puissance baisse.", "Less water to freeze: the plateau shortens and the power falls.")],
      [t2("Surgélation à −40 °C", "Deep-freezing to −40 °C"), go(500, 0.75, 0.9, 15, -1.5, -40, 4), t2("Descendre plus bas ajoute peu : le produit congelé a une capacité thermique faible et la chaleur latente reste en tête.", "Going lower adds little: the frozen product has a low heat capacity and latent heat stays ahead.")]
    ]);
    var W = 640, H = 250, L0 = 60, R0 = 150, T0 = 16, B0 = 46;
    var play = h("button", { type: "button", "class": "ct-btn" }, tr("▶ Congeler")); box.appendChild(play);
    var sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg ct-wide", role: "img", "aria-label": tr("Température du produit selon l'énergie extraite, et le produit qui gèle"), style: "max-height:340px" }, box);
    var cM = slider(tr("Masse (kg)"), 10, 2000, 10, 500, function (v) { return f(v, 0) + " kg"; }),
        cW = slider(tr("Teneur en eau w"), 0.5, 0.95, 0.01, 0.75, function (v) { return f(v * 100, 0) + PC; }),
        cG = slider(tr("Part de l'eau gelée g"), 0.6, 1, 0.01, 0.9, function (v) { return f(v * 100, 0) + PC; }),
        cTi = slider(t2("Température initiale Ti", "Initial temperature Ti"), 0, 40, 1, 15, function (v) { return f(v, 0) + " °C"; }),
        cTc = slider(tr("Début de congélation Tc (°C)"), -5, 0, 0.1, -1.5, function (v) { return f(v, 1) + " °C"; }),
        cTf = slider(tr("Température finale Tf (°C)"), -40, -5, 1, -18, function (v) { return f(v, 0) + " °C"; }),
        cDt = slider(tr("Durée Δt (h)"), 0.5, 24, 0.5, 4, function (v) { return f(v, 1) + " h"; });
    var ctl = h("div", { "class": "ct-ctl" }); [cM, cW, cG, cTi, cTc, cTf, cDt].forEach(function (c) { ctl.appendChild(c.w); }); box.appendChild(ctl);
    var bar = h("div", { "class": "ct-stack", "aria-hidden": "true" }); box.appendChild(bar);
    var leg = h("p", { "class": "muted ct-leg3" }, tr('<span class="k1"></span>1. refroidir le produit frais &nbsp; <span class="k2"></span>2. geler l\'eau (chaleur latente) &nbsp; <span class="k3"></span>3. refroidir le produit congelé'));
    box.appendChild(leg);
    box.appendChild(h("p", { "class": "muted", style: "margin:4px 0" }, t2("La masse et la durée ne déplacent pas la courbe : elle est tracée par kilo de produit. Elles ne changent que la puissance moyenne, affichée ci-dessous.", "Mass and duration do not move the curve: it is drawn per kilogram of product. They change only the average power, shown below.")));
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    seeAlso(box, [LINK.biot, LINK.cop]);
    var u = 1, timer = null, r, Ti, Tc, Tf, g;
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = tr("▶ Congeler"); }
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
      el("line", { x1: L0, x2: W - R0, y1: Y(0), y2: Y(0), stroke: "#9fb0c0" }, sv);
      el("text", { x: W - R0 + 4, y: Y(0) + 4, "class": "ct-axl" }, sv).textContent = "0 °C";
      [hi, Tc, lo].forEach(function (t) { el("text", { x: L0 - 6, y: Y(t) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = f(t, t === Tc ? 1 : 0) + "°"; });
      var gap = SMALL ? 70 : 28, lastX = -1e9;
      [0, r.a, r.a + r.b].forEach(function (e) { if (X(e) - lastX < gap || (e && X(r.dh) - X(e) < gap)) return; lastX = X(e); el("text", { x: X(e), y: H - B0 + 16, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = f(e, 0); });
      el("text", { x: X(r.dh), y: H - B0 + 16, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = f(r.dh, 0);
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
    [cM, cW, cG, cTi, cTc, cTf, cDt].forEach(function (c) { c.i.addEventListener("input", draw); c.i.addEventListener("input", bar0.clear); }); draw(); bar0.select(0);
  }

  function cop(box) {
    box.appendChild(h(ht(box), {}, tr("Machine frigorifique : combien de travail pour extraire 1 kJ de chaleur au froid ?")));
    box.appendChild(h("p", { "class": "muted" }, t2("Entre −10 °C et +40 °C, une machine frigorifique extrait au mieux 5,26 J de chaleur par joule de travail (le COP, coefficient de performance) ; entre −40 °C et +20 °C, au mieux 3,89 J. Plus l’écart de température grandit, plus le froid coûte cher. Cette limite de Carnot est un maximum : aucune machine réelle ne l’atteint.", "Between −10 °C and +40 °C, a refrigerator extracts at best 5.26 J of heat per joule of work (the COP, coefficient of performance); between −40 °C and +20 °C, at best 3.89 J. The wider the temperature gap, the more cold costs. This Carnot limit is a maximum: no real machine attains it.")));
    symbols(box, EN ? "COP means coefficient of performance: COP = Qcold/W. The Carnot limit is COPC = Tcold/(Thot − Tcold) in kelvins. In the energy balance, Qcold is heat extracted from the cold side (evaporator), Qhot heat rejected to the hot side (condenser) and W work supplied. They are amounts of energy, not temperatures; the reservoir temperatures are converted to kelvins for the Carnot formula." : "COP signifie coefficient de performance : COP = Qf/W. La limite de Carnot vaut COPC = Tf/(Tc − Tf) en kelvins, avec Tf la source froide et Tc la source chaude. Dans le bilan, Qf est la chaleur extraite au froid (évaporateur), Qc la chaleur rejetée au chaud (condenseur) et W le travail fourni. Ce sont des énergies, pas des températures ; les températures des sources sont converties en kelvins pour la formule de Carnot.");
    function go(tf, tc) { return function () { setv(cF, tf); setv(cC, tc); }; }
    var bar = presets(box, [
      [t2("Froid −10 °C, chaud +40 °C", "Cold −10 °C, hot +40 °C"), go(-10, 40), t2("263,15/50 = 5,26 : au plus 5,26 J extraits pour 1 J de travail.", "263.15/50 = 5.26: at most 5.26 J removed per 1 J of work.")],
      [t2("Froid −40 °C, chaud +20 °C", "Cold −40 °C, hot +20 °C"), go(-40, 20), t2("233,15/60 = 3,89 : un écart plus grand, donc plus de travail pour la même chaleur.", "233.15/60 = 3.89: a wider gap, so more work for the same heat.")],
      [t2("Conserver : 0 °C, local à +30 °C", "Chill: 0 °C, room at +30 °C"), go(0, 30), t2("Un écart de 30 K seulement : le COP maximal dépasse 9.", "A gap of only 30 K: the maximum COP exceeds 9.")],
      [t2("Surgeler : −30 °C, local à +30 °C", "Deep-freeze: −30 °C, room at +30 °C"), go(-30, 30), t2("Même local, écart doublé : le COP maximal tombe à environ 4.", "Same room, gap doubled: the maximum COP falls to about 4.")],
      [t2("Écart minimal : +10 °C et +20 °C", "Smallest gap: +10 °C and +20 °C"), go(10, 20), t2("Quand l’écart tend vers zéro, la limite s’envole : c’est mathématiquement juste, pas un appareil réel.", "As the gap tends to zero, the limit soars: this is mathematically correct, not a real appliance.")],
      [t2("Écart maximal : −40 °C et +60 °C", "Largest gap: −40 °C and +60 °C"), go(-40, 60), t2("100 K d’écart : le COP maximal n’est plus que de 2,33.", "A 100 K gap: the maximum COP is only 2.33.")]
    ]);
    box.appendChild(h("p", { "class": "muted", style: "margin:4px 0" }, t2("Courbe : COP maximal selon la source froide, de −40 à +10 °C, pour la source chaude choisie. Point orange : votre réglage. À droite : bilan pour 1 kJ extrait, largeurs proportionnelles aux énergies.", "Curve: maximum COP against the cold side, from −40 to +10 °C, for the chosen hot side. Orange dot: your setting. Right: balance for 1 kJ removed, widths proportional to energies.")));
    var W = 640, H = 230, L0 = 60, R0 = 240, T0 = 14, B0 = 46;
    var sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg ct-wide", role: "img", "aria-label": tr("COP de Carnot selon la température d'évaporation, et bilan d'énergie"), style: "max-height:320px" }, box);
    var cF = slider(tr("Source froide Tf (°C)"), -40, 10, 1, -10, function (v) { return f(v, 0) + " °C"; }),
        cC = slider(tr("Source chaude Tc (°C)"), 20, 60, 1, 40, function (v) { return f(v, 0) + " °C"; });
    var ctl = h("div", { "class": "ct-ctl" }); ctl.appendChild(cF.w); ctl.appendChild(cC.w); box.appendChild(ctl);
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    seeAlso(box, [LINK.engine, LINK.congel, LINK.biot]);
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
      el("text", { x: bx + 40, y: 95 - ww / 2 - 6, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = (SMALL ? "W = " : tr("travail W = ")) + f(w1, 2) + " kJ";
      out.innerHTML = tr("COP de Carnot = <b>") + f(c, 2) + tr("</b> : pour extraire 1 kJ au froid, il faut au moins <b>") + f(w1, 2) + tr(" kJ de travail</b>, et le condenseur rejette ") + f(1 + w1, 2) +
        tr(" kJ au chaud. Écart Tc − Tf = ") + f(tc - tf, 0) + t2(" K : plus l’écart grandit, plus la bande verte (travail) s’épaissit. Surgeler coûte donc plus cher que conserver au frais.", " K: as the gap grows, the green band (work) gets thicker. Deep-freezing therefore requires more work per unit of heat removed than chilled storage.");
    }
    [cF, cC].forEach(function (c) { c.i.addEventListener("input", draw); c.i.addEventListener("input", bar.clear); }); draw(); bar.select(0);
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
    box.appendChild(h("p", { "class": "muted" }, t2("Un seul point peut changer la droite et le coefficient r (la corrélation, de −1 à 1) de tout un nuage, à condition d’être loin en x (sur l’axe horizontal) et hors de la tendance (hors de l’alignement des autres points). Douze points d’exemple restent fixes ; déplacez le point orange.", "One point can change the line and the coefficient r (the correlation, from −1 to 1) of a whole scatter, provided it lies far away in x (on the horizontal axis) and off the trend (off the alignment of the other points). Twelve example points stay fixed; move the orange point.")));
    symbols(box, EN ? "x and y are the two coordinates of a point. r = cov(x, y)/(sx·sy) is their Pearson correlation, cov their covariance, and sx and sy their standard deviations. The least-squares line is y = b₀ + b₁·x, with slope b₁ and intercept b₀. n is the number of included points and t = r·√(n − 2)/√(1 − r²) the zero-correlation test statistic, with n − 2 degrees of freedom (df). r² describes variation explained by this line; the p-value establishes neither causality nor future predictive performance." : "x et y sont les deux coordonnées d’un point. r = cov(x, y)/(sx·sy) est leur corrélation de Pearson, cov leur covariance et sx et sy leurs écarts-types. La droite des moindres carrés est y = b₀ + b₁·x, de pente b₁ et d’ordonnée à l’origine b₀. n est le nombre de points inclus et t = r·√(n − 2)/√(1 − r²) la statistique du test de corrélation nulle, à n − 2 degrés de liberté (ddl). r² décrit la variation expliquée par cette droite ; la p-value n’établit ni causalité ni performance prédictive future.");
    var BX = [1.2, 1.9, 2.4, 3.1, 3.6, 4.2, 4.9, 5.5, 6.1, 6.8, 7.4, 8.0],
        BY = [2.6, 2.1, 3.5, 3.2, 4.4, 3.9, 5.1, 4.6, 5.9, 5.4, 6.6, 6.2];
    var r0 = CT.regress(BX, BY);
    function go(x, y, on) { return function () { setv(cX, x); setv(cY, y); chk.checked = on; chk.dispatchEvent(new Event("change")); }; }
    var bar = presets(box, [
      [t2("Loin en x, hors tendance", "Far in x, off the trend"), go(9.5, 1, true), t2("Le point tire la droite vers lui : la pente et r chutent. C’est l’effet de levier : le poids d’un point éloigné sur la droite.", "The point pulls the line towards it: the slope and r fall. This is leverage: the pull of a distant point on the line.")],
      [t2("Loin en x, dans la tendance", "Far in x, on the trend"), go(9.5, Math.round(10 * (r0.b0 + 9.5 * r0.b1)) / 10, true), t2("Même éloignement, mais il confirme la relation : la droite ne bouge presque pas et r monte. Éloigné ne veut pas dire influent.", "Same distance, but it confirms the relationship: the line hardly moves and r rises. Far away does not mean influential.")],
      [t2("Au centre, hors tendance", "At the center, off the trend"), go(4.5, 9, true), t2("Grand écart vertical, peu de levier : la pente bouge peu, mais r baisse quand même.", "Large vertical gap, little leverage: the slope barely moves, but r still falls.")],
      [t2("Sans le point orange", "Without the orange point"), go(9.5, 1, false), t2("Les douze points seuls : c’est la droite grise de référence.", "The twelve points alone: this is the grey reference line.")]
    ]);
    var W = 320, H = 210, sv = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "ct-svg", role: "img", "aria-label": tr("Nuage de points et droite de régression"), style: "max-height:340px" }, box);
    var cX = slider(tr("x du point orange"), 0, 10, 0.1, 9.5, function (v) { return f(v, 1); }),
        cY = slider(tr("y du point orange"), 0, 10, 0.1, 1, function (v) { return f(v, 1); }),
        cOn = h("label", { "class": "ct-sl" }, tr('<span>Inclure le point orange</span>'));
    var chk = h("input", { type: "checkbox", checked: "" }); cOn.appendChild(chk);
    var ctl = h("div", { "class": "ct-ctl" }); [cX, cY].forEach(function (c) { ctl.appendChild(c.w); }); ctl.appendChild(cOn); box.appendChild(ctl);
    box.appendChild(h("p", { "class": "muted", style: "margin:6px 0" }, t2('<span style="color:var(--muted);font-weight:700">━</span> droite sans le point orange &nbsp; <span style="color:var(--link);font-weight:700">━</span> droite avec le point orange &nbsp; · axes x et y sans unité (valeurs d’exemple)', '<span style="color:var(--muted);font-weight:700">━</span> line without the orange point &nbsp; <span style="color:var(--link);font-weight:700">━</span> line with the orange point &nbsp; · x and y axes unitless (example values)')));
    var out = h("p", { "class": "ct-out", "aria-live": "polite" }); box.appendChild(out);
    seeAlso(box, [LINK.corr, LINK.interv]);
    var X = function (v) { return 30 + (W - 40) * v / 10; }, Y = function (v) { return H - 24 - (H - 34) * v / 10; };
    el("line", { x1: 30, y1: Y(0), x2: W - 10, y2: Y(0), "class": "ct-ax" }, sv); el("line", { x1: 30, y1: Y(0), x2: 30, y2: Y(10), "class": "ct-ax" }, sv);
    [0, 5, 10].forEach(function (v) { el("text", { x: X(v), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = v; el("text", { x: 24, y: Y(v) + 4, "class": "ct-axl", "text-anchor": "end" }, sv).textContent = v; });
    el("text", { x: X(7.5), y: H - 8, "class": "ct-axl", "text-anchor": "middle" }, sv).textContent = "x"; el("text", { x: 12, y: Y(7.5), "class": "ct-axl" }, sv).textContent = "y";
    var base = el("line", { "class": "ct-l1" }, sv), line = el("line", { "class": "ct-l2" }, sv);
    BX.forEach(function (x, i) { var c = el("circle", { cx: X(x), cy: Y(BY[i]), r: 4, "class": "ct-dot" }, sv); c.style.fill = "var(--ink)"; c.style.fillOpacity = ".75"; });
    var pt = el("circle", { r: 6, "class": "ct-pt" }, sv);
    base.setAttribute("x1", X(0)); base.setAttribute("x2", X(10)); base.setAttribute("y1", Y(r0.b0)); base.setAttribute("y2", Y(r0.b0 + 10 * r0.b1));
    function draw() {
      var on = chk.checked, px = +cX.i.value, py = +cY.i.value;
      var XS = on ? BX.concat([px]) : BX, YS = on ? BY.concat([py]) : BY, r = CT.regress(XS, YS);
      line.setAttribute("x1", X(0)); line.setAttribute("x2", X(10)); line.setAttribute("y1", Y(r.b0)); line.setAttribute("y2", Y(r.b0 + 10 * r.b1));
      pt.setAttribute("cx", X(px)); pt.setAttribute("cy", Y(py)); pt.style.opacity = on ? 1 : 0.25;
      var pv = r.p < 1e-4 ? r.p.toExponential(1).replace(".", EN ? "." : ",") : f(r.p, 4);
      var slope = (r.b1 < 0 ? " − " : " + ") + f(Math.abs(r.b1), 3);
      var inside = px >= BX[0] && px <= BX[BX.length - 1];
      out.innerHTML = "n = " + r.n + " · r = <b>" + f(r.r, 3) + "</b> · r² = <b>" + f(r.r2, 3) + tr("</b> · droite y = ") + f(r.b0, 2) + slope + "·x<br>t = " + f(r.t, 2) +
        " (" + (r.n - 2) + tr(" ddl) · p = <b>") + pv + "</b> " + (r.p < 0.05 ? tr("(lien significatif au risque 5 %)") : tr("(pas significatif au risque 5 %)")) +
        tr("<br>Sans le point orange : r = ") + f(r0.r, 3) + t2(", pente = ", ", slope = ") + f(r0.b1, 3) + (on ? (inside ? t2(". Ce point reste dans l’étendue des x : il a moins de levier sur la pente. Regardez toujours le nuage avant de conclure.", ". This point stays within the range of x: it has less leverage on the slope. Always inspect the scatter plot before drawing conclusions.") : t2(". Ce point est au-delà des autres x : il a beaucoup de levier sur la pente. Regardez toujours le nuage avant de conclure.", ". This point lies beyond the other x values: it has strong leverage on the slope. Always inspect the scatter plot before drawing conclusions.")) : ".");
    }
    [cX, cY].forEach(function (c) { c.i.addEventListener("input", draw); c.i.addEventListener("input", bar.clear); }); chk.addEventListener("change", draw); chk.addEventListener("change", bar.clear); draw(); bar.select(0);
  }

  var T = { roc: roc, normal: normal, atten: atten, biot: biot, congel: congel, cop: cop, regr: regr };
  function init() {
    var bs = document.querySelectorAll(".ctool[data-tool]");
    for (var i = 0; i < bs.length; i++) { var b = bs[i], fn = T[b.getAttribute("data-tool")]; if (fn && !b.childNodes.length) fn(b); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
