/* Voyant et al., RPOR 16 (2011), 21–31. DOI 10.1016/j.rpor.2010.11.002.
   Rounded reference scaling and conditional Table 2 only. Not a transport or treatment planner. */
(function (root) {
  'use strict';
  var M = {
    result: function (hours, boron) {
      if (!Number.isFinite(hours) || !Number.isFinite(boron) || hours < 0 || boron < 0) throw new RangeError('Non-negative finite inputs required');
      return {tumourReferenceMicroGy: hours, captureIndex: 100 * hours * boron / 20, flightModelMicroSv: 4.37 * hours, flightReferenceMicroSv: 6.1 * hours};
    },
    reactions: {BSH: [1, 94, 0, 5], BPA: [1, 88, 0, 11]}
  };
  root.FlightBNCT = M;
  if (typeof document === 'undefined') return;
  function mount(box) {
    if (box.dataset.ready) return; box.dataset.ready = 'true';
    var fr = box.dataset.lang === 'fr', tr = function (a,b) { return fr ? a : b; };
    var fmt = function (n) { return n.toLocaleString(fr?'fr-FR':'en-GB',{maximumFractionDigits:2}); };
    box.innerHTML = '<h2>' + tr('Du ciel à la cellule : explorer sans confondre les échelles','From the sky to the cell: keep the scales separate') + '</h2>' +
      '<p>' + tr('Quatre étapes schématiques, jusqu’à une possible signalisation bystander. Les particules dessinées ne représentent pas un nombre réel de captures.','Four schematic stages, through possible bystander signalling. Drawn particles do not represent actual capture counts.') + '</p>' +
      '<svg viewBox="0 0 760 330" role="img" aria-label="' + tr('Cascade atmosphérique, avion et capture du bore','Atmospheric cascade, aircraft and boron capture') + '"></svg>' +
      '<div class="bnct-ctl"><button type="button" data-step>' + tr('Étape suivante','Next stage') + '</button><button type="button" data-guide aria-expanded="false" aria-controls="bnct-reading-guide">' + tr('Lire le schéma','Read the diagram') + '</button><button type="button" data-reset>' + tr('Revenir au ciel','Back to the sky') + '</button></div>' +
      '<div class="bnct-guide" id="bnct-reading-guide" data-guide-panel hidden><h3>' + tr('Les quatre étapes du schéma','The four stages in the diagram') + '</h3><ol></ol></div>' +
      '<p class="bnct-step" aria-live="polite"></p><div class="bnct-ctl"><label>' + tr('Durée illustrative : ','Illustrative duration: ') + '<output data-hours>1 h</output><input aria-label="' + tr('Durée en heures','Duration in hours') + '" data-time type="range" min="0" max="12" step="0.5" value="1"></label><label>' + tr('Bore-10 dans le fantôme : ','Boron-10 in the phantom: ') + '<output data-boron>20 µg/g</output><input aria-label="' + tr('Concentration de bore-10 du fantôme','Phantom boron-10 concentration') + '" data-b type="range" min="0" max="50" step="1" value="20"></label></div>' +
      '<div class="bnct-metrics" aria-live="polite"></div><p class="bnct-foot">' + tr('Spectre et géométrie fixés. Mise à l’échelle d’un ordre de grandeur publié, pas un nouveau calcul Monte-Carlo. Les µGy et µSv des panneaux ne sont pas interchangeables.','Fixed spectrum and geometry. Scaling a published order of magnitude, not a new Monte Carlo calculation. The panels’ µGy and µSv are not interchangeable.') + '</p>' +
      '<h3>' + tr('Changer de molécule, pas inventer un gain clinique','Change the molecule, without inventing clinical gains') + '</h3><label>' + tr('Vecteur du bore — tableau 2','Boron carrier — Table 2') + ' <select aria-label="' + tr('Vecteur du bore','Boron carrier') + '"><option>BSH</option><option>BPA</option></select></label><div class="bnct-bars"></div><p>' + tr('Répartition conditionnelle des réactions neutron–molécule dans le spectre de l’article. Le choix BSH/BPA ne change pas l’indice à concentration de bore-10 identique. La dose de référence reste celle de 20 µg/g.','Conditional neutron–molecule reaction distribution in the paper’s spectrum. Switching BSH/BPA does not change the index at equal boron-10 concentration. The reference dose remains that at 20 µg/g.') + '</p>';
    var sv=box.querySelector('svg'), step=0;
    var desc=[tr('1 — Des particules cosmiques énergétiques rencontrent l’atmosphère : des particules secondaires, dont des neutrons, sont produites. Le vent solaire module le fond galactique ; un événement solaire énergétique est autre chose.','1 — Energetic cosmic particles encounter the atmosphere, producing secondaries including neutrons. Solar wind modulates the galactic background; a solar energetic event is different.'),
      tr('2 — Le modèle étudié fixe 12 km d’altitude, 45° de latitude et un spectre de 14,7 neutrons·cm⁻²·s⁻¹. Une couche d’eau de 10 cm modère les neutrons avant le crâne et le fantôme tumoral. Il ne décrit pas toutes les routes aériennes.','2 — The studied model fixes 12 km altitude, 45° latitude and a spectrum with 14.7 neutrons·cm⁻²·s⁻¹. A 10 cm water layer moderates neutrons before the skull and tumour phantom. This does not describe every flight route.'),
      tr('3 — Une capture par le bore-10 émet du lithium-7 et une particule alpha : des trajectoires de quelques micromètres. Une énergie très localisée, mais des événements rares : la dose moyenne reste de l’ordre du µGy/h dans le cas de référence.','3 — Boron-10 capture emits lithium-7 and an alpha particle, with tracks a few micrometres long. Highly local energy, but rare events: the mean dose remains of the order of µGy/h in the reference case.'),
      tr('4 — Une cellule touchée peut transmettre des signaux à ses voisines : c’est le bystander. Le pointillé violet représente un signal biologique, pas une trajectoire alpha ni une dose supplémentaire. La réponse de la voisine et l’éventuel effet sur les récidives ne sont pas prédits ici.','4 — A hit cell may signal to neighbours: a bystander response. The purple dashed line represents biological signalling, not an alpha track or extra dose. Neighbour responses and any recurrence effect are not predicted here.')];
    var guide=box.querySelector('[data-guide-panel] ol');
    desc.forEach(function(s){var li=document.createElement('li');li.textContent=s.replace(/^[1-4] — /,'');guide.appendChild(li);});
    var NS='http://www.w3.org/2000/svg';
    function el(tag,a,text) {var e=document.createElementNS(NS,tag);Object.keys(a).forEach(function(k){e.setAttribute(k,a[k]);});if(text)e.textContent=text;sv.appendChild(e);return e;}
    function txt(x,y,s,size,color){return el('text',{x:x,y:y,'font-size':size||16,fill:color||'currentColor','font-family':'system-ui'},s);}
    function line(x,y,x2,y2,color,w){el('line',{x1:x,y1:y,x2:x2,y2:y2,stroke:color,'stroke-width':w||3,'stroke-linecap':'round'});}
    function circle(x,y,r,color){el('circle',{cx:x,cy:y,r:r,fill:color});}
    function draw() {
      sv.replaceChildren();
      el('rect',{x:0,y:0,width:760,height:330,fill:'#f1f7fb',rx:12});
      txt(24,30,tr('COSMOS → ATMOSPHÈRE','COSMOS → ATMOSPHERE'),15,'#13405d');
      el('path',{d:'M0 215 Q110 160 245 215 L245 330 L0 330Z',fill:'#c3dce8'});
      txt(20,310,tr('Cascade secondaire','Secondary cascade'),14,'#13405d');
      var travel=0.5;
      line(98,48,128,112,'#ad5916',4);circle(98+30*travel,48+64*travel,6,'#ad5916');
      [[50,192],[142,202],[211,189]].forEach(function(p){line(128,112,p[0],p[1],'#287c99',2);circle(128+(p[0]-128)*travel,112+(p[1]-112)*travel,4,'#287c99');});
      line(255,165,287,165,'#476e85',2);
      txt(292,30,tr('LE MODÈLE À 12 km','THE MODEL AT 12 km'),15,'#13405d');
      el('path',{d:'M295 110 L345 106 L375 80 L388 80 L374 106 L433 110 L374 117 L387 143 L374 143 L345 118 L295 115Z',fill:'#326c88'});
      el('rect',{x:300,y:178,width:55,height:78,fill:'#b1dfef',rx:5});txt(302,280,'10 cm',13,'#13405d');
      txt(302,171,tr('Eau','Water'),14,'#13405d');
      // Skull thickness is annotated numerically; its width is exaggerated for legibility.
      el('rect',{x:363,y:178,width:16,height:78,fill:'#8e8067',stroke:'#564a36','stroke-width':1});
      line(371,258,371,274,'#564a36',1);txt(345,290,tr('Os du crâne','Skull bone'),13,'#13405d');txt(355,308,'0.5 cm',13,'#13405d');
      el('ellipse',{cx:419,cy:216,rx:36,ry:43,fill:'#f0dcd6'});txt(390,171,tr('Cerveau','Brain'),13,'#13405d');
      circle(419,218,16,'#cb8f86');txt(393,273,tr('Tumeur','Tumour'),13,'#13405d');txt(403,290,'~1 g',13,'#13405d');
      if(step>=1){line(286,215,410,215,'#287c99',2);circle(286+124*travel,215,5,'#287c99');}
      line(460,165,490,165,'#476e85',2);
      txt(497,30,tr('ZOOM : UNE CAPTURE','ZOOM: ONE CAPTURE'),15,'#13405d');
      circle(620,170,79,'#e5eff5');el('circle',{cx:620,cy:170,r:79,fill:'none',stroke:'#7197ac','stroke-dasharray':'5 5'});
      circle(620,170,12,'#ba6217');txt(599,151,'¹⁰B',20,'#13405d');
      if(step>=2){var r=40+30*travel;line(620,170,620+r,170-r/2,'#b94631',4);line(620,170,620-r/2,170+r/4,'#7a419c',4);circle(620+r,170-r/2,6,'#b94631');circle(620-r/2,170+r/4,6,'#7a419c');txt(676,113,'α ~8 µm',14,'#9e3020');txt(493,232,'⁷Li ~4 µm',14,'#70338c');}
      if(step===3){
        circle(721,229,18,'#d4e1e9');txt(716,235,'?',19,'#70338c');
        el('line',{x1:667,y1:202,x2:705,y2:224,stroke:'#8052a2','stroke-width':2,'stroke-dasharray':'4 4'});
        circle(667+38*travel,202+22*travel,3,'#8052a2');
        txt(686,255,tr('voisine','neighbour'),11,'#70338c');
        txt(501,73,tr('Bystander : réponse à vérifier','Bystander: response to investigate'),12,'#70338c');
      }
      txt(498,280,'¹⁰B + n → ⁷Li + α',20,'#13405d');
      txt(498,310,tr('Schéma, distances non à l’échelle','Schematic, distances not to scale'),12,'#13405d');
    }
    function updateStage(){box.querySelector('.bnct-step').textContent=desc[step];draw();}
    function values(){
      var t=+box.querySelector('[data-time]').value,b=+box.querySelector('[data-b]').value,v=M.result(t,b);
      box.querySelector('[data-hours]').textContent=fmt(t)+' h';box.querySelector('[data-boron]').textContent=fmt(b)+' µg/g';
      box.querySelector('.bnct-metrics').innerHTML='<article>'+tr('Dose moyenne : référence à 20 µg/g','Mean dose: reference at 20 µg/g')+'<strong>≈ '+fmt(v.tumourReferenceMicroGy)+' µGy</strong>'+tr('Durée × 1 µGy/h, uniquement à 20 µg/g. Le curseur de bore ne recalcule pas cette dose.','Duration × 1 µGy/h, at 20 µg/g only. The boron slider does not recalculate this dose.')+'</article><article>'+tr('Indice relatif d’interactions sur le bore','Relative boron interaction index')+'<strong>'+fmt(v.captureIndex)+' %</strong>'+tr('100 % = 1 h à 20 µg/g. Ce n’est pas un pourcentage de neutrons capturés, ni une dose.','100% = 1 h at 20 µg/g. Not the percentage of neutrons captured, nor a dose.')+'</article><article>'+tr('Exposition du vol : modèle historique','Flight exposure: historical model')+'<strong>'+fmt(v.flightModelMicroSv)+' µSv</strong>'+tr('4,37 µSv/h × durée. Sans lien avec le curseur de bore.','4.37 µSv/h × duration. Independent of the boron slider.')+'</article><article>'+tr('Vol : référence historique SIEVERT','Flight: historical SIEVERT reference')+'<strong>'+fmt(v.flightReferenceMicroSv)+' µSv</strong>'+tr('6,1 µSv/h × durée. Pas une estimation personnalisée actuelle.','6.1 µSv/h × duration. Not a current personal exposure estimate.')+'</article>';
      var a=M.reactions[box.querySelector('select').value],names=[tr('Capture γ','γ capture'),'(n,α)','(n,p)','(n,n)'];
      box.querySelector('.bnct-bars').innerHTML=a.map(function(n,i){return '<div class="bnct-bar"><span>'+names[i]+'</span><i style="width:'+n+'%"></i><b>'+(i===2?'≈ ':'')+n+' %</b></div>';}).join('');
    }
    box.querySelector('[data-guide]').onclick=function(){var panel=box.querySelector('[data-guide-panel]'),open=this.getAttribute('aria-expanded')!=='true';this.setAttribute('aria-expanded',String(open));panel.hidden=!open;};
    box.querySelector('[data-step]').onclick=function(){step=(step+1)%desc.length;updateStage();};
    box.querySelector('[data-reset]').onclick=function(){step=0;updateStage();};
    box.querySelectorAll('input,select').forEach(function(e){e.addEventListener('input',values);});
    updateStage();values();
  }
  function init(){document.querySelectorAll('.bnct-lab').forEach(mount);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window !== 'undefined'?window:globalThis);
