// Links into any card with any settings, and the connections shown on every
// card. A link looks like #curved?focus=hw-c&seg.hw-m=3&hf-n=40: open the tab,
// set each control in order (seg.<id> presses the button in group <id> whose
// data value matches), then bring the focused element into view.
(function () {
  const $ = (id) => document.getElementById(id);
  const L = window.Links;
  function parse(hash) {
    const h = hash.replace(/^#/, ''), q = h.indexOf('?');
    return { tab: q < 0 ? h : h.slice(0, q), params: q < 0 ? [] : [...new URLSearchParams(h.slice(q + 1))] };
  }
  function set(k, v) {
    if (k.startsWith('seg.')) {
      const g = $(k.slice(4)); if (!g) return false;
      const b = [...g.querySelectorAll('button')].find((b) => Object.values(b.dataset).includes(v));
      if (b) { b.click(); return true; }
      return false;
    }
    const el = $(k); if (!el) return false;
    if (el.type === 'checkbox') el.checked = v === '1' || v === 'true';
    else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  function flash(el) {
    const box = el.closest('.card, .view') || el;
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
    setTimeout(() => box.classList.remove('flash'), 1600);
  }
  function apply(hash) {
    const { params } = parse(hash);
    if (!params.length) return;
    let focus = null;
    for (const [k, v] of params) { if (k === 'focus') focus = v; else set(k, v); }
    const el = focus && $(focus);
    if (el) { el.scrollIntoView({ block: 'center' }); flash(el); }
  }
  // tabs.js shows the tab first; settings go in once the views have it laid out
  const later = (hash) => setTimeout(() => apply(hash), 30);
  window.addEventListener('hashchange', () => later(location.hash));
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === location.hash) later(location.hash); // same link again: no hashchange
  });

  // The settings of one card, as a link.
  function cardLink(card) {
    const panel = card.closest('.panel'), tab = panel.id.slice(2), p = new URLSearchParams();
    const view = card.classList.contains('tile-ctl') ? card.previousElementSibling : null;
    const focus = (card.querySelector('canvas[id]') || (view && view.querySelector('canvas[id]')) || card.querySelector('[id]'));
    if (focus) p.append('focus', focus.id);
    for (const g of card.querySelectorAll('.seg[id]')) {
      if (g.closest('[hidden]')) continue;
      const b = g.querySelector('button[aria-pressed="true"]'); if (!b) continue;
      const v = Object.values(b.dataset)[0]; if (v !== undefined) p.append('seg.' + g.id, v);
    }
    for (const el of card.querySelectorAll('input[id], select[id]')) {
      if (el.closest('[hidden]')) continue;
      if (el.type === 'number' && card.querySelector(`input[type="range"][aria-label="${el.getAttribute('aria-label')}"]`)) continue;
      p.append(el.id, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
    }
    return `${location.origin}${location.pathname}#${tab}?${p.toString()}`;
  }
  for (const card of document.querySelectorAll('.panel .card')) {
    if (card.closest('#s-links')) continue;
    const b = document.createElement('button');
    b.className = 'btn linkbtn'; b.type = 'button'; b.textContent = 'Copy a link to these settings';
    b.onclick = async () => {
      const url = cardLink(card);
      history.replaceState(null, '', url);
      try { await navigator.clipboard.writeText(url); b.textContent = 'Copied'; } catch (e) { b.textContent = 'In the address bar'; }
      setTimeout(() => { b.textContent = 'Copy a link to these settings'; }, 1500);
    };
    card.appendChild(b);
  }

  // Every card lists what it connects to, with a link that opens the other
  // end set up to show it.
  if (L) {
    const groups = new Map();
    for (const n of L.nodes) {
      const el = $(n.focus); if (!el) continue;
      let box = el.closest('.card');
      if (!box) { const grid = el.closest('.qc-grid'); box = grid && grid.querySelector('.card'); }
      if (!box) continue;
      if (!groups.has(box)) groups.set(box, []);
      groups.get(box).push(n);
    }
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    for (const [box, ns] of groups) {
      const d = document.createElement('details');
      d.className = 'links';
      const count = ns.reduce((s, n) => s + L.neighbours(n.id).length, 0);
      let html = `<summary>Connections (${count})</summary>`;
      for (const n of ns) {
        if (ns.length > 1) html += `<p class="lk-from">${esc(n.title)}</p>`;
        html += '<ul>' + L.neighbours(n.id).map(({ edge, other, theirs }) => `<li><a href="${L.href(other, theirs)}">${esc(L.byId[other].title)}</a> ${esc(edge.why)}</li>`).join('') + '</ul>';
      }
      html += `<p class="lk-from"><a href="#links?node=${ns[0].id}">See it on the map of connections</a></p>`;
      d.innerHTML = html;
      box.appendChild(d);
    }
  }
  window.State = { parse, apply, set, cardLink };
  later(location.hash);
})();
