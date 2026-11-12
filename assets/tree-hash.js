/* Home-page anchors listed in the site tree (13 Nov 2026), e.g. /fr/#proba-race: when the address carries such an anchor,
   open its branch of the tree (loading the deferred section if needed), mark the entry, and put "previous / next" steps
   under the target section, taken from the same list of the tree (internal pages only), as on every other page. */
(() => {
  const tree = document.getElementById('site-tree');
  if (!tree) return;
  const fr = document.documentElement.lang.startsWith('fr');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const find = target => [...tree.querySelectorAll('a[href]')].find(a => a.getAttribute('href') === target);
  async function sync() {
    document.querySelectorAll('nav.tree-hash-steps').forEach(n => n.remove());
    tree.querySelectorAll('a[aria-current="location"]').forEach(a => a.removeAttribute('aria-current'));
    if (!location.hash) return;
    const target = location.pathname + location.hash, section = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    let link = find(target);
    if (!link) {
      for (const d of tree.querySelectorAll('details[data-tree-section]')) {
        try {
          const text = await (await fetch(d.dataset.treeSection)).text();
          if (!text.includes('href="' + target + '"')) continue;
          d.open = true;
          for (let i = 0; i < 60 && !(link = find(target)); i++) await wait(50);
          break;
        } catch { /* the section stays closed; the page still works */ }
      }
    }
    if (!link) return;
    link.setAttribute('aria-current', 'location');
    for (let d = link.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    if (!section) return;
    const items = [...link.closest('ul').children].map(li => li.querySelector(':scope > a[href]'))
      .filter(a => a && a.getAttribute('href').startsWith('/') && !/\((anglais|French)\)$/.test(a.textContent.trim()));
    const i = items.indexOf(link), prev = items[i - 1], next = items[i + 1];
    if (!prev && !next) return;
    const nav = document.createElement('nav');
    nav.className = 'site-page-steps tree-hash-steps';
    nav.setAttribute('aria-label', fr ? 'Page précédente / Page suivante' : 'Previous page / Next page');
    const step = (a, cls, txt) => {
      if (!a) return document.createElement('span');
      const e = document.createElement('a');
      e.className = 'page-step ' + cls; e.href = a.getAttribute('href'); e.rel = cls === 'next' ? 'next' : 'prev';
      e.innerHTML = '<span></span><strong></strong>'; e.firstChild.textContent = txt; e.lastChild.textContent = a.textContent.trim();
      return e;
    };
    nav.append(step(prev, 'previous', '← ' + (fr ? 'Page précédente' : 'Previous page')), step(next, 'next', (fr ? 'Page suivante' : 'Next page') + ' →'));
    section.after(nav);
  }
  sync();
  addEventListener('hashchange', sync);
})();
