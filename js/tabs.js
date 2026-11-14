// One section at a time. The hash names the section (#shadows, #tiling,
// #never, #4d, ... #infinity), so a link can open any of them.
(function () {
  const tabs = [...document.querySelectorAll('.tabs [data-tab]')];
  function show(id, write) {
    if (!document.getElementById(id)) id = 's-shadows';
    for (const b of tabs) {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.dataset.tab).hidden = !on;
    }
    if (write) history.replaceState(null, '', '#' + id.slice(2));
    window.dispatchEvent(new Event('resize'));
  }
  tabs.forEach((b, i) => {
    b.onclick = () => show(b.dataset.tab, true);
    b.onkeydown = (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return;
      const n = tabs[(i + k + tabs.length) % tabs.length];
      n.focus(); show(n.dataset.tab, true); e.preventDefault();
    };
  });
  const fromHash = () => 's-' + (location.hash.slice(1) || 'shadows');
  window.addEventListener('hashchange', () => show(fromHash()));
  show(fromHash());
})();
