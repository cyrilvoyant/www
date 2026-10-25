/* Course-only statistical laboratories. Requires course-tools.js (window.CT).
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
  var NS='http://www.w3.org/2000/svg';
  function node(tag,attrs,parent,text){var e=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,attrs[k]);});if(text!==undefined)e.textContent=text;if(parent)parent.appendChild(e);return e;}
  function svg(tag,attrs,parent,text){var e=document.createElementNS(NS,tag);Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,attrs[k]);});if(text!==undefined)e.textContent=text;if(parent)parent.appendChild(e);return e;}
  function num(x,d){return Number.isFinite(x)?x.toFixed(d===undefined?3:d).replace('.',','):'—';}
  function pv(x){return x<1e-8?'p < 10⁻⁸':'p = '+(x<.0001?x.toExponential(2):x.toFixed(4)).replace('.',',');}
  function control(parent,label,type,min,max,step,value){var w=node('label',{'class':'st-control'},parent);node('span',{},w,label);var i=node('input',{type:type,min:min,max:max,step:step,value:value},w);var o=node('output',{},w);function update(){o.textContent=type==='range'?num(+i.value,step<1?2:0):'';}i.addEventListener('input',update);update();return {w:w,i:i};}
  function heading(b,t,sub){node('h3',{},b,t);node('p',{'class':'st-intro'},b,sub);}
  function note(b,text){return node('p',{'class':'st-note'},b,text);}
  function chart(parent,label,w,h){return svg('svg',{viewBox:'0 0 '+w+' '+h,role:'img','aria-label':label,'class':'st-svg'},parent);}
  function path(points){return points.map(function(p,i){return(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2);}).join(' ');}
  function metric(parent,label,value){var d=node('div',{},parent);node('span',{},d,label);node('strong',{},d,value);}
  M.summarySample=function(mean,sd,n){var z=[],sum=0;for(var i=0;i<n;i++){var q=C.invPhi((i+.5)/n);z.push(q);sum+=q;}var center=sum/n,v=0;z.forEach(function(x){v+=(x-center)*(x-center);});var scale=sd/Math.sqrt(v/(n-1));return z.map(function(x){return mean+(x-center)*scale;});};
  function student(b){
    // Classic (pooled) Student test of the course (slides 92-93): two independent groups, s_p² = [(n₁−1)s₁²+(n₂−1)s₂²]/(n₁+n₂−2),
    // t = (x̄₁ − x̄₂)/(s_p √(1/n₁+1/n₂)), ddl = n₁+n₂−2, H₀ rejected when |t| > t_table. Engine: M.student('pooled', …) (checked).
    heading(b,'Deux traitements : leurs moyennes diffèrent-elles vraiment ?','Deux groupes de patients reçoivent chacun un traitement. Les moyennes diffèrent toujours un peu, ne serait-ce que par hasard. Le test de Student du cours dit si l’écart observé est grand devant ce hasard.');
    var EX={
      hta:{a:'Traitement A',b:'Traitement B',u:'mmHg',q:'baisse de la pression systolique après 8 semaines',m1:14,s1:5,m2:8,s2:6,n:12,
           src:'Exemple construit pour l’exercice : 12 patients par groupe, valeurs fictives.'},
      gfi:{a:'GFI gauche',b:'GFI droit',u:'',q:'mesure de l’aire de Broca (exemple du cours)',m1:36,s1:9.4195,m2:70.25,s2:4.6928,n:12,
           src:'Exemple du cours, diapositive 97 : n = 12 par groupe, moyennes 36 et 70,25, variances 88,73 et 22,02 ; le cours trouve t = −11,27 pour 22 ddl.'}};
    var cur=EX.hta;
    var presets=node('div',{'class':'st-presets'},b);
    [['hta','Exemple : deux traitements de l’hypertension'],['gfi','Exemple du cours : aire de Broca (diapositive 97)']].forEach(function(p){var bt=node('button',{type:'button'},presets,p[1]);bt.addEventListener('click',function(){load(EX[p[0]]);});});
    var ctl=node('div',{'class':'st-controls'},b),m1=control(ctl,'Moyenne groupe 1','range',0,100,.25,14),s1=control(ctl,'Écart-type groupe 1','range',.5,30,.01,5),
        m2=control(ctl,'Moyenne groupe 2','range',0,100,.25,8),s2=control(ctl,'Écart-type groupe 2','range',.5,30,.01,6),n=control(ctl,'Patients par groupe n','range',3,60,1,12);
    var story=node('p',{'class':'st-reading'},b);
    var dist=chart(b,'Distributions des deux groupes : patients et moyennes',640,300);
    var legend=note(b,'');
    var metrics=node('div',{'class':'st-metrics','aria-live':'polite'},b);
    var view=chart(b,'Loi de Student sous H₀, seuil du cours et t observé',640,260);
    var read=node('p',{'class':'st-reading'},b), steps=note(b,''), cond=note(b,'');
    function load(e){cur=e;m1.i.value=e.m1;s1.i.value=e.s1;m2.i.value=e.m2;s2.i.value=e.s2;n.i.value=e.n;[m1,s1,m2,s2,n].forEach(function(c){c.i.dispatchEvent(new Event('input'));});}
    function normal(x,m,s){return Math.exp(-.5*((x-m)/s)*((x-m)/s))/(s*Math.sqrt(2*Math.PI));}
    function draw(){
      var a1=+m1.i.value,b1=+s1.i.value,a2=+m2.i.value,b2=+s2.i.value,nn=+n.i.value,u=cur.u?' '+cur.u:'';
      m1.w.firstChild.textContent='Moyenne '+cur.a;s1.w.firstChild.textContent='Écart-type '+cur.a;m2.w.firstChild.textContent='Moyenne '+cur.b;s2.w.firstChild.textContent='Écart-type '+cur.b;
      var r=M.student('pooled',a1-a2,b1,nn,b2,nn,.05), sp=Math.sqrt(((nn-1)*b1*b1+(nn-1)*b2*b2)/(2*nn-2));
      story.textContent='Question : '+cur.q+'. '+cur.a+' : moyenne '+num(a1,2)+u+', écart-type '+num(b1,2)+' ; '+cur.b+' : moyenne '+num(a2,2)+u+', écart-type '+num(b2,2)+' ; '+nn+' patients par groupe. '+cur.src;
      // 1. the distributions: patients (wide curves, dots) and means (narrow dashed curves, s/√n)
      dist.replaceChildren();
      var lo=Math.min(a1-3.2*b1,a2-3.2*b2),hi=Math.max(a1+3.2*b1,a2+3.2*b2),X=function(x){return 40+580*(x-lo)/(hi-lo);},base=230;
      var top=Math.max(normal(a1,a1,b1),normal(a2,a2,b2)),Yp=function(v){return base-120*v/top;};
      var topm=Math.max(normal(a1,a1,b1/Math.sqrt(nn)),normal(a2,a2,b2/Math.sqrt(nn))),Ym=function(v){return base-200*v/topm;};
      [[a1,b1,'#087e8b',cur.a],[a2,b2,'#c36d25',cur.b]].forEach(function(g,k){
        var pts=[],ptm=[];for(var j=0;j<=300;j++){var x=lo+(hi-lo)*j/300;pts.push([X(x),Yp(normal(x,g[0],g[1]))]);ptm.push([X(x),Ym(normal(x,g[0],g[1]/Math.sqrt(nn)))]);}
        svg('path',{d:path(pts)+'L'+X(hi)+' '+base+'L'+X(lo)+' '+base+'Z',fill:g[2],'fill-opacity':.12,stroke:g[2],'stroke-width':2},dist);
        svg('path',{d:path(ptm),fill:'none',stroke:g[2],'stroke-width':2.5,'stroke-dasharray':'6 4'},dist);
        svg('line',{x1:X(g[0]),x2:X(g[0]),y1:base,y2:28,stroke:g[2],'stroke-width':2},dist);
        svg('text',{x:X(g[0]),y:22-k*0,'text-anchor':'middle','class':'st-axis',fill:g[2]},dist,g[3]+' : '+num(g[0],1));
        M.summarySample(g[0],g[1],nn).forEach(function(x,i){svg('circle',{cx:X(x),cy:base+12+k*14+((i*7)%3-1)*2,r:3,fill:g[2],'fill-opacity':.75},dist);});
      });
      var yA=46;svg('line',{x1:X(Math.min(a1,a2)),x2:X(Math.max(a1,a2)),y1:yA,y2:yA,stroke:'#193d5b','stroke-width':2},dist);
      svg('text',{x:(X(a1)+X(a2))/2,y:yA-6,'text-anchor':'middle','class':'st-axis'},dist,'Δ = '+num(a1-a2,2)+u);
      [lo,(lo+hi)/2,hi].forEach(function(x){svg('text',{x:X(x),y:296,'text-anchor':'middle','class':'st-axis'},dist,num(x,1));});
      legend.textContent='Courbes pleines : répartition des patients de chaque groupe (moyenne ± écart-type). Pointillés : précision de la moyenne du groupe, d’écart-type s/√n. Points : les '+nn+' patients de chaque groupe (valeurs construites pour avoir exactement la moyenne et l’écart-type affichés). Les patients se chevauchent ; ce qui compte pour le test, c’est le chevauchement des pointillés.';
      // 2. the three steps of the course
      metrics.replaceChildren();
      metric(metrics,'1. Écart des moyennes Δ',num(r.difference,2)+u);metric(metrics,'2. Écart-type commun sₚ',num(sp,2));metric(metrics,'Erreur standard de Δ',num(r.se,3));
      metric(metrics,'3. t calculé',num(r.t,2));metric(metrics,'ddl = n₁ + n₂ − 2',String(r.df));metric(metrics,'t table (α = 5 %)',num(r.critical,3));metric(metrics,'p-value bilatérale',pv(r.p));
      // 3. Student density under H0
      view.replaceChildren();
      var span=Math.max(4.5,Math.min(13,Math.abs(r.t)+1),r.critical+1),XT=function(t){return 40+560*(t+span)/(2*span);},Y=function(z){return 213-420*z;};
      var pt=[];for(var j=0;j<=400;j++){var t=-span+2*span*j/400;pt.push([XT(t),Y(M.density(t,r.df))]);}
      [-1,1].forEach(function(sg){var q=[[XT(sg*r.critical),213]];for(var k=0;k<=150;k++){var t=sg*(r.critical+(span-r.critical)*k/150);q.push([XT(t),Y(M.density(t,r.df))]);}q.push([XT(sg*span),213]);svg('path',{d:path(q)+'Z',fill:'#f2b676'},view);});
      svg('path',{d:path(pt),fill:'none',stroke:'#193d5b','stroke-width':2.5},view);svg('line',{x1:40,y1:213,x2:600,y2:213,stroke:'#74869a'},view);
      [-r.critical,0,r.critical].forEach(function(t){svg('line',{x1:XT(t),y1:30,x2:XT(t),y2:213,stroke:t?'#b96a1c':'#acb8c3','stroke-dasharray':'4 4'},view);svg('text',{x:XT(t),y:237,'text-anchor':'middle','class':'st-axis'},view,num(t,3));});
      var sh=Math.max(-span,Math.min(span,r.t));svg('line',{x1:XT(sh),y1:40,x2:XT(sh),y2:213,stroke:'#087e8b','stroke-width':3},view);
      svg('text',{x:XT(sh),y:34,'text-anchor':'middle','class':'st-axis'},view,'t calculé = '+num(r.t,2));
      svg('text',{x:320,y:256,'text-anchor':'middle','class':'st-axis'},view,'Sous H₀ (traitements équivalents) : loi de Student à '+r.df+' ddl ; zones orange : 5 % des cas au total');
      var rej=Math.abs(r.t)>r.critical;
      read.textContent=(rej?'|t calculé| = '+num(Math.abs(r.t),2)+' > t table = '+num(r.critical,3)+' (ddl = '+r.df+', α = 0,05) : H₀ rejetée. Les moyennes de '+cur.a+' et de '+cur.b+' diffèrent significativement.'
        :'|t calculé| = '+num(Math.abs(r.t),2)+' ≤ t table = '+num(r.critical,3)+' (ddl = '+r.df+', α = 0,05) : H₀ non rejetée. L’écart observé peut s’expliquer par le hasard ; cela ne prouve pas que les traitements sont équivalents.');
      steps.textContent='Calcul du cours : sₚ = √{[(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2)} = '+num(sp,3)+' ; t = Δ/(sₚ √(1/n₁ + 1/n₂)) = '+num(r.difference,2)+'/'+num(r.se,3)+' = '+num(r.t,3)+'. Essayez : augmentez n sans changer les moyennes, les pointillés se resserrent et t grandit.';
      var ratio=Math.max(b1,b2)*Math.max(b1,b2)/(Math.min(b1,b2)*Math.min(b1,b2));
      cond.textContent='Conditions du cours : deux groupes indépendants (patients différents), distributions proches de la loi normale, variances homogènes, à vérifier (ici, rapport des variances = '+num(ratio,2)+'). Si les mêmes patients sont mesurés avant et après, c’est le test apparié, sur les différences.';
    }
    [m1,s1,m2,s2,n].forEach(function(c){c.i.addEventListener('input',draw);});draw();
  }
  function determination(b){
    heading(b,'Un lien significatif explique-t-il beaucoup ?','Deux curseurs, deux questions : n change la significativité ; r² mesure la part de variation décrite par une régression linéaire simple avec constante. Le signe de r donne le sens, pas la quantité de variation expliquée.');
    var ctl=node('div',{'class':'st-controls'},b),cr=control(ctl,'Corrélation r du nuage construit','range',-.95,.95,.01,.3),cn=control(ctl,'Effectif n dans le calcul du test','range',10,1000,1,30),met=node('div',{'class':'st-metrics','aria-live':'polite'},b),v=chart(b,'Nuage construit, droite ajustée et distances résiduelles',640,310),stack=node('div',{'class':'st-variance',role:'img','aria-label':'Décomposition de la variation totale'},b),labels=node('p',{'class':'st-note'},b),out=node('p',{'class':'st-reading'},b),buttons=node('div',{'class':'st-presets'},b);
    [['Petit r, petit n',.1,30],['Même r, grand n',.1,1000],['Fort lien négatif',-.8,30]].forEach(function(p){var bt=node('button',{type:'button'},buttons,p[0]);bt.addEventListener('click',function(){cr.i.value=p[1];cn.i.value=p[2];cr.i.dispatchEvent(new Event('input'));cn.i.dispatchEvent(new Event('input'));});});
    note(b,'Formules du chapitre : t = r√[(n−2)/(1−r²)], ν = n−2 ; R² = SSR/SST = 1−SSE/SST = r² en régression simple avec constante. SST = Σ(yi−ȳ)², SSE = Σ(yi−ŷi)², SSR = Σ(ŷi−ȳ)². Les traits verticaux montrent quelques résidus.');
    note(b,'Nuage pédagogique déterministe construit pour conserver exactement r : ce ne sont ni des mesures ni un échantillon aléatoire. La p-value illustre le test théorique sous H₀ : ρ = 0, pour des couples indépendants normaux bivariés ; elle ne constitue pas une inférence sur ce nuage artificiel. Aucune causalité ni performance future n’est démontrée.');
    function draw(){var r=M.correlation(+cr.i.value,+cn.i.value),p=M.cloud(r.r,r.n),fit=C.regress(p.x,p.y),sst=0,sse=0;met.replaceChildren();v.replaceChildren();stack.replaceChildren();
      p.y.forEach(function(y,i){sst+=y*y;sse+=Math.pow(y-fit.b0-fit.b1*p.x[i],2);});
      metric(met,'Corrélation r',num(fit.r));metric(met,'Variation expliquée R²',num(100*fit.r2,1)+' %');metric(met,'Significativité théorique',pv(r.p));metric(met,'Effectif n',r.n);
      var extent=Math.max.apply(null,p.x.concat(p.y).map(Math.abs))*1.1;
      var X=function(x){return 320+270*x/extent;},Y=function(y){return 150-130*y/extent;};
      svg('line',{x1:45,y1:Y(0),x2:595,y2:Y(0),stroke:'#a7b7c3'},v);svg('line',{x1:X(0),y1:12,x2:X(0),y2:280,stroke:'#a7b7c3'},v);
      for(var i=0;i<p.x.length;i++){if(i%Math.max(1,Math.floor(r.n/12))===0)svg('line',{x1:X(p.x[i]),x2:X(p.x[i]),y1:Y(p.y[i]),y2:Y(fit.b0+fit.b1*p.x[i]),stroke:'#d6873e','stroke-width':1.6},v);svg('circle',{cx:X(p.x[i]),cy:Y(p.y[i]),r:r.n>100?1.7:3.5,fill:'#087e8b','fill-opacity':.6},v);}
      svg('line',{x1:X(-extent),y1:Y(fit.b0-extent*fit.b1),x2:X(extent),y2:Y(fit.b0+extent*fit.b1),stroke:'#193d5b','stroke-width':3},v);svg('text',{x:320,y:304,'text-anchor':'middle','class':'st-axis'},v,'Nuage centré construit · droite en bleu foncé · résidus en orange');
      node('span',{'class':'st-explained',style:'width:'+(100*fit.r2)+'%'},stack);node('span',{'class':'st-residual',style:'width:'+(100*(1-fit.r2))+'%'},stack);
      stack.setAttribute('aria-label',num(100*fit.r2,1)+' % expliqués, '+num(100*(1-fit.r2),1)+' % résiduels');labels.textContent='Bleu : variation expliquée '+num(100*fit.r2,1)+' % · orange : variation résiduelle '+num(100*(1-fit.r2),1)+' %. SST = '+num(sst,1)+' ; SSE = '+num(sse,1)+' (unités arbitraires au carré).';
      out.textContent=(r.p<.05?'Test théorique significatif':'Test théorique non significatif')+' au seuil 5 %, avec '+num(100*fit.r2,1)+' % de variation expliquée par la droite. '+(fit.r2<.1?'Un faible R² peut coexister avec une petite p-value.':'Le R² décrit l’ajustement dans cet exemple ; il faut une évaluation séparée pour prévoir de nouvelles données.');
    }
    [cr.i,cn.i].forEach(function(i){i.addEventListener('input',draw);});draw();
  }
  function chisquare(b){
    heading(b,'χ² : où se trouve l’écart à l’hypothèse ?','Modifier des effectifs, comparer observés et attendus, puis repérer les cellules qui contribuent le plus au χ². Deux usages du chapitre : équilibre d’un dé à six faces et indépendance dans un tableau 2×2.');
    var ch=node('label',{'class':'st-choice'},b);node('span',{},ch,'Question posée');var mode=node('select',{},ch);node('option',{value:'fit'},mode,'Dé à six faces : équilibré ?');node('option',{value:'independence'},mode,'Tableau 2×2 : variables indépendantes ?');
    var ctl=node('div',{'class':'st-controls'},b),inputs=[],info=note(b,''),met=node('div',{'class':'st-metrics','aria-live':'polite'},b),v=chart(b,'Comparaison des effectifs observés et attendus sous H0',640,270),tab=node('div',{'class':'st-table'},b),out=node('p',{'class':'st-reading'},b),buttons=node('div',{'class':'st-presets'},b);
    function set(values){values.forEach(function(x,i){inputs[i].i.value=x;});draw();}
    var suspect=node('button',{type:'button'},buttons,'Dé suspect : face 6 fréquente');suspect.addEventListener('click',function(){mode.value='fit';reset();set([10,12,11,9,10,68]);});var equal=node('button',{type:'button'},buttons,'Observés = attendus'),small=node('button',{type:'button'},buttons,'Voir les faibles effectifs'),more=node('button',{type:'button'},buttons,'Même répartition, effectifs ×4');
    equal.addEventListener('click',function(){set(mode.value==='fit'?[20,20,20,20,20,20]:[70,30,70,30]);});small.addEventListener('click',function(){set(mode.value==='fit'?[1,0,2,0,1,2]:[1,0,0,2]);});more.addEventListener('click',function(){set(inputs.map(function(c){return +c.i.value*4;}));});
    note(b,'χ² = Σ (O−E)²/E. Dé équilibré : probabilités fixées à 1/6, E=N/6 et 5 ddl ; pas de paramètre estimé. Indépendance : Eij = total ligne i × total colonne j / N, 1 ddl. Pearson sans correction de continuité ; pas de test exact ni de conclusion causale.');
    note(b,'Conditions : observations indépendantes, catégories exclusives et effectifs comptés, pas des pourcentages saisis comme s’il s’agissait de nombres de personnes. Le tableau 2×2 ne convient pas à des mesures appariées. Le plan de recueil et les effectifs attendus déterminent la pertinence de l’approximation.');
    function reset(){ctl.replaceChildren();inputs=[];var labels=mode.value==='fit'?['Face 1','Face 2','Face 3','Face 4','Face 5','Face 6']:['Groupe A : oui','Groupe A : non','Groupe B : oui','Groupe B : non'],values=mode.value==='fit'?[10,12,11,9,10,68]:[75,25,65,35];labels.forEach(function(label,i){var c=control(ctl,label,'number',0,10000000,1,values[i]);c.i.addEventListener('input',draw);inputs.push(c);});info.textContent=mode.value==='fit'?'Exemple fictif de 120 lancers indépendants d’un dé à six faces. H₀ : chaque face a une probabilité 1/6 ; on attend donc 20 occurrences par face. Les valeurs ne reproduisent pas le tableau des bonbons du support.':'Valeurs de départ de l’exercice du cours (chapitre 3, diapositive 62) : 75/25 et 65/35. « Oui » et « non » reprennent les deux issues du tableau ; aucune recommandation médicale n’est déduite de cet exercice. H₀ : groupe et issue sont indépendants.';draw();}
    function draw(){met.replaceChildren();v.replaceChildren();tab.replaceChildren();var r;
      try{if(inputs.some(function(c){return !c.i.value.trim()||!c.i.checkValidity();}))throw Error('Saisir des effectifs entiers positifs ou nuls dans les plages indiquées.');r=M.chisquare(mode.value,inputs.map(function(c){return +c.i.value;}));}catch(e){out.textContent=e.message;return;}
      metric(met,'χ² de Pearson',num(r.stat,3));metric(met,'Degrés de liberté',r.df);metric(met,'p asymptotique',pv(r.p));metric(met,'Effectif total',r.N);
      var max=Math.max.apply(null,r.expected.concat(inputs.map(function(c){return +c.i.value;})))*1.15,base=218,h=170,step=530/inputs.length;
      svg('line',{x1:50,y1:base,x2:600,y2:base,stroke:'#74869a'},v);
      inputs.forEach(function(c,i){var x=65+i*step,obs=+c.i.value,exp=r.expected[i];svg('rect',{x:x,y:base-h*obs/max,width:step*.28,height:h*obs/max,fill:'#087e8b'},v);svg('rect',{x:x+step*.32,y:base-h*exp/max,width:step*.28,height:h*exp/max,fill:'none',stroke:'#193d5b','stroke-width':2},v);svg('text',{x:x+step*.3,y:240,'text-anchor':'middle','class':'st-axis'},v,mode.value==='fit'?'Face '+(i+1):['A oui','A non','B oui','B non'][i]);});
      svg('text',{x:320,y:22,'text-anchor':'middle','class':'st-axis'},v,'Bleu plein : observé · contour : attendu sous H₀');
      var table=node('table',{},tab),head=node('tr',{},node('thead',{},table));['Cellule','Observé O','Attendu E','Contribution (O−E)²/E'].forEach(function(t){node('th',{scope:'col'},head,t);});var tbody=node('tbody',{},table);
      inputs.forEach(function(c,i){var tr=node('tr',{},tbody);node('th',{scope:'row'},tr,c.w.firstChild.textContent);node('td',{},tr,c.i.value);node('td',{},tr,num(r.expected[i],2));var td=node('td',{},tr);node('span',{},td,num(r.contributions[i],3));var bar=node('span',{'class':'st-contribution','aria-hidden':'true'},td);bar.style.width=(r.stat?100*r.contributions[i]/r.stat:0)+'%';});
      out.textContent=r.small?'Au moins un attendu est inférieur à 5 : signal pédagogique de fragilité de l’approximation. La p-value est affichée pour comprendre le calcul ; ne pas conclure automatiquement avec ce seuil. Une méthode adaptée ou exacte doit être envisagée selon la structure du tableau.':(r.p<.05?'H₀ rejetée':'H₀ non rejetée')+' au seuil fixé de 5 %. '+(r.p<.05?'Les écarts à H₀ sont statistiquement détectables dans ce modèle.':'Le test ne met pas en évidence un écart ; il ne prouve pas H₀.')+' Le χ² additionne les contributions : une différence dans une cellule peu attendue pèse davantage.';
    }
    mode.addEventListener('change',reset);reset();
  }
  M.regressionDemo=function(n,se){
    var raw=M.cloud(0,n).y,X=[],Y=[],sxx=0,sxe=0,ee=0;
    for(var i=0;i<n;i++){var x=-2+4*i/(n-1);X.push(x);sxx+=x*x;sxe+=x*raw[i];}
    for(i=0;i<n;i++){raw[i]-=sxe/sxx*X[i];ee+=raw[i]*raw[i];}
    for(i=0;i<n;i++)Y.push(1+.6*X[i]+raw[i]*Math.sqrt((n-2)*se*se/ee));
    return {x:X,y:Y,sxx:sxx,xbar:0,b0:1,b1:.6,se:se,n:n};
  };
  function intervals(b){
    heading(b,'Prévoir une moyenne ou une nouvelle observation ?','La bande de confiance de la moyenne est plus étroite que la bande de prévision individuelle. Déplacez x₀, augmentez n ou changez la dispersion résiduelle : les deux bandes ne répondent pas à la même question.');
    var ctl=node('div',{'class':'st-controls'},b),cn=control(ctl,'Nombre de points n','range',6,100,1,20),cs=control(ctl,'Écart-type résiduel se','range',.2,3,.1,1),cx=control(ctl,'Valeur x₀ à prévoir','range',-4,4,.1,0),met=node('div',{'class':'st-metrics','aria-live':'polite'},b),v=chart(b,'Droite ajustée, bande de confiance de la moyenne et bande de prévision individuelle',640,350),out=node('p',{'class':'st-reading'},b);
    var presets=node('div',{'class':'st-presets'},b);
    [['Au centre',0],['À la limite des x observés',2],['En extrapolation',3.5]].forEach(function(p){var bt=node('button',{type:'button'},presets,p[0]);bt.addEventListener('click',function(){cx.i.value=p[1];cx.i.dispatchEvent(new Event('input'));});});
    note(b,'IC95 de la moyenne : ŷ₀ ± t(0,975 ; n−2) se √[1/n+(x₀−x̄)²/Sxx]. IP95 individuel : ajouter 1 sous la racine. Sxx = Σ(xi−x̄)² ; se² = SSE/(n−2). Les bandes sont ponctuelles à 95 % pour un x fixé, pas des bandes simultanées à 95 % sur toute la courbe.');
    note(b,'Nuage artificiel centré sur la droite ŷ=1+0,6x, résidus construits pour obtenir se. Les bandes illustrent le modèle théorique à erreurs indépendantes normales de variance constante, conditionnel aux x observés sans erreur. Elles ne certifient pas une prévision réelle. Le modèle linéaire peut être inadapté hors du domaine observé.');
    function draw(){var n=+cn.i.value,se=+cs.i.value,x0=+cx.i.value,data=M.regressionDemo(n,se),r=M.regressionInterval(n,se,0,data.sxx,1,.6,x0,.05),grid=[],lo=Infinity,hi=-Infinity;met.replaceChildren();v.replaceChildren();
      for(var j=0;j<=100;j++){var x=-4+8*j/100,z=M.regressionInterval(n,se,0,data.sxx,1,.6,x,.05);grid.push({x:x,z:z});lo=Math.min(lo,z.loPrediction);hi=Math.max(hi,z.hiPrediction);}
      data.y.forEach(function(y){lo=Math.min(lo,y);hi=Math.max(hi,y);});var margin=(hi-lo)*.08;lo-=margin;hi+=margin;
      var X=function(x){return 55+530*(x+4)/8;},Y=function(y){return 285-250*(y-lo)/(hi-lo);};
      svg('rect',{x:X(-4),y:35,width:X(-2)-X(-4),height:250,fill:'#f1f3f5'},v);svg('rect',{x:X(2),y:35,width:X(4)-X(2),height:250,fill:'#f1f3f5'},v);
      function band(low,high,fill){var pts=grid.map(function(p){return[X(p.x),Y(p.z[low])];}).concat(grid.slice().reverse().map(function(p){return[X(p.x),Y(p.z[high])];}));svg('path',{d:path(pts)+'Z',fill:fill},v);}
      band('loPrediction','hiPrediction','#f3d2ac');band('loMean','hiMean','#a3d2d5');
      data.x.forEach(function(x,i){svg('circle',{cx:X(x),cy:Y(data.y[i]),r:3,fill:'#193d5b','fill-opacity':.65},v);});
      svg('line',{x1:X(-4),y1:Y(1-.6*4),x2:X(4),y2:Y(1+.6*4),stroke:'#193d5b','stroke-width':2},v);svg('line',{x1:X(x0),y1:35,x2:X(x0),y2:285,stroke:'#087e8b','stroke-dasharray':'5 4'},v);svg('circle',{cx:X(x0),cy:Y(r.mean),r:6,fill:'#087e8b'},v);
      [-4,-2,0,2,4].forEach(function(x){svg('text',{x:X(x),y:305,'text-anchor':'middle','class':'st-axis'},v,String(x));});
      [lo,(lo+hi)/2,hi].forEach(function(y){svg('text',{x:47,y:Y(y)+4,'text-anchor':'end','class':'st-axis'},v,num(y,1));});
      svg('text',{x:320,y:20,'text-anchor':'middle','class':'st-axis'},v,'Bleu-vert : IC moyenne · orange : IP individuel');svg('text',{x:320,y:330,'text-anchor':'middle','class':'st-axis'},v,'x observés : [−2 ; 2] · extérieurs grisés : extrapolation');
      metric(met,'Moyenne prévue ŷ₀',num(r.mean,2));metric(met,'IC95 moyenne','['+num(r.loMean,2)+' ; '+num(r.hiMean,2)+']');metric(met,'IP95 individuel','['+num(r.loPrediction,2)+' ; '+num(r.hiPrediction,2)+']');metric(met,'Degrés de liberté',r.df);
      out.textContent=(Math.abs(x0)>2?'Attention : x₀ est hors du domaine observé. Les bandes calculées supposent que le modèle linéaire reste valable ; elles ne mesurent pas le risque de changement de relation. ':'x₀ est dans le domaine observé. ')+'Demi-largeur de l’IC : '+num(r.confidence,2)+' ; de l’IP : '+num(r.prediction,2)+'. L’incertitude est minimale près de x̄=0 ; une observation future conserve sa variabilité propre, même si la moyenne est bien estimée.';
    }
    [cn.i,cs.i,cx.i].forEach(function(i){i.addEventListener('input',draw);});draw();
  }
  function reveal(){var key=window.location?window.location.hash.slice(1):'',target=key?document.getElementById(key):null;if(target&&target.matches('details.st-disclosure'))target.open=true;}
  function init(){document.querySelectorAll('[data-stat-tool]').forEach(function(b){if(b.dataset.ready)return;var fn={student:student,determination:determination,chisquare:chisquare,intervals:intervals}[b.dataset.statTool];if(fn){b.dataset.ready='1';fn(b);}});reveal();window.addEventListener('hashchange',reveal);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}());
