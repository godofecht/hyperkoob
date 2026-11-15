// The Connections tab: every idea on the page as a node, every shared idea as
// a line. Pick a node to read what it connects to and open either end; pick
// a route to walk through the ideas in order.
(function () {
  const L = window.Links;
  const $ = (id) => document.getElementById(id);
  if (!$('lk-c') || !L) return;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let theme = UI.theme;
  UI.onTheme((t) => { theme = t; });
  const TAB_HUE = { shadows: 210, tiling: 180, never: 150, '4d': 265, high: 235, fractal: 95, curved: 330, strings: 45, infinity: 20 };
  const TAB_NAME = { shadows: 'Shadows', tiling: 'Tiling', never: 'Never repeating', '4d': 'The fourth dimension', high: 'High dimensions', fractal: 'Fractal dimension', curved: 'Curved space', strings: 'String theory', infinity: 'Infinity' };
  const col = (h, a = 1, dl = 0) => `hsla(${h}, ${theme.es}, ${clamp(theme.el + dl, 8, 92)}%, ${a})`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // A fixed layout: start each tab's ideas together round a circle, then let
  // springs along the links and a push between all nodes settle it.
  const tabs = Object.keys(TAB_HUE), P = {};
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  for (const n of L.nodes) { const a = (tabs.indexOf(n.tab) / tabs.length) * 2 * Math.PI; P[n.id] = [Math.cos(a) * 0.35 + rnd() * 0.08, Math.sin(a) * 0.35 + rnd() * 0.08]; }
  // constants chosen by measuring how much the labels overlap (tests/links.test.js)
  const IT = 700;
  for (let it = 0; it < IT; it++) {
    const F = Object.fromEntries(L.nodes.map((n) => [n.id, [0, 0]])), cool = 1 - it / IT;
    for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) {
      const a = L.nodes[i], b = L.nodes[j], dx = P[a.id][0] - P[b.id][0], dy = (P[a.id][1] - P[b.id][1]) * 1.6, d2 = dx * dx + dy * dy + 1e-4, f = 0.008 / d2;
      F[a.id][0] += dx * f; F[a.id][1] += dy * f; F[b.id][0] -= dx * f; F[b.id][1] -= dy * f;
    }
    for (const e of L.edges) {
      const dx = P[e.b][0] - P[e.a][0], dy = P[e.b][1] - P[e.a][1], d = Math.hypot(dx, dy) + 1e-9, f = (d - 0.25) * 0.05;
      F[e.a][0] += (dx / d) * f; F[e.a][1] += (dy / d) * f; F[e.b][0] -= (dx / d) * f; F[e.b][1] -= (dy / d) * f;
    }
    for (const n of L.nodes) {
      const a = (tabs.indexOf(n.tab) / tabs.length) * 2 * Math.PI, f = F[n.id];
      f[0] += (Math.cos(a) * 0.4 - P[n.id][0]) * 0.01; f[1] += (Math.sin(a) * 0.4 - P[n.id][1]) * 0.01;
      P[n.id][0] += clamp(f[0], -0.03, 0.03) * cool; P[n.id][1] += clamp(f[1], -0.03, 0.03) * cool;
    }
  }
  const xs = L.nodes.map((n) => P[n.id][0]), ys = L.nodes.map((n) => P[n.id][1]);
  const bx = [Math.min(...xs), Math.max(...xs)], by = [Math.min(...ys), Math.max(...ys)];
  for (const n of L.nodes) P[n.id] = [(P[n.id][0] - bx[0]) / (bx[1] - bx[0]), (P[n.id][1] - by[0]) / (by[1] - by[0])];

  const st = { sel: 'hopf', theme: 'all', thread: '', step: 0, hover: null, screen: {} };
  function draw() {
    const { c, w, h, dpr } = UI.canvas('lk-c'), pad = 16 * dpr, narrow = w < 640 * dpr;
    // on a tall screen the map is turned a quarter, so it uses the height
    const tall = h > w * 1.1, Q = (id) => (tall ? [P[id][1], P[id][0]] : P[id]);
    const X = (id) => [pad + Q(id)[0] * (w - 2 * pad), 40 * dpr + Q(id)[1] * (h - 56 * dpr)];
    const path = st.thread ? L.THREADS[st.thread].path : null;
    const onPath = (a, b) => path && path.some((x, i) => i < path.length - 1 && ((x === a && path[i + 1] === b) || (x === b && path[i + 1] === a)));
    const near = new Set(st.sel ? [st.sel, ...L.neighbours(st.sel).map((x) => x.other)] : []);
    const inTheme = (n) => st.theme === 'all' || n.themes.includes(st.theme);
    // lines
    for (const e of L.edges) {
      const [x0, y0] = X(e.a), [x1, y1] = X(e.b), A = L.byId[e.a], B = L.byId[e.b];
      const hot = st.sel && (e.a === st.sel || e.b === st.sel), route = onPath(e.a, e.b), lit = inTheme(A) && inTheme(B);
      c.strokeStyle = route ? col(30, 0.95, -5) : hot ? col(TAB_HUE[L.byId[st.sel].tab], 0.9, -8) : theme.line;
      c.globalAlpha = route || hot ? 1 : lit ? (st.sel || path ? 0.35 : 0.8) : 0.15;
      c.lineWidth = (route ? 3.2 : hot ? 2.2 : 1) * dpr;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    c.globalAlpha = 1;
    // nodes
    st.screen = {};
    const placed = [];
    c.textBaseline = 'middle';
    for (const n of L.nodes) {
      const [x, y] = X(n.id), isSel = n.id === st.sel, isNear = near.has(n.id), stepI = path ? path.indexOf(n.id) : -1;
      const dim = !inTheme(n) || (path && stepI < 0) || (st.sel && !path && !isNear);
      const r = (isSel ? 9 : stepI >= 0 ? 8 : 6) * dpr;
      st.screen[n.id] = [x, y, Math.max(r, 12 * dpr)];
      c.globalAlpha = dim ? 0.25 : 1;
      c.fillStyle = col(TAB_HUE[n.tab], 1, isSel ? -12 : 0);
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      if (isSel || (path && stepI === st.step)) { c.strokeStyle = theme.fg; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(x, y, r + 3 * dpr, 0, 7); c.stroke(); }
      if (stepI >= 0) { c.fillStyle = '#fff'; c.font = `600 ${9 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.fillText(String(stepI + 1), x, y + 0.5 * dpr); }
      const label = !narrow || isSel || isNear || stepI >= 0 || st.hover === n.id;
      if (label) {
        c.font = `${(isSel ? 12.5 : 11) * dpr}px "IBM Plex Sans", sans-serif`;
        // put the label on whichever side overlaps the labels already placed less
        const tw0 = c.measureText(n.title).width + 6 * dpr, sides = [true, false].map((rt) => [rt, rt ? x + r : x - r - tw0, y - 8 * dpr, tw0, 16 * dpr]);
        const cost = ([rt, bx, by2, bw, bh]) => (bx < 0 || bx + bw > w ? 1e9 : 0) + placed.reduce((s, q) => s + Math.max(0, Math.min(bx + bw, q[0] + q[2]) - Math.max(bx, q[0])) * Math.max(0, Math.min(by2 + bh, q[1] + q[3]) - Math.max(by2, q[1])), 0);
        const pickSide = cost(sides[0]) <= cost(sides[1]) ? sides[0] : sides[1];
        placed.push(pickSide.slice(1));
        const right = pickSide[0];
        c.textAlign = right ? 'left' : 'right';
        c.fillStyle = theme.bg; c.globalAlpha = dim ? 0.2 : 0.75;
        const tw = c.measureText(n.title).width;
        c.fillRect(right ? x + r + 3 * dpr : x - r - 5 * dpr - tw, y - 8 * dpr, tw + 4 * dpr, 16 * dpr);
        c.globalAlpha = dim ? 0.3 : 1; c.fillStyle = isSel || st.hover === n.id ? theme.fg : theme.muted;
        c.fillText(n.title, right ? x + r + 5 * dpr : x - r - 3 * dpr, y);
      }
    }
    c.globalAlpha = 1;
  }
  // the panel: the chosen idea and everything it connects to
  function panel() {
    const n = L.byId[st.sel], box = $('lk-info');
    if (!n) { box.innerHTML = '<p class="sub">Pick an idea on the map.</p>'; return; }
    const ns = L.neighbours(n.id);
    box.innerHTML = `<h3 style="margin:0 0 4px">${esc(n.title)}</h3>
      <p class="sub" style="margin:0 0 8px">${TAB_NAME[n.tab]} tab. ${n.themes.map((t) => L.THEMES[t].name).join(', ')}. ${ns.length} connections.</p>
      <p style="margin:0 0 10px"><a class="btn" href="${L.href(n.id)}">Open it</a></p>
      <ul class="lk-list">${ns.map(({ edge, other, theirs, mine }) => `<li><button class="lk-pick" data-id="${other}">${esc(L.byId[other].title)}</button> ${esc(edge.why)}
        <span class="lk-go"><a href="${L.href(n.id, mine)}">open ${esc(n.title)}</a> · <a href="${L.href(other, theirs)}">open ${esc(L.byId[other].title)}</a></span></li>`).join('')}</ul>`;
    for (const b of box.querySelectorAll('.lk-pick')) b.onclick = () => pick(b.dataset.id);
  }
  function route() {
    const box = $('lk-route');
    if (!st.thread) { box.hidden = true; return; }
    const T = L.THREADS[st.thread], path = T.path;
    box.hidden = false;
    const step = clamp(st.step, 0, path.length - 1), a = path[step], b = path[step + 1];
    const e = b && L.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    $('lk-step').textContent = `Step ${step + 1} of ${path.length}: ${L.byId[a].title}`;
    $('lk-why').textContent = e ? `Next, ${L.byId[b].title}: ${e.why}` : 'The end of this route. Every idea on it links to others; pick any node to branch off.';
    $('lk-open').setAttribute('href', L.href(a));
  }
  function pick(id) { st.sel = id; if (st.thread) { const i = L.THREADS[st.thread].path.indexOf(id); if (i >= 0) st.step = i; else st.thread = ''; $('lk-thread').value = st.thread; } panel(); route(); }
  const cv = $('lk-c');
  const at = (e) => {
    const r = cv.getBoundingClientRect(), dpr = cv.width / r.width, x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
    let best = null, bd = Infinity;
    for (const [id, [nx, ny, rr]] of Object.entries(st.screen)) { const d = Math.hypot(nx - x, ny - y); if (d < rr && d < bd) { bd = d; best = id; } }
    return best;
  };
  cv.addEventListener('click', (e) => { const id = at(e); if (id) pick(id); });
  cv.addEventListener('pointermove', (e) => { st.hover = at(e); cv.style.cursor = st.hover ? 'pointer' : 'default'; });
  $('lk-theme').innerHTML = '<option value="all">every theme</option>' + Object.entries(L.THEMES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');
  $('lk-theme').onchange = () => { st.theme = $('lk-theme').value; };
  $('lk-thread').innerHTML = '<option value="">none</option>' + Object.entries(L.THREADS).map(([k, t]) => `<option value="${k}">${t.name} (${t.path.length} steps)</option>`).join('');
  $('lk-thread').onchange = () => { st.thread = $('lk-thread').value; st.step = 0; if (st.thread) st.sel = L.THREADS[st.thread].path[0]; panel(); route(); };
  $('lk-prev').onclick = () => { if (!st.thread) return; st.step = Math.max(0, st.step - 1); st.sel = L.THREADS[st.thread].path[st.step]; panel(); route(); };
  $('lk-next').onclick = () => { if (!st.thread) return; st.step = Math.min(L.THREADS[st.thread].path.length - 1, st.step + 1); st.sel = L.THREADS[st.thread].path[st.step]; panel(); route(); };
  $('lk-legend').innerHTML = tabs.map((t) => `<span><i style="background:hsl(${TAB_HUE[t]}, 65%, 50%)"></i>${TAB_NAME[t]}</span>`).join('');
  $('lk-count').textContent = `${L.nodes.length} ideas, ${L.edges.length} connections`;
  // #links?node=hopf or #links?thread=curvature
  function fromHash() {
    const h = location.hash, q = h.indexOf('?');
    if (!h.startsWith('#links') || q < 0) return;
    const p = new URLSearchParams(h.slice(q + 1));
    if (p.get('thread') && L.THREADS[p.get('thread')]) { st.thread = p.get('thread'); $('lk-thread').value = st.thread; st.step = 0; st.sel = L.THREADS[st.thread].path[0]; }
    if (p.get('node') && L.byId[p.get('node')]) pick(p.get('node'));
    panel(); route();
  }
  window.addEventListener('hashchange', fromHash);
  fromHash(); panel(); route();
  UI.loop(() => { if (UI.shown('s-links') && UI.visible('lk-c')) draw(); });
})();
