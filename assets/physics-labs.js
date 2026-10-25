/* Course illustrations: classical plane EM wave, Compton kinematics, heat engine.
 * No external library or data. PH exposes pure functions for independent checks. */
(function(){
 'use strict';
 var P=window.PH={},C=299792458;
 P.wave=function(amplitude,mhz,phase,x){if(!(amplitude>=0&&mhz>0)||![amplitude,mhz,phase,x].every(Number.isFinite))throw Error('Paramètres d’onde invalides.');var frequency=mhz*1e6,lambda=C/frequency,e=amplitude*Math.cos(phase-2*Math.PI*x/lambda);return{frequency:frequency,lambda:lambda,E:e,B:e/C,B0:amplitude/C,intensity:.5*8.8541878128e-12*C*amplitude*amplitude};};
 P.compton=function(energy,theta){if(!(energy>0)||theta<0||theta>180||![energy,theta].every(Number.isFinite))throw Error('Énergie positive et angle de 0 à 180° requis.');var a=theta*Math.PI/180,ep=energy/(1+energy/511*(1-Math.cos(a))),ke=energy-ep;return{photon:ep,electron:ke,shiftPM:2.42631023867*(1-Math.cos(a)),px:energy-ep*Math.cos(a),py:-ep*Math.sin(a)};};
 P.engine=function(hot,cold,heat,fraction){var Th=hot+273.15,Tf=cold+273.15;if(!(Th>Tf&&Tf>0&&heat>0&&fraction>=0&&fraction<=1)||![hot,cold,heat,fraction].every(Number.isFinite))throw Error('Sources ordonnées en température absolue, chaleur positive et fraction de 0 à 1 requises.');var etaC=1-Tf/Th,eta=fraction*etaC,w=heat*eta,rejected=heat-w,entropy=rejected/Tf-heat/Th;return{etaCarnot:etaC,eta:eta,work:w,rejected:rejected,entropy:Math.abs(entropy)<1e-12?0:entropy};};
 function h(tag,attr,parent,text){var e=document.createElement(tag);Object.keys(attr||{}).forEach(function(k){e.setAttribute(k,attr[k]);});if(text!==undefined)e.textContent=text;if(parent)parent.appendChild(e);return e;}
 function s(tag,attr,parent,text){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attr||{}).forEach(function(k){e.setAttribute(k,attr[k]);});if(text!==undefined)e.textContent=text;if(parent)parent.appendChild(e);return e;}
 function f(x,n){return x.toFixed(n===undefined?2:n).replace('.',',');}
 function slider(parent,label,min,max,step,value){var w=h('label',{'class':'ph-control'},parent);h('span',{},w,label);var input=h('input',{type:'range',min:min,max:max,step:step,value:value},w),output=h('output',{},w);function val(){output.textContent=f(+input.value,step<1?2:0);}input.addEventListener('input',val);val();return input;}
 function metrics(parent,values){parent.replaceChildren();values.forEach(function(v){var d=h('div',{},parent);h('span',{},d,v[0]);h('strong',{},d,v[1]);});}
 function note(parent,text){h('p',{'class':'ph-note'},parent,text);}
 function heading(b,title,intro){h('h3',{},b,title);h('p',{},b,intro);}
 function svg(parent,label,height){return s('svg',{viewBox:'0 0 760 '+height,'class':'ph-svg',role:'img','aria-label':label},parent);}
 function line(svg,x1,y1,x2,y2,color,width){s('line',{x1:x1,y1:y1,x2:x2,y2:y2,stroke:color,'stroke-width':width||2,'stroke-linecap':'round'},svg);}
 function arrow(svg,x1,y1,x2,y2,color,width){var a=Math.atan2(y2-y1,x2-x1),l=Math.max(13,(width||2)*1.45),bx=x2-l*Math.cos(a),by=y2-l*Math.sin(a);line(svg,x1,y1,bx,by,color,width);s('path',{d:'M'+x2+' '+y2+' L'+(bx+l*.6*Math.sin(a))+' '+(by-l*.6*Math.cos(a))+' L'+(bx-l*.6*Math.sin(a))+' '+(by+l*.6*Math.cos(a))+' Z',fill:color},svg);}
 function text(svg,x,y,t,color){return s('text',{x:x,y:y,'text-anchor':'middle',fill:color||'#234155','class':'ph-label'},svg,t);}
 function wave(b){
  heading(b,'Voir une onde se propager','Un point du milieu oscille ; le profil de l’onde se déplace. Suivez les champs électrique E et magnétique B d’une onde plane progressive, polarisée linéairement dans le vide.');
  var ctl=h('div',{'class':'ph-controls'},b),amp=slider(ctl,'Amplitude E₀ (V/m)',.5,4,.1,2),freq=slider(ctl,'Fréquence ν (MHz)',10,100,1,50),phase=slider(ctl,'Phase temporelle ωt (rad)',0,6.28,.01,0),met=h('div',{'class':'ph-metrics'},b),cv=h('canvas',{width:960,height:400,role:'img','aria-label':'Projection des champs transversaux électrique et magnétique le long de la propagation','class':'ph-canvas'},b),ctx=cv.getContext('2d'),buttons=h('div',{'class':'ph-buttons'},b),play=h('button',{type:'button','aria-pressed':'false'},buttons,'Lancer l’animation'),step=h('button',{type:'button'},buttons,'Avancer d’un huitième de période'),message=h('p',{'class':'ph-reading'},b);
  var running=false,visible=true,last=null,frame=0,angle=0,reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  note(b,'E(x,t) = E₀ cos(ωt−kx), B = E/c, λ = c/ν et I = ε₀cE₀²/2. Les axes E et B sont physiquement perpendiculaires ; le dessin est une projection. Le champ B est amplifié d’un facteur c dans le tracé pour comparer les formes, pas leurs unités.');
  note(b,'Temps ralenti : une période visuelle dure deux secondes, indépendamment de la fréquence physique. Le domaine dessiné mesure 12 m. La direction de propagation est +x. Pas de changement de milieu ni de polarisation elliptique dans cette expérience. Animation arrêtée par défaut.');
  function point(x,e,bc){return[90+60*x+11*bc,210-25*e+9*bc];}
  function canvasLine(points,color,width){ctx.beginPath();points.forEach(function(p,i){if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function draw(){ctx.clearRect(0,0,960,400);ctx.fillStyle='#f7fbfc';ctx.fillRect(0,0,960,400);ctx.font='15px system-ui';ctx.fillStyle='#435f73';
   var A=+amp.value,F=+freq.value,r=P.wave(A,F,angle,0),ep=[],bp=[];
   canvasLine([point(0,0,0),point(12.5,0,0)],'#8fa3b2',2);
   for(var j=0;j<=360;j++){var x=12*j/360,z=P.wave(A,F,angle,x).E;ep.push(point(x,z,0));bp.push(point(x,0,z));}
   canvasLine(ep,'#087e8b',3);canvasLine(bp,'#c36d25',3);
   [0,3,6,9,12].forEach(function(x){var p=point(x,0,0);ctx.fillText(x+' m',p[0]-10,p[1]+23);});
   var xp=5,ev=P.wave(A,F,angle,xp).E,o=point(xp,0,0),e=point(xp,ev,0),bb=point(xp,0,ev);canvasLine([o,e],'#087e8b',4);canvasLine([o,bb],'#c36d25',4);
   [e,bb].forEach(function(p,i){ctx.beginPath();ctx.arc(p[0],p[1],6,0,2*Math.PI);ctx.fillStyle=i?'#c36d25':'#087e8b';ctx.fill();});
   ctx.fillStyle='#087e8b';ctx.fillText('Champ E',65,50);ctx.fillStyle='#c36d25';ctx.fillText('Champ B (échelle amplifiée)',65,76);ctx.fillStyle='#234155';ctx.fillText('Propagation → +x',690,350);ctx.fillText('Point suivi : x = 5 m',65,350);
   message.textContent='À x = 5 m : E = '+f(ev,3)+' V/m ; B = '+f(ev/C*1e9,3)+' nT. Les deux champs oscillent en phase, dans des directions transversales différentes.';
  }
  function values(){var r=P.wave(+amp.value,+freq.value,angle,0);metrics(met,[['Longueur d’onde λ',f(r.lambda,2)+' m'],['Période physique',f(1e9/r.frequency,2)+' ns'],['Amplitude B₀',f(r.B0*1e9,2)+' nT'],['Intensité moyenne',f(r.intensity*1000,3)+' mW/m²']]);}
  function stop(){running=false;play.textContent='Lancer l’animation';play.setAttribute('aria-pressed','false');cancelAnimationFrame(frame);last=null;}
  function tick(now){if(!running)return;if(document.hidden||!visible){last=null;frame=0;return;}var dt=last===null?0:Math.min(.1,(now-last)/1000);last=now;angle=(angle+Math.PI*dt)%(2*Math.PI);phase.value=angle.toFixed(2);phase.parentElement.querySelector('output').textContent=f(angle,2);draw();frame=requestAnimationFrame(tick);}
  play.addEventListener('click',function(){if(running)stop();else{running=true;play.textContent='Mettre en pause';play.setAttribute('aria-pressed','true');last=null;frame=requestAnimationFrame(tick);}});
  step.addEventListener('click',function(){stop();angle=(angle+Math.PI/4)%(2*Math.PI);phase.value=angle.toFixed(2);phase.parentElement.querySelector('output').textContent=f(angle,2);draw();});
  [amp,freq,phase].forEach(function(i){i.addEventListener('input',function(){if(i===phase){stop();angle=+phase.value;}values();draw();});});
  document.addEventListener('visibilitychange',function(){if(!running)return;if(document.hidden){cancelAnimationFrame(frame);frame=0;last=null;}else if(visible){last=null;frame=requestAnimationFrame(tick);}});
  if(window.IntersectionObserver)new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;last=null;}else if(running&&!frame&&!document.hidden)frame=requestAnimationFrame(tick);}).observe(cv);
  reduced.addEventListener('change',function(){if(reduced.matches)stop();});values();draw();
 }
 function compton(b){
  heading(b,'Compton : l’angle change le partage de l’énergie','Choisissez l’énergie incidente puis l’angle du photon diffusé. La fraction emportée par l’électron varie ; l’énergie totale se conserve.');
  var ctl=h('div',{'class':'ph-controls'},b),energy=slider(ctl,'Énergie incidente E₀ (keV)',25,1000,.5,255.5),theta=slider(ctl,'Angle du photon θ (°)',0,180,1,90),met=h('div',{'class':'ph-metrics'},b),v=svg(b,'Schéma de la diffusion Compton et directions des particules',360),stack=h('div',{'class':'ph-stack',role:'img'},b),out=h('p',{'class':'ph-reading'},b),bt=h('div',{'class':'ph-buttons'},b);
  [['Sans déviation',0],['Angle droit',90],['Rétrodiffusion',180]].forEach(function(p){var t=h('button',{type:'button'},bt,p[0]);t.addEventListener('click',function(){theta.value=p[1];theta.dispatchEvent(new Event('input'));});});
  note(b,'E′ = E₀/[1 + (E₀/511)(1−cos θ)] en keV ; énergie cinétique de l’électron K = E₀−E′ ; Δλ = (h/mec)(1−cos θ). Le cours utilise mec² ≈ 511 keV. La démonstration des équations de conservation reste hors programme, comme dans le support.');
  note(b,'Modèle d’un photon interagissant avec un électron libre initialement au repos. Schéma des directions, pas des vitesses ni une simulation des probabilités de diffusion. Aucune section efficace, dose ou conduite clinique n’est calculée.');
  function draw(){var E=+energy.value,t=+theta.value,r=P.compton(E,t),a=t*Math.PI/180,cx=350,cy=175;v.replaceChildren();stack.replaceChildren();metrics(met,[['Photon diffusé E′',f(r.photon,2)+' keV'],['Électron : K',f(r.electron,2)+' keV'],['Somme E′ + K',f(r.photon+r.electron,2)+' keV'],['Décalage Δλ',f(r.shiftPM,3)+' pm']]);
   arrow(v,50,cy,cx-14,cy,'#234155',4);text(v,160,cy+35,'Photon incident : '+f(E,1)+' keV');s('circle',{cx:cx,cy:cy,r:8,fill:'#234155'},v);
   var px=cx+140*Math.cos(a),py=cy-140*Math.sin(a);arrow(v,cx,cy,px,py,'#087e8b',4);text(v,Math.max(110,Math.min(650,px)),Math.max(25,py-18),'Photon diffusé','#087e8b');
   if(r.electron>1e-10){var norm=Math.hypot(r.px,r.py),ex=cx+150*r.px/norm,ey=cy-150*r.py/norm;arrow(v,cx,cy,ex,ey,'#c36d25',4);text(v,ex,Math.min(335,ey+26),'Électron de recul','#c36d25');}
   var arc=[];for(var i=0;i<=40;i++){var q=a*i/40;arc.push((i?'L':'M')+(cx+48*Math.cos(q))+' '+(cy-48*Math.sin(q)));}s('path',{d:arc.join(' '),fill:'none',stroke:'#8097a8','stroke-width':2},v);text(v,620,50,'θ = '+t+'°');
   h('span',{style:'width:'+(100*r.photon/E)+'%;background:#087e8b'},stack);h('span',{style:'width:'+(100*r.electron/E)+'%;background:#c36d25'},stack);stack.setAttribute('aria-label','Photon : '+f(100*r.photon/E,1)+' %, électron : '+f(100*r.electron/E,1)+' %');
   out.textContent='Bleu-vert : '+f(100*r.photon/E,1)+' % de l’énergie au photon ; orange : '+f(100*r.electron/E,1)+' % à l’électron. '+(t===0?'À angle nul, il n’y a pas de transfert d’énergie dans ce modèle.':t===180?'Le transfert à l’électron est maximal en rétrodiffusion ; le photon conserve une énergie non nulle.':'Le photon ne cède qu’une partie de son énergie.');
  }[energy,theta].forEach(function(i){i.addEventListener('input',draw);});draw();
 }
 function engine(b){
  heading(b,'Un moteur ne transforme pas toute sa chaleur en travail','Réglez les deux températures et le rendement choisi, puis suivez le bilan d’énergie par cycle et l’entropie échangée par les sources.');
  var ctl=h('div',{'class':'ph-controls'},b),hot=slider(ctl,'Source chaude (°C)',100,700,5,400),cold=slider(ctl,'Source froide (°C)',-20,80,1,20),heat=slider(ctl,'Chaleur reçue Qchaud (J/cycle)',100,2000,10,1000),fraction=slider(ctl,'Fraction de la borne de Carnot',.1,1,.05,.7),met=h('div',{'class':'ph-metrics'},b),v=svg(b,'Chaleur reçue, travail fourni et chaleur rejetée par un moteur cyclique',370),out=h('p',{'class':'ph-reading'},b);
  note(b,'ηCarnot = 1−Tf/Tc avec températures absolues en kelvins. η choisi = fraction × ηCarnot ; Wfourni = η Qchaud ; Qrejetée = Qchaud−Wfourni. Pour la machine sur un cycle : ΔU = 0 et ΔS = 0. Pour les deux réservoirs idéaux : ΔStotal = Qrejetée/Tf−Qchaud/Tc ≥ 0.');
  note(b,'La fraction réglable illustre un rendement inférieur à la borne réversible ; ce n’est pas la prédiction d’un moteur particulier. Le rendement de Carnot n’est une borne pertinente que pour une machine cyclique entre ces deux sources. Les échanges sont indiqués en valeurs positives reçues/fournies, pas mélangés avec la convention des travaux reçus du premier principe.');
  var presets=h('div',{'class':'ph-buttons'},b);[['Limite réversible',1],['Moitié de la borne',.5]].forEach(function(p){var bt=h('button',{type:'button'},presets,p[0]);bt.addEventListener('click',function(){fraction.value=p[1];fraction.dispatchEvent(new Event('input'));});});
  function draw(){var Th=+hot.value,Tf=+cold.value,Q=+heat.value,r=P.engine(Th,Tf,Q,+fraction.value);v.replaceChildren();metrics(met,[['Rendement maximal',f(100*r.etaCarnot,1)+' %'],['Rendement choisi',f(100*r.eta,1)+' %'],['Travail fourni',f(r.work,1)+' J/cycle'],['ΔS des deux sources',f(r.entropy,4)+' J/K/cycle']]);
   [[170,20,300,55,'#f5d1b4','Source chaude : '+f(Th,0)+' °C'],[170,145,300,65,'#d5e8eb','Machine cyclique'],[170,290,300,55,'#dce8f5','Source froide : '+f(Tf,0)+' °C']].forEach(function(p){s('rect',{x:p[0],y:p[1],width:p[2],height:p[3],rx:12,fill:p[4]},v);text(v,p[0]+p[2]/2,p[1]+p[3]/2+5,p[5]);});
   arrow(v,320,80,320,135,'#c36d25',18);text(v,535,108,'Q reçue : '+f(Q,1)+' J');arrow(v,320,220,320,280,'#4b78a3',Math.max(3,18*r.rejected/Q));text(v,540,255,'Q rejetée : '+f(r.rejected,1)+' J');arrow(v,480,177,685,177,'#087e8b',Math.max(3,18*r.work/Q));text(v,590,151,'W : '+f(r.work,1)+' J');
   out.textContent='Bilan : '+f(Q,1)+' J reçus = '+f(r.work,1)+' J de travail + '+f(r.rejected,1)+' J rejetés. '+(r.entropy===0?'À la limite réversible, le bilan d’entropie des deux sources est nul.':'Avec le rendement choisi, le bilan d’entropie des deux sources est positif.')+' Augmenter la source chaude ou abaisser la source froide relève la borne ; aucune source froide à température absolue positive ne permet η = 100 %.';
  }[hot,cold,heat,fraction].forEach(function(i){i.addEventListener('input',draw);});draw();
 }
 function init(){document.querySelectorAll('[data-physics-lab]').forEach(function(b){if(b.dataset.ready)return;var fn={wave:wave,compton:compton,engine:engine}[b.dataset.physicsLab];if(fn){b.dataset.ready='1';fn(b);}});reveal();window.addEventListener('hashchange',reveal);}
 function reveal(){var id=window.location.hash.slice(1),t=id?document.getElementById(id):null;if(t&&t.matches('details.ph-disclosure'))t.open=true;}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}());
