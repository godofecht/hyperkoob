// The "Fractal dimension" tab: a fractal, a grid of boxes over it, the box
// counts on a log-log chart, and a zoom that finds the same picture inside.
(function () {
  const F = window.Fractal;
  const $ = (id) => document.getElementById(id);
  const cv = $('cfr');
  if (!cv || !F) return;
  const ctx = cv.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const st = { name: 'sierpinski', k: 5, r: 0.38, box: 2, zoom: 0, grid: true, yaw: 0.5, pitch: 0.4, spin: !reduceMotion, drag: null, dirty: true, data: null };

  let theme = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    theme = { fg: g('--fg'), muted: g('--muted'), line: g('--line'), accent: g('--accent'), panel: g('--panel'), el: parseFloat(g('--edge-l')) || 50 };
    st.dirty = true;
  }
  const hex = (css) => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = css; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };

  function build() {
    const Fr = F.get(st.name, st.k, st.r), L = F.levelFor(Fr, Fr.dim === 3 ? 160000 : 250000), P = F.points(Fr, L);
    const sizes = F.levelSizes(Fr, L), fit = F.fitSizes(P, sizes);
    // bounds by a loop: spreading 250,000 points into Math.min overflows the stack
    const dims = P[0].length, lo = Array(dims).fill(Infinity), hi = Array(dims).fill(-Infinity);
    for (const p of P) for (let i = 0; i < dims; i++) { if (p[i] < lo[i]) lo[i] = p[i]; if (p[i] > hi[i]) hi[i] = p[i]; }
    st.data = { Fr, L, P, sizes, fit, lo, hi, dim: F.similarityDim(Fr), s: Fr.maps[0].s };
    $('fr-box').max = sizes.length - 1; st.box = clamp(st.box, 0, sizes.length - 1); $('fr-box').value = st.box;
    st.dirty = true; readouts();
  }
  function readouts() {
    const D = st.data, Fr = D.Fr, k = Fr.maps.length, s = D.s, same = Fr.maps.every((m) => Math.abs(m.s - s) < 1e-12);
    $('fr-rule').textContent = same ? `${k} copies, each 1/${+(1 / s).toFixed(3)} the size: D = log ${k} / log ${+(1 / s).toFixed(3)} = ${D.dim.toFixed(4)}` : `D = ${D.dim.toFixed(4)}`;
    $('fr-meas').textContent = D.fit.slope.toFixed(3);
    const e = D.sizes[st.box];
    $('fr-n').textContent = `${F.boxes(D.P, e).size.toLocaleString('en-US')} boxes of side ${e < 0.001 ? e.toExponential(1) : +e.toPrecision(3)}`;
    $('fr-pts').textContent = `${D.P.length.toLocaleString('en-US')} points, ${D.L} levels deep`;
    $('fr-flake').hidden = st.name !== 'flake';
  }

  function sizeCanvas(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; st.dirty = true; }
    return { w, h, dpr };
  }
  function draw() {
    const { w, h, dpr } = sizeCanvas(cv), c = ctx, D = st.data;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const col = hex(theme.accent);
    if (D.P[0].length === 3) return draw3(c, w, h, dpr, col);
    // zoom toward the fixed point of the first copy, the origin: at a zoom
    // of 1/s the picture repeats
    const z = (1 / D.s) ** st.zoom, span = Math.max(D.hi[0] - D.lo[0], D.hi[1] - D.lo[1], 1e-9);
    const cx0 = D.lo[0] + (D.hi[0] - D.lo[0]) / 2, cy0 = D.lo[1] + (D.hi[1] - D.lo[1]) / 2;
    const fx = cx0 + (0 - cx0) * (1 - 1 / z), fy = cy0 + (0 - cy0) * (1 - 1 / z);
    const sc = (0.86 * Math.min(w, h * (st.name === 'cantor' ? 4 : 1))) / span * z;
    const X = (x) => w / 2 + (x - fx) * sc, Y = (y) => h / 2 - (y - fy) * sc;
    if (st.name === 'cantor') return drawCantor(c, w, h, dpr, X, sc);
    // occupied boxes
    const e = D.sizes[st.box];
    if (st.grid) {
      const occ = F.boxes(D.P, e), bpx = e * sc;
      if (occ.size < 40000 && bpx > 1.5) {
        c.fillStyle = theme.accent; c.globalAlpha = 0.12;
        for (const key of occ) { const [i, j] = key.split(',').map(Number); c.fillRect(X(i * e), Y((j + 1) * e), bpx, bpx); }
        c.globalAlpha = 1;
        if (bpx > 5) {
          c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath();
          const i0 = Math.floor((fx - w / 2 / sc) / e), i1 = Math.ceil((fx + w / 2 / sc) / e), j0 = Math.floor((fy - h / 2 / sc) / e), j1 = Math.ceil((fy + h / 2 / sc) / e);
          if ((i1 - i0) + (j1 - j0) < 600) { for (let i = i0; i <= i1; i++) { c.moveTo(X(i * e), 0); c.lineTo(X(i * e), h); } for (let j = j0; j <= j1; j++) { c.moveTo(0, Y(j * e)); c.lineTo(w, Y(j * e)); } }
          c.stroke();
        }
      }
    }
    // the points, straight into pixels
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (const p of D.P) {
      const x = X(p[0]) | 0, y = Y(p[1]) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const o = (y * w + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }
  // the Cantor set: each row removes the middle third of every piece
  function drawCantor(c, w, h, dpr, X, sc) {
    const rows = 8, top = h * 0.12, gap = (h * 0.7) / rows;
    for (let r = 0; r < rows; r++) {
      const pieces = F.points({ ...st.data.Fr, seed: [[0, 0]] }, r), len = (1 / 3) ** r;
      c.fillStyle = theme.accent;
      for (const p of pieces) c.fillRect(X(p[0]), top + r * gap, Math.max(1, len * sc), gap * 0.5);
    }
    const e = st.data.sizes[st.box], occ = F.boxes(st.data.P, e);
    c.strokeStyle = theme.fg; c.lineWidth = dpr;
    for (const key of occ) { const i = +key.split(',')[0]; const x = X(i * e), bw = e * sc; if (bw > 1) c.strokeRect(x, top + rows * gap, bw, 10 * dpr); }
    c.fillStyle = theme.muted; c.font = `${11 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
    c.fillText('each row keeps the outer thirds of the row above', 10 * dpr, h - 10 * dpr);
  }
  // the sponge in 3D: each point is a small cube, drawn as a square of its
  // size into a depth buffer, so near cubes hide far ones and the holes show
  function draw3(c, w, h, dpr, col) {
    const D = st.data, ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch), sc = Math.min(w, h) * 0.55;
    const img = c.getImageData(0, 0, w, h), d = img.data, zb = new Float32Array(w * h).fill(-Infinity);
    const size = Math.max(1, Math.ceil(D.s ** D.L * sc * 1.15)), half = size >> 1;
    for (const p of D.P) {
      const x = p[0] - 0.5, y = p[1] - 0.5, zz = p[2] - 0.5;
      const x1 = ca * x + sa * zz, z1 = -sa * x + ca * zz, y2 = cp * y - sp * z1, z2 = sp * y + cp * z1;
      const k = 3 / (3 - z2), px = (w / 2 + x1 * sc * k) | 0, py = (h / 2 - y2 * sc * k) | 0;
      const f = 0.25 + 0.75 * (z2 + 0.87) / 1.74;
      for (let j = py - half; j < py - half + size; j++) {
        if (j < 0 || j >= h) continue;
        for (let i = px - half; i < px - half + size; i++) {
          if (i < 0 || i >= w) continue;
          const q = j * w + i;
          if (z2 <= zb[q]) continue;
          zb[q] = z2; const o = q * 4; d[o] = col[0] * f; d[o + 1] = col[1] * f; d[o + 2] = col[2] * f; d[o + 3] = 255;
        }
      }
    }
    // outline every jump in depth, so the holes and steps read clearly
    const t = 0.6 * D.s ** D.L;
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      const q = j * w + i, z = zb[q]; if (z === -Infinity) continue;
      const zr = zb[q + 1], zd = zb[q + w];
      if ((zr !== -Infinity && Math.abs(z - zr) > t) || (zd !== -Infinity && Math.abs(z - zd) > t) || zr === -Infinity || zd === -Infinity) { const o = q * 4; d[o] *= 0.45; d[o + 1] *= 0.45; d[o + 2] *= 0.45; }
    }
    c.putImageData(img, 0, 0);
  }
  // log N against log 1/e, with the fit and the rule's slope
  function drawChart() {
    const c2 = $('cfrc'), { w, h, dpr } = sizeCanvas(c2), c = c2.getContext('2d'), D = st.data;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const rows = D.fit.rows, xs = rows.map((r) => Math.log(1 / r.e)), ys = rows.map((r) => Math.log(r.n)), pad = 14 * dpr;
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = (x) => pad + ((x - x0) / Math.max(1e-9, x1 - x0)) * (w - 2 * pad), Y = (y) => h - pad - ((y - y0) / Math.max(1e-9, y1 - y0)) * (h - 2 * pad);
    c.strokeStyle = theme.muted; c.setLineDash([4 * dpr, 4 * dpr]); c.lineWidth = dpr; c.beginPath();
    const mx = (x0 + x1) / 2, my = D.fit.icept + D.fit.slope * mx;
    c.moveTo(X(x0), Y(my + D.dim * (x0 - mx))); c.lineTo(X(x1), Y(my + D.dim * (x1 - mx))); c.stroke(); c.setLineDash([]);
    c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(X(x0), Y(D.fit.icept + D.fit.slope * x0)); c.lineTo(X(x1), Y(D.fit.icept + D.fit.slope * x1)); c.stroke();
    rows.forEach((r, i) => { c.fillStyle = i === st.box ? theme.fg : theme.accent; c.beginPath(); c.arc(X(xs[i]), Y(ys[i]), (i === st.box ? 5 : 3.5) * dpr, 0, 7); c.fill(); });
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left'; c.fillText('log(boxes) against log(1 / box side); dashed: the rule\'s slope', pad, pad);
  }

  // controls
  $('fr-kind').addEventListener('change', (e) => { st.name = e.target.value; st.zoom = 0; $('fr-zoom').value = 0; build(); });
  $('fr-k').addEventListener('input', () => { st.k = +$('fr-k').value; $('fr-kv').textContent = st.k; build(); });
  $('fr-r').addEventListener('input', () => { st.r = +$('fr-r').value; $('fr-rv').textContent = st.r.toFixed(2); build(); });
  $('fr-box').addEventListener('input', () => { st.box = +$('fr-box').value; st.dirty = true; readouts(); });
  $('fr-zoom').addEventListener('input', () => { st.zoom = +$('fr-zoom').value; $('fr-zoomv').textContent = `x${(1 / st.data.s) ** st.zoom < 100 ? ((1 / st.data.s) ** st.zoom).toFixed(1) : Math.round((1 / st.data.s) ** st.zoom)}`; st.dirty = true; });
  $('fr-grid').onclick = () => { st.grid = !st.grid; $('fr-grid').setAttribute('aria-pressed', st.grid); st.dirty = true; };
  $('fr-grid').setAttribute('aria-pressed', st.grid);
  cv.addEventListener('pointerdown', (e) => { st.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!st.drag) return; st.yaw += (e.clientX - st.drag.x) * 0.008; st.pitch = clamp(st.pitch + (e.clientY - st.drag.y) * 0.008, -1.5, 1.5); st.drag = { x: e.clientX, y: e.clientY }; st.dirty = true; });
  const end = () => { st.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('s-fractal').hidden) {
      if (!st.data) build();
      if (st.data.P[0].length === 3 && st.spin && !st.drag) { st.yaw += dt * 0.3; st.dirty = true; }
      if (st.dirty) { st.dirty = false; draw(); drawChart(); }
    }
    requestAnimationFrame(frame);
  }
  readTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  window.addEventListener('resize', () => { st.dirty = true; });
  requestAnimationFrame(frame);
})();
