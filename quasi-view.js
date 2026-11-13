// The "Shadows that never repeat" section: a tiling of any dimension d cut
// from the cube grid Z^m, shown whole (d <= 3), as a 3D slice (d >= 4), or
// as its own shadow cast into 3D or 2D; plus where every corner lands in the
// hidden directions.
(function () {
  const Q = window.Quasi, H = window.Hyper;
  const $ = (id) => document.getElementById(id);
  if (!$('cq')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  // volume of the unit ball in k dimensions, by V_k = 2 pi / k * V_(k-2)
  const ballVol = (k) => (k === 0 ? 1 : k === 1 ? 2 : ((2 * Math.PI) / k) * ballVol(k - 2));
  const BUDGET = { 1: 400, 2: 9000, 3: 2600, slice: 600000, shadow: 1500 };
  const DEFAULT_R = { 1: 24, 2: 12, 3: 4.5 };

  const q = {
    d: 2, m: 5, step: Q.STEPS, R: 12, seed: 1, view: 'whole', grow: !reduceMotion, lines: false, spin: !reduceMotion, cut: false,
    pos: 0.15, sweep: false, rev: 0, hold: 0, yaw: 0.5, pitch: 0.35,
    P: null, tiles: [], V: [], solids: [], job: null, dirty: true, hover: null, per: null,
  };

  let theme = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    theme = { fg: g('--fg'), muted: g('--muted'), line: g('--line'), accent: g('--accent'), panel: g('--panel'), el: parseFloat(g('--edge-l')) || 50, es: g('--edge-s') || '72%' };
    q.dirty = true;
  }
  const hue = (j) => (j * 137.508 + 200) % 360;
  const shapeColor = (j, a, dl = 0) => `hsla(${hue(j)}, ${theme.es}, ${clamp(theme.el + dl, 8, 92)}%, ${a})`;

  function sizeCanvas(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; return { w, h, dpr, changed: true }; }
    return { w, h, dpr, changed: false };
  }
  function syncNum(el, v) { if (document.activeElement !== el) el.value = String(v); }
  function bindNum(el, set) {
    const commit = () => { const v = parseFloat(el.value); if (Number.isFinite(v)) set(v); };
    el.addEventListener('change', commit);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); el.blur(); } });
  }

  // The views a tiling dimension allows: whole up to 3, a slice above.
  const views = (d) => (d <= 2 ? ['whole'] : d === 3 ? ['whole', 'shadow2'] : ['slice', 'shadow3', 'shadow2']);
  const VIEW_NAMES = { whole: 'Whole', slice: '3D slice', shadow3: 'Shadow in 3D', shadow2: 'Shadow in 2D' };
  const is3D = () => (q.d === 3 && q.view === 'whole') || q.view === 'slice' || q.view === 'shadow3';

  // Slice offset in coordinates 4..d: a fixed direction, scaled by pos.
  function sliceOff(d, pos) {
    const k = d - 3, v = Array.from({ length: k }, (_, a) => 1 + 0.37 * a), l = Math.hypot(...v);
    return v.map((x) => (x / l) * pos);
  }

  // Pick a radius that keeps the build within budget.
  function radiusFor(P) {
    const d = P.d;
    if (q.view === 'slice') {
      let R = q.R;
      while (R > 0.6 && Q.slabCost(P, R) > BUDGET.slice) R *= 0.9;
      return R;
    }
    const budget = d >= 4 || q.view === 'shadow2' ? BUDGET.shadow : BUDGET[d];
    return Math.min(q.R, (budget / (P.density * ballVol(d))) ** (1 / d));
  }

  function start() {
    const P = Q.setup(q.d, q.m, q.step, q.seed);
    const Reff = radiusFor(P);
    const off = q.view === 'slice' ? sliceOff(q.d, q.pos) : null;
    q.next = { P, Reff, off, tiles: [], t0: performance.now() };
    q.job = Q.build(P, Reff, q.next.tiles, off);
    labels(P);
  }
  function finish() {
    const { P, Reff, off, tiles, t0 } = q.next;
    tiles.sort((a, b) => a.r - b.r);
    q.P = P; q.Reff = Reff; q.off = off; q.tiles = tiles; q.job = null;
    q.buildMs = performance.now() - t0;
    q.solids = [];
    if (q.view === 'slice' || (q.d === 3 && q.view === 'whole')) {
      for (const t of tiles) { const s = Q.solid(t, off); if (s) { s.r = Math.hypot(...s.center); q.solids.push(s); } }
      q.solids.sort((a, b) => a.r - b.r);
    }
    q.V = P.d <= 6 || tiles.length < 3000 ? Q.vertices(P, tiles).sort((a, b) => a.r - b.r) : [];
    q.W = Q.window2(P);
    q.per = Q.period(P);
    q.anchor = q.V.length ? q.V[0].x : [0, 0];
    q.distinct = new Set(q.V.map((v) => v.y.map((x) => Math.round(x * 1e4)).join())).size;
    if (!q.grow || q.sweep) q.rev = Infinity; else q.rev = Math.min(q.rev, Reff * 0.15);
    q.hover = null; q.dirty = true; q.fit2 = 0; q.fit3 = 0;
    stats();
  }

  // ---------- labels and stats ----------
  function labels(P) {
    const sl = P.slice, m = P.m, d = P.d;
    const tiltable = (d === 2 && m > 3) || (d === 1 && m === 2);
    $('qtrow').hidden = !tiltable;
    const golden = m === 5 || (d === 1 && m === 2);
    $('qtl').textContent = sl.ints ? (golden ? `golden ratio ≈ ${sl.label}` : sl.label) : golden ? 'golden ratio, exact' : sl.label;
    $('qposrow').hidden = q.view !== 'slice';
    $('qlines').hidden = !(d === 2);
    $('qspin').hidden = !is3D();
    $('qcut').hidden = !(q.view === 'slice' || (d === 3 && q.view === 'whole'));
    const seg = $('qview'); seg.textContent = '';
    for (const v of views(d)) {
      const b = document.createElement('button'); b.textContent = VIEW_NAMES[v]; b.setAttribute('aria-pressed', v === q.view);
      b.onclick = () => { q.view = v; q.rev = 0; start(); };
      seg.appendChild(b);
    }
    $('qviewrow').hidden = views(d).length < 2;
    $('qname').textContent = name(P);
  }
  function name(P) {
    const { d, m } = P, exact = !P.slice.ints || P.slice.fixed;
    if (d === 2 && m === 3) return 'cubes seen corner-on';
    if (m === d) return d === 1 ? 'equal segments' : d === 2 ? 'squares' : d === 3 ? 'cubes' : `${d}D cubes`;
    if (d === 1 && m === 2) return exact ? 'Fibonacci chain' : 'repeating chain';
    if (d === 2 && m === 5 && exact) return 'Penrose tiling';
    if (d === 2 && m === 4) return 'Ammann-Beenker tiling';
    if (d === 3 && m === 6) return 'Ammann rhombohedra';
    return `${d}D tiling cut from the ${m}D grid`;
  }
  function stats() {
    const P = q.P, { d, m } = P, per = q.per;
    const items = q.view === 'slice' ? q.solids : q.tiles;
    $('q-nl').textContent = q.view === 'slice' ? 'Cells in the slice' : 'Tiles drawn';
    $('q-n').textContent = fmt(items.length);
    const shapes = new Map();
    for (const t of items) shapes.set(t.shape, (shapes.get(t.shape) || 0) + 1);
    $('q-shapes').textContent = d === 2 && m > 2 ? Math.floor(m / 2) : P.shapes.size || 1;
    $('q-rep').textContent = per ? `every ${fmt(per.tiles)} tiles` : P.repeats ? 'yes' : 'never';
    const sym = d === 2 ? `${2 * m}-fold${P.slice.ints && !P.slice.fixed ? ', nearly' : ''}` : d === 3 && (m === 5 || m === 6) ? 'icosahedral' : d === 3 && m === 4 ? 'tetrahedral' : '';
    $('q-syml').hidden = $('q-sym').hidden = !sym; $('q-sym').textContent = sym;
    const counts = [...shapes.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    let mixl = 'Tiles of each shape', mix = counts.length <= 6 ? counts.map(fmt).join(' / ') : `${counts.length} shapes`;
    if (d === 1 && m === 2 && counts.length === 2) { mixl = 'Long to short'; mix = (counts[0] / counts[1]).toFixed(4); }
    if (d === 2 && m === 5 && counts.length === 2) { mixl = 'Thick to thin'; mix = (counts[0] / counts[1]).toFixed(4); }
    if (d === 3 && m === 6 && q.view === 'whole' && P.shapes.size === 2) {
      const vols = [...P.shapes.entries()].sort((a, b) => +b[0] - +a[0]).map((e) => shapes.get(e[1]) || 0);
      mixl = 'Prolate to oblate'; mix = `${fmt(vols[0])} : ${fmt(vols[1])} = ${(vols[0] / Math.max(1, vols[1])).toFixed(3)}`;
    }
    $('q-mixl').textContent = mixl; $('q-mix').textContent = mix;
    $('qcap').textContent = per || P.repeats ? 'Repeats' : 'Never repeats';
    const trimmed = q.Reff < q.R - 1e-9;
    let foot;
    if (q.view === 'slice') foot = `a 3D slice through ${d}D space${trimmed ? `, radius trimmed to ${q.Reff.toFixed(1)}` : ''}`;
    else if (q.view.startsWith('shadow')) foot = `${d}D tiles cast into ${q.view === 'shadow3' ? '3D' : '2D'}, radius ${q.Reff.toFixed(1)}`;
    else if (d === 2 && per) foot = Math.hypot(...per.vecs[0]) > q.Reff * 0.9 ? 'the repeat cell is wider than this patch' : `dashed: one repeat cell, ${fmt(per.tiles)} tiles`;
    else if (d === 2) foot = trimmed ? `patch trimmed to ${fmt(items.length)} tiles` : 'hover a tile to see where it comes from';
    else if (d === 1 && m === 2) foot = 'grid points inside the strip drop onto the line';
    else foot = trimmed ? `trimmed to ${fmt(items.length)} tiles` : `${fmt(items.length)} tiles`;
    $('qfoot').textContent = foot;
    $('wfoot').textContent = q.V.length ? `${fmt(q.V.length)} corners on ${fmt(q.distinct)} points` : 'too many corners to plot';
  }

  const cq = $('cq'), cw = $('cw'), ctx = cq.getContext('2d'), ctxW = cw.getContext('2d');

  // ---------- 1D ----------
  function draw1(c, w, h, dpr) {
    if (q.P.m === 2) return drawStrip(c, w, h, dpr);
    // a chain of m lengths, wrapped into rows
    const R = q.Reff, rows = 6, per = (2 * R) / rows, sc = (0.92 * w) / per, y0 = h * 0.2, gap = (h * 0.64) / (rows - 1), lw = Math.max(1, dpr);
    for (const t of q.tiles) {
      if (t.r > q.rev) continue;
      const a = t.base[0] + R, b = a + t.edges[0][0], lo = Math.min(a, b), row = Math.floor(lo / per);
      if (row < 0 || row >= rows) continue;
      const x0 = w * 0.04 + (lo - row * per) * sc, x1 = x0 + Math.abs(b - a) * sc, y = y0 + row * gap;
      c.save(); c.beginPath(); c.rect(w * 0.04 - 2, 0, w * 0.92 + 4, h); c.clip();
      c.fillStyle = shapeColor(t.shape, 0.75); c.fillRect(x0, y - 7 * dpr, x1 - x0, 14 * dpr);
      c.strokeStyle = theme.fg; c.lineWidth = lw; c.strokeRect(x0, y - 7 * dpr, x1 - x0, 14 * dpr);
      c.restore();
    }
  }
  // The whole cut-and-project picture for the 2D grid: lattice, strip, line.
  function drawStrip(c, w, h, dpr) {
    const P = q.P, u = [P.cols[0][0], P.cols[1][0]], l = Math.hypot(...u), e = [u[0] / l, u[1] / l], n = [-e[1], e[0]];
    const ctr = [P.gam[0] + 0.5, P.gam[1] + 0.5];
    const wn = [[0, 0], [1, 0], [0, 1], [1, 1]].map((p) => (p[0] - 0.5) * n[0] + (p[1] - 0.5) * n[1]);
    const wlo = Math.min(...wn), whi = Math.max(...wn);
    const span = 8, sc = Math.min(w, h * 1.2) / (2 * span), cx = w / 2, cy = h * 0.44;
    const X = (p) => cx + (p[0] - ctr[0]) * sc, Y = (p) => cy - (p[1] - ctr[1]) * sc;
    const pt = (s, t) => [ctr[0] + s * e[0] + t * n[0], ctr[1] + s * e[1] + t * n[1]];
    const lw = Math.max(1, dpr), far = span * 3;
    c.fillStyle = theme.accent; c.globalAlpha = 0.12; c.beginPath();
    [[-far, wlo], [far, wlo], [far, whi], [-far, whi]].forEach(([s, t], i) => { const p = pt(s, t); i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)); });
    c.closePath(); c.fill(); c.globalAlpha = 1;
    c.fillStyle = theme.muted;
    const i0 = Math.floor(ctr[0] - span * 1.5), i1 = Math.ceil(ctr[0] + span * 1.5), j0 = Math.floor(ctr[1] - span), j1 = Math.ceil(ctr[1] + span);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const x = X([i, j]), y = Y([i, j]); if (x > -5 && x < w + 5 && y > -5 && y < h * 0.8) { c.beginPath(); c.arc(x, y, 1.6 * dpr, 0, 7); c.fill(); } }
    c.strokeStyle = theme.accent; c.lineWidth = 1.5 * lw;
    const a = pt(-far, 0), b = pt(far, 0); c.beginPath(); c.moveTo(X(a), Y(a)); c.lineTo(X(b), Y(b)); c.stroke();
    const S = (K) => (K[0] - ctr[0]) * e[0] + (K[1] - ctr[1]) * e[1];
    const onScreen = (p) => X(p) > -10 && X(p) < w + 10 && Y(p) < h * 0.8 && Y(p) > -10;
    for (const v of q.V) {
      if (v.r > q.rev || !onScreen(v.K)) continue;
      const foot = pt(S(v.K), 0);
      c.strokeStyle = theme.muted; c.setLineDash([2 * dpr, 3 * dpr]); c.lineWidth = lw;
      c.beginPath(); c.moveTo(X(v.K), Y(v.K)); c.lineTo(X(foot), Y(foot)); c.stroke(); c.setLineDash([]);
      c.fillStyle = theme.fg; c.beginPath(); c.arc(X(v.K), Y(v.K), 3.2 * dpr, 0, 7); c.fill();
    }
    c.lineCap = 'butt';
    for (const t of q.tiles) {
      if (t.r > q.rev) continue;
      const K = Q.latticeOf(P, t), K2 = K.slice(); K2[t.S[0]]++;
      const p1 = pt(S(K), 0), p2 = pt(S(K2), 0);
      if (!onScreen(p1) && !onScreen(p2)) continue;
      c.strokeStyle = shapeColor(t.shape, 1); c.lineWidth = 5 * dpr;
      c.beginPath(); c.moveTo(X(p1), Y(p1)); c.lineTo(X(p2), Y(p2)); c.stroke();
    }
    // the chain laid flat along the bottom, with its letters
    const by = h * 0.9, bsc = (0.94 * w) / (2 * q.Reff);
    c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'center';
    const long = Math.max(...P.cols.map((g) => Math.abs(g[0])));
    for (const t of q.tiles) {
      if (t.r > q.rev) continue;
      const x0 = w / 2 + t.base[0] * bsc, x1 = x0 + t.edges[0][0] * bsc, lo = Math.min(x0, x1), wd = Math.abs(x1 - x0);
      c.fillStyle = shapeColor(t.shape, 0.75); c.fillRect(lo, by - 6 * dpr, wd, 12 * dpr);
      c.strokeStyle = theme.fg; c.lineWidth = lw; c.strokeRect(lo, by - 6 * dpr, wd, 12 * dpr);
      if (wd > 10 * dpr) { c.fillStyle = theme.fg; c.fillText(Math.abs(t.edges[0][0]) > long * P.s * 0.99 ? 'L' : 'S', lo + wd / 2, by - 10 * dpr); }
    }
  }

  // ---------- 2D ----------
  function view2(w, h) { const sc = (0.47 * Math.min(w, h)) / q.Reff; return { sc, cx: w / 2, cy: h / 2 }; }
  function rhomb(p, t, X, Y, sc) {
    const [a, b] = t.edges, o = t.base;
    p.moveTo(X(o), Y(o)); p.lineTo(X(o) + a[0] * sc, Y(o) - a[1] * sc); p.lineTo(X(o) + (a[0] + b[0]) * sc, Y(o) - (a[1] + b[1]) * sc); p.lineTo(X(o) + b[0] * sc, Y(o) - b[1] * sc); p.closePath();
  }
  function draw2(c, w, h, dpr) {
    const { sc, cx, cy } = view2(w, h), X = (p) => cx + p[0] * sc, Y = (p) => cy - p[1] * sc;
    const fills = new Map();
    for (const t of q.tiles) {
      if (t.r > q.rev) break;
      if (!fills.has(t.shape)) fills.set(t.shape, new Path2D());
      rhomb(fills.get(t.shape), t, X, Y, sc);
    }
    for (const [i, p] of fills) { c.fillStyle = shapeColor(i, 0.5); c.fill(p); }
    c.strokeStyle = theme.fg; c.globalAlpha = 0.35; c.lineWidth = Math.max(0.6, dpr * 0.6);
    for (const p of fills.values()) c.stroke(p);
    c.globalAlpha = 1;
    const P = q.P, nS = Math.floor(P.m / 2) + 1;
    if (q.lines) {
      const R = q.Reff;
      c.lineWidth = dpr; c.globalAlpha = 0.5;
      P.cols.forEach((gv, i) => {
        const L = Math.hypot(...gv), u = [gv[0] / L, gv[1] / L], step = P.s / L;
        c.strokeStyle = shapeColor(i + nS, 1); c.beginPath();
        for (let n = Math.ceil(-R / step + P.gam[i]) - 1; (n - P.gam[i]) * step <= R; n++) {
          const dd = (n - P.gam[i]) * step; if (Math.abs(dd) > R) continue;
          const e = Math.sqrt(R * R - dd * dd);
          const p0 = [u[0] * dd - u[1] * e, u[1] * dd + u[0] * e], p1 = [u[0] * dd + u[1] * e, u[1] * dd - u[0] * e];
          c.moveTo(X(p0), Y(p0)); c.lineTo(X(p1), Y(p1));
        }
        c.stroke();
      });
      c.globalAlpha = 1;
    }
    const per = q.per;
    if (per && q.rev >= q.Reff * 0.6 && Math.hypot(...per.vecs[0]) < q.Reff * 0.9) {
      const [p1, p2] = per.vecs, o = q.anchor;
      c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.setLineDash([6 * dpr, 4 * dpr]);
      c.beginPath();
      [o, [o[0] + p1[0], o[1] + p1[1]], [o[0] + p1[0] + p2[0], o[1] + p1[1] + p2[1]], [o[0] + p2[0], o[1] + p2[1]]].forEach((p, i) => (i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p))));
      c.closePath(); c.stroke(); c.setLineDash([]);
      c.fillStyle = theme.accent;
      const k = Math.ceil(q.Reff / Math.min(Math.hypot(...p1), Math.hypot(...p2))) + 1;
      for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {
        const p = [o[0] + i * p1[0] + j * p2[0], o[1] + i * p1[1] + j * p2[1]];
        if (Math.hypot(...p) > q.Reff) continue;
        c.beginPath(); c.arc(X(p), Y(p), 3 * dpr, 0, 7); c.fill();
      }
    }
    if (q.hover) {
      const p = new Path2D(); rhomb(p, q.hover, X, Y, sc);
      c.fillStyle = theme.accent; c.globalAlpha = 0.35; c.fill(p); c.globalAlpha = 1;
      c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.stroke(p);
    }
  }

  // ---------- 3D: whole rhombohedra or a slice ----------
  function camera(w, h, dpr, R) {
    const ca = Math.cos(q.yaw), sa = Math.sin(q.yaw), cp = Math.cos(q.pitch), sp = Math.sin(q.pitch);
    const rot = (p) => { const x1 = ca * p[0] + sa * p[2], z1 = -sa * p[0] + ca * p[2]; return [x1, cp * p[1] - sp * z1, sp * p[1] + cp * z1]; };
    const sc = (0.36 * Math.min(w, h)) / (R + 0.8), camD = 7 * R + 4, cx = w / 2, cy = h / 2 + 6 * dpr;
    const proj = (p) => { const k = camD / (camD - p[2]); return [cx + p[0] * sc * k, cy - p[1] * sc * k]; };
    return { rot, proj, eye: [0, 0, camD] };
  }
  function drawSolids(c, w, h, dpr) {
    const { rot, proj, eye } = camera(w, h, dpr, q.Reff);
    const list = [];
    for (const s of q.solids) {
      if (s.r > q.rev) break;
      if (q.cut && s.center[2] > 0) continue;
      list.push({ s, z: rot(s.center)[2] });
    }
    list.sort((a, b) => a.z - b.z);
    const light = [-0.4, 0.6, 0.7], ll = Math.hypot(...light);
    c.lineJoin = 'round'; c.lineWidth = Math.max(0.6, 0.7 * dpr); c.strokeStyle = theme.panel;
    for (const { s } of list) {
      const V = s.V.map(rot);
      for (const f of s.faces) {
        const nn = rot(f.n), p0 = V[f.idx[0]];
        if ((eye[0] - p0[0]) * nn[0] + (eye[1] - p0[1]) * nn[1] + (eye[2] - p0[2]) * nn[2] <= 0) continue;
        const lit = (nn[0] * light[0] + nn[1] * light[1] + nn[2] * light[2]) / (Math.hypot(...nn) * ll);
        c.fillStyle = shapeColor(s.shape, 1, lit * 16 - 4);
        c.beginPath(); f.idx.forEach((i, k) => { const p = proj(V[i]); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.fill(); c.stroke();
      }
    }
  }

  // ---------- shadows: cast the d-dimensional tiles into 3D or 2D ----------
  // The casts use the page's own frames, the same ones the top views use.
  function drawShadow(c, w, h, dpr) {
    const d = q.d, to3 = q.view === 'shadow3';
    const F = to3 ? H.frame3(d, 'diag') : H.frame2(d, 'diag'); // both are orthogonal projections
    const cast = (x) => { const o = [0, 0, 0]; for (let a = 0; a < d; a++) { o[0] += F[a][0] * x[a]; o[1] += F[a][1] * x[a]; if (to3) o[2] += F[a][2] * x[a]; } return o; };
    c.lineWidth = Math.max(0.6, 0.8 * dpr); c.lineJoin = 'round';
    if (!to3) {
      // each tile casts a zonogon: its exact outline, at any d
      const shapes = [];
      let ext = 1e-6;
      for (const t of q.tiles) {
        if (t.r > q.rev) break;
        const ctr = cast(t.center), E = t.edges.map(cast);
        const pts = H.outline2(E, E.map(() => 1)).map((p) => [ctr[0] + p[0], ctr[1] + p[1]]);
        for (const p of pts) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]));
        shapes.push({ pts, shape: t.shape });
      }
      // fit what is drawn, and stay put while it grows
      q.fit2 = Math.max(q.fit2 || 0, ext);
      const sc = (0.46 * Math.min(w, h)) / q.fit2, X = (p) => w / 2 + p[0] * sc, Y = (p) => h / 2 - p[1] * sc;
      const fade = Math.min(1, 6 / d);
      for (const f of shapes) {
        c.beginPath(); f.pts.forEach((p, i) => (i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)))); c.closePath();
        c.fillStyle = shapeColor(f.shape, 0.05 * fade); c.fill();
        c.strokeStyle = shapeColor(f.shape, 0.45 * fade); c.stroke();
      }
      return;
    }
    if (!q.fit3) { let ext = 0; for (const t of q.tiles) { const c0 = cast(t.center); ext = Math.max(ext, Math.hypot(...c0) + 0.5 * t.edges.reduce((a, e) => a + Math.hypot(...cast(e)), 0)); } q.fit3 = ext || q.Reff; }
    const cam = camera(w, h, dpr, q.fit3 * 0.7), proj = (p) => cam.proj(cam.rot(p));
    const full = d <= 6;
    for (const t of q.tiles) {
      if (t.r > q.rev) break;
      const b = cast(t.base), E = t.edges.map(cast), k = E.length, path = new Path2D();
      const seg = (p, a) => { const sp = proj(p), sq = proj([p[0] + E[a][0], p[1] + E[a][1], p[2] + E[a][2]]); path.moveTo(sp[0], sp[1]); path.lineTo(sq[0], sq[1]); };
      if (full) {
        for (let e = 0; e < 1 << k; e++) {
          const p = [b[0], b[1], b[2]];
          for (let a = 0; a < k; a++) if (e & (1 << a)) { p[0] += E[a][0]; p[1] += E[a][1]; p[2] += E[a][2]; }
          for (let a = 0; a < k; a++) if (!(e & (1 << a))) seg(p, a);
        }
      } else {
        // too many edges to draw: the d edges at the lowest and highest corners
        const top = [0, 1, 2].map((i) => b[i] + E.reduce((acc, e) => acc + e[i], 0));
        for (let a = 0; a < k; a++) { seg(b, a); seg(top.map((v, i) => v - E[a][i]), a); }
      }
      c.strokeStyle = shapeColor(t.shape, full ? 0.3 : 0.5); c.stroke(path);
    }
  }

  function draw() {
    const { w, h, dpr, changed } = sizeCanvas(cq);
    if (!q.P || (!q.dirty && !changed)) return;
    q.dirty = false;
    const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    if (q.view.startsWith('shadow')) drawShadow(c, w, h, dpr);
    else if (q.d === 1) draw1(c, w, h, dpr);
    else if (q.d === 2) draw2(c, w, h, dpr);
    else drawSolids(c, w, h, dpr);
    drawWindow();
  }

  // Corners seen along two hidden directions. When the slice is square to
  // the diagonal, corners sit on layers by coordinate sum, one plot each.
  function drawWindow() {
    const { w, h, dpr } = sizeCanvas(cw);
    const c = ctxW; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const W = q.W; if (!W || !q.V.length) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of W) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const span = Math.max(x1 - x0, y1 - y0, 1e-6), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const layers = [...new Set(q.V.map((v) => v.layer))].sort((a, b) => a - b);
    const split = q.P.layered && layers.length > 1 && layers.length <= 16;
    const panes = split ? layers : [null];
    const cols = Math.ceil(Math.sqrt(panes.length * (w / h))), rows = Math.ceil(panes.length / cols);
    const top = 34 * dpr, bottom = 26 * dpr, pw = w / cols, ph = (h - top - bottom) / rows;
    const sc = (0.86 * Math.min(pw, ph)) / span, r = Math.max(1, (split ? 1.5 : 1.3) * dpr);
    const where = new Map();
    panes.forEach((L, i) => {
      const ox = pw * (i % cols) + pw / 2, oy = top + ph * Math.floor(i / cols) + ph / 2;
      where.set(L, [ox, oy]);
      const X = (p) => ox + (p[0] - mx) * sc, Y = (p) => oy - (p[1] - my) * sc;
      c.strokeStyle = theme.muted; c.globalAlpha = split ? 0.5 : 1; c.lineWidth = dpr; c.setLineDash([3 * dpr, 4 * dpr]);
      c.beginPath(); W.forEach((p, k) => (k ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)))); c.closePath(); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      if (split) {
        c.fillStyle = theme.muted; c.font = `${11 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
        c.fillText(`sum ${L}`, ox - pw / 2 + 6 * dpr, oy - ph / 2 + 12 * dpr);
      }
    });
    for (const v of q.V) {
      if (v.r > q.rev + 1) break;
      const [ox, oy] = where.get(split ? v.layer : null);
      c.fillStyle = split ? shapeColor(layers.indexOf(v.layer) + 3, 0.95) : theme.accent;
      c.fillRect(ox + (v.y[0] - mx) * sc - r, oy - (v.y[1] - my) * sc - r, 2 * r, 2 * r);
    }
    if (q.hover) {
      const K = Q.latticeOf(q.P, q.hover), y = q.P.inner.map((row) => row.reduce((a, v, i) => a + v * K[i], 0));
      const L = K.reduce((a, b) => a + b, 0), pos = where.get(split ? L : null);
      if (pos) { c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(pos[0] + (y[0] - mx) * sc, pos[1] - (y[1] - my) * sc, 6 * dpr, 0, 7); c.stroke(); }
    }
  }

  // ---------- interaction ----------
  let drag = null;
  cq.addEventListener('pointerdown', (e) => { if (!is3D()) return; drag = { x: e.clientX, y: e.clientY }; cq.setPointerCapture(e.pointerId); });
  cq.addEventListener('pointermove', (e) => {
    if (drag) {
      q.yaw += (e.clientX - drag.x) * 0.008; q.pitch = clamp(q.pitch + (e.clientY - drag.y) * 0.008, -1.55, 1.55);
      drag = { x: e.clientX, y: e.clientY }; q.dirty = true; return;
    }
    if (!q.P || q.P.d !== 2 || q.view !== 'whole') return;
    const r = cq.getBoundingClientRect(), dpr = cq.width / r.width;
    const { sc, cx, cy } = view2(cq.width, cq.height);
    const p = [((e.clientX - r.left) * dpr - cx) / sc, (cy - (e.clientY - r.top) * dpr) / sc];
    let hit = null;
    for (const t of q.tiles) {
      if (t.r > q.rev) break;
      if (Math.abs(t.center[0] - p[0]) < 1.2 && Math.abs(t.center[1] - p[1]) < 1.2 && Q.contains(t, p)) { hit = t; break; }
    }
    if (hit !== q.hover) {
      q.hover = hit; q.dirty = true;
      if (hit) {
        const K = Q.latticeOf(q.P, hit), m = q.P.m;
        const ks = m <= 12 ? K.join(', ') : K.slice(0, 10).join(', ') + ', ...';
        $('qfoot').textContent = `square face at (${ks}) of the ${m}D grid, along axes ${hit.S[0] + 1} and ${hit.S[1] + 1}`;
      } else stats();
    }
  });
  const end = () => { drag = null; };
  cq.addEventListener('pointerup', end); cq.addEventListener('pointercancel', end);
  cq.addEventListener('pointerleave', () => { if (q.hover) { q.hover = null; q.dirty = true; stats(); } });

  // ---------- controls ----------
  const qd = $('qd'), qdr = $('qdr'), qm = $('qm'), qmr = $('qmr'), qt = $('qt'), qr = $('qr'), qpos = $('qpos');
  qt.max = Q.STEPS; qt.value = Q.STEPS;
  function setR(R) { q.R = R; qr.value = Math.min(R, +qr.max); $('qrv').textContent = +R.toFixed(1); }
  function setD(v) {
    const d = Math.max(1, Math.round(v));
    if (d !== q.d) {
      q.d = d;
      if (!views(d).includes(q.view)) q.view = views(d)[0];
      setR(d <= 3 ? DEFAULT_R[d] : 3);
      // keep the grid larger than the tiling
      if (q.m <= d || q.m > 2 * d + 12) q.m = d === 1 ? 2 : d === 2 ? 5 : d === 3 ? 6 : 2 * d - 1;
    }
    qdr.value = Math.min(d, +qdr.max); syncNum(qd, d);
    setM(q.m);
  }
  function setM(v) {
    q.m = Math.max(q.d, Math.round(v));
    qmr.min = q.d; qmr.max = Math.max(16, q.d + 8); qmr.value = Math.min(q.m, +qmr.max); syncNum(qm, q.m);
    q.rev = 0; start();
  }
  qdr.addEventListener('input', () => setD(+qdr.value));
  bindNum(qd, (v) => setD(v));
  qmr.addEventListener('input', () => setM(+qmr.value));
  bindNum(qm, setM);
  qt.addEventListener('input', () => { q.step = +qt.value; start(); });
  qr.addEventListener('input', () => { setR(+qr.value); start(); });
  qpos.addEventListener('input', () => { q.pos = +qpos.value; start(); });
  function toggle(id, key, after) {
    const b = $(id), show = () => b.setAttribute('aria-pressed', q[key]);
    b.onclick = () => { q[key] = !q[key]; show(); if (after) after(); q.dirty = true; };
    show();
  }
  toggle('qgrow', 'grow', () => { q.rev = q.grow ? 0 : Infinity; q.hold = 0; });
  toggle('qlines', 'lines');
  toggle('qspin', 'spin');
  toggle('qcut', 'cut');
  toggle('qsweep', 'sweep', () => { if (q.sweep) q.rev = Infinity; });
  $('qshift').onclick = () => { q.seed++; start(); };
  for (const b of document.querySelectorAll('#qpre button')) b.onclick = () => {
    q.step = b.dataset.step === 'x' ? Q.STEPS : +b.dataset.step; qt.value = q.step;
    const d = +b.dataset.d;
    q.m = +b.dataset.m; q.d = 0; q.view = b.dataset.view || views(d)[0];
    setD(d);
    if (b.dataset.r) { setR(+b.dataset.r); start(); }
  };

  // ---------- loop ----------
  // Building runs a few milliseconds per frame, so big dimensions never freeze the page.
  function work() {
    if (!q.job) return;
    const t0 = performance.now();
    let r;
    do { r = q.job.next(); } while (!r.done && performance.now() - t0 < 10);
    if (r.done) finish(); else if (!q.sweep) $('qfoot').textContent = `building, ${Math.round(100 * r.value)}%`;
  }
  const visible = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
  io.observe(cq);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    work();
    if (visible.has(cq) && q.P) {
      if (q.grow && !q.sweep && q.rev !== Infinity) {
        if (q.rev < q.Reff) { q.rev = Math.min(q.Reff, q.rev + dt * 0.17 * q.Reff); q.dirty = true; }
        else if ((q.hold += dt) > 4) { q.hold = 0; q.rev = 0; }
      }
      if (q.spin && is3D() && !drag) { q.yaw += dt * 0.2; q.dirty = true; }
      // sweep the slice through the extra dimensions, one build at a time
      if (q.sweep && q.view === 'slice' && !q.job) {
        q.pos += 0.03; if (q.pos > 1.5) q.pos = -1.5; qpos.value = q.pos; start();
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  readTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  window.addEventListener('resize', () => { q.dirty = true; });
  q.d = 0; setD(2);
  requestAnimationFrame(frame);
})();
