/* Synthetic teaching experiment. sCV/F: Voyant et al., doi:10.1016/j.renene.2025.123913.
   Constant reference I_clr=1, d=0.2, artificial period T=24. Not a solar dataset or an RMSE regression. */
(function(root){
 'use strict';
 const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
 const rms=x=>Math.sqrt(mean(x.map(v=>v*v)));
 function pearson(a,b){if(Math.max(...a)===Math.min(...a)||Math.max(...b)===Math.min(...b))return null;const ma=mean(a),mb=mean(b);let ab=0,aa=0,bb=0;for(let i=0;i<a.length;i++){const u=a[i]-ma,v=b[i]-mb;ab+=u*v;aa+=u*u;bb+=v*v;}return aa*bb>0?ab/Math.sqrt(aa*bb):null;}
 const M={
  pair(amplitude,mix,seed=42){
   if(!Number.isFinite(amplitude)||amplitude<0||amplitude>.35||!Number.isFinite(mix)||mix<0||mix>100)throw new RangeError('Invalid synthetic controls');
   const a=Array.from({length:192},(_,i)=>.6+amplitude*Math.sin(2*Math.PI*i/24)),b=a.slice();
   let state=seed>>>0||42;
   function rand(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;}
   const swaps=[];for(let i=b.length-1;i>0;i--)swaps.push([i,Math.floor(rand()*(i+1))]);
   for(const [i,j] of swaps.slice(0,Math.round(swaps.length*mix/100)))[b[i],b[j]]=[b[j],b[i]];
   return {a,b};
  },
  describe(x,h){
   if(!Number.isInteger(h)||h<1||h>12||x.length!==192||x.some(v=>!Number.isFinite(v)||v<=0))throw new RangeError('192 positive values and horizon 1..12 required');
   const mu=mean(x),sd=rms(x.map(v=>v-mu)),scv=Math.SQRT2/.8*rms(x.map(v=>v-1));
   const delta=x.slice(1).map((v,i)=>v-x[i]),md=mean(delta);
   const rho=pearson(x.slice(0,-h),x.slice(h)),rs=[];
   for(let lag=h;lag<=12;lag++){const r=pearson(x.slice(0,-lag),x.slice(lag));if(r!==null)rs.push(Math.abs(r));}
   const rhoMax=rs.length?Math.max(...rs):null,F=rhoMax===null?null:1+scv*(rhoMax-1);
   const trainMean=mean(x.slice(0,96));
   return {mean:mu,sd,cv:sd/mu,scv,rho,rhoMax,F,deltaSd:rms(delta.map(v=>v-md)),malr:mean(x.slice(1).map((v,i)=>Math.abs(Math.log(v/x[i])))),trainMean,
    persRmse:rms(x.slice(120).map((v,i)=>v-x[i+120-h])),meanRmse:rms(x.slice(120).map(v=>v-trainMean))};
  }
 };
 root.CVMemory=M;if(typeof document==='undefined')return;
 function mount(box){
  if(box.dataset.ready)return;box.dataset.ready='true';
  const fr=box.dataset.lang==='fr',t=(a,b)=>fr?a:b,n=v=>v===null?t('indéfini','undefined'):v.toLocaleString(fr?'fr-FR':'en-GB',{maximumFractionDigits:3});
  box.innerHTML='<h2>'+t('Mêmes valeurs. Une autre histoire temporelle.','Same values. A different temporal story.')+'</h2><p>'+t('192 valeurs synthétiques positives, une référence constante égale à 1. Les 96 premiers points estiment la moyenne ; après 24 pas tampons, les 72 derniers comparent les prévisions. Les autres indicateurs décrivent toute la série, a posteriori.','192 positive synthetic values with a constant reference of 1. The first 96 points estimate the mean; after a 24-step buffer, the last 72 compare forecasts. Other indicators describe the whole series retrospectively.')+'</p>'+
   '<div class="vm-controls"><label>'+t('Amplitude autour de 0,6','Amplitude around 0.6')+' <output data-ampout></output><input data-amp aria-label="'+t('Amplitude synthétique','Synthetic amplitude')+'" type="range" min="0.05" max="0.35" step="0.01" value="0.30"></label><label>'+t('Mélange de B','Shuffle B')+' <output data-mixout></output><input data-mix aria-label="'+t('Mélange temporel','Temporal shuffle')+'" type="range" min="0" max="100" value="100"></label><label>'+t('Horizon (pas fictifs)','Horizon (artificial steps)')+' <output data-hout></output><input data-h aria-label="'+t('Horizon en pas','Horizon in steps')+'" type="range" min="1" max="12" value="1"></label><label>'+t('Prévision dessinée','Displayed forecast')+'<select data-method aria-label="'+t('Référence de prévision','Forecast reference')+'"><option value="p">'+t('Persistance','Persistence')+'</option><option value="m">'+t('Moyenne d’entraînement','Training mean')+'</option></select></label></div>'+
   '<div class="vm-presets"><button data-preset="0,1">'+t('Ordre structuré, horizon 1','Structured order, horizon 1')+'</button><button data-preset="100,1">'+t('Mélange, horizon 1','Shuffled, horizon 1')+'</button><button data-preset="0,12">'+t('Même structure, horizon 12','Same structure, horizon 12')+'</button><button data-seed>'+t('Autre mélange reproductible','Another reproducible shuffle')+'</button></div>'+
   '<div class="vm-plots"><figure><h3>'+t('A — structure conservée','A — structure preserved')+'</h3><svg data-a viewBox="0 0 720 245" role="img" aria-label="'+t('Série A et référence de prévision','Series A and forecast reference')+'"></svg></figure><figure><h3>'+t('B — mêmes valeurs, ordre modifié','B — same values, reordered')+'</h3><svg data-b viewBox="0 0 720 245" role="img" aria-label="'+t('Série B et référence de prévision','Series B and forecast reference')+'"></svg></figure></div>'+
   '<div class="vm-controls"><button data-play>'+t('Lire les prévisions','Play forecasts')+'</button><button data-step>'+t('Pas suivant','Next step')+'</button><button data-reset>'+t('Revenir au début du test','Back to test start')+'</button></div><p class="vm-cursor" aria-live="polite"></p><div class="vm-verdict" aria-live="polite"></div><div class="vm-table"></div><p class="vm-note">'+t('Courbe bleue : signal construit ; orange pointillé : référence de prévision choisie ; fond teinté : test. Axe horizontal : pas fictifs. Axe vertical : valeur normalisée, sans unité. Le mélange conserve exactement les valeurs, leur histogramme et la sCV ; il change leurs voisins dans le temps.','Blue: constructed signal; dashed orange: selected forecast reference; shaded area: test. Horizontal axis: artificial steps. Vertical axis: dimensionless normalised value. Shuffling exactly preserves values, histogram and sCV, while changing temporal neighbours.')+'</p>';
  const playbar=box.querySelector('[data-play]').parentElement;playbar.classList.add('vm-playbar');box.insertBefore(playbar,box.querySelector('.vm-plots'));
  const amp=box.querySelector('[data-amp]'),mix=box.querySelector('[data-mix]'),hor=box.querySelector('[data-h]'),method=box.querySelector('[data-method]');
  let pair,stats,seed=42,cursor=120,playing=false,frame=0,last=0,elapsed=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),NS='http://www.w3.org/2000/svg';
  function draw(sv,x,st){
   sv.replaceChildren();const X=i=>48+650*i/191,Y=v=>205-160*v;
   function e(tag,attrs,text){const q=document.createElementNS(NS,tag);for(const k in attrs)q.setAttribute(k,attrs[k]);if(text!==undefined)q.textContent=text;sv.appendChild(q);return q;}
   const text=(xx,yy,z)=>e('text',{x:xx,y:yy,fill:'currentColor','font-size':12,'font-family':'system-ui'},z);
   e('rect',{x:X(120),y:28,width:X(191)-X(120),height:177,fill:'#0c7085',opacity:.06});
   for(const v of [0,.25,.5,.75,1]){e('line',{x1:48,x2:698,y1:Y(v),y2:Y(v),stroke:'#ccd8e0','stroke-width':1});text(8,Y(v)+4,n(v));}
   for(const i of [0,48,96,144,191])text(X(i)-8,225,i);
   text(70,22,t('Entraînement','Training'));text(X(96),22,t('Tampon','Buffer'));text(X(120)+4,22,t('Test chronologique','Chronological test'));
   const path=arr=>arr.map((v,i)=>(i?'L':'M')+X(v[0])+','+Y(v[1])).join(' ');
   e('path',{d:path(x.map((v,i)=>[i,v])),fill:'none',stroke:'#086c93','stroke-width':2.3});
   const pred=i=>method.value==='p'?x[i-(+hor.value)]:st.trainMean;
   e('path',{d:path(x.slice(120).map((v,i)=>[i+120,pred(i+120)])),fill:'none',stroke:'#b36312','stroke-width':2,'stroke-dasharray':'5 4'});
   e('line',{x1:X(cursor),x2:X(cursor),y1:28,y2:205,stroke:'#7b4896','stroke-width':1.5});
   for(const [v,c] of [[x[cursor],'#086c93'],[pred(cursor),'#b36312']])e('circle',{cx:X(cursor),cy:Y(v),r:4.5,fill:c});
  }
  function plots(){draw(box.querySelector('[data-a]'),pair.a,stats.a);draw(box.querySelector('[data-b]'),pair.b,stats.b);}
  function say(){box.querySelector('.vm-cursor').textContent=t('Pas observé : ','Observed step: ')+cursor+' · '+t('prévision émise au pas ','forecast issued at step ')+(cursor-(+hor.value))+' · '+t('Graine du mélange : ','Shuffle seed: ')+seed;}
  function stop(){playing=false;cancelAnimationFrame(frame);last=0;box.querySelector('[data-play]').textContent=t('Lire les prévisions','Play forecasts');}
  function update(){
   stop();cursor=120;pair=M.pair(+amp.value,+mix.value,seed);stats={a:M.describe(pair.a,+hor.value),b:M.describe(pair.b,+hor.value)};
   box.querySelector('[data-ampout]').textContent=n(+amp.value);box.querySelector('[data-mixout]').textContent=mix.value+' %';box.querySelector('[data-hout]').textContent=hor.value;
   const rows=[['mean',t('Moyenne des 192 valeurs','Mean of all 192 values')],['sd','σ(k)'],['malr',t('MALR : moyenne |Δ ln k|','MALR: mean |Δ ln k|')],['deltaSd','σ(Δk)'],['scv',t('sCV (référence constante = 1)','sCV (constant reference = 1)')],['rho','ρ(h)'],['F','F(h), T = 24'],['persRmse',t('RMSE test — persistance','Test RMSE — persistence')],['meanRmse',t('RMSE test — moyenne apprise','Test RMSE — learned mean')]];
   box.querySelector('.vm-table').innerHTML='<table><caption>'+t('Diagnostic descriptif et erreurs sur le même test','Descriptive diagnostics and errors on the same test')+'</caption><thead><tr><th>'+t('Indicateur','Indicator')+'</th><th>A</th><th>B</th></tr></thead><tbody>'+rows.map(([key,label])=>'<tr><th scope="row">'+label+'</th><td>'+n(stats.a[key])+'</td><td>'+n(stats.b[key])+'</td></tr>').join('')+'</tbody></table>';
   box.querySelector('.vm-verdict').innerHTML=['a','b'].map(k=>{const q=stats[k],winner=q.persRmse<q.meanRmse?t('persistance','persistence'):t('moyenne d’entraînement','training mean');return '<p><b>'+k.toUpperCase()+' : '+winner+'</b> '+t('obtient ici la plus petite RMSE parmi ces deux références.','has the lower RMSE here among these two references.')+'</p>';}).join('')+'<p>'+t('Un F élevé peut inclure une anticorrélation : une mémoire exploitable ne garantit pas que recopier la dernière valeur soit la bonne prévision.','A high F may include anticorrelation: exploitable memory does not guarantee that copying the last value is the right forecast.')+'</p>';
   plots();say();
  }
  function tick(now){if(!playing)return;if(last)elapsed+=Math.min(now-last,100);last=now;if(elapsed>=100){cursor++;elapsed=0;if(cursor>=192){cursor=191;stop();say();}plots();}if(playing)frame=requestAnimationFrame(tick);}
  box.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',update));
  box.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const [v,h]=b.dataset.preset.split(',');mix.value=v;hor.value=h;update();});
  box.querySelector('[data-seed]').onclick=()=>{seed++;update();};
  box.querySelector('[data-step]').onclick=()=>{stop();cursor=cursor===191?120:cursor+1;plots();say();};
  box.querySelector('[data-reset]').onclick=()=>{stop();cursor=120;plots();say();};
  box.querySelector('[data-play]').onclick=function(){if(playing){stop();say();return;}if(reduced.matches){cursor=cursor===191?120:cursor+1;plots();say();return;}if(cursor===191)cursor=120;playing=true;this.textContent=t('Pause','Pause');frame=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
  if(root.IntersectionObserver)new IntersectionObserver(e=>{if(!e[0].isIntersecting)stop();}).observe(box);
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.vm-lab').forEach(mount));else document.querySelectorAll('.vm-lab').forEach(mount);
})(typeof window!=='undefined'?window:globalThis);
