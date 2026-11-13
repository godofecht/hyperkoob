// The "Curved space" tab: {p, q} tilings on the sphere, the plane and the
// hyperbolic plane, with a choice of view, travel by dragging, and how a
// circle grows in each geometry.
(function () {
  const C = window.Curved;
  const $ = (id) => document.getElementById(id);
  const cv = $('ccv');
  if (!cv || !C) return;
  const ctx = cv.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const st = { p: 7, q: 3, view: 'poincare', colour: 'check', drift: !reduceMotion, M: null, T: null, dirty: true, drag: null, yaw: 0.3, pitch: 0.4, r: 2, lastRoot: 0 };
  const I = [[1, 0], [0, 0], [0, 0], [1, 0]];

  let theme = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    theme = { fg: g('--fg'), muted: g('--muted'), line: g('--line'), accent: g('--accent'), panel: g('--panel'), el: parseFloat(g('--edge-l')) || 50 };
    st.dirty = true;
  }
  const views = (kind) => (kind === 'hyperbolic' ? ['poincare', 'klein', 'halfplane', 'band'] : kind === 'sphere' ? ['stereo', 'globe'] : ['flat']);
  const VIEW_NAMES = { poincare: 'Poincare disk', klein: 'Klein disk', halfplane: 'half-plane', band: 'band', stereo: 'stereographic', globe: 'globe', flat: 'flat' };

  function build(first) {
    st.T = C.tiles(st.p, st.q, { max: 2200, minEdge: 0.003, far: 7, first });
    // edge points, in model coordinates, once per tiling
    for (const t of st.T.tiles) t.e = t.v.map((a, j) => C.geodesic(a, t.v[(j + 1) % t.v.length], st.T.k, 8));
    if (!first) st.M = I;
    st.dirty = true;
    const vs = views(st.T.kind); if (!vs.includes(st.view)) st.view = vs[0];
    labels();
  }
  // After travelling, rebuild around the tile now nearest the middle, so
  // the tiling keeps going ahead of you.
  function reroot() {
    const T = st.T; if (!T || T.k === -1) return;
    let best = null, bd = Infinity;
    for (const t of T.tiles) { const c = C.mapply(st.M, t.c), d = C.abs(c); if (d < bd) { bd = d; best = t; } }
    if (!best || bd < 1e-9) return;
    build({ c: C.mapply(st.M, best.c), v: best.v.map((z) => C.mapply(st.M, z)), parity: best.parity });
    st.M = I;
  }
  function labels() {
    const T = st.T, s = 1 / st.p + 1 / st.q;
    $('cv-kind').textContent = T.kind === 'sphere' ? 'a sphere' : T.kind === 'plane' ? 'the flat plane' : 'the hyperbolic plane';
    $('cv-sum').textContent = `1/${st.p} + 1/${st.q} = ${s.toFixed(3)} ${s > 0.5 ? '>' : s < 0.5 ? '<' : '='} 1/2`;
    const flat = (st.p - 2) * 180, real = (st.p * 360) / st.q;
    $('cv-ang').textContent = `${real.toFixed(1)}° against ${flat}° when flat`;
    const A = C.tileArea(st.p, st.q);
    $('cv-area').textContent = T.kind === 'sphere' ? `${A.toFixed(4)}, so ${Math.round((4 * Math.PI) / A)} tiles cover it` : T.kind === 'plane' ? 'no curvature' : `${A.toFixed(4)} each, and the plane holds infinitely many`;
    const seg = $('cv-view'); seg.textContent = '';
    for (const v of views(T.kind)) { const b = document.createElement('button'); b.textContent = VIEW_NAMES[v]; b.setAttribute('aria-pressed', v === st.view); b.onclick = () => { st.view = v; labels(); st.dirty = true; }; seg.appendChild(b); }
    // tiles within n steps of the first: steady growth when flat, exponential when hyperbolic
    const byDepth = []; for (const t of T.tiles) byDepth[t.depth] = (byDepth[t.depth] || 0) + 1;
    $('cv-grow').textContent = byDepth.slice(1, 7).map((n) => n || 0).join(', ') + (T.kind === 'hyperbolic' ? ' ...' : '');
  }

  function sizeCanvas() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; st.dirty = true; }
    return { w, h, dpr };
  }
  function draw() {
    const { w, h, dpr } = sizeCanvas(), c = ctx, T = st.T;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const R = Math.min(w, h) * 0.46, cx = w / 2, cy = h / 2;
    let toScreen;
    if (st.view === 'globe') {
      const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      toScreen = (z) => {
        const d = 1 + z[0] * z[0] + z[1] * z[1]; let X = (2 * z[0]) / d, Y = (2 * z[1]) / d, Z = (z[0] * z[0] + z[1] * z[1] - 1) / d;
        if (!Number.isFinite(X)) { X = 0; Y = 0; Z = 1; }
        const x1 = ca * X + sa * Z, z1 = -sa * X + ca * Z, y2 = cp * Y - sp * z1, z2 = sp * Y + cp * z1;
        return [cx + x1 * R, cy - y2 * R, z2];
      };
    } else {
      const V = C.VIEWS[st.view] || ((z) => z), s = st.view === 'halfplane' ? R / 2.2 : st.view === 'stereo' ? R / 2.4 : st.view === 'flat' ? R / 3 : R;
      const oy = st.view === 'halfplane' ? cy + R * 0.9 : cy;
      toScreen = (z) => { const v = V(z); return [cx + v[0] * s, oy - v[1] * s, 1]; };
    }
    // the boundary of the model
    c.strokeStyle = theme.line; c.lineWidth = dpr;
    if (st.view === 'poincare' || st.view === 'klein' || st.view === 'globe') { c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); }
    if (st.view === 'halfplane') { c.beginPath(); c.moveTo(0, cy + R * 0.9); c.lineTo(w, cy + R * 0.9); c.stroke(); }
    if (st.view === 'band') { c.beginPath(); c.moveTo(0, cy - R); c.lineTo(w, cy - R); c.moveTo(0, cy + R); c.lineTo(w, cy + R); c.stroke(); }
    const M = st.M, maxD = Math.max(1, ...T.tiles.map((t) => t.depth));
    // two colours need an even number at each corner; with odd q one colour
    const colourOf = (t, a = st.view === 'globe' ? 1 : 0.8) => {
      if (st.colour === 'check') { const two = st.q % 2 === 0, alt = two && t.parity; return `hsla(${alt ? 220 : 30}, 45%, ${clamp(theme.el + (alt ? 0 : 12), 20, 85)}%, ${a})`; }
      return `hsla(${(200 + (t.depth * 300) / maxD) % 360}, 65%, ${clamp(theme.el, 20, 85)}%, ${a})`;
    };
    const isInf = (t) => C.abs(t.c) > 1e4;
    let drawn = 0;
    c.lineJoin = 'round';
    if (st.view === 'globe') {
      // each tile as a fan of small triangles from its centre; hide those facing away
      const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      const onSphere = (z) => { const d = 1 + z[0] * z[0] + z[1] * z[1]; if (!Number.isFinite(d) || d > 1e12) return [0, 0, 1]; return [(2 * z[0]) / d, (2 * z[1]) / d, (z[0] * z[0] + z[1] * z[1] - 1) / d]; };
      const turn = (P) => { const x1 = ca * P[0] + sa * P[2], z1 = -sa * P[0] + ca * P[2]; return [x1, cp * P[1] - sp * z1, sp * P[1] + cp * z1]; };
      const scr = (P) => [cx + P[0] * R, cy - P[1] * R];
      c.fillStyle = theme.line; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      const tris = [], edges = [];
      for (const t of T.tiles) {
        const ctr = turn(isInf(t) ? [0, 0, 1] : onSphere(C.mapply(M, t.c))), col = colourOf(t), ring = [];
        for (const e of t.e) for (let i = 0; i < e.length - 1; i++) ring.push(turn(onSphere(C.mapply(M, e[i]))));
        for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], z = (ctr[2] + a[2] + b[2]) / 3; if (z > 0) tris.push({ z, col, pts: [ctr, a, b] }); }
        edges.push(ring);
        if (ctr[2] > 0) drawn++;
      }
      tris.sort((x, y) => x.z - y.z);
      for (const tr of tris) { const P = tr.pts.map(scr); c.beginPath(); c.moveTo(P[0][0], P[0][1]); c.lineTo(P[1][0], P[1][1]); c.lineTo(P[2][0], P[2][1]); c.closePath(); c.fillStyle = tr.col; c.fill(); c.strokeStyle = tr.col; c.lineWidth = 0.6 * dpr; c.stroke(); }
      c.strokeStyle = theme.panel; c.lineWidth = 1.2 * dpr;
      for (const ring of edges) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; if (a[2] > 0 && b[2] > 0) { const A = scr(a), B = scr(b); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); } }
    } else {
      // on the stereographic sphere, the tile round infinity is everything outside the rest
      const inf = T.tiles.find(isInf);
      if (inf) { c.fillStyle = colourOf(inf); c.fillRect(0, 0, w, h); drawn++; }
      for (const t of T.tiles) {
        if (isInf(t)) continue;
        const pts = []; let bad = false;
        for (const e of t.e) for (let i = 0; i < e.length - 1; i++) {
          const sp = toScreen(C.mapply(M, e[i]));
          if (!Number.isFinite(sp[0]) || Math.abs(sp[0]) > 1e5 || Math.abs(sp[1]) > 1e5) { bad = true; break; }
          pts.push(sp);
        }
        if (bad || !pts.length) continue;
        c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath();
        c.fillStyle = colourOf(t); c.fill(); c.strokeStyle = theme.panel; c.lineWidth = 0.8 * dpr; c.stroke();
        drawn++;
      }
    }
    const polys = { length: drawn };
    $('cv-n').textContent = polys.length.toLocaleString('en-US');
  }

  // travel: drag moves the space under the pointer
  function moveBy(dx, dy) {
    const k = st.T.k, s = st.view === 'flat' ? 3 : st.view === 'stereo' ? 2.4 : 1, R = Math.min(cv.width, cv.height) * 0.46;
    const d = [(-dx * s) / R, (dy * s) / R];
    st.M = C.mmul(C.moveMatrix(d, k), st.M);
    st.dirty = true;
  }
  cv.addEventListener('pointerdown', (e) => { st.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!st.drag) return;
    const dpr = cv.width / cv.getBoundingClientRect().width, dx = (e.clientX - st.drag.x) * dpr, dy = (e.clientY - st.drag.y) * dpr;
    st.drag = { x: e.clientX, y: e.clientY };
    if (st.view === 'globe') { st.yaw += dx * 0.006; st.pitch = clamp(st.pitch + dy * 0.006, -1.5, 1.5); st.dirty = true; } else moveBy(dx, dy);
  });
  const end = () => { if (st.drag) { st.drag = null; reroot(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  // controls
  const setPQ = (p, q) => {
    st.p = clamp(Math.round(p), 3, 40); st.q = clamp(Math.round(q), 3, 40);
    $('cv-p').value = Math.min(st.p, 12); $('cv-q').value = Math.min(st.q, 12); $('cv-pn').value = st.p; $('cv-qn').value = st.q;
    build();
  };
  $('cv-p').addEventListener('input', () => setPQ(+$('cv-p').value, st.q));
  $('cv-q').addEventListener('input', () => setPQ(st.p, +$('cv-q').value));
  $('cv-pn').addEventListener('change', () => setPQ(+$('cv-pn').value, st.q));
  $('cv-qn').addEventListener('change', () => setPQ(st.p, +$('cv-qn').value));
  for (const b of document.querySelectorAll('#cv-pre button')) b.onclick = () => setPQ(+b.dataset.p, +b.dataset.q);
  for (const b of document.querySelectorAll('#cv-colour button')) b.onclick = () => { st.colour = b.dataset.c; for (const o of document.querySelectorAll('#cv-colour button')) o.setAttribute('aria-pressed', o === b); st.dirty = true; };
  $('cv-drift').onclick = () => { st.drift = !st.drift; $('cv-drift').setAttribute('aria-pressed', st.drift); };
  $('cv-drift').setAttribute('aria-pressed', st.drift);
  $('cv-home').onclick = () => { st.M = I; build(); };

  // how a circle grows with its radius, in each geometry
  function drawCircles() {
    const c2 = $('ccirc'), r = c2.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c2.width !== w || c2.height !== h) { c2.width = w; c2.height = h; }
    const c = c2.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const pad = 14 * dpr, rmax = 5, ymax = C.circumference(rmax, 1);
    const X = (x) => pad + (x / rmax) * (w - 2 * pad), Y = (y) => h - pad - (Math.log10(1 + y) / Math.log10(1 + ymax)) * (h - 2 * pad);
    const lines = [[1, 'hyperbolic', 'hsl(330, 70%, 50%)'], [0, 'flat', theme.fg], [-1, 'sphere', 'hsl(200, 70%, 45%)']];
    for (const [k, , col] of lines) {
      c.strokeStyle = col; c.lineWidth = 2 * dpr; c.beginPath();
      for (let i = 0; i <= 200; i++) { const x = (rmax * i) / 200; if (k === -1 && x > Math.PI) break; const y = C.circumference(x, k); i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); }
      c.stroke();
    }
    c.strokeStyle = theme.muted; c.setLineDash([4 * dpr, 4 * dpr]); c.beginPath(); c.moveTo(X(st.r), pad); c.lineTo(X(st.r), h - pad); c.stroke(); c.setLineDash([]);
    $('cc-h').textContent = C.circumference(st.r, 1).toFixed(2); $('cc-f').textContent = C.circumference(st.r, 0).toFixed(2);
    $('cc-s').textContent = st.r <= Math.PI ? C.circumference(st.r, -1).toFixed(2) : 'past the far pole';
  }
  $('cc-r').addEventListener('input', () => { st.r = +$('cc-r').value; $('cc-rv').textContent = st.r.toFixed(2); });

  let last = performance.now(), lastRoot = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('s-curved').hidden && st.T) {
      if (st.drift && !st.drag) {
        if (st.view === 'globe') { st.yaw += dt * 0.25; st.dirty = true; }
        else { st.M = C.mmul(C.moveMatrix([dt * 0.12, dt * 0.03], st.T.k), st.M); st.dirty = true; if (now - lastRoot > 400) { lastRoot = now; reroot(); } }
      }
      if (st.dirty) { st.dirty = false; draw(); }
      drawCircles();
    }
    requestAnimationFrame(frame);
  }
  readTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  window.addEventListener('resize', () => { st.dirty = true; });
  setPQ(7, 3);
  requestAnimationFrame(frame);
})();
