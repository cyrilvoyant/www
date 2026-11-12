/* ARTU teaching help. Standalone, no calculation or external dependency.
   Parent inserts native <button type="button" data-ai-help="kappa" aria-label="…">?</button>
   then calls ARTUHelp.init(container); language comes from container.dataset.lang.
   Click/touch toggles; Escape/outside closes. Links are focusable in a nonmodal dialog. */
(function (root) {
  'use strict';
  var ready = new WeakSet(), popup, title, text, more, closeButton, owner = null, current = null;
  var base = 'https://www.cyrilvoyant.com', gh = 'https://cyrilvoyant.github.io';
  var definitions = {
    kappa: ['κ : rapport à la tendance', 'κ: ratio to trend',
      'κ = GHI / CS : éclairement global horizontal divisé par celui de ciel clair, sans unité. Ici le ciel clair vaut constamment 800 W/m² : le signal simulé n’est pas une série météo réelle.',
      'κ = GHI / CS: global horizontal irradiance divided by clear-sky irradiance, with no unit. Here clear-sky irradiance is fixed at 800 W/m²: the simulated signal is not a real weather series.',
      gh+'/teaching/artu-worked-example-fr.html#theory', gh+'/teaching/artu-worked-example.html#theory'],
    phi: ['φ : mémoire du bruit simulé', 'φ: memory of the simulated noise',
      'φ règle le lien entre le bruit d’un pas et celui du pas précédent dans le générateur. Plus φ est proche de 1, plus les écarts persistent. Ce paramètre n’est ni un poids ARTU ni la corrélation mesurée sur la série avec cycle.',
      'φ controls the link between noise at one step and at the previous step in the generator. Closer to 1, deviations persist longer. It is neither an ARTU weight nor the correlation measured on the series with a cycle.',
      base+'/fr/recits/variabilite-memoire-previsibilite/#experience',base+'/stories/variability-memory-forecastability/#experience'],
    rho: ['ρ(h) : mémoire mesurée de la série', 'ρ(h): measured memory of the series',
      'Corrélation de la série κ avec elle-même décalée de h pas ; ρ(2h) utilise deux fois ce décalage. Elle est estimée sur l’entraînement, entre −1 et 1. Ce n’est pas un score de précision. Ces deux nombres situent la série dans la table.',
      'Correlation of κ with itself shifted by h steps; ρ(2h) uses twice that shift. Estimated on training data, it lies between −1 and 1. It is not an accuracy score. These two numbers locate the series in the table.',
      base+'/fr/enseignement/biostatistique/correlation-regression/',base+'/teaching/biostatistics/correlation-regression/'],
    K: ['K : coefficient de la table ARTU', 'K: coefficient from the ARTU table',
      'K est lu, avec α, dans la table publiée à partir de ρ(h), ρ(2h) et du niveau R. Ici une interpolation entre les cases suit le code source. K seul n’est pas le poids de la dernière valeur : ce poids est S = α + K.',
      'K is read, with α, from the published table using ρ(h), ρ(2h) and level R. Here interpolation between cells follows the source code. K alone is not the weight of the last known value: that weight is S = α + K.',
      gh+'/teaching/artu-worked-example-fr.html#theory',gh+'/teaching/artu-worked-example.html#theory'],
    alpha: ['α : second coefficient de la table', 'α: second table coefficient',
      'α est lu dans la même table que K ; il ne s’agit pas du risque α d’un test statistique. Ensemble, ils donnent les poids S = α + K, −P = −αK et 1 + P − S. Ces poids peuvent être négatifs.',
      'α is read from the same table as K; it is not the significance level α of a statistical test. Together they give weights S = α + K, −P = −αK and 1 + P − S. These weights can be negative.',
      gh+'/teaching/artu-worked-example-fr.html#theory',gh+'/teaching/artu-worked-example.html#theory'],
    S: ['S : poids de la dernière valeur connue', 'S: weight of the last known value',
      'S = α + K. ARTU multiplie la dernière valeur disponible par S, la précédente (décalée de h pas supplémentaires) par −P, et la moyenne d’entraînement par 1 + P − S. Les trois poids font 1 ; ce n’est pas nécessairement une combinaison convexe.',
      'S = α + K. ARTU multiplies the last available value by S, the previous one (another h steps earlier) by −P, and the training mean by 1 + P − S. The three weights sum to 1; this is not necessarily a convex combination.',
      gh+'/teaching/artu-worked-example-fr.html#theory',gh+'/teaching/artu-worked-example.html#theory'],
    P: ['P : produit des deux coefficients', 'P: product of the two coefficients',
      'P = αK. Le poids de la valeur précédente est −P, et non P. Le poids de la moyenne vaut 1 + P − S. Ici P désigne un coefficient de calcul, pas une probabilité.',
      'P = αK. The weight of the previous value is −P, not P. The weight of the mean is 1 + P − S. Here P is a calculation coefficient, not a probability.',
      gh+'/teaching/artu-worked-example-fr.html#theory',gh+'/teaching/artu-worked-example.html#theory'],
    R: ['R : hypothèse de bruit de mesure', 'R: measurement-noise assumption',
      'R est le rapport entre la variance du bruit de mesure et la variance du signal. Il choisit une table de coefficients. Le changer ici n’ajoute pas de bruit à la série : c’est une hypothèse de calcul, pas une garantie de meilleur résultat.',
      'R is the ratio of measurement-noise variance to signal variance. It selects a coefficient table. Changing it here does not add noise to the series: it is a calculation assumption, not a guarantee of better results.',
      gh+'/teaching/artu-worked-example-fr.html#theory',gh+'/teaching/artu-worked-example.html#theory'],
    NICE2: ['NICE² : erreur comparée à la persistance', 'NICE²: error relative to persistence',
      'NICE² = RMSE du modèle / RMSE de la persistance simple, aux mêmes dates et au même horizon. 0 signifie parfait, 1 égale la référence, > 1 signifie moins bon. Si la référence a une erreur nulle, le rapport est indéfini. Le calcul n’est pas plafonné ; l’affichage au-dessus de 1 est « > 1 ».',
      'NICE² = model RMSE / simple-persistence RMSE, on the same targets and horizon. 0 means perfect, 1 equals the reference, > 1 means worse. If reference error is zero, the ratio is undefined. The calculation is not capped; values above 1 are displayed as “> 1”.',
      gh+'/methods/nice-metrics-fr.html',gh+'/methods/nice-metrics.html'],
    nRMSE: ['nRMSE : erreur quadratique normalisée', 'nRMSE: normalized root-mean-square error',
      'La RMSE est la racine de la moyenne des erreurs au carré ; les grosses erreurs pèsent davantage. Ici nRMSE = RMSE / moyenne des observations du test, sans unité (0,25 : l’erreur type vaut le quart de la moyenne). Elle ne signifie pas « pourcentage de prévisions fausses ».',
      'RMSE is the square root of mean squared error; large errors count more. Here nRMSE = RMSE / mean of test observations, unitless (0.25: the typical error is a quarter of the mean). It does not mean “percentage of wrong forecasts”.',
      gh+'/methods/nice-metrics-fr.html',gh+'/methods/nice-metrics.html'],
    MAE: ['MAE : erreur absolue moyenne', 'MAE: mean absolute error',
      'Moyenne des distances entre chaque prévision et son observation, sans compenser erreurs positives et négatives. Ici elle est affichée en W/m² après conversion du rapport κ avec le ciel clair constant de 800 W/m². Plus bas signifie moins d’erreur sur ces cibles.',
      'Mean distance between each forecast and its observation, without cancelling positive and negative errors. Here it is displayed in W/m² after converting κ using the constant clear-sky value of 800 W/m². Lower means less error on these targets.',
      gh+'/methods/nice-metrics-fr.html',gh+'/methods/nice-metrics.html']
  };
  function ensure() {
    if (popup) return;
    var style = document.createElement('style'); style.id = 'artu-help-style';
    style.textContent = '.ai-help-pop{position:fixed;z-index:2147483000;box-sizing:border-box;width:340px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;padding:16px;background:#fff;color:#172536;border:1px solid #9bb0c4;border-radius:10px;box-shadow:0 8px 30px #17253633;font:16px/1.55 system-ui,sans-serif;overflow-wrap:anywhere}.ai-help-pop[hidden]{display:none}.ai-help-pop h2{font:700 17px/1.4 system-ui,sans-serif;margin:0 32px 10px 0}.ai-help-pop p{margin:0 0 12px}.ai-help-pop a{color:#07569a;text-decoration:underline}.ai-help-pop button{position:absolute;right:8px;top:8px;min-width:32px;min-height:32px;border:1px solid #9bb0c4;border-radius:6px;background:#fff;color:#172536;font:20px system-ui;cursor:pointer}.ai-help-pop :focus-visible,.ai-help-pop:focus-visible{outline:3px solid #ad5200;outline-offset:2px}button[data-ai-help]{min-width:26px;min-height:26px;cursor:pointer}';
    document.head.appendChild(style);
    popup = document.createElement('div'); popup.className = 'ai-help-pop'; popup.id = 'artu-help-popover'; popup.hidden = true;
    popup.setAttribute('role','dialog'); popup.setAttribute('aria-modal','false'); popup.setAttribute('aria-labelledby','artu-help-title'); popup.setAttribute('aria-describedby','artu-help-description'); popup.tabIndex = -1;
    title = document.createElement('h2'); title.id = 'artu-help-title'; text = document.createElement('p'); text.id = 'artu-help-description'; more = document.createElement('a');
    closeButton = document.createElement('button'); closeButton.type='button'; closeButton.textContent='×'; closeButton.addEventListener('click',function(){hide(true);});
    popup.appendChild(closeButton); popup.appendChild(title); popup.appendChild(text); popup.appendChild(more); document.body.appendChild(popup);
    document.addEventListener('pointerdown',function(e){if(current&&!popup.contains(e.target)&&!current.contains(e.target))hide(false);},true);
    document.addEventListener('keydown',function(e){if(current&&e.key==='Escape'){e.preventDefault();hide(true);}});
    document.addEventListener('focusin',function(e){if(current&&!popup.contains(e.target)&&!current.contains(e.target))hide(false);});
    root.addEventListener('resize',position); root.addEventListener('scroll',position,true);
  }
  function hide(restore) { var old=current; if(old){old.setAttribute('aria-expanded','false');old.removeAttribute('aria-describedby');} current=null;owner=null;if(popup)popup.hidden=true;if(restore&&old&&old.isConnected)old.focus(); }
  function position() {
    if(!current||popup.hidden)return;
    if(!current.isConnected){hide(false);return;}
    var vv=root.visualViewport, width=vv?vv.width:document.documentElement.clientWidth,height=vv?vv.height:root.innerHeight,ox=vv?vv.offsetLeft:0,oy=vv?vv.offsetTop:0;
    popup.style.maxWidth=Math.max(1,width-24)+'px';popup.style.maxHeight=Math.max(1,height-24)+'px';
    var r=current.getBoundingClientRect(),b=popup.getBoundingClientRect();
    var left=Math.max(ox+12,Math.min(r.left,ox+width-b.width-12));
    var below=r.bottom+8,above=r.top-b.height-8,top=below+b.height<=oy+height-12?below:above;
    top=Math.max(oy+12,Math.min(top,oy+height-b.height-12));popup.style.left=left+'px';popup.style.top=top+'px';
  }
  function show(button, container) {
    var d=definitions[button.dataset.aiHelp]; if(!d)return;ensure();
    if(current===button){hide(true);return;}hide(false);current=button;owner=container;
    var fr=container.dataset.lang==='fr';title.textContent=d[fr?0:1];text.textContent=d[fr?2:3];more.textContent=fr?'Approfondir cette notion':'Explore this idea';more.href=d[fr?4:5];closeButton.setAttribute('aria-label',fr?'Fermer l’explication':'Close explanation');popup.lang=fr?'fr':'en';
    button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',popup.id);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-describedby',text.id);
    popup.hidden=false;popup.style.visibility='hidden';position();popup.style.visibility='';popup.focus({preventScroll:true});
  }
  function init(container) {
    if(!container||ready.has(container))return;ready.add(container);ensure();
    function prepare(button){if(!definitions[button.dataset.aiHelp])return;button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',popup.id);if(current!==button)button.setAttribute('aria-expanded','false');}
    container.querySelectorAll('button[data-ai-help]').forEach(prepare);
    container.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button[data-ai-help]');if(b&&container.contains(b)){prepare(b);show(b,container);}});
  }
  root.ARTUHelp={init:init,terms:Object.keys(definitions),close:function(){hide(false);}};
}(window));
