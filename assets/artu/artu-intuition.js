/* Teaching bridge for ARTU. Published tables and source interpolation preserved.
   Simulated data are not a reproduction of the paper's validation. */
(function (root) {
  'use strict';
  function mean(a) { return a.reduce(function (s,x) { return s+x; },0)/a.length; }
  function rng(seed) { var s=seed>>>0; return function () { s=(Math.imul(s,1664525)+1013904223)>>>0; return (s+0.5)/4294967296; }; }
  function generate(phi,cycle,seed,n) {
    var u=rng(seed),z=0,out=[],clipped=0;
    for(var i=-400;i<n;i++) {
      var e=Math.sqrt(-2*Math.log(u()))*Math.cos(2*Math.PI*u());
      z=phi*z+Math.sqrt(1-phi*phi)*e;
      var raw=.7+cycle*Math.sin(2*Math.PI*i/24)+.08*z;
      if(i>=0) { var k=Math.max(.05,Math.min(1.15,raw)); if(k!==raw)clipped++; out.push(k); }
    }
    return {values:out,clipped:clipped};
  }
  function corr(a,lag) {
    var x=a.slice(lag),y=a.slice(0,a.length-lag),mx=mean(x),my=mean(y),xy=0,xx=0,yy=0;
    for(var i=0;i<x.length;i++){var dx=x[i]-mx,dy=y[i]-my;xy+=dx*dy;xx+=dx*dx;yy+=dy*dy;}
    return xx>0&&yy>0?xy/Math.sqrt(xx*yy):NaN;
  }
  function lookup(tables,r1,r2,R) {
    var T=tables.tables[String(R)],g=tables.grid,last=g.n-1;
    if(!T||![r1,r2].every(function(x){return x>=-1&&x<=1;})) return null;
    var fi=(r1-g.start)/g.step,fj=(r2-g.start)/g.step;
    var i=Math.min(Math.floor(fi+1e-9),last-1),j=Math.min(Math.floor(fj+1e-9),last-1),u=fi-i,v=fj-j;
    function bil(M){return (1-u)*(1-v)*M[i][j]+u*(1-v)*M[i+1][j]+(1-u)*v*M[i][j+1]+u*v*M[i+1][j+1];}
    var K=bil(T.K),alpha=bil(T.alpha),S=alpha+K,P=alpha*K;
    return {K:K,alpha:alpha,S:S,P:P,weights:[S,-P,1+P-S],row:i+1,column:j+1};
  }
  function predict(k,t,h,m,c) { return c.weights[0]*k[t-h]+c.weights[1]*k[t-2*h]+c.weights[2]*m; }
  function calculate(tables,settings) {
    var gen=generate(settings.phi,settings.cycle,settings.seed,1464),k=gen.values,cut=984;
    var train=k.slice(0,960),m=mean(train),r1=corr(train,settings.h),r2=corr(train,2*settings.h);
    var c=lookup(tables,r1,r2,settings.R); if(!c)throw new Error('Outside the source table');
    var forecasts=[],persistence=[],climatology=[],observed=k.slice(cut),negative=0,capped=0;
    for(var t=cut;t<k.length;t++) {
      var raw=predict(k,t,settings.h,m,c);if(raw<0)negative++;if(raw>1.2)capped++;
      forecasts.push(Math.min(raw,1.2)); // Algorithm's upper cap; no invented lower clipping.
      persistence.push(k[t-settings.h]);climatology.push(m);
    }
    var norm=mean(observed);
    function metric(a){var ae=0,se=0;for(var i=0;i<a.length;i++){var e=a[i]-observed[i];ae+=Math.abs(e);se+=e*e;}return {mae:ae/a.length,rmse:Math.sqrt(se/a.length),nrmse:100*Math.sqrt(se/a.length)/norm};}
    return {k:k,cut:cut,mean:m,r1:r1,r2:r2,coeff:c,forecasts:forecasts,persistence:persistence,climatology:climatology,
      metrics:[metric(forecasts),metric(persistence),metric(climatology)],negative:negative,capped:capped,clipped:gen.clipped};
  }
  var API={generate:generate,corr:corr,lookup:lookup,predict:predict,calculate:calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(!root.document)return;
  root.ARTUIntuition=API;
  function start(box,tables) {
    var fr=box.dataset.lang==='fr',T=function(a,b){return fr?a.replace(/irradiance/g,'éclairement'):b;},state={phi:.7,cycle:0,seed:43,h:1,R:.05},result,mapGeometry,cursor;
    var $=function(s){return box.querySelector(s);};
    function fmt(x,n){return Number(x).toLocaleString(fr?'fr-FR':'en-GB',{minimumFractionDigits:n,maximumFractionDigits:n}).replace(/-/g,'−');}
    function help(term,label){return ' <button type="button" class="ai-help-button" data-ai-help="'+term+'" aria-expanded="false" aria-haspopup="dialog" aria-label="'+T('Comprendre ','Understand ')+label+'">ⓘ</button>';}
    var labels=[T('ARTU (table publiée)','ARTU (published table)'),T('Persistance','Persistence'),T('Moyenne passée','Historical mean')];
    function draw() {
      result=calculate(tables,state);
      box.querySelectorAll('[data-value]').forEach(function(o){var key=o.dataset.value;o.textContent=fmt(state[key],key==='phi'?1:key==='cycle'?2:0);});
      if($('[data-h-unit]'))$('[data-h-unit]').textContent=T('pas',state.h===1?'step':'steps');
      box.querySelectorAll('[data-case]').forEach(function(e){var cases={random:[0,0],memory:[.9,0],cycle:[.7,.2]},v=cases[e.dataset.case];e.setAttribute('aria-pressed',String(state.phi===v[0]&&state.cycle===v[1]));});
      var c=result.coeff,w=c.weights;
      $('[data-coeff]').innerHTML='<span><b>ρ(h) = '+fmt(result.r1,3)+'</b> · <b>ρ(2h) = '+fmt(result.r2,3)+'</b>'+help('rho',T('les corrélations','correlations'))+'</span><span><b>K = '+fmt(c.K,3)+'</b>'+help('K','K')+' · <b>α = '+fmt(c.alpha,3)+'</b>'+help('alpha','alpha')+'</span>';
      $('[data-train]').textContent=T('Les corrélations (Pearson entre paires décalées) et la moyenne utilisent les 960 premières valeurs seulement. Après 24 pas de tampon, 480 cibles servent au test : les coefficients restent fixes, les dernières mesures disponibles avancent avec chaque origine de prévision.','Correlations (Pearson on lagged pairs) and the mean use only the first 960 values. After a 24-step buffer, 480 targets form the test: coefficients stay fixed while the latest available measurements advance with each forecast origin.');
      var names=[T('Poids de la dernière valeur connue','Weight of the last known value'),T('Poids de la valeur h pas plus tôt','Weight of the value h steps earlier'),T('Poids de la moyenne passée','Weight of the historical mean')];
      $('[data-weights]').innerHTML=w.map(function(x,i){return '<div><span>'+names[i]+'</span><strong>'+fmt(x,3)+'</strong><small>'+['S = α + K','−P = −αK','1 + P − S'][i]+help(i===1?'P':'S',i===1?'P':'S')+'</small></div>';}).join('');
      $('[data-sum]').innerHTML=T('Somme des poids = ','Sum of weights = ')+fmt(w.reduce(function(s,x){return s+x;},0),3)+T('. Ils peuvent être négatifs : ARTU n’est pas nécessairement une ','. They may be negative: ARTU is not necessarily a ')+'<a href="https://cyrilvoyant.github.io/methods/persistence-blend'+(fr?'-fr.html#theorie':'.html#theory')+'">'+T('combinaison convexe','convex combination')+'</a>.';
      var reference=result.metrics[1].rmse;
      function nice(m){return reference===0?T('indéfini','undefined'):m.rmse/reference>1?'&gt; 1':fmt(m.rmse/reference,2);}
      $('[data-live-nice]').innerHTML=nice(result.metrics[0]);
      $('[data-live-nrmse]').textContent=fmt(result.metrics[0].nrmse,1)+' %';
      $('[data-live-mae]').textContent=fmt(800*result.metrics[0].mae,1)+' W/m²';
      $('[data-table]').innerHTML='<table><caption>'+T('480 prévisions sur les mêmes cibles nouvelles','480 forecasts on the same new targets')+'</caption><thead><tr><th>'+T('Référence','Reference')+'</th><th>nRMSE</th><th>MAE<br>W/m²</th><th>NICE²</th></tr></thead><tbody>'+result.metrics.map(function(m,i){return '<tr><th>'+labels[i]+'</th><td>'+fmt(m.nrmse,1)+' %</td><td>'+fmt(800*m.mae,1)+'</td><td>'+nice(m)+'</td></tr>';}).join('')+'</tbody></table>';
      var sensitivity=[.01,.05,.1].map(function(R){return calculate(tables,{phi:state.phi,cycle:state.cycle,h:state.h,R:R,seed:state.seed});});
      var scores=sensitivity.map(function(z){return z.metrics[0].nrmse;});
      $('[data-sensitivity]').textContent=T('Même série, autres tables : la nRMSE ARTU va de ','Same series, different tables: ARTU nRMSE ranges from ')+fmt(Math.min.apply(null,scores),3)+' %'+T(' à ',' to ')+fmt(Math.max.apply(null,scores),3)+' %'+T('. Si elle reste presque stable, ce n’est pas un bug : les poids changent sans modifier beaucoup les erreurs sur ce signal. R n’est pas une garantie de gain.','. If it stays nearly constant, that is not a bug: the weights change without greatly affecting errors on this signal. R is not a guarantee of improvement.');
      var best=result.metrics.reduce(function(b,m,i){return m.nrmse<result.metrics[b].nrmse?i:b;},0);
      $('[data-verdict]').textContent=T('Pour ce signal et cet horizon, la plus petite nRMSE est obtenue par ','For this signal and horizon, the lowest nRMSE belongs to ')+labels[best]+T('. Ce résultat simulé n’établit pas une supériorité générale d’ARTU.','. This simulated result does not establish ARTU’s general superiority.');
      $('[data-warnings]').textContent=T('Table R = ','Table R = ')+fmt(state.R,2)+T(' : hypothèse de bruit, pas un bouton qui ajoute du bruit à la série. Interpolation bilinéaire de K et α comme dans le code source. ',' : a noise assumption, not a control that adds noise to the series. Bilinear interpolation of K and α follows the source code. ')+(result.clipped?T('Générateur : ','Generator: ')+result.clipped+T(' valeurs bornées à [0,05 ; 1,15]. ',' values bounded to [0.05, 1.15]. '):'')+(result.negative?T('Attention : ','Warning: ')+result.negative+T(' prévisions négatives ; ce réglage ne convient pas à une irradiance physique sans garde-fou justifié. Aucune borne basse n’est ajoutée ici. ',' negative forecasts; this setting is unsuitable for physical irradiance without a justified safeguard. No lower clipping is added here. '):'')+(result.capped?result.capped+T(' prévisions plafonnées à β = 1,2.',' forecasts capped at β = 1.2.'):'');
      map(); explain();
    }
    function map() {
      var svg=$('[data-map]'),field=$('[data-field]').value,grid=tables.grid,Tb=tables.tables[String(state.R)],cells=[],min=Infinity,max=-Infinity;
      for(var i=0;i<grid.n;i++)for(var j=0;j<grid.n;j++){
        var rr1=grid.start+i*grid.step,rr2=grid.start+j*grid.step;
        if(rr2<2*rr1*rr1-1-1e-9)continue;
        var z=field==='S'?Tb.K[i][j]+Tb.alpha[i][j]:field==='K'?Tb.K[i][j]:Tb.alpha[i][j];
        min=Math.min(min,z);max=Math.max(max,z);
      }
      var L=62,top=28,side=310,step=side/(grid.n-1);
      function color(z){var u=(z-min)/(max-min||1);return 'hsl('+(210-185*u)+',55%,'+(92-48*u)+'%)';}
      var s='<title>'+T('Carte des coefficients ARTU ; point calculé depuis la série simulée','ARTU coefficient map; point calculated from the simulated series')+'</title>';
      for(var ii=0;ii<grid.n-1;ii++)for(var jj=0;jj<grid.n-1;jj++){
        var r1=grid.start+(ii+.5)*grid.step,r2=grid.start+(jj+.5)*grid.step,c=lookup(tables,r1,r2,state.R);
        var value=field==='S'?c.S:field==='K'?c.K:c.alpha;
        var coherent=r2>=2*r1*r1-1;
        s+='<rect x="'+(L+ii*step)+'" y="'+(top+side-(jj+1)*step)+'" width="'+(step+.4)+'" height="'+(step+.4)+'" fill="'+(coherent?color(value):'#e4e9ed')+'"/>';
      }
      [-1,0,1].forEach(function(v){var px=L+(v+1)*side/2,py=top+(1-v)*side/2;s+='<text x="'+px+'" y="360" text-anchor="middle">'+fmt(v,0)+'</text><text x="52" y="'+(py+4)+'" text-anchor="end">'+fmt(v,0)+'</text>';});
      var mx=L+(result.r1+1)*side/2,my=top+(1-result.r2)*side/2;
      s+='<circle cx="'+mx+'" cy="'+my+'" r="16" fill="#fff" opacity="0.7"/><circle cx="'+mx+'" cy="'+my+'" r="9" fill="#fff" stroke="#172536" stroke-width="3"/><text x="'+L+'" y="17">ρ(2h)</text><text x="'+(L+side)+'" y="385" text-anchor="end">ρ(h)</text>';
      s+='<defs><linearGradient id="ai-scale">';for(var q=0;q<=10;q++)s+='<stop offset="'+(q*10)+'%" stop-color="'+color(min+(max-min)*q/10)+'"/>';s+='</linearGradient></defs><rect x="62" y="403" width="310" height="15" fill="url(#ai-scale)"/><text x="62" y="440">'+fmt(min,2)+'</text><text x="372" y="440" text-anchor="end">'+fmt(max,2)+'</text><text x="217" y="465" text-anchor="middle">'+T('Poids / coefficient sans unité','Dimensionless weight / coefficient')+'</text>';
      s+='<path d="M62,418v7M372,418v7" stroke="#172536"/>';
      if(min<0&&max>0){var zero=62+310*(-min)/(max-min);s+='<path d="M'+zero+',418v7" stroke="#172536"/><text x="'+zero+'" y="440" text-anchor="middle">0</text>';}
      s+='<rect x="62" y="482" width="18" height="15" fill="#e4e9ed"/><text x="89" y="495">'+T('Paires impossibles*','Impossible pairs*')+'</text><g data-map-cursor visibility="hidden"><path stroke="#172536" fill="none" stroke-width="1.5"/></g>';
      svg.setAttribute('viewBox','0 0 440 515');
      svg.innerHTML=s;
      mapGeometry={L:L,top:top,side:side,field:field};
      $('[data-map-caption]').textContent=T('Le cercle représente votre série. Touchez ou survolez la carte pour lire une autre case, sans déplacer ce cercle. * Gris : paires qui ne respectent pas la cohérence des corrélations d’un processus stationnaire.','The circle represents your series. Tap or hover to inspect another cell without moving that circle. * Grey: pairs that violate stationary-correlation consistency.');
      var title=field==='S'?T('S = α + K : poids de la dernière mesure.','S = α + K: weight of the latest measurement.'):field==='K'?T('K : coefficient de la table, utilisé pour calculer les poids.','K: a table coefficient used to calculate the weights.'):T('α (alpha) : coefficient de la table, utilisé pour calculer les poids.','α (alpha): a table coefficient used to calculate the weights.');
      $('[data-field-description]').textContent=title;
      if(cursor)inspectMap(cursor[0],cursor[1]);
    }
    function inspectMap(r1,r2){
      if(!mapGeometry)return;
      r1=Math.max(-1,Math.min(1,r1));r2=Math.max(-1,Math.min(1,r2));cursor=[r1,r2];
      var g=mapGeometry,c=lookup(tables,r1,r2,state.R),px=g.L+(r1+1)*g.side/2,py=g.top+(1-r2)*g.side/2;
      var group=$('[data-map-cursor]');group.setAttribute('visibility','visible');group.querySelector('path').setAttribute('d','M'+(px-12)+','+py+'H'+(px+12)+'M'+px+','+(py-12)+'V'+(py+12));
      $('[data-map-readout]').textContent=T('Case inspectée — ','Inspected cell — ')+'ρ(h) = '+fmt(r1,2)+' · ρ(2h) = '+fmt(r2,2)+' · '+g.field+' = '+fmt(g.field==='S'?c.S:g.field==='K'?c.K:c.alpha,3)+(r2<2*r1*r1-1?T(' — zone grise : paire hors condition de cohérence.',' — grey area: pair violates the consistency condition.'):'');
    }
    function explain() {
      var target=result.cut+Number($('[data-instant]').value),origin=target-state.h,c=result.coeff;
      var terms=[c.weights[0]*result.k[origin],c.weights[1]*result.k[origin-state.h],c.weights[2]*result.mean];
      var raw=terms.reduce(function(a,b){return a+b;},0),f=Math.min(raw,1.2),actual=result.k[target];
      $('[data-instant-value]').textContent=target;
      $('[data-instant]').setAttribute('aria-valuetext',T('Pas ','Step ')+target);
      $('[data-calculation]').textContent=T('Cible au pas ','Target at step ')+target+T(' ; dernière mesure au pas ','; last measurement at step ')+origin+'. '+fmt(c.weights[0],3)+' × '+fmt(result.k[origin],3)+' + ('+fmt(c.weights[1],3)+') × '+fmt(result.k[origin-state.h],3)+' + '+fmt(c.weights[2],3)+' × '+fmt(result.mean,3)+' = '+fmt(raw,4)+'.';
      $('[data-point]').textContent=T('Rapport à la tendance prévu : ','Forecast ratio to trend: ')+fmt(f,3)+T(' ; valeur observée simulée : ','; simulated observed value: ')+fmt(actual,3)+'. '+T('Avec un ciel clair fixé à 800 W/m² pour cette illustration : ','With clear-sky irradiance fixed at 800 W/m² for this illustration: ')+fmt(800*f,1)+T(' W/m² prévus contre ',' W/m² forecast against ')+fmt(800*actual,1)+' W/m².';
      plot(target);
    }
    function plot(target) {
      var zoom=$('[data-zoom]').checked;
      var sv=$('[data-series]'),W=box.clientWidth<650?360:900,H=300,L=45,RR=20,top=20,B=45,lo=zoom?Math.max(984,target-14):924,hi=zoom?Math.min(1144,target+14):1144;
      var shown=result.k.slice(lo,hi+1).concat(result.forecasts.slice(Math.max(0,lo-result.cut),hi-result.cut+1),result.persistence.slice(Math.max(0,lo-result.cut),hi-result.cut+1)),vmin=zoom?Math.min.apply(null,shown)-.04:0,vmax=zoom?Math.max.apply(null,shown)+.04:1.2;
      sv.setAttribute('viewBox','0 0 '+W+' '+H);
      var x=function(i){return L+(i-lo)*(W-L-RR)/(hi-lo);},y=function(v){return H-B-(v-vmin)*(H-top-B)/(vmax-vmin);};
      function path(values,start){return values.map(function(v,i){return (i?'L':'M')+x(start+i).toFixed(2)+','+y(v).toFixed(2);}).join(' ');}
      var s='<title>'+T('Rapport à la tendance et prévisions sur des données simulées','Ratio to trend and forecasts on simulated data')+'</title><rect x="'+x(result.cut)+'" y="20" width="'+(x(hi)-x(result.cut))+'" height="'+(H-top-B)+'" fill="#edf5fa"/>';
      if(!zoom)s+='<rect x="'+x(960)+'" y="20" width="'+(x(result.cut)-x(960))+'" height="'+(H-top-B)+'" fill="#fcf0d3"/><line x1="'+x(960)+'" x2="'+x(960)+'" y1="20" y2="255" stroke="#8e7444"/>';
      [0,1,2,3].forEach(function(i){var v=vmin+(vmax-vmin)*i/3;s+='<line x1="'+L+'" x2="'+(W-RR)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#d5dfe6"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+fmt(v,zoom?2:1)+'</text>';});
      [lo,Math.round((lo+hi)/2),hi].forEach(function(t){s+='<text x="'+x(t)+'" y="278" text-anchor="middle">'+t+'</text>';});
      s+='<text x="'+L+'" y="13">'+T('Rapport à la tendance','Ratio to trend')+'</text><text x="'+(W-RR)+'" y="297" text-anchor="end">'+T('pas de temps','time steps')+'</text>';
      var first=Math.max(result.cut,lo);
      for(var ri=first;ri<hi;ri++){
        var f0=result.forecasts[ri-result.cut],f1=result.forecasts[ri+1-result.cut],o0=result.k[ri],o1=result.k[ri+1],e0=f0-o0,e1=f1-o1;
        function area(points,positive){s+='<polygon points="'+points.map(function(p){return x(p[0]).toFixed(2)+','+y(p[1]).toFixed(2);}).join(' ')+'" fill="'+(positive?'#b74832':'#1676a8')+'" opacity="0.34"/>';}
        if(e0*e1<0){var u=e0/(e0-e1),mid=ri+u,v=o0+u*(o1-o0);area([[ri,o0],[ri,f0],[mid,v]],e0>0);area([[mid,v],[ri+1,f1],[ri+1,o1]],e1>0);}
        else area([[ri,o0],[ri,f0],[ri+1,f1],[ri+1,o1]],e0+e1>0);
      }
      s+='<path d="'+path(result.k.slice(lo,hi+1),lo)+'" stroke="#172536" fill="none" stroke-width="1.8"/>';
      s+='<path d="'+path(result.persistence.slice(first-result.cut,hi-result.cut+1),first)+'" stroke="#aa4b24" fill="none" stroke-width="1.6"/>';
      s+='<path d="'+path(result.forecasts.slice(first-result.cut,hi-result.cut+1),first)+'" stroke="#086b94" fill="none" stroke-width="2"/>';
      s+='<line x1="'+x(target)+'" x2="'+x(target)+'" y1="20" y2="255" stroke="#596a78"/>';
      s+='<circle cx="'+x(target)+'" cy="'+y(result.forecasts[target-result.cut])+'" r="5" fill="#086b94"/><circle cx="'+x(target)+'" cy="'+y(result.k[target])+'" r="4" fill="#172536"/>';
      sv.innerHTML=s;
    }
    box.querySelectorAll('[data-setting]').forEach(function(e){e.addEventListener('input',function(){state[e.dataset.setting]=Number(e.value);var o=box.querySelector('[data-value="'+e.dataset.setting+'"]');if(o)o.textContent=e.value;draw();});});
    box.querySelectorAll('[data-case]').forEach(function(e){e.addEventListener('click',function(){var cases={random:[0,0],memory:[.9,0],cycle:[.7,.2]};state.phi=cases[e.dataset.case][0];state.cycle=cases[e.dataset.case][1];box.querySelectorAll('[data-setting]').forEach(function(x){x.value=state[x.dataset.setting];var o=box.querySelector('[data-value="'+x.dataset.setting+'"]');if(o)o.textContent=x.value;});draw();});});
    $('[data-instant]').addEventListener('input',explain);
    $('[data-zoom]').addEventListener('change',explain);
    var mapSvg=$('[data-map]');
    function pointer(e){if(!mapGeometry)return;var r=mapSvg.getBoundingClientRect(),vb=mapSvg.viewBox.baseVal,px=(e.clientX-r.left)*vb.width/r.width,py=(e.clientY-r.top)*vb.height/r.height,g=mapGeometry;if(px>=g.L&&px<=g.L+g.side&&py>=g.top&&py<=g.top+g.side)inspectMap(2*(px-g.L)/g.side-1,1-2*(py-g.top)/g.side);}
    mapSvg.addEventListener('pointermove',function(e){if(e.pointerType!=='touch')pointer(e);});mapSvg.addEventListener('pointerup',pointer);
    mapSvg.addEventListener('keydown',function(e){if(!/^Arrow/.test(e.key))return;e.preventDefault();var v=cursor||[result.r1,result.r2];inspectMap(v[0]+(e.key==='ArrowRight'?.05:e.key==='ArrowLeft'?-.05:0),v[1]+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0));});
    $('[data-field]').addEventListener('change',map);
    $('[data-new]').addEventListener('click',function(){state.seed++;draw();});
    root.addEventListener('resize',function(){explain();});
    draw();
    if(root.ARTUHelp)root.ARTUHelp.init(box);
  }
  root.document.querySelectorAll('[data-artu-intuition]').forEach(function(box){
    fetch('/assets/artu/artu-tables.json').then(function(r){if(!r.ok)throw new Error('tables');return r.json();}).then(function(t){start(box,t);}).catch(function(){box.querySelector('[data-coeff]').textContent=box.dataset.lang==='fr'?'Les tables ne sont pas disponibles. L’exemple calculé reste accessible plus bas.':'The tables are unavailable. The worked example remains available below.';});
  });
})(typeof window!=='undefined'?window:{});
