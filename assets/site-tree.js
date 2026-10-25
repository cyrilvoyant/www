(()=>{
const tree=document.getElementById('site-tree'),trigger=document.querySelector('.site-tree-trigger'),backdrop=document.querySelector('.site-tree-backdrop'),close=tree?.querySelector('.tree-close');
if(!tree||!trigger)return;
function setOpen(open){tree.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',String(open));document.body.classList.toggle('site-tree-open',open);if(backdrop)backdrop.hidden=!open;if(open)close?.focus();else trigger.focus()}
trigger.addEventListener('click',()=>setOpen(!tree.classList.contains('is-open')));close?.addEventListener('click',()=>setOpen(false));backdrop?.addEventListener('click',()=>setOpen(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tree.classList.contains('is-open'))setOpen(false)});
tree.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(matchMedia('(max-width:1549px)').matches)setOpen(false)}));
})();