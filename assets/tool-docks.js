/* Keep existing controls and their event listeners together; mobile parameters are collapsible. */
(function(){'use strict';function init(){
 const fr=document.documentElement.lang==='fr',small=matchMedia('(max-width:640px)').matches;
 const configs=[['.ph-lab','.ph-controls,.ph-buttons'],['.ctool:not(.st-lab)','.ct-ctl'],['.st-lab','.st-controls'],['.fc','.fc-ctl'],['.cx','.ct-ctl'],['.sun','.sun-ctl'],['.bnct-lab','.bnct-ctl'],['.vm-lab','.vm-controls,.vm-presets'],['.cvt',':scope > .cvt-grid']];
 for(const [selector,groups] of configs)document.querySelectorAll(selector).forEach(root=>{
  if(root.dataset.docked||root.querySelector('.cvt-sticky,.fp-dock,.tool-dock'))return;
  const controls=Array.from(root.querySelectorAll(groups)).filter(e=>!e.closest('.tool-dock'));
  if(!controls.length)return;root.dataset.docked='true';
  const dock=document.createElement('div');dock.className='tool-dock';const details=document.createElement('details');details.open=!small;
  const summary=document.createElement('summary');summary.textContent=fr?'Paramètres de l’expérience':'Experiment parameters';details.append(summary);dock.append(details);
  let insertion=controls[0];const visual=root.querySelector('svg,canvas');
  if(visual&&(visual.compareDocumentPosition(controls[0])&Node.DOCUMENT_POSITION_FOLLOWING)){insertion=visual;while(insertion.parentElement!==root)insertion=insertion.parentElement;}
  insertion.before(dock);for(const c of controls){c.classList.add('tool-dock-inner');if(c.classList.contains('ph-buttons')||c.classList.contains('vm-playbar')||(root.classList.contains('bnct-lab')&&c.querySelector('[data-play]')))dock.append(c);else details.append(c);}
  if(root.classList.contains('bnct-lab')){const sel=root.querySelector('select');if(sel&&sel.parentElement.tagName==='LABEL')details.append(sel.parentElement);}
 });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
