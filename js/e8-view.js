// E8 in the "Never repeating" tab: its roots in the Coxeter plane, and the
// Elser-Sloane quasicrystal cut from it, as a shadow, a slice, or flat.
(function () {
  const E = window.E8;
  const $ = (id) => document.getElementById(id);
  const cv = $('ce8');
  if (!cv || !E) return;
  const ctx = cv.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const st = { view: 'roots', axes: [0, 1, 2], turn: 0, r2: 8, win: 1.0, bonds: true, pos: 0, spin: !reduceMotion, yaw: 0.5, pitch: 0.3, drag: null, data: null, dirty: true };

  let theme = {};
  function readTheme() {
    theme = UI.theme;
  }
  // roots, their rings in the Coxeter plane, and the edges of the famous picture
  const R = E.roots(), RP = R.map((r) => E.COXETER.map((c) => E.dot(c, r)));
  const ringOf = (() => { const rs = [...new Set(RP.map((p) => Math.hypot(...p).toFixed(4)))].sort(); return RP.map((p) => rs.indexOf(Math.hypot(...p).toFixed(4))); })();
  const REDGES = [];
  for (let i = 0; i < 240; i++) for (let j = i + 1; j < 240; j++) if (Math.abs(E.dot(R[i], R[j]) - 1) < 1e-9) REDGES.push([i, j]);

  function build() {
    const Q = E.quasicrystal(st.r2, st.win);
    // nearest distance, and the bonds of that length, found with a grid
    let dmin = Infinity;
    const cell = 0.8, grid = new Map(), key = (x) => x.map((v) => Math.floor(v / cell)).join();
    Q.forEach((q, i) => { const k = key(q.x); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    const near = (q, f) => {
      const b = q.x.map((v) => Math.floor(v / cell));
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) {
        const l = grid.get([b[0] + a, b[1] + c, b[2] + d, b[3] + e].join()); if (l) for (const j of l) f(j);
      }
    };
    Q.forEach((q, i) => near(q, (j) => { if (j > i) dmin = Math.min(dmin, Math.hypot(...q.x.map((v, k) => v - Q[j].x[k]))); }));
    const bonds = [];
    Q.forEach((q, i) => near(q, (j) => { if (j > i && Math.hypot(...q.x.map((v, k) => v - Q[j].x[k])) < dmin * 1.001) bonds.push([i, j]); }));
    st.data = { Q, dmin, bonds, ext: Math.max(...Q.map((q) => Math.hypot(...q.x))) };
    st.dirty = true;
  }

  const sizeCanvas = () => UI.fit(cv);
  // 4D physical coordinates to the three on screen, after a turn that mixes
  // the third shown axis with the hidden one
  function to3(x) {
    const [a, b, c] = st.axes, hdn = [0, 1, 2, 3].find((i) => !st.axes.includes(i)), t = st.turn;
    return [x[a], x[b], Math.cos(t) * x[c] + Math.sin(t) * x[hdn], -Math.sin(t) * x[c] + Math.cos(t) * x[hdn]];
  }
  function draw() {
    const { w, h, dpr } = sizeCanvas(), c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const ring = (k, a) => `hsla(${(k * 47 + 200) % 360}, 70%, ${clamp(theme.el, 30, 70)}%, ${a})`;
    if (st.view === 'roots') {
      const sc = (0.44 * Math.min(w, h)) / 1.14, X = (p) => w / 2 + p[0] * sc, Y = (p) => h / 2 - p[1] * sc;
      c.strokeStyle = theme.fg; c.globalAlpha = 0.06; c.lineWidth = dpr; c.beginPath();
      for (const [i, j] of REDGES) { c.moveTo(X(RP[i]), Y(RP[i])); c.lineTo(X(RP[j]), Y(RP[j])); }
      c.stroke(); c.globalAlpha = 1;
      RP.forEach((p, i) => { c.fillStyle = ring(ringOf[i], 1); c.beginPath(); c.arc(X(p), Y(p), 3.2 * dpr, 0, 7); c.fill(); });
      stats(['Points', '240 roots'], ['Edges', `${REDGES.length.toLocaleString('en-US')}, between roots at angle 60°`], ['Symmetry', '30-fold, 8 rings of 30']);
      $('e8foot').textContent = 'the roots of E8 seen in its Coxeter plane';
      return;
    }
    const D = st.data; if (!D) return;
    const pts = D.Q;
    if (st.view === 'coxeter') {
      const sc = (0.46 * Math.min(w, h)) / (D.ext * 0.8), X = (p) => w / 2 + p[0] * sc, Y = (p) => h / 2 - p[1] * sc;
      if (st.bonds) { c.strokeStyle = theme.fg; c.globalAlpha = 0.15; c.lineWidth = dpr; c.beginPath(); for (const [i, j] of D.bonds) { c.moveTo(X(pts[i].x), Y(pts[i].x)); c.lineTo(X(pts[j].x), Y(pts[j].x)); } c.stroke(); c.globalAlpha = 1; }
      c.fillStyle = theme.accent; for (const q of pts) c.fillRect(X(q.x) - 1.3 * dpr, Y(q.x) - 1.3 * dpr, 2.6 * dpr, 2.6 * dpr);
      stats(['Points', pts.length.toLocaleString('en-US')], ['Nearest neighbours', D.dmin.toFixed(4)], ['Symmetry', '30-fold in this plane']);
      $('e8foot').textContent = 'the quasicrystal flattened onto the Coxeter plane';
      return;
    }
    // 3D: a shadow of all of it, or the points near a 3D slice
    let use = pts.map((q, i) => ({ i, y: to3(q.x) }));
    if (st.view === 'slice') use = use.filter((u) => Math.abs(u.y[3] - st.pos) < 0.22);
    const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const rot = (p) => { const x1 = ca * p[0] + sa * p[2], z1 = -sa * p[0] + ca * p[2]; return [x1, cp * p[1] - sp * z1, sp * p[1] + cp * z1]; };
    const camD = D.ext * 5, sc = (0.42 * Math.min(w, h)) / D.ext;
    const proj = (q) => { const k = camD / (camD - q[2]); return [w / 2 + q[0] * sc * k, h / 2 - q[1] * sc * k, k]; };
    const P = new Map(use.map((u) => [u.i, rot(u.y)]));
    if (st.bonds) {
      c.lineWidth = dpr;
      for (const [i, j] of D.bonds) {
        const a = P.get(i), b = P.get(j); if (!a || !b) continue;
        const pa = proj(a), pb = proj(b), dep = clamp(((a[2] + b[2]) / 2 / D.ext + 1) / 2, 0, 1);
        c.strokeStyle = theme.fg; c.globalAlpha = (st.view === 'slice' ? 0.5 : 0.1) * (0.4 + 0.6 * dep);
        c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(pb[0], pb[1]); c.stroke();
      }
      c.globalAlpha = 1;
    }
    const order = [...P.entries()].sort((a, b) => a[1][2] - b[1][2]);
    for (const [i, p] of order) {
      const s = proj(p), hue = (pts[i].x[0] * 40 + 200) % 360, dep = clamp((p[2] / D.ext + 1) / 2, 0, 1);
      c.fillStyle = `hsla(${hue}, 65%, ${clamp(theme.el - 10 + 20 * dep, 20, 80)}%, ${0.5 + 0.5 * dep})`;
      c.beginPath(); c.arc(s[0], s[1], (st.view === 'slice' ? 3.4 : 2) * dpr * s[2], 0, 7); c.fill();
    }
    const AX = ['1', '2', '3', '4'];
    stats(['Points shown', `${use.length.toLocaleString('en-US')} of ${pts.length.toLocaleString('en-US')}`], ['Nearest neighbours', D.dmin.toFixed(4)], ['Symmetry', "the 600-cell's (H4), in 4D"]);
    $('e8foot').textContent = st.view === 'slice' ? `points within 0.22 of a 3D slice, at ${st.pos.toFixed(2)} along axis ${AX[[0, 1, 2, 3].find((i) => !st.axes.includes(i))]}` : 'the 4D quasicrystal cast into 3D';
  }
  function stats(...rows) { rows.forEach(([l, v], i) => { $('e8-l' + (i + 1)).textContent = l; $('e8-v' + (i + 1)).textContent = v; }); }

  // controls
  for (const b of document.querySelectorAll('#e8-view button')) b.onclick = () => {
    st.view = b.dataset.v; for (const o of document.querySelectorAll('#e8-view button')) o.setAttribute('aria-pressed', o === b);
    const three = st.view === 'shadow' || st.view === 'slice';
    $('e8-3d').hidden = !three; $('e8-posrow').hidden = st.view !== 'slice'; $('e8-qc').hidden = st.view === 'roots';
    if (st.view !== 'roots' && !st.data) build();
    st.dirty = true;
  };
  for (const b of document.querySelectorAll('#e8-axes button')) b.onclick = () => { st.axes = b.dataset.a.split('').map(Number); for (const o of document.querySelectorAll('#e8-axes button')) o.setAttribute('aria-pressed', o === b); };
  $('e8-turn').addEventListener('input', () => { st.turn = (+$('e8-turn').value * Math.PI) / 180; });
  $('e8-pos').addEventListener('input', () => { st.pos = +$('e8-pos').value; });
  $('e8-win').addEventListener('change', () => { st.win = +$('e8-win').value; build(); });
  $('e8-win').addEventListener('input', () => { $('e8-winv').textContent = (+$('e8-win').value).toFixed(2); });
  $('e8-r').addEventListener('change', () => { st.r2 = +$('e8-r').value; build(); });
  $('e8-r').addEventListener('input', () => { $('e8-rv').textContent = $('e8-r').value; });
  $('e8-bonds').onclick = () => { st.bonds = !st.bonds; $('e8-bonds').setAttribute('aria-pressed', st.bonds); };
  $('e8-spin').onclick = () => { st.spin = !st.spin; $('e8-spin').setAttribute('aria-pressed', st.spin); };
  $('e8-bonds').setAttribute('aria-pressed', st.bonds); $('e8-spin').setAttribute('aria-pressed', st.spin);
  cv.addEventListener('pointerdown', (e) => { st.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!st.drag) return; st.yaw += (e.clientX - st.drag.x) * 0.008; st.pitch = clamp(st.pitch + (e.clientY - st.drag.y) * 0.008, -1.5, 1.5); st.drag = { x: e.clientX, y: e.clientY }; });
  const end = () => { st.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  // which lattice the tab shows
  for (const b of document.querySelectorAll('#nv-lattice button')) b.onclick = () => {
    const e8 = b.dataset.l === 'e8';
    for (const o of document.querySelectorAll('#nv-lattice button')) o.setAttribute('aria-pressed', o === b);
    $('nv-cube').hidden = e8; $('nv-e8').hidden = !e8;
    window.dispatchEvent(new Event('resize'));
  };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('nv-e8').hidden && !$('s-never').hidden) {
      if (st.spin && !st.drag && (st.view === 'shadow' || st.view === 'slice')) st.yaw += dt * 0.15;
      draw();
    }
  }
  UI.onTheme(readTheme);
  UI.loop(frame);
})();
