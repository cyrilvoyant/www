/* Keep existing controls and their event listeners together; mobile parameters are collapsible. */
(function(){'use strict';function init(){
 const fr=document.documentElement.lang==='fr',small=matchMedia('(max-width:640px)').matches;
 const configs=[['.ph-lab','.ph-controls,.ph-buttons'],['.ctool:not(.st-lab)','.ct-ctl'],['.st-lab','.st-controls'],['.fc','.fc-ctl'],['.cx','.ct-ctl'],['.sun','.sun-ctl'],['.bnct-lab','.bnct-ctl'],['.vm-lab','.vm-controls,.vm-presets'],['.cvt',':scope > .cvt-grid']];
 for(const [selector,groups] of configs)document.querySelectorAll(selector).forEach(root=>{
  if(root.dataset.docked||root.querySelector('.cvt-sticky,.fp-dock,.tool-dock'))return;
  const controls=Array.from(root.querySelectorAll(groups)).filter(e=>!e.closest('.tool-dock'));
  if(!controls.length)return;root.dataset.docked='true';
  const dock=document.createElement('div');dock.className='tool-dock';const details=document.createElement('details');details.open=!small;
  const summary=document.createElement('summary');summary.textContent=small?(fr?'Modifier les valeurs (ouvrir)':'Change the values (open)'):(fr?'Paramètres de l’expérience':'Experiment parameters');details.append(summary);dock.append(details);
  let insertion=controls[0];const visual=root.querySelector('svg,canvas');
  if(visual&&(visual.compareDocumentPosition(controls[0])&Node.DOCUMENT_POSITION_FOLLOWING)){insertion=visual;while(insertion.parentElement!==root)insertion=insertion.parentElement;}
  insertion.before(dock);for(const c of controls){c.classList.add('tool-dock-inner');if((!small&&c.classList.contains('ph-buttons'))||c.classList.contains('vm-playbar')||(root.classList.contains('bnct-lab')&&c.querySelector('[data-play]')))dock.append(c);else details.append(c);}
  if(root.classList.contains('bnct-lab')){const sel=root.querySelector('select');if(sel&&sel.parentElement.tagName==='LABEL')details.append(sel.parentElement);}
 });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* Quick navigation on long pages (audit of 11 Nov 2026, lot 3): a collapsed contents list built from the
   section titles, and a shortcut to the interactive tool when it starts far below the first screen. */
(function () {
  var main = document.getElementById("main") || document.querySelector("main");
  if (!main || main.querySelector(".quick-nav")) return;
  var h1 = main.querySelector("h1");
  if (!h1) return;
  var fr = (document.documentElement.lang || "").slice(0, 2) === "fr";
  var vh = window.innerHeight || 800;
  function top(el) { return el.getBoundingClientRect().top + (window.pageYOffset || 0); }
  function slug(t) {
    return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "section";
  }
  var box = document.createElement("nav");
  box.className = "quick-nav";
  box.setAttribute("aria-label", fr ? "Aller plus vite dans la page" : "Move faster through the page");

  var tool = main.querySelector("#fair-tool, #pvm, #try-it, .ctool, .st-lab, .ph-lab, .bl-lab, .fc, .cx, .sun");
  if (tool && top(tool) > 1.5 * vh) {
    if (!tool.id) tool.id = fr ? "outil" : "tool";
    var a = document.createElement("a");
    a.className = "quick-tool"; a.href = "#" + tool.id;
    a.textContent = fr ? "Aller à l’outil ↓" : "Go to the tool ↓";
    box.appendChild(a);
  }

  var hasToc = main.querySelector(".toc, [class*=toc], nav[aria-label*=ommaire], nav[aria-label*=ontents]");
  var heads = Array.prototype.filter.call(main.querySelectorAll("h2"), function (h) {
    return h.textContent.trim() && h.offsetParent !== null && !h.closest("nav, aside, details, .cards, .cards3, .quick-nav");
  });
  if (!hasToc && heads.length >= 4 && document.documentElement.scrollHeight > 6 * vh) {
    var seen = {}, d = document.createElement("details"), s = document.createElement("summary"), ol = document.createElement("ol");
    Array.prototype.forEach.call(document.querySelectorAll("[id]"), function (e) { seen[e.id] = 1; });
    d.className = "auto-toc";
    s.textContent = (fr ? "Sommaire" : "Contents") + " · " + heads.length + (fr ? " sections" : " sections");
    heads.forEach(function (h) {
      if (!h.id) { var b = slug(h.textContent), id = b, n = 2; while (seen[id]) id = b + "-" + n++; h.id = id; seen[id] = 1; }
      var li = document.createElement("li"), l = document.createElement("a");
      l.href = "#" + h.id; l.textContent = h.textContent.trim().replace(/\s+/g, " ");
      l.addEventListener("click", function () { d.open = false; });
      li.appendChild(l); ol.appendChild(li);
    });
    d.appendChild(s); d.appendChild(ol); box.appendChild(d);
  }
  if (!box.firstChild) return;
  h1.parentNode.insertBefore(box, h1.nextSibling);
})();
