(()=>{
const tree=document.getElementById('site-tree'),trigger=document.querySelector('.site-tree-trigger'),backdrop=document.querySelector('.site-tree-backdrop'),close=tree?.querySelector('.tree-close');
if(!tree||!trigger)return;
function setOpen(open){tree.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',String(open));document.body.classList.toggle('site-tree-open',open);if(backdrop)backdrop.hidden=!open;if(open)setTimeout(()=>close?.focus(),60);else trigger.focus()}
trigger.addEventListener('click',()=>setOpen(!tree.classList.contains('is-open')));close?.addEventListener('click',()=>setOpen(false));backdrop?.addEventListener('click',()=>setOpen(false));
document.addEventListener('keydown',e=>{if(!tree.classList.contains('is-open'))return;if(e.key==='Escape'){setOpen(false);return}
if(e.key!=='Tab')return;const items=[...tree.querySelectorAll('a[href],button,summary')].filter(x=>x.checkVisibility?x.checkVisibility():x.offsetParent!==null);if(!items.length)return;const first=items[0],last=items[items.length-1],cur=document.activeElement;
if(!tree.contains(cur)){e.preventDefault();first.focus()}else if(e.shiftKey&&cur===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&cur===last){e.preventDefault();first.focus()}});
tree.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(matchMedia('(max-width:1549px)').matches)setOpen(false)}));
trigger.addEventListener('click',()=>{const cur=tree.querySelector('[aria-current=page]');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center'}),80)});
const maincol=tree.parentElement.querySelector('.site-maincol');if(!maincol)return;
const fr=(document.documentElement.lang||'').startsWith('fr');
const T=fr?{menu:'Menu',up:'Niveau supérieur',prev:'Page précédente',next:'Page suivante',nextw:'Suivant',start:'Commencer'}:{menu:'Menu',up:'Up one level',prev:'Previous page',next:'Next page',nextw:'Next',start:'Start'};
const same=a=>{const u=new URL(a.href,location.href);return u.origin===location.origin&&!u.hash&&(/\.html$/i.test(u.pathname)||!/\.[a-z0-9]+$/i.test(u.pathname))&&!/\/(search|recherche)\/?$/.test(u.pathname)};
const mirror=a=>{const d=a.closest('details');return d&&/\((anglais|French)\)\s*$/.test(d.querySelector(':scope>summary')?.textContent||'')};
const label=a=>{if(a.classList.contains('tree-hub')){const s=a.closest('details')?.querySelector(':scope>summary');if(s)return s.textContent.trim()}return a.textContent.replace(/^[^\p{L}\p{N}]+/u,'').trim()};
const cur=tree.querySelector('.site-tree-list a[aria-current=page]');
const tops=[...tree.querySelectorAll('.site-tree-list>li')];
const topLi=cur&&cur.closest('.site-tree-list>li');
let prev=null,next=null,up=null,pos='';
const isHome=cur&&cur.closest('.tree-home');
if(isHome){next=tops.map(li=>li.querySelector('a.tree-hub')||li.querySelector('details a')).find(a=>a&&a!==cur)||null}
else if(cur){const seen=new Set();const seq=[...topLi.querySelectorAll('a')].filter(a=>same(a)&&!mirror(a)).filter(a=>{const k=new URL(a.href).pathname;if(seen.has(k))return false;seen.add(k);return true});
 const i=seq.indexOf(cur);if(i>0)prev=seq[i-1];if(i>=0&&i+1<seq.length)next=seq[i+1];
 if(i>=0&&i+1===seq.length){const t=tops.indexOf(topLi);for(let k=t+1;k<tops.length&&!next;k++)next=[...tops[k].querySelectorAll('a')].find(same)||null}
 if(!next){const h=tree.querySelector('.tree-home a');if(h&&h!==cur&&same(h))next=h}
 let d=cur.closest('details');if(cur.classList.contains('tree-hub'))d=d&&d.parentElement.closest('details');
 while(d&&!up){const h=d.querySelector(':scope>a.tree-hub');if(h&&h!==cur&&same(h))up=h;d=d.parentElement.closest('details')}
 if(!up){const h=tree.querySelector('.tree-home a');if(h&&h!==cur)up=h}
 if(!cur.classList.contains('tree-hub')){const items=[...cur.closest('ul').children].filter(li=>li.querySelector(':scope>a'));const n=items.indexOf(cur.closest('li'));if(items.length>1&&n>=0)pos=(n+1)+' / '+items.length}}
const bar=document.createElement('nav');bar.className='reading-bar';bar.setAttribute('aria-label',fr?'Parcours de lecture':'Reading path');
const link=(a,cls,before,word,after,aria,rel)=>{const e=document.createElement('a');e.href=a.href;e.className=cls;const t=label(a);e.title=aria+' : '+t;e.setAttribute('aria-label',aria+' : '+t);if(rel)e.rel=rel;e.innerHTML=(before?'<span aria-hidden="true">'+before+'</span>':'')+'<span class="rb-title"></span>'+(word?'<span class="rb-word">'+word+'</span>':'')+(after?'<span aria-hidden="true">'+after+'</span>':'');e.querySelector('.rb-title').textContent=t;return e};
trigger.lastElementChild&&(trigger.lastElementChild.textContent=T.menu);bar.appendChild(trigger);
if(up)bar.appendChild(link(up,'rb-up','↑','','',T.up));
const gap=document.createElement('span');gap.className='rb-gap';bar.appendChild(gap);
if(prev)bar.appendChild(link(prev,'rb-prev','←','','',T.prev,'prev'));
if(pos){const s=document.createElement('span');s.className='rb-pos';s.textContent=pos;bar.appendChild(s)}
if(next)bar.appendChild(link(next,'rb-next','',isHome?T.start:T.nextw,'→',T.next,'next'));
const prog=document.createElement('span');prog.className='reading-progress';prog.setAttribute('aria-hidden','true');prog.innerHTML='<i></i>';bar.appendChild(prog);
maincol.insertBefore(bar,maincol.firstChild);
const main=maincol.querySelector('main');
if(main&&!document.querySelector('.site-page-steps')&&(prev||next)&&!isHome){const nav=document.createElement('nav');nav.className='site-page-steps';nav.setAttribute('aria-label',T.prev+' / '+T.next);
 const step=(a,cls,txt)=>{if(!a)return document.createElement('span');const e=document.createElement('a');e.className='page-step '+cls;e.href=a.href;e.innerHTML='<span></span><strong></strong>';e.firstChild.textContent=txt;e.lastChild.textContent=label(a);return e};
 nav.append(step(prev,'previous','← '+T.prev),step(next,'next',T.next+' →'));main.after(nav)}
const fill=prog.firstChild;let tick=false;const paint=()=>{tick=false;const h=document.documentElement.scrollHeight-innerHeight;fill.style.transform='scaleX('+(h>40?Math.min(1,scrollY/h):0)+')'};
addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(paint)}},{passive:true});paint();
})();