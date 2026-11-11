(() => {
  const tree = document.getElementById('site-tree');
  if (!tree) return;
  const isFrench = document.documentElement.lang.startsWith('fr');
  const sections = tree.querySelectorAll('details[data-tree-section]');
  sections.forEach((section, index) => {
    let loading = false;
    async function load() {
      const url = section.dataset.treeSection;
      if (!section.open || loading || !url) return;
      loading = true;
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.textContent = isFrench ? 'Chargement…' : 'Loading…';
      section.querySelector('p[role="status"]')?.remove();
      section.append(status);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Menu section unavailable');
        const template = document.createElement('template');
        template.innerHTML = await response.text();
        const list = template.content.firstElementChild;
        if (list?.tagName !== 'UL') throw new Error('Invalid menu section');
        [list, ...list.querySelectorAll('ul')].forEach((group, i) => {
          group.querySelectorAll(':scope > li > details').forEach(item => {
            item.name = 'tree-deferred-' + index + '-' + i;
          });
        });
        list.addEventListener('click', event => {
          if (event.target.closest('a[href]') && tree.classList.contains('is-open')) {
            document.querySelector('.site-tree-trigger')?.click();
          }
        });
        section.append(list);
        delete section.dataset.treeSection;
        status.remove();
      } catch {
        status.textContent = isFrench
          ? 'Liste indisponible. Le lien de rubrique reste accessible.'
          : 'List unavailable. You can still open the section page.';
      } finally {
        loading = false;
      }
    }
    section.addEventListener('toggle', load);
    load();
  });
})();
