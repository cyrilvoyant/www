/* Course-only statistical tools. Requires course-tools.js (window.CT).
   No external library, tracking, upload, random research result or server call.
   Pure numerical functions are exposed as window.CS for independent SciPy checks. */
(function () {
  'use strict';
  var M = window.CS = {}, C = window.CT;
  function logGamma(z) {
    var a = [676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
    z -= 1; var x=.99999999999980993;
    for (var i=0;i<a.length;i++) x+=a[i]/(z+i+1);
    var t=z+7.5; return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
  }
  M.density = function(t,df) { return Math.exp(logGamma((df+1)/2)-logGamma(df/2)-.5*Math.log(df*Math.PI)-(df+1)/2*Math.log1p(t*t/df)); };
  M.critical = function(alpha,df) {
    var lo=0,hi=1;
    while(C.tTwoSided(hi,df)>alpha && hi<1e8) hi*=2;
    for(var i=0;i<75;i++){var mid=(lo+hi)/2;if(C.tTwoSided(mid,df)>alpha)lo=mid;else hi=mid;}
    return (lo+hi)/2;
  };
  M.student = function(mode,d,s1,n1,s2,n2,alpha) {
    if(!['one','paired','welch','pooled'].includes(mode) || !Number.isFinite(d) || !(s1>0) || !Number.isFinite(s1) || !Number.isInteger(n1) || n1<2 || !(alpha>0 && alpha<1)) throw Error('Paramètres invalides.');
    var se,df;
    if(mode==='one'||mode==='paired'){se=s1/Math.sqrt(n1);df=n1-1;}
    else {
      if(!(s2>0) || !Number.isFinite(s2) || !Number.isInteger(n2) || n2<2)throw Error('Second groupe invalide.');
      if(mode==='pooled'){var sp=((n1-1)*s1*s1+(n2-1)*s2*s2)/(n1+n2-2);se=Math.sqrt(sp*(1/n1+1/n2));df=n1+n2-2;}
      else{var a=s1*s1/n1,b=s2*s2/n2;se=Math.sqrt(a+b);df=(a+b)*(a+b)/(a*a/(n1-1)+b*b/(n2-1));}
    }
    var t=d/se,q=M.critical(alpha,df),p=C.tTwoSided(t,df);
    return {difference:d,se:se,df:df,t:t,p:p,critical:q,lo:d-q*se,hi:d+q*se};
  };
  M.correlation = function(r,n) {
    if(!Number.isFinite(r)||Math.abs(r)>=1||!Number.isInteger(n)||n<3)throw Error('r doit être entre −1 et 1, n ≥ 3.');
    var t=r*Math.sqrt((n-2)/(1-r*r)); return {r:r,r2:r*r,n:n,t:t,p:C.tTwoSided(t,n-2)};
  };
  // Fixed-seed normal coordinates, centred and orthogonalized: exact r by design.
  // Conditioning on r means this is an illustration, not an inferential sample.
  M.cloud = function(r,n) {
    var X=[],E=[],Y=[],seed=42137;
    function uniform(){seed=(1664525*seed+1013904223)>>>0;return(seed+.5)/4294967296;}
    for(var i=0;i<n;i++){var a=Math.sqrt(-2*Math.log(uniform())),b=2*Math.PI*uniform();X.push(a*Math.cos(b));E.push(a*Math.sin(b));}
    var mx=X.reduce(function(a,b){return a+b;},0)/n,me=E.reduce(function(a,b){return a+b;},0)/n,xx=0,xe=0;
    for(i=0;i<n;i++){X[i]-=mx;E[i]-=me;xx+=X[i]*X[i];xe+=X[i]*E[i];}
    var ee=0;for(i=0;i<n;i++){E[i]-=xe/xx*X[i];ee+=E[i]*E[i];}
    for(i=0;i<n;i++){X[i]*=Math.sqrt(n/xx);E[i]*=Math.sqrt(n/ee);Y.push(r*X[i]+Math.sqrt(1-r*r)*E[i]);}
    return {x:X,y:Y};
  };
  // Upper regularized incomplete gamma: series below a+1, continued fraction above.
  M.gammaQ = function(a,x){
    if(!(a>0)||x<0||!Number.isFinite(a)||!Number.isFinite(x))throw Error('Gamma : arguments invalides.');
    if(x===0)return 1;
    var factor=Math.exp(a*Math.log(x)-x-logGamma(a)),j;
    if(x<a+1){var term=1/a,sum=term;for(j=1;j<2000;j++){term*=x/(a+j);sum+=term;if(Math.abs(term)<Math.abs(sum)*1e-14)break;}return Math.max(0,Math.min(1,1-factor*sum));}
    var b=x+1-a,c=1e300,d=1/b,h=d;
    for(j=1;j<2000;j++){var an=-j*(j-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;var delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-14)break;}
    return Math.max(0,Math.min(1,factor*h));
  };
  M.chisquare = function(mode,observed){
    if(!['fit','independence'].includes(mode)||!Array.isArray(observed)||observed.length<2||observed.some(function(x){return !Number.isSafeInteger(x)||x<0;}))throw Error('Effectifs entiers positifs ou nuls requis.');
    var N=observed.reduce(function(a,b){return a+b;},0),expected,df;
    if(!N)throw Error('Le total doit être strictement positif.');
    if(mode==='fit'){expected=observed.map(function(){return N/observed.length;});df=observed.length-1;}
    else{
      if(observed.length!==4)throw Error('Tableau 2×2 requis.');
      var r=[observed[0]+observed[1],observed[2]+observed[3]],c=[observed[0]+observed[2],observed[1]+observed[3]];
      if(r.concat(c).some(function(x){return x===0;}))throw Error('Une marge est nulle : le test 2×2 n’est pas défini.');
      expected=[r[0]*c[0]/N,r[0]*c[1]/N,r[1]*c[0]/N,r[1]*c[1]/N];df=1;
    }
    var contributions=observed.map(function(x,i){return (x-expected[i])*(x-expected[i])/expected[i];}),stat=contributions.reduce(function(a,b){return a+b;},0);
    return {stat:stat,df:df,p:M.gammaQ(df/2,stat/2),N:N,expected:expected,contributions:contributions,small:Math.min.apply(null,expected)<5};
  };
  M.regressionInterval = function(n,se,xbar,sxx,b0,b1,x0,alpha){
    if(!Number.isInteger(n)||n<3||!(se>0)||!(sxx>0)||!(alpha>0&&alpha<1)||![se,xbar,sxx,b0,b1,x0].every(Number.isFinite))throw Error('Paramètres de régression invalides.');
    var q=M.critical(alpha,n-2),leverage=1/n+(x0-xbar)*(x0-xbar)/sxx,mean=b0+b1*x0,cm=q*se*Math.sqrt(leverage),cp=q*se*Math.sqrt(1+leverage);
    return {mean:mean,confidence:cm,prediction:cp,loMean:mean-cm,hiMean:mean+cm,loPrediction:mean-cp,hiPrediction:mean+cp,df:n-2};
  };
  var EN = document.documentElement.lang === "en";
  var TEXT_EN = {"Paramètres invalides.": "Invalid parameters.", "Second groupe invalide.": "Invalid second group.", "r doit être entre −1 et 1, n ≥ 3.": "r must lie between −1 and 1, n ≥ 3.", "Gamma : arguments invalides.": "Gamma: invalid arguments.", "Effectifs entiers positifs ou nuls requis.": "Nonnegative integer counts are required.", "Le total doit être strictement positif.": "The total must be strictly positive.", "Tableau 2×2 requis.": "A 2×2 table is required.", "Une marge est nulle : le test 2×2 n’est pas défini.": "A margin is zero: the 2×2 test is undefined.", "Paramètres de régression invalides.": "Invalid regression parameters.", "Deux traitements : leurs moyennes diffèrent-elles vraiment ?": "Two treatments: do their means really differ?", "baisse de la pression systolique après 8 semaines": "reduction in systolic blood pressure after 8 weeks", "Lésion GFI gauche": "Left IFG lesion", "Lésion GFI droit": "Right IFG lesion", "score de dénomination de patients atteints d’une lésion du GFI, l’aire de Broca (exemple du cours)": "naming score in patients with a lesion of the inferior frontal gyrus (IFG), Broca’s area (course example)", "Exemple du cours, diapositives 94 à 97 : n = 12 par groupe, moyennes 36 et 70,25, variances 88,73 et 22,02 ; le cours trouve t = −11,27 pour 22 ddl.": "Course example, slides 94–97: n = 12 per group, means 36 and 70.25, variances 88.73 and 22.02; the course gives t = −11.27 with 22 degrees of freedom.", "Exemple du cours : lésions de l’aire de Broca (diapositives 94 à 97)": "Course example: Broca’s area lesions (slides 94–97)", "Écart-type groupe 1": "Group 1 standard deviation", "Écart-type groupe 2": "Group 2 standard deviation", "Patients par groupe n": "Patients per group n", "1. Les deux groupes": "1. The two groups", "2. Le test de Student": "2. The Student test", "Distributions des deux groupes : patients et moyennes": "Two group distributions: patients and means", "Loi de Student sous H₀, seuil du cours et t observé": "Student distribution under H₀, critical value and observed t", "Écart-type ": "Standard deviation ", ", écart-type ": ", standard deviation ", " patients par groupe. ": " patients per group. ", "1. Écart des moyennes Δ": "1. Difference between means Δ", "2. Écart-type commun sₚ": "2. Pooled standard deviation sₚ", "Erreur standard de Δ": "Standard error of Δ", "3. t calculé": "3. Computed t", "p-value bilatérale": "Two-sided p-value", "t calculé = ": "computed t = ", "Sous H₀ (moyennes égales) : loi de Student à ": "Under H₀ (equal population means): Student distribution with ", " ddl ; zones orange : 5 % des cas au total": " df; orange tails: 5% of cases in total", "|t calculé| = ": "|computed t| = ", ", α = 0,05) : H₀ rejetée. Les moyennes de ": ", α = 0.05): H₀ rejected. The means of ", " diffèrent significativement.": " differ significantly.", ", α = 0,05) : H₀ non rejetée. L’écart observé peut s’expliquer par le hasard ; cela ne prouve pas que les traitements sont équivalents.": ", α = 0.05): H₀ not rejected. The observed difference is compatible with sampling variation; this does not establish treatment equivalence.", "Calcul du cours : sₚ = √{[(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2)} = ": "Course calculation: sₚ = √{[(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2)} = ", "Un lien significatif explique-t-il beaucoup ?": "Does a significant relationship explain much?", "Corrélation r du nuage construit": "Correlation r of the constructed cloud", "Nuage construit, droite ajustée et distances résiduelles": "Constructed scatterplot, fitted line and residual distances", "Décomposition de la variation totale": "Decomposition of total variation", "Fort lien négatif": "Strong negative relationship", "Formules du chapitre : t = r√[(n−2)/(1−r²)], ν = n−2 ; R² = SSR/SST = 1−SSE/SST = r² en régression simple avec constante. SST = Σ(yi−ȳ)², SSE = Σ(yi−ŷi)², SSR = Σ(ŷi−ȳ)². Les traits verticaux montrent quelques résidus.": "Chapter equations: t = r√[(n−2)/(1−r²)], ν = n−2; R² = SSR/SST = 1−SSE/SST = r² for simple regression with an intercept. SST = Σ(yi−ȳ)², SSE = Σ(yi−ŷi)², SSR = Σ(ŷi−ȳ)². Vertical segments show selected residuals.", "Corrélation r": "Correlation r", "Variation expliquée R²": "Explained variation R²", "p-value du test de corrélation": "Correlation-test p-value", " % expliqués, ": "% explained, ", " % résiduels": "% residual", " % · orange : variation résiduelle ": "% · orange: residual variation ", " (unités arbitraires au carré).": " (squared arbitrary units).", "χ² : où se trouve l’écart à l’hypothèse ?": "χ²: where is the departure from the hypothesis?", "Question posée": "Question", "Dé à six faces : équilibré ?": "Six-sided die: fair?", "Tableau 2×2 : variables indépendantes ?": "2×2 table: independent variables?", "Comparaison des effectifs observés et attendus sous H0": "Observed and expected counts under H₀", "Dé suspect : face 6 fréquente": "Suspect die: frequent face 6", "Observés = attendus": "Observed = expected", "Voir les faibles effectifs": "Show small counts", "Même répartition, effectifs ×4": "Same proportions, counts ×4", "χ² = Σ (O−E)²/E. Dé équilibré : probabilités fixées à 1/6, E=N/6 et 5 ddl ; pas de paramètre estimé. Indépendance : Eij = total ligne i × total colonne j / N, 1 ddl. Pearson sans correction de continuité ; pas de test exact ni de conclusion causale.": "χ² = Σ (O−E)²/E. Fair die: probabilities fixed at 1/6, E=N/6 and 5 df; no estimated parameter. Independence: Eij = row i total × column j total / N, 1 df. Pearson test without continuity correction; neither an exact test nor a causal conclusion.", "Valeurs de départ de l’exercice du cours (chapitre 3, diapositive 62) : 75/25 et 65/35. « Oui » et « non » reprennent les deux issues du tableau ; aucune recommandation médicale n’est déduite de cet exercice. H₀ : groupe et issue sont indépendants.": "Starting values from the course exercise (chapter 3, slide 62): 75/25 and 65/35. “Yes” and “no” represent the two table outcomes; this exercise gives no medical recommendation. H₀: group and outcome are independent.", "Saisir des effectifs entiers positifs ou nuls dans les plages indiquées.": "Enter nonnegative integer counts within the indicated ranges.", "χ² de Pearson": "Pearson χ²", "Degrés de liberté": "Degrees of freedom", "Observé O": "Observed O", "Contribution (O−E)²/E": "Contribution (O−E)²/E", "H₀ rejetée": "H₀ rejected", "H₀ non rejetée": "H₀ not rejected", " au seuil fixé de 5 %. ": " at the prespecified 5% level. ", "Les écarts à H₀ sont statistiquement détectables dans ce modèle.": "Departures from H₀ are statistically detectable under this model.", "Le test ne met pas en évidence un écart ; il ne prouve pas H₀.": "The test does not detect a departure; it does not prove H₀.", "Prévoir une moyenne ou une nouvelle observation ?": "Predict a mean or a new observation?", "Écart-type résiduel se": "Residual standard deviation se", "Valeur x₀ à prévoir": "Prediction input x₀", "Droite ajustée, bande de confiance de la moyenne et bande de prévision individuelle": "Fitted line, confidence band for the mean and individual prediction band", "À la limite des x observés": "At the observed x boundary", "IC95 de la moyenne : ŷ₀ ± t(0,975 ; n−2) se √[1/n+(x₀−x̄)²/Sxx]. IP95 individuel : ajouter 1 sous la racine. Sxx = Σ(xi−x̄)² ; se² = SSE/(n−2). Les bandes sont ponctuelles à 95 % pour un x fixé, pas des bandes simultanées à 95 % sur toute la courbe.": "95% CI for the mean: ŷ₀ ± t(0.975; n−2) se √[1/n+(x₀−x̄)²/Sxx]. Individual 95% PI: add 1 under the square root. Sxx = Σ(xi−x̄)²; se² = SSE/(n−2). These are pointwise 95% intervals for a fixed x, not simultaneous 95% bands for the whole curve.", "Moyenne prévue ŷ₀": "Predicted mean ŷ₀", "Attention : x₀ est hors du domaine observé. Les bandes calculées supposent que le modèle linéaire reste valable ; elles ne mesurent pas le risque de changement de relation. ": "Warning: x₀ lies outside the observed domain. The bands assume the linear model remains valid; they do not measure the risk of a changed relationship. ", "x₀ est dans le domaine observé. ": "x₀ is inside the observed domain. ", "Demi-largeur de l’IC : ": "CI half-width: ", ". L’incertitude est minimale près de x̄=0 ; une observation future conserve sa variabilité propre, même si la moyenne est bien estimée.": ". Uncertainty is smallest near x̄=0; a future observation retains its own variability even when the mean is well estimated.", "Traitement A": "Treatment A", "Traitement B": "Treatment B", "Moyenne groupe 1": "Group 1 mean", "Moyenne groupe 2": "Group 2 mean", "Moyenne ": "Mean ", "Question : ": "Question: ", " : moyenne ": ": mean ", "ddl = n₁ + n₂ − 2": "df = n₁ + n₂ − 2", "t table (α = 5 %)": "Critical t (α = 5%)", " > t table = ": " > critical t = ", " ≤ t table = ": " ≤ critical t = ", " (ddl = ": " (df = ", " et de ": " and ", "Effectif n": "Sample size n", "Groupe A : oui": "Group A: yes", "Groupe A : non": "Group A: no", "Groupe B : oui": "Group B: yes", "Groupe B : non": "Group B: no", "A oui": "A yes", "A non": "A no", "B oui": "B yes", "B non": "B no", "Effectif total": "Total count", "Cellule": "Cell", "Attendu E": "Expected E", "Nombre de points n": "Number of points n", "Au centre": "At the center", "En extrapolation": "Extrapolation", "IC95 moyenne": "95% mean CI", "IP95 individuel": "95% individual PI", " ; de l’IP : ": "; PI half-width: ", " ; ": "; ", " : ": ": ", "Exemple modifié : valeurs choisies par vous.": "Example modified: values chosen by you."};
  function trText(s){return EN && Object.prototype.hasOwnProperty.call(TEXT_EN,s)?TEXT_EN[s]:s;}
  var PC=EN?'%':' %', SMALL=!!(window.matchMedia&&window.matchMedia('(max-width:500px)').matches);   // phones: larger chart text (see .st-axis in stats-tools.css)
  var NS='http://www.w3.org/2000/svg';
  function node(tag,attrs,parent,text){var e=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,attrs[k]);});if(text!==undefined)e.textContent=text;if(parent)parent.appendChild(e);return e;}
  function svg(tag,attrs,parent,text){var e=document.createElementNS(NS,tag);Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,attrs[k]);});if(text!==undefined)e.textContent=text;if(parent)parent.appendChild(e);return e;}
  function num(x,d){if(!Number.isFinite(x))return '—';d=d===undefined?3:d;var s=x.toFixed(d);if(+s===0)s=(0).toFixed(d);return s.replace('.',EN?'.':',');}   // never "-0,000"
  function pv(x){return x<1e-8?'p < 10⁻⁸':'p = '+(x<.0001?x.toExponential(2):x.toFixed(4)).replace('.',EN?'.':',');}
  function control(parent,label,type,min,max,step,value){var w=node('label',{'class':'st-control'},parent);node('span',{},w,label);var i=node('input',{type:type,min:min,max:max,step:step,value:value},w);var o=node('output',{},w);function update(){o.textContent=type==='range'?num(+i.value,step<1?2:0):'';}i.addEventListener('input',update);update();return {w:w,i:i};}
  function heading(b,t,sub){node(b.closest('#experience')?'h2':'h3',{},b,t);node('p',{'class':'st-intro'},b,sub);}
  function note(b,text){return node('p',{'class':'st-note'},b,text);}
  function chart(parent,label,w,h){return svg('svg',{viewBox:'0 0 '+w+' '+h,role:'img','aria-label':label,'class':'st-svg'},parent);}
  function path(points){return points.map(function(p,i){return(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2);}).join(' ');}
  function metric(parent,label,value,hint){var d=node('div',{},parent);node('span',{},d,label);node('strong',{},d,value);if(hint)node('small',{},d,hint);}
  function tt(fr,en){return EN?en:fr;}
  // Presets set the controls by themselves and say, in one sentence, what the reader should conclude.
  function presetBar(b,items){
    var w=node('div',{'class':'st-presets',role:'group','aria-label':tt('Cas à essayer','Cases to try')},b),say=node('p',{'class':'st-case'},b),btns=[];say.hidden=true;
    function mark(bt,text){btns.forEach(function(x){x.setAttribute('aria-pressed',x===bt?'true':'false');});say.textContent=text||'';say.hidden=!text;}
    items.forEach(function(it){var bt=node('button',{type:'button','aria-pressed':'false'},w,it[0]);bt.addEventListener('click',function(){var r=it[1]();mark(bt,typeof r==='string'?r:it[2]);});btns.push(bt);});
    return {clear:function(){mark(null,'');},select:function(i){mark(btns[i],items[i][2]);}};
  }
  // Definitions next to the tool: native details, so keyboard and touch work without any script.
  function symbols(b,text){var d=node('details',{'class':'st-key'},b);node('summary',{},d,tt('Que veut dire chaque symbole ?','What does each symbol mean?'));node('p',{},d,text);}
  function keyLine(parent,items){var w=node('p',{'class':'st-legend'},parent);items.forEach(function(it){var s=node('span',{},w),i=node('i',{'aria-hidden':'true'},s);if(it[2])i.style.border='2px solid '+it[0];else i.style.background=it[0];s.appendChild(document.createTextNode(it[1]));});return w;}
  function seeAlso(b,items){var w=node('p',{'class':'st-links'},b);node('span',{},w,tt('À relier : ','Related: '));items.forEach(function(it,i){if(i)w.appendChild(document.createTextNode(' · '));node('a',{href:EN?'/tools/'+it[1]+'/':'/fr/animations/'+it[0]+'/'},w,EN?it[3]:it[2]);});}
  function setValue(c,v){c.i.value=v;c.i.dispatchEvent(new Event('input'));}
  var LINK={student:['test-student','student-t-test','test de Student','Student t-test'],chi:['test-khi-deux','chi-square-test','test du χ²','chi-square test'],corr:['correlation-significativite-r2','correlation-significance-r-squared','corrélation et R²','correlation and R²'],normal:['loi-normale','normal-distribution','loi normale','normal distribution'],interv:['intervalles-regression','regression-intervals','intervalles de régression','regression intervals'],regr:['point-influent-regression','influential-point-regression','point influent','influential point']};
  M.summarySample=function(mean,sd,n){var z=[],sum=0;for(var i=0;i<n;i++){var q=C.invPhi((i+.5)/n);z.push(q);sum+=q;}var center=sum/n,v=0;z.forEach(function(x){v+=(x-center)*(x-center);});var scale=sd/Math.sqrt(v/(n-1));return z.map(function(x){return mean+(x-center)*scale;});};
  function student(b){
    // Classic (pooled) Student test of the course (slides 92-93): two independent groups, s_p² = [(n₁−1)s₁²+(n₂−1)s₂²]/(n₁+n₂−2),
    // t = (x̄₁ − x̄₂)/(s_p √(1/n₁+1/n₂)), ddl = n₁+n₂−2, H₀ rejected when |t| > t_table. Engine: M.student('pooled', …) (checked).
    heading(b,trText('Deux traitements : leurs moyennes diffèrent-elles vraiment ?'),tt('Le même écart de 6 mmHg (millimètres de mercure, unité de pression artérielle) n’est pas significatif avec 4 patients par groupe, et le devient avec 12 : significatif veut dire peu compatible avec H₀, l’hypothèse de départ selon laquelle les deux traitements ont le même effet moyen. Le test compare l’écart des moyennes au hasard de l’échantillonnage, qui diminue quand les groupes grandissent.','The same 6 mmHg (millimeters of mercury, a unit of blood pressure) difference is not significant with 4 patients per group, and becomes so with 12: significant means hardly compatible with H₀, the starting hypothesis that both treatments have the same mean effect. The test compares the difference between means with sampling variation, which shrinks as groups grow.'));
    symbols(b,EN?'Δ is the difference between group means; s₁ and s₂ are group standard deviations and sₚ their pooled estimate. n₁ and n₂ are group sizes, both equal to the n control. H₀ assumes equal population means. t expresses Δ in standard-error units, df means degrees of freedom, and α = 5% is the rejection threshold. The p-value is a probability of results at least as extreme under H₀ and the test model, not the probability that H₀ is true.':'Δ est l’écart des moyennes ; s₁ et s₂ les écarts-types des groupes et sₚ leur estimation commune. n₁ et n₂ sont les effectifs, tous deux égaux au curseur n. H₀ suppose les moyennes des populations égales. t exprime Δ en unités d’erreur standard, ddl signifie degrés de liberté et α = 5 % est le seuil de rejet. La p-value est une probabilité de résultats au moins aussi extrêmes sous H₀ et le modèle du test, pas la probabilité que H₀ soit vraie.');
    var EX={
      hta:{a:trText('Traitement A'),b:trText('Traitement B'),u:'mmHg',q:trText('baisse de la pression systolique après 8 semaines'),xl:tt('baisse de pression (mmHg)','pressure reduction (mmHg)'),m1:14,s1:5,m2:8,s2:6,n:12,
           src:tt('Exemple construit pour l’exercice, valeurs fictives.','Constructed teaching example, fictitious values.')},
      gfi:{a:trText('Lésion GFI gauche'),b:trText('Lésion GFI droit'),u:'',q:trText('score de dénomination de patients atteints d’une lésion du GFI, l’aire de Broca (exemple du cours)'),xl:tt('score de dénomination','naming score'),m1:36,s1:9.4195,m2:70.25,s2:4.6928,n:12,
           src:trText('Exemple du cours, diapositives 94 à 97 : n = 12 par groupe, moyennes 36 et 70,25, variances 88,73 et 22,02 ; le cours trouve t = −11,27 pour 22 ddl.')}};
    var cur=EX.hta;
    var bar=presetBar(b,[
      [tt('Hypertension, 12 patients par groupe','Hypertension, 12 patients per group'),function(){load(EX.hta);},tt('L’écart de 6 mmHg dépasse le seuil du test : H₀ est rejetée.','The 6 mmHg difference exceeds the test threshold: H₀ is rejected.')],
      [tt('Même écart, 4 patients','Same difference, 4 patients'),function(){load(EX.hta,{n:4});},tt('Mêmes moyennes, mêmes écarts-types, mais trop peu de patients : le test ne conclut plus. Cela ne prouve pas que les traitements sont équivalents.','Same means, same standard deviations, but too few patients: the test no longer concludes. This does not establish equivalence.')],
      [tt('Même écart, 60 patients','Same difference, 60 patients'),function(){load(EX.hta,{n:60});},tt('L’écart n’a pas changé : seule sa précision s’est améliorée.','The difference has not changed: only its precision has improved.')],
      [tt('Patients très dispersés','Widely spread patients'),function(){load(EX.hta,{s1:25,s2:25});},tt('Toujours 6 mmHg, mais noyés dans une forte dispersion : H₀ n’est pas rejetée.','Still 6 mmHg, but lost in a large spread: H₀ is not rejected.')],
      [tt('Moyennes égales','Equal means'),function(){load(EX.hta,{m2:14});},tt('Aucun écart : t = 0 et p = 1, quel que soit le nombre de patients.','No difference: t = 0 and p = 1, whatever the number of patients.')],
      [trText('Exemple du cours : lésions de l’aire de Broca (diapositives 94 à 97)'),function(){load(EX.gfi);},tt('Un écart très grand devant sa précision : le t calculé sort largement du seuil, comme dans le cours.','A difference much larger than its precision: the computed t lies far beyond the threshold, as in the course.')]
    ]);
    var ctl=node('div',{'class':'st-controls'},b),m1=control(ctl,trText('Moyenne groupe 1'),'range',0,100,.25,14),s1=control(ctl,trText('Écart-type groupe 1'),'range',.5,30,.0001,5),
        m2=control(ctl,trText('Moyenne groupe 2'),'range',0,100,.25,8),s2=control(ctl,trText('Écart-type groupe 2'),'range',.5,30,.0001,6),n=control(ctl,trText('Patients par groupe n'),'range',3,60,1,12);
    // The slider keeps its 0.0001 step, so the course values stay exact; at the keyboard an arrow moves by 0.01, which the two-decimal display shows.
    [s1,s2].forEach(function(c){c.i.addEventListener('keydown',function(e){var d=(e.key==='ArrowRight'||e.key==='ArrowUp')?.01:(e.key==='ArrowLeft'||e.key==='ArrowDown')?-.01:0;if(!d)return;e.preventDefault();c.i.value=(+c.i.value+d).toFixed(4);c.i.dispatchEvent(new Event('input'));});});
    var story=node('p',{'class':'st-reading'},b);
    var metrics=node('div',{'class':'st-metrics','aria-live':'polite'},b);
    var pair=node('div',{'class':'st-pair'},b), left=node('div',{'class':'st-cell'},pair), right=node('div',{'class':'st-cell'},pair);   // 1×2: distributions | test (Cyril, 25/10)
    var subH=b.closest('#experience')?'h3':'h4';node(subH,{},left,trText('1. Les deux groupes'));node(subH,{},right,trText('2. Le test de Student'));
    var dist=chart(left,trText('Distributions des deux groupes : patients et moyennes'),640,322);
    var legend=note(left,'');
    var view=chart(right,trText('Loi de Student sous H₀, seuil du cours et t observé'),640,260);
    var viewCap=note(right,''), read=node('p',{'class':'st-reading'},right), steps=note(b,''), cond=note(b,'');
    seeAlso(b,[LINK.normal,LINK.chi,LINK.corr]);
    function load(e,over){cur=Object.assign({},e,over||{});m1.i.value=cur.m1;s1.i.value=cur.s1;m2.i.value=cur.m2;s2.i.value=cur.s2;n.i.value=cur.n;[m1,s1,m2,s2,n].forEach(function(c){c.i.dispatchEvent(new Event('input'));});}
    function normal(x,m,s){return Math.exp(-.5*((x-m)/s)*((x-m)/s))/(s*Math.sqrt(2*Math.PI));}
    function draw(){
      var a1=+m1.i.value,b1=+s1.i.value,a2=+m2.i.value,b2=+s2.i.value,nn=+n.i.value,u=cur.u?' '+cur.u:'';
      m1.w.firstChild.textContent=trText('Moyenne ')+cur.a;s1.w.firstChild.textContent=trText('Écart-type ')+cur.a;m2.w.firstChild.textContent=trText('Moyenne ')+cur.b;s2.w.firstChild.textContent=trText('Écart-type ')+cur.b;
      var r=M.student('pooled',a1-a2,b1,nn,b2,nn,.05), sp=Math.sqrt(((nn-1)*b1*b1+(nn-1)*b2*b2)/(2*nn-2));
      [[m1,a1],[s1,b1],[m2,a2],[s2,b2]].forEach(function(c){c[0].w.querySelector('output').textContent=num(c[1],2)+u;});
      var asExample=[[a1,cur.m1],[b1,cur.s1],[a2,cur.m2],[b2,cur.s2],[nn,cur.n]].every(function(c){return Math.abs(c[0]-c[1])<1e-9;});
      story.textContent=trText('Question : ')+cur.q+'. '+cur.a+trText(' : moyenne ')+num(a1,2)+u+trText(', écart-type ')+num(b1,2)+u+trText(' ; ')+cur.b+trText(' : moyenne ')+num(a2,2)+u+trText(', écart-type ')+num(b2,2)+u+trText(' ; ')+nn+trText(' patients par groupe. ')+(asExample?cur.src:trText('Exemple modifié : valeurs choisies par vous.'));
      // 1. the distributions: patients (wide filled curves, dots) and means (narrow unfilled curves, s/√n)
      dist.replaceChildren();
      var lo=Math.min(a1-3.2*b1,a2-3.2*b2),hi=Math.max(a1+3.2*b1,a2+3.2*b2),X=function(x){return 40+580*(x-lo)/(hi-lo);},base=230;
      var top=Math.max(normal(a1,a1,b1),normal(a2,a2,b2)),Yp=function(v){return base-120*v/top;};
      var topm=Math.max(normal(a1,a1,b1/Math.sqrt(nn)),normal(a2,a2,b2/Math.sqrt(nn))),Ym=function(v){return base-175*v/topm;};
      [[a1,b1,'#087e8b',cur.a],[a2,b2,'#c36d25',cur.b]].forEach(function(g,k){
        var pts=[],ptm=[];for(var j=0;j<=300;j++){var x=lo+(hi-lo)*j/300;pts.push([X(x),Yp(normal(x,g[0],g[1]))]);ptm.push([X(x),Ym(normal(x,g[0],g[1]/Math.sqrt(nn)))]);}
        svg('path',{d:path(pts)+'L'+X(hi)+' '+base+'L'+X(lo)+' '+base+'Z',fill:g[2],'fill-opacity':.14,stroke:g[2],'stroke-width':1.5},dist);
        svg('path',{d:path(ptm),fill:'none',stroke:g[2],'stroke-width':3},dist);
        M.summarySample(g[0],g[1],nn).forEach(function(x,i){svg('circle',{cx:X(x),cy:base+12+k*14+((i*7)%3-1)*2,r:3,fill:g[2],'fill-opacity':.75},dist);});
      });
      var yA=SMALL?72:52;svg('line',{x1:X(Math.min(a1,a2)),x2:X(Math.max(a1,a2)),y1:yA,y2:yA,stroke:'#193d5b','stroke-width':2},dist);
      [[a1,'#087e8b',cur.a,0],[a2,'#c36d25',cur.b,1]].forEach(function(g){
        var lblX=X(g[0]),lblA=(g[0]>=(g[3]?a1:a2))?'start':'end';if(SMALL){if(lblX<230)lblA='start';else if(lblX>410)lblA='end';}
        svg('text',{x:lblX,y:SMALL?20+g[3]*24:16+g[3]*16,'text-anchor':lblA,'class':'st-axis',fill:g[1],style:'fill:'+g[1]},dist,g[2]+trText(' : ')+num(g[0],1));
      });
      svg('text',{x:(X(a1)+X(a2))/2,y:yA-6,'text-anchor':'middle','class':'st-axis'},dist,'Δ = '+num(a1-a2,2)+u);
      [lo,(lo+hi)/2,hi].forEach(function(x,i){svg('text',{x:X(x),y:SMALL?288:282,'text-anchor':i?(i===2?'end':'middle'):'start','class':'st-axis'},dist,num(x,1));});
      svg('text',{x:320,y:SMALL?316:304,'text-anchor':'middle','class':'st-axis'},dist,cur.xl);
      var overlap=Math.abs(a1-a2)<2*Math.max(b1,b2);
      legend.textContent=tt('Ordonnée : densité de probabilité, en hauteur relative, sans graduation. ','Y-axis: probability density, relative height, not graduated. ')+tt('Courbes larges et colorées : répartition des patients de chaque groupe. Courbes étroites : précision de la moyenne du groupe (écart-type s/√n). Points : les '+nn+' patients de chaque groupe, valeurs construites pour retrouver exactement la moyenne et l’écart-type affichés. '+(overlap?'Les patients se chevauchent, mais le test ne lit pas ce chevauchement':'Le test ne lit pas le chevauchement des patients')+' : il compare Δ à son erreur standard, √(s₁²/n + s₂²/n). Des courbes étroites bien séparées annoncent un t grand ; seul t tranche.',
        'Wide coloured curves: distribution of patients in each group. Narrow curves: precision of the group mean (standard deviation s/√n). Dots: the '+nn+' patients in each group, values constructed to reproduce exactly the displayed mean and standard deviation. '+(overlap?'Patients overlap, but the test does not measure this overlap':'The test does not measure the overlap of patients')+': it compares Δ with its standard error, √(s₁²/n + s₂²/n). Well separated narrow curves suggest a large t; only t decides.');
      // 2. the three steps of the course
      metrics.replaceChildren();
      metric(metrics,trText('1. Écart des moyennes Δ'),num(r.difference,2)+u);
      metric(metrics,trText('2. Écart-type commun sₚ'),num(sp,2)+u,tt('dispersion commune estimée','estimated common spread'));
      metric(metrics,trText('Erreur standard de Δ'),num(r.se,3)+u,tt('incertitude sur l’écart Δ','uncertainty on the difference Δ'));
      metric(metrics,trText('3. t calculé'),num(r.t,2),tt('Δ divisé par son erreur standard','Δ divided by its standard error'));
      metric(metrics,trText('ddl = n₁ + n₂ − 2'),String(r.df),tt('degrés de liberté','degrees of freedom'));
      metric(metrics,trText('t table (α = 5 %)'),num(r.critical,3),tt('seuil à dépasser pour rejeter H₀ (α = 5 % : le risque accepté de rejeter H₀ à tort)','threshold to exceed to reject H₀ (α = 5%: the accepted risk of rejecting H₀ wrongly)'));
      metric(metrics,trText('p-value bilatérale'),pv(r.p),tt('écart au moins aussi grand si H₀ est vraie','a difference at least this large if H₀ holds'));
      // 3. Student density under H0
      view.replaceChildren();
      var span=Math.max(4.5,Math.min(13,Math.abs(r.t)+1),r.critical+1),XT=function(t){return 40+560*(t+span)/(2*span);},Y=function(z){return 213-420*z;};
      var pt=[];for(var j=0;j<=400;j++){var t=-span+2*span*j/400;pt.push([XT(t),Y(M.density(t,r.df))]);}
      [-1,1].forEach(function(sg){var q=[[XT(sg*r.critical),213]];for(var k=0;k<=150;k++){var t=sg*(r.critical+(span-r.critical)*k/150);q.push([XT(t),Y(M.density(t,r.df))]);}q.push([XT(sg*span),213]);svg('path',{d:path(q)+'Z',fill:'#f2b676'},view);});
      svg('path',{d:path(pt),fill:'none',stroke:'#193d5b','stroke-width':2.5},view);svg('line',{x1:40,y1:213,x2:600,y2:213,stroke:'#74869a'},view);
      [-r.critical,0,r.critical].forEach(function(t){svg('line',{x1:XT(t),y1:30,x2:XT(t),y2:213,stroke:t?'#b96a1c':'#acb8c3'},view);svg('text',{x:XT(t),y:SMALL&&!t?258:237,'text-anchor':'middle','class':'st-axis'},view,num(t,3));});
      var off=Math.abs(r.t)>span,sh=Math.max(-span,Math.min(span,r.t));svg('line',{x1:XT(sh),y1:40,x2:XT(sh),y2:213,stroke:'#087e8b','stroke-width':3},view);
      svg('text',{x:Math.max(SMALL?150:120,Math.min(SMALL?490:520,XT(sh))),y:30,'text-anchor':'middle','class':'st-axis'},view,trText('t calculé = ')+num(r.t,2)+(off?tt(' (hors échelle)',' (off scale)'):''));
      viewCap.textContent=trText('Sous H₀ (moyennes égales) : loi de Student à ')+r.df+trText(' ddl ; zones orange : 5 % des cas au total')+tt('. Abscisse : t, sans unité ; ordonnée : densité de probabilité.','. X-axis: t, unitless; Y-axis: probability density.');
      var rej=Math.abs(r.t)>r.critical;
      read.textContent=(rej?trText('|t calculé| = ')+num(Math.abs(r.t),2)+trText(' > t table = ')+num(r.critical,3)+trText(' (ddl = ')+r.df+trText(', α = 0,05) : H₀ rejetée. Les moyennes de ')+cur.a+trText(' et de ')+cur.b+trText(' diffèrent significativement.')
        :trText('|t calculé| = ')+num(Math.abs(r.t),2)+trText(' ≤ t table = ')+num(r.critical,3)+trText(' (ddl = ')+r.df+trText(', α = 0,05) : H₀ non rejetée. L’écart observé peut s’expliquer par le hasard ; cela ne prouve pas que les traitements sont équivalents.'));
      steps.textContent=trText('Calcul du cours : sₚ = √{[(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2)} = ')+num(sp,3)+trText(' ; ')+'t = Δ/(sₚ √(1/n₁ + 1/n₂)) = '+num(r.difference,2)+'/'+num(r.se,3)+' = '+num(r.t,3)+(a1!==a2?tt('. Essayez : augmentez n sans changer les moyennes, les courbes étroites se resserrent et |t| grandit.','. Try increasing n without changing the means: the narrow curves tighten and |t| increases.'):tt('. Écart nul : t reste à 0 quel que soit n, c’est mathématiquement juste.','. Zero difference: t stays at 0 whatever n; this is mathematically correct.'));
      var ratio=Math.max(b1,b2)*Math.max(b1,b2)/(Math.min(b1,b2)*Math.min(b1,b2));
      cond.textContent=tt('Conditions du cours : groupes indépendants, distributions proches de la loi normale, variances homogènes (ici, rapport des variances = '+num(ratio,2)+'). Si elles diffèrent nettement, le cours passe au dénominateur √(s₁²/n₁ + s₂²/n₂) ; avec n₁ = n₂, le t est le même. Mêmes patients avant et après : test apparié, sur les différences.','Course assumptions: independent groups, approximately normal distributions, equal variances (here, variance ratio = '+num(ratio,2)+'). If variances differ markedly, the course uses the denominator √(s₁²/n₁ + s₂²/n₂); when n₁ = n₂, t is unchanged. Same patients before and after: paired test on the differences.');
    }
    [m1,s1,m2,s2,n].forEach(function(c){c.i.addEventListener('input',draw);c.i.addEventListener('input',bar.clear);});draw();bar.select(0);
  }
  function determination(b){
    heading(b,trText('Un lien significatif explique-t-il beaucoup ?'),tt('Avec 1 000 points, une corrélation de 0,10 devient significative alors que la droite n’explique que 1 % de la variation. La p-value (la probabilité d’un lien au moins aussi fort si les deux grandeurs étaient indépendantes) dit si un lien se distingue du hasard, R² (la part de la variation décrite par la droite) dit combien il pèse ; le signe de r (la corrélation, de −1 à 1) donne seulement le sens.','With 1,000 points, a correlation of 0.10 becomes significant although the line explains only 1% of the variation. The p-value (the probability of an association at least this strong if the two quantities were independent) says whether a relationship stands out from chance, R² (the share of variation described by the line) how much it weighs; the sign of r (the correlation, from −1 to 1) only gives the direction.'));
    symbols(b,EN?'r is the Pearson correlation in the scatterplot; n is the number of points. R² is the coefficient of determination. H₀ assumes zero population correlation (ρ = 0); t is its test statistic and ν = n−2 its degrees of freedom. The p-value concerns this hypothesis under the stated test model. SST sums squared deviations from the mean, SSE squared residuals and SSR squared deviations of fitted values from the mean. A residual is the vertical difference between an observation yᵢ and its fitted value ŷᵢ; ȳ is the observed mean.':'r est la corrélation de Pearson du nuage ; n son nombre de points. R² est le coefficient de détermination. H₀ suppose une corrélation nulle dans la population (ρ = 0) ; t est sa statistique de test et ν = n−2 ses degrés de liberté. La p-value concerne cette hypothèse dans le modèle indiqué. SST additionne les carrés des écarts à la moyenne, SSE ceux des résidus et SSR ceux des valeurs ajustées à la moyenne. Un résidu est l’écart vertical entre une observation yᵢ et sa valeur ajustée ŷᵢ ; ȳ est la moyenne observée.');
    function go(r,n){return function(){setValue(cr,r);setValue(cn,n);};}
    var bar=presetBar(b,[
      [tt('Lien moyen, 30 points','Moderate link, 30 points'),go(.3,30),tt('La droite explique 9 % de la variation, mais 30 points ne suffisent pas à exclure le hasard au seuil de 5 %.','The line explains 9% of the variation, but 30 points are not enough to rule out chance at the 5% level.')],
      [tt('Lien faible, 30 points','Weak link, 30 points'),go(.1,30),tt('1 % de variation expliquée et une p-value élevée : rien à conclure.','1% of variation explained and a large p-value: nothing to conclude.')],
      [tt('Même lien, 1 000 points','Same link, 1,000 points'),go(.1,1000),tt('R² n’a pas bougé, la p-value s’effondre : significatif ne veut pas dire important.','R² has not moved, the p-value collapses: significant does not mean important.')],
      [tt('Fort lien négatif, 30 points','Strong negative link, 30 points'),go(-.8,30),tt('Le signe donne le sens : R² vaut 64 %, comme pour une corrélation de +0,8.','The sign gives the direction: R² is 64%, as for a correlation of +0.8.')],
      [tt('Aucun lien, 100 points','No link, 100 points'),go(0,100),tt('Corrélation nulle : droite horizontale, R² = 0 et p = 1.','Zero correlation: horizontal line, R² = 0 and p = 1.')]
    ]);
    var ctl=node('div',{'class':'st-controls'},b),cr=control(ctl,trText('Corrélation r du nuage construit'),'range',-.95,.95,.01,.3),cn=control(ctl,trText('Nombre de points n'),'range',10,1000,1,30),met=node('div',{'class':'st-metrics','aria-live':'polite'},b),v=chart(b,trText('Nuage construit, droite ajustée et distances résiduelles'),640,310);
    keyLine(b,[['#087e8b',tt('points du nuage','scatter points')],['#193d5b',tt('droite ajustée','fitted line')],['#d6873e',tt('résidus : écarts verticaux à la droite (quelques-uns)','residuals: vertical gaps to the line (a selection)')]]);
    note(b,tt('Nuage construit pour avoir exactement cette corrélation : ce ne sont pas des mesures. Axes x et y centrés, en unités arbitraires.','Scatter constructed to have exactly this correlation: these are not measurements. Axes x and y are centered, in arbitrary units.'));
    var stack=node('div',{'class':'st-variance',role:'img','aria-label':trText('Décomposition de la variation totale')},b),labels=node('p',{'class':'st-note'},b),out=node('p',{'class':'st-reading'},b);
    note(b,trText('Formules du chapitre : t = r√[(n−2)/(1−r²)], ν = n−2 ; R² = SSR/SST = 1−SSE/SST = r² en régression simple avec constante. SST = Σ(yi−ȳ)², SSE = Σ(yi−ŷi)², SSR = Σ(ŷi−ȳ)². Les traits verticaux montrent quelques résidus.'));
    note(b,tt('La p-value illustre le test théorique sous H₀ : ρ = 0 (couples indépendants, loi normale bivariée), pas une inférence sur ce nuage artificiel. Ni causalité, ni performance future.','The p-value illustrates the theoretical test under H₀: ρ = 0 (independent pairs, bivariate normal), not an inference about this artificial cloud. Neither causality nor future performance.'));
    seeAlso(b,[LINK.regr,LINK.interv,LINK.student]);
    function draw(){var r=M.correlation(+cr.i.value,+cn.i.value),p=M.cloud(r.r,r.n),fit=C.regress(p.x,p.y),sst=0,sse=0;met.replaceChildren();v.replaceChildren();stack.replaceChildren();
      p.y.forEach(function(y,i){sst+=y*y;sse+=Math.pow(y-fit.b0-fit.b1*p.x[i],2);});
      metric(met,trText('Corrélation r'),num(fit.r),tt('force et sens du lien, de −1 à +1','strength and direction, from −1 to +1'));metric(met,trText('Variation expliquée R²'),num(100*fit.r2,1)+PC,tt('part de variation décrite par la droite','share of variation described by the line'));metric(met,trText('p-value du test de corrélation'),pv(r.p),tt('lien au moins aussi fort si ρ = 0','a link at least this strong if ρ = 0'));metric(met,trText('Effectif n'),r.n);
      var extent=Math.max.apply(null,p.x.concat(p.y).map(Math.abs))*1.1;
      var X=function(x){return 320+270*x/extent;},Y=function(y){return 150-130*y/extent;};
      svg('line',{x1:45,y1:Y(0),x2:595,y2:Y(0),stroke:'#a7b7c3'},v);svg('line',{x1:X(0),y1:12,x2:X(0),y2:280,stroke:'#a7b7c3'},v);
      svg('text',{x:600,y:Y(0)-8,'text-anchor':'end','class':'st-axis'},v,'x');svg('text',{x:X(0)+10,y:26,'class':'st-axis'},v,'y');
      for(var i=0;i<p.x.length;i++){if(i%Math.max(1,Math.floor(r.n/12))===0)svg('line',{x1:X(p.x[i]),x2:X(p.x[i]),y1:Y(p.y[i]),y2:Y(fit.b0+fit.b1*p.x[i]),stroke:'#d6873e','stroke-width':1.6},v);svg('circle',{cx:X(p.x[i]),cy:Y(p.y[i]),r:r.n>100?1.7:3.5,fill:'#087e8b','fill-opacity':.6},v);}
      svg('line',{x1:X(-extent),y1:Y(fit.b0-extent*fit.b1),x2:X(extent),y2:Y(fit.b0+extent*fit.b1),stroke:'#193d5b','stroke-width':3},v);
      node('span',{'class':'st-explained',style:'width:'+(100*fit.r2)+'%'},stack);node('span',{'class':'st-residual',style:'width:'+(100*(1-fit.r2))+'%'},stack);
      stack.setAttribute('aria-label',num(100*fit.r2,1)+trText(' % expliqués, ')+num(100*(1-fit.r2),1)+trText(' % résiduels'));labels.textContent=tt('Bleu-vert : variation expliquée ','Teal: explained variation ')+num(100*fit.r2,1)+trText(' % · orange : variation résiduelle ')+num(100*(1-fit.r2),1)+PC+'. SST = '+num(sst,1)+trText(' ; ')+'SSE = '+num(sse,1)+trText(' (unités arbitraires au carré).');
      var sig=r.p<.05,weak=fit.r2<.1,R=num(100*fit.r2,1)+PC;
      out.textContent=sig?(weak?tt('Significatif au seuil de 5 %, et pourtant la droite n’explique que '+R+' de la variation : une petite p-value n’annonce pas un lien fort.','Significant at the 5% level, yet the line explains only '+R+' of the variation: a small p-value does not imply a strong link.'):tt('Significatif au seuil de 5 %, et la droite explique '+R+' de la variation. Ce R² décrit l’ajustement de cet exemple ; prévoir de nouvelles données demande une évaluation séparée.','Significant at the 5% level, and the line explains '+R+' of the variation. This R² describes the fit in this example; predicting new data requires a separate evaluation.')):tt('Non significatif au seuil de 5 %, avec '+R+' de variation expliquée : ces données ne permettent pas d’exclure l’absence de lien, sans prouver qu’il n’y en a pas.','Not significant at the 5% level, with '+R+' of variation explained: these data cannot rule out the absence of a link, nor do they prove there is none.');
    }
    [cr.i,cn.i].forEach(function(i){i.addEventListener('input',draw);i.addEventListener('input',bar.clear);});draw();bar.select(0);
  }
  function chisquare(b){
    heading(b,trText('χ² : où se trouve l’écart à l’hypothèse ?'),tt('Le χ² (khi-deux) additionne des écarts cellule par cellule (chacun compare l’effectif observé à celui attendu si H₀, « le dé est équilibré », était vraie), et une seule peut tout porter : dans ce dé suspect, la face 6 fournit à elle seule l’essentiel de la statistique. Modifiez des effectifs et regardez quelle cellule pèse.','χ² (chi-square) adds up gaps cell by cell (each compares the observed count with the one expected if H₀, “the die is fair”, were true), and a single cell can carry it all: in this suspect die, face 6 alone provides most of the statistic. Change the counts and see which cell weighs most.'));
    symbols(b,EN?'O is an observed count, E the count expected under the tested hypothesis H₀, and N the total count. χ² adds the cell contributions (O−E)²/E; Σ means sum. Degrees of freedom select its reference distribution. The reported p-value uses this approximate distribution; it is not the probability that the die is fair or that the variables are independent.':'O est un effectif observé, E l’effectif attendu sous l’hypothèse H₀ testée et N l’effectif total. χ² additionne les contributions (O−E)²/E des cellules ; Σ signifie somme. Les degrés de liberté déterminent sa loi de référence. La p-value affichée utilise cette loi approchée : ce n’est pas la probabilité que le dé soit équilibré ou que les variables soient indépendantes.');
    var ch=node('label',{'class':'st-choice'},b);node('span',{},ch,trText('Question posée'));var mode=node('select',{},ch);node('option',{value:'fit'},mode,trText('Dé à six faces : équilibré ?'));node('option',{value:'independence'},mode,trText('Tableau 2×2 : variables indépendantes ?'));
    var inputs=[];
    function set(values){values.forEach(function(x,i){inputs[i].i.value=x;});draw();}
    var bar=presetBar(b,[
      [trText('Dé suspect : face 6 fréquente'),function(){mode.value='fit';reset();set([10,12,11,9,10,68]);},tt('120 lancers, 20 attendus par face : la face 6 sort 68 fois et pèse presque tout le χ².','120 rolls, 20 expected per face: face 6 comes up 68 times and carries nearly all of χ².')],
      [tt('Tableau du cours : 75/25 et 65/35','Course table: 75/25 and 65/35'),function(){mode.value='independence';reset();set([75,25,65,35]);},tt('Un écart de 10 points entre groupes, sur 100 personnes chacun : H₀ n’est pas rejetée au seuil de 5 %.','A 10-point gap between groups of 100 people each: H₀ is not rejected at the 5% level.')],
      [trText('Même répartition, effectifs ×4'),function(){var next=inputs.map(function(c){return +c.i.value*4;});if(next.some(function(x){return x>10000000;}))return tt('Effectifs déjà au maximum de la saisie : rien n’a changé.','Counts are already at the input maximum: nothing changed.');set(next);},tt('Mêmes proportions, quatre fois plus de données : le χ² est multiplié par 4, le même écart devient plus facile à détecter.','Same proportions, four times the data: χ² is multiplied by 4, so the same gap is easier to detect.')],
      [trText('Observés = attendus'),function(){set(mode.value==='fit'?[20,20,20,20,20,20]:[70,30,70,30]);},tt('Aucun écart : χ² = 0 et p = 1. Cela ne prouve pas pour autant que H₀ est vraie.','No gap: χ² = 0 and p = 1. This still does not prove that H₀ is true.')],
      [trText('Voir les faibles effectifs'),function(){set(mode.value==='fit'?[1,0,2,0,1,2]:[1,0,0,2]);},tt('Effectifs attendus trop faibles : le calcul reste affiché, la conclusion automatique est suspendue.','Expected counts too small: the calculation stays visible, the automatic conclusion is suspended.')]
    ]);
    var ctl=node('div',{'class':'st-controls'},b),info=note(b,''),met=node('div',{'class':'st-metrics','aria-live':'polite'},b),pair=node('div',{'class':'st-pair'},b),left=node('div',{'class':'st-cell'},pair),right=node('div',{'class':'st-cell'},pair),v=chart(left,trText('Comparaison des effectifs observés et attendus sous H0'),640,270);
    keyLine(left,[['#087e8b',tt('observé','observed')],['#193d5b',tt('attendu sous H₀','expected under H₀'),true]]);
    var tab=node('div',{'class':'st-table'},right),out=node('p',{'class':'st-reading'},b);
    note(b,trText('χ² = Σ (O−E)²/E. Dé équilibré : probabilités fixées à 1/6, E=N/6 et 5 ddl ; pas de paramètre estimé. Indépendance : Eij = total ligne i × total colonne j / N, 1 ddl. Pearson sans correction de continuité ; pas de test exact ni de conclusion causale.'));
    note(b,tt('Conditions : observations indépendantes, catégories exclusives, vrais comptages et non des pourcentages. Le tableau 2×2 ne convient pas à des mesures appariées.','Assumptions: independent observations, mutually exclusive categories, actual counts rather than percentages. This 2×2 test is not for paired observations.'));
    seeAlso(b,[LINK.student,LINK.corr]);
    function reset(){ctl.replaceChildren();inputs=[];var labels=mode.value==='fit'?['Face 1','Face 2','Face 3','Face 4','Face 5','Face 6']:[trText('Groupe A : oui'),trText('Groupe A : non'),trText('Groupe B : oui'),trText('Groupe B : non')],values=mode.value==='fit'?[10,12,11,9,10,68]:[75,25,65,35];labels.forEach(function(label,i){var c=control(ctl,label,'number',0,10000000,1,values[i]);c.i.addEventListener('input',draw);c.i.addEventListener('input',bar.clear);inputs.push(c);});info.textContent=mode.value==='fit'?tt('Exemple fictif de lancers indépendants d’un dé à six faces. H₀ : chaque face a une probabilité 1/6, soit N/6 occurrences attendues par face (20 pour 120 lancers). Ces valeurs diffèrent de l’exemple des diapositives.','Fictitious example of independent rolls of a six-sided die. H₀: each face has probability 1/6, giving N/6 expected occurrences per face (20 for 120 rolls). These values differ from the example in the slides.'):trText('Valeurs de départ de l’exercice du cours (chapitre 3, diapositive 62) : 75/25 et 65/35. « Oui » et « non » reprennent les deux issues du tableau ; aucune recommandation médicale n’est déduite de cet exercice. H₀ : groupe et issue sont indépendants.');draw();}
    function draw(){met.replaceChildren();v.replaceChildren();tab.replaceChildren();var r;
      try{if(inputs.some(function(c){return !c.i.value.trim()||!c.i.checkValidity();}))throw Error(trText('Saisir des effectifs entiers positifs ou nuls dans les plages indiquées.'));r=M.chisquare(mode.value,inputs.map(function(c){return +c.i.value;}));}catch(e){out.textContent=trText(e.message);return;}
      metric(met,trText('χ² de Pearson'),num(r.stat,3),tt('somme des contributions','sum of the contributions'));metric(met,trText('Degrés de liberté'),r.df);metric(met,tt('p-value (loi approchée)','p-value (approximate distribution)'),pv(r.p),tt('écart au moins aussi grand si H₀ est vraie','a gap at least this large if H₀ holds'));metric(met,trText('Effectif total'),r.N);
      var max=Math.max.apply(null,r.expected.concat(inputs.map(function(c){return +c.i.value;})))*1.15,base=218,h=170,step=530/inputs.length;
      [.5,1].forEach(function(q){svg('line',{x1:60,y1:base-h*q,x2:600,y2:base-h*q,stroke:'#dbe4ea'},v);svg('text',{x:56,y:base-h*q+5,'text-anchor':'end','class':'st-axis'},v,num(max*q,0));});
      svg('text',{x:56,y:base+5,'text-anchor':'end','class':'st-axis'},v,'0');svg('text',{x:60,y:28,'class':'st-axis'},v,tt('Ordonnée : effectif (nombre de cas)','Y-axis: count (number of cases)'));svg('line',{x1:60,y1:base,x2:600,y2:base,stroke:'#74869a'},v);
      inputs.forEach(function(c,i){var x=65+i*step,obs=+c.i.value,exp=r.expected[i];svg('rect',{x:x,y:base-h*obs/max,width:step*.28,height:h*obs/max,fill:'#087e8b'},v);svg('rect',{x:x+step*.32,y:base-h*exp/max,width:step*.28,height:h*exp/max,fill:'none',stroke:'#193d5b','stroke-width':2},v);
        if(String(obs).length*(SMALL?14:9)<step)svg('text',{x:x+step*.14,y:base-h*obs/max-5,'text-anchor':'middle','class':'st-axis'},v,String(obs));
        svg('text',{x:x+step*.3,y:SMALL?248:240,'text-anchor':'middle','class':'st-axis'},v,mode.value==='fit'?'Face '+(i+1):[trText('A oui'),trText('A non'),trText('B oui'),trText('B non')][i]);});
      var table=node('table',{},tab),head=node('tr',{},node('thead',{},table));[trText('Cellule'),trText('Observé O'),trText('Attendu E'),trText('Contribution (O−E)²/E')].forEach(function(t){node('th',{scope:'col'},head,t);});var tbody=node('tbody',{},table);
      var heavy=0;r.contributions.forEach(function(x,i){if(x>r.contributions[heavy])heavy=i;});
      inputs.forEach(function(c,i){var tr=node('tr',{},tbody);node('th',{scope:'row'},tr,c.w.firstChild.textContent);node('td',{},tr,c.i.value);node('td',{},tr,num(r.expected[i],2));var td=node('td',{},tr);node('span',{},td,num(r.contributions[i],3));var bar=node('span',{'class':'st-contribution','aria-hidden':'true'},td);bar.style.width=(r.stat?100*r.contributions[i]/r.stat:0)+'%';});
      var who=inputs[heavy].w.firstChild.textContent,share=r.stat?num(100*r.contributions[heavy]/r.stat,0)+PC:'';
      out.textContent=r.small?tt('Au moins un effectif attendu est inférieur à 5 : l’approximation du χ² devient fragile. La p-value reste affichée pour comprendre le calcul, mais ne concluez pas avec ce seuil ; une méthode exacte peut convenir selon le tableau.','At least one expected count is below 5: the χ² approximation becomes unreliable. The p-value stays visible to explain the calculation, but do not conclude from this threshold; an exact method may suit, depending on the table.'):(r.p<.05?trText('H₀ rejetée'):trText('H₀ non rejetée'))+trText(' au seuil fixé de 5 %. ')+(r.p<.05?trText('Les écarts à H₀ sont statistiquement détectables dans ce modèle.'):trText('Le test ne met pas en évidence un écart ; il ne prouve pas H₀.'))+(r.stat?tt(' La cellule qui pèse le plus : '+who+', '+share+' du χ². Une différence dans une cellule peu attendue pèse davantage.',' The heaviest cell: '+who+', '+share+' of χ². A difference in a cell with a smaller expected count carries more weight.'):'');
    }
    mode.addEventListener('change',function(){bar.clear();reset();});reset();bar.select(0);
  }
  M.regressionDemo=function(n,se){
    var raw=M.cloud(0,n).y,X=[],Y=[],sxx=0,sxe=0,ee=0;
    for(var i=0;i<n;i++){var x=-2+4*i/(n-1);X.push(x);sxx+=x*x;sxe+=x*raw[i];}
    for(i=0;i<n;i++){raw[i]-=sxe/sxx*X[i];ee+=raw[i]*raw[i];}
    for(i=0;i<n;i++)Y.push(1+.6*X[i]+raw[i]*Math.sqrt((n-2)*se*se/ee));
    return {x:X,y:Y,sxx:sxx,xbar:0,b0:1,b1:.6,se:se,n:n};
  };
  function intervals(b){
    heading(b,trText('Prévoir une moyenne ou une nouvelle observation ?'),tt('Plus de données resserrent la moyenne prévue, pas l’observation future : avec 100 points, l’intervalle de confiance de la moyenne (la plage plausible de la vraie moyenne) devient étroit, celui d’une nouvelle observation (l’intervalle de prévision : la plage où tombera la prochaine mesure) reste large. Les deux bandes ne répondent pas à la même question.','More data tighten the predicted mean, not the future observation: with 100 points, the confidence interval for the mean (the plausible range of the true mean) becomes narrow while the interval for a new observation (the prediction interval: the range where the next measurement will fall) stays wide. The two bands answer different questions.'));
    symbols(b,EN?'x₀ is the predictor value where a prediction is requested; ŷ₀ is the mean predicted by the line. n is sample size, se the estimated residual standard deviation, and x̄ the mean observed x. Sxx adds the squared distances xᵢ−x̄; SSE adds squared residuals. CI is a confidence interval for the mean and PI a prediction interval for a new observation. In the equations, t(0.975; n−2) is the Student quantile used for the 95% bands.':'x₀ est la valeur de la variable explicative où l’on prévoit ; ŷ₀ est la moyenne prévue par la droite. n est l’effectif, se l’écart-type résiduel estimé et x̄ la moyenne des x observés. Sxx additionne les carrés des écarts xᵢ−x̄ ; SSE additionne les carrés des résidus. IC désigne l’intervalle de confiance de la moyenne et IP l’intervalle de prévision d’une observation. Dans les formules, t(0,975 ; n−2) est le quantile de Student utilisé pour les bandes à 95 %.');
    function go(n,se,x){return function(){setValue(cn,n);setValue(cs,se);setValue(cx,x);};}
    var bar=presetBar(b,[
      [tt('Au centre, 20 points','At the center, 20 points'),go(20,1,0),tt('Au centre du nuage, la moyenne est connue à ±0,47 ; une nouvelle observation à ±2,15 seulement.','At the center of the scatter, the mean is known to ±0.47; a new observation only to ±2.15.')],
      [tt('Beaucoup de points : 100','Many points: 100'),go(100,1,0),tt('La moyenne est bien estimée ; la prochaine observation garde sa dispersion propre, et son intervalle reste large.','The mean is well estimated; the next observation keeps its own spread, and its interval stays wide.')],
      [tt('Peu de points : 6','Few points: 6'),go(6,1,0),tt('Peu de points : le quantile de Student augmente et les deux bandes s’élargissent.','Few points: the Student quantile rises and both bands widen.')],
      [tt('Forte dispersion','Large spread'),go(20,3,0),tt('Les deux bandes sont proportionnelles à se : tripler la dispersion triple leur largeur.','Both bands are proportional to se: tripling the spread triples their width.')],
      [trText('À la limite des x observés'),go(20,1,2),tt('Au bord des données, l’incertitude sur la moyenne a grossi : la droite y est moins bien tenue.','At the edge of the data, uncertainty on the mean has grown: the line is less well anchored there.')],
      [trText('En extrapolation'),go(20,1,3.5),tt('Hors des x observés, les bandes supposent la droite toujours valable : elles ne mesurent pas ce risque.','Outside the observed x, the bands assume the line still holds: they do not measure this risk.')]
    ]);
    var ctl=node('div',{'class':'st-controls'},b),cn=control(ctl,trText('Nombre de points n'),'range',6,100,1,20),cs=control(ctl,trText('Écart-type résiduel se'),'range',.2,3,.1,1),cx=control(ctl,trText('Valeur x₀ à prévoir'),'range',-4,4,.1,0),met=node('div',{'class':'st-metrics','aria-live':'polite'},b),v=chart(b,trText('Droite ajustée, bande de confiance de la moyenne et bande de prévision individuelle'),640,350);
    keyLine(b,[['#a3d2d5',tt('IC : moyenne','CI: mean')],['#f3d2ac',tt('IP : nouvelle observation','PI: new observation')],['#193d5b',tt('droite et points','line and points')],['#087e8b',tt('position de x₀','position of x₀')],['#e4e8ec',tt('zone grisée : hors des x observés [−2 ; 2], extrapolation','grey area: outside observed x [−2, 2], extrapolation')]]);
    var out=node('p',{'class':'st-reading'},b);
    note(b,trText('IC95 de la moyenne : ŷ₀ ± t(0,975 ; n−2) se √[1/n+(x₀−x̄)²/Sxx]. IP95 individuel : ajouter 1 sous la racine. Sxx = Σ(xi−x̄)² ; se² = SSE/(n−2). Les bandes sont ponctuelles à 95 % pour un x fixé, pas des bandes simultanées à 95 % sur toute la courbe.'));
    note(b,tt('Nuage construit sur la droite ŷ=1+0,6x. Les bandes supposent des erreurs indépendantes, normales, de variance constante ; elles ne certifient pas une prévision réelle.','Scatter constructed on the line ŷ=1+0.6x. The bands assume independent normal errors of constant variance; they do not validate a real forecast.'));
    seeAlso(b,[LINK.corr,LINK.regr,LINK.normal]);
    function draw(){var n=+cn.i.value,se=+cs.i.value,x0=+cx.i.value,data=M.regressionDemo(n,se),r=M.regressionInterval(n,se,0,data.sxx,1,.6,x0,.05),grid=[],lo=Infinity,hi=-Infinity;met.replaceChildren();v.replaceChildren();
      for(var j=0;j<=100;j++){var x=-4+8*j/100,z=M.regressionInterval(n,se,0,data.sxx,1,.6,x,.05);grid.push({x:x,z:z});lo=Math.min(lo,z.loPrediction);hi=Math.max(hi,z.hiPrediction);}
      data.y.forEach(function(y){lo=Math.min(lo,y);hi=Math.max(hi,y);});var margin=(hi-lo)*.08;lo-=margin;hi+=margin;
      var X=function(x){return 55+530*(x+4)/8;},Y=function(y){return 285-250*(y-lo)/(hi-lo);};
      svg('rect',{x:X(-4),y:35,width:X(-2)-X(-4),height:250,fill:'#e4e8ec'},v);svg('rect',{x:X(2),y:35,width:X(4)-X(2),height:250,fill:'#e4e8ec'},v);
      function band(low,high,fill){var pts=grid.map(function(p){return[X(p.x),Y(p.z[low])];}).concat(grid.slice().reverse().map(function(p){return[X(p.x),Y(p.z[high])];}));svg('path',{d:path(pts)+'Z',fill:fill},v);}
      band('loPrediction','hiPrediction','#f3d2ac');band('loMean','hiMean','#a3d2d5');
      data.x.forEach(function(x,i){svg('circle',{cx:X(x),cy:Y(data.y[i]),r:3,fill:'#193d5b','fill-opacity':.65},v);});
      svg('line',{x1:X(-4),y1:Y(1-.6*4),x2:X(4),y2:Y(1+.6*4),stroke:'#193d5b','stroke-width':2},v);svg('line',{x1:X(x0),y1:35,x2:X(x0),y2:285,stroke:'#087e8b','stroke-width':1.5},v);svg('circle',{cx:X(x0),cy:Y(r.mean),r:6,fill:'#087e8b'},v);
      [-4,-2,0,2,4].forEach(function(x){svg('text',{x:X(x),y:SMALL?312:305,'text-anchor':'middle','class':'st-axis'},v,String(x));});
      svg('text',{x:X(0),y:SMALL?344:328,'text-anchor':'middle','class':'st-axis'},v,tt('x (variable explicative)','x (predictor)'));
      [lo,(lo+hi)/2,hi].forEach(function(y){svg('text',{x:47,y:Y(y)+4,'text-anchor':'end','class':'st-axis'},v,num(y,1));});
      svg('text',{x:55,y:24,'class':'st-axis'},v,tt('Ordonnée : y (variable expliquée, unités arbitraires)','Y-axis: y (response, arbitrary units)'));
      metric(met,trText('Moyenne prévue ŷ₀'),num(r.mean,2),tt('valeur de la droite en x₀','value of the line at x₀'));metric(met,trText('IC95 moyenne'),'['+num(r.loMean,2)+trText(' ; ')+num(r.hiMean,2)+']',tt('où se situe la moyenne, à 95 %','where the mean lies, at 95%'));metric(met,trText('IP95 individuel'),'['+num(r.loPrediction,2)+trText(' ; ')+num(r.hiPrediction,2)+']',tt('où tombera une nouvelle observation, à 95 %','where a new observation will fall, at 95%'));metric(met,trText('Degrés de liberté'),r.df,'n − 2');
      out.textContent=(Math.abs(x0)>2?trText('Attention : x₀ est hors du domaine observé. Les bandes calculées supposent que le modèle linéaire reste valable ; elles ne mesurent pas le risque de changement de relation. '):trText('x₀ est dans le domaine observé. '))+trText('Demi-largeur de l’IC : ')+num(r.confidence,2)+trText(' ; de l’IP : ')+num(r.prediction,2)+trText('. L’incertitude est minimale près de x̄=0 ; une observation future conserve sa variabilité propre, même si la moyenne est bien estimée.');
    }
    [cn.i,cs.i,cx.i].forEach(function(i){i.addEventListener('input',draw);i.addEventListener('input',bar.clear);});draw();bar.select(0);
  }
  function reveal(){var key=window.location?window.location.hash.slice(1):'',target=key?document.getElementById(key):null;if(target&&target.matches('details.st-disclosure'))target.open=true;}
  function init(){document.querySelectorAll('[data-stat-tool]').forEach(function(b){if(b.dataset.ready)return;var fn={student:student,determination:determination,chisquare:chisquare,intervals:intervals}[b.dataset.statTool];if(fn){b.dataset.ready='1';fn(b);}});reveal();window.addEventListener('hashchange',reveal);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}());
