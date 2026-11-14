// The "Infinity" tab: a line that fills a square, counting fractions, the
// diagonal that escapes every list, one piece of the free group becoming
// three, and Gabriel's horn.
(function () {
  const I = window.Infinite;
  const $ = (id) => document.getElementById(id);
  if (!$('s-infinity')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const canvas = UI.canvas;
  let theme = UI.theme;
  UI.onTheme((t) => { theme = t; });
  const hsl = (h, a, dl = 0) => `hsla(${h}, ${theme.es}, ${clamp(theme.el + dl, 8, 92)}%, ${a})`;
  const mono = (dpr, px = 11) => `${px * dpr}px "IBM Plex Mono", monospace`;
  function playButton(id, on, set) {
    const b = $(id), show = () => { b.textContent = on() ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', on()); };
    b.onclick = () => { set(!on()); show(); }; show();
  }

  // ---------- 1. a line that fills a square ----------
  const fl = { kind: 'hilbert', n: 4, t: 0.3, w: 1 / 16, play: !reduceMotion, path: null, key: '' };
  function flPath() { const k = fl.kind + fl.n; if (fl.key !== k) { fl.path = I.curvePath(fl.kind, fl.n); fl.key = k; } return fl.path; }
  function drawFill() {
    const { c, w, h, dpr } = canvas('inf-c1'), P = flPath(), N = P.length;
    const bar = 30 * dpr, side = Math.min(h - bar - 12 * dpr, w - 16 * dpr), ox = (w - side) / 2, oy = bar + 6 * dpr;
    const X = (p) => ox + p[0] * side, Y = (p) => oy + (1 - p[1]) * side;
    // the interval [0, 1] and the window on it
    const bx0 = 12 * dpr, bx1 = w - 12 * dpr, by = 12 * dpr, t0 = fl.t, t1 = Math.min(1, fl.t + fl.w);
    c.strokeStyle = theme.line; c.lineWidth = 4 * dpr; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx0, by); c.lineTo(bx1, by); c.stroke();
    c.strokeStyle = hsl(25, 0.95); c.beginPath(); c.moveTo(bx0 + t0 * (bx1 - bx0), by); c.lineTo(bx0 + t1 * (bx1 - bx0), by); c.stroke();
    c.fillStyle = theme.muted; c.font = mono(dpr, 10); c.textAlign = 'left'; c.fillText('0', bx0, by + 14 * dpr); c.textAlign = 'right'; c.fillText('1', bx1, by + 14 * dpr);
    // the square and the whole curve, coloured by time
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.strokeRect(ox, oy, side, side);
    const segs = Math.min(N - 1, 256), lw = Math.max(0.6, Math.min(2, side / Math.sqrt(N) / 5)) * dpr;
    c.lineWidth = lw; c.lineJoin = 'round';
    for (let s = 0; s < segs; s++) {
      const a = Math.floor((s * (N - 1)) / segs), b = Math.floor(((s + 1) * (N - 1)) / segs);
      c.strokeStyle = hsl(200 + (140 * s) / segs, 0.45);
      c.beginPath(); c.moveTo(X(P[a]), Y(P[a])); for (let i = a + 1; i <= b; i++) c.lineTo(X(P[i]), Y(P[i])); c.stroke();
    }
    // the window's image: whole cells, so its area equals its length
    const i0 = Math.floor(t0 * N), i1 = Math.max(i0 + 1, Math.floor(t1 * N)), cell = side / Math.sqrt(N);
    let xmin = 1, xmax = 0, ymin = 1, ymax = 0;
    c.fillStyle = hsl(25, 0.55);
    for (let i = i0; i < i1 && i < N; i++) {
      const p = P[i]; c.fillRect(X(p) - cell / 2, Y(p) - cell / 2, cell, cell);
      xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]);
    }
    c.strokeStyle = hsl(25, 1, -10); c.lineWidth = 1.6 * dpr; c.beginPath(); c.moveTo(X(P[i0]), Y(P[i0]));
    for (let i = i0 + 1; i < i1 && i < N; i++) c.lineTo(X(P[i]), Y(P[i])); c.stroke();
    const spread = Math.hypot(xmax - xmin, ymax - ymin) + Math.SQRT2 / Math.sqrt(N);
    const pc = (x) => (100 * x).toFixed(x < 0.01 ? 2 : 1) + '%';
    $('inf-v1a').textContent = `${pc((i1 - i0) / N)} of the area`;
    $('inf-v1b').textContent = `${spread.toFixed(3)} (√w = ${Math.sqrt(fl.w).toFixed(3)})`;
    const C = I.CURVES[fl.kind], sideN = C.base ** fl.n;
    $('inf-v1c').textContent = `${((N - 1) / sideN).toFixed(1)} sides`;
    $('inf-v1d').textContent = fl.kind === 'zorder' ? `${I.longestStep('zorder', fl.n).toFixed(1)} cells` : '1 cell';
  }
  function setOrderRange() { const m = I.CURVES[fl.kind].maxOrder; $('inf-n').max = m; fl.n = Math.min(fl.n, m); $('inf-n').value = fl.n; $('inf-nv').textContent = fl.n; }
  $('inf-kind').onchange = () => { fl.kind = $('inf-kind').value; setOrderRange(); };
  $('inf-n').oninput = () => { fl.n = +$('inf-n').value; $('inf-nv').textContent = fl.n; };
  $('inf-t').oninput = () => { fl.t = +$('inf-t').value; };
  $('inf-w').oninput = () => { fl.w = 10 ** +$('inf-w').value; $('inf-wv').textContent = fl.w.toFixed(4); };
  playButton('inf-play1', () => fl.play, (v) => { fl.play = v; });

  // ---------- 2. counting the fractions ----------
  const ct = { N: 8, k: 0, play: !reduceMotion, acc: 0 };
  function drawCount() {
    const { c, w, h, dpr } = canvas('inf-c2'), N = ct.N, Z = I.zigzag(N * N * 4).filter((z) => z.p <= N && z.q <= N);
    const total = Z.length, k = Math.min(Math.floor(ct.k), total), pad = 26 * dpr, cs = Math.min((w - pad - 8 * dpr) / N, (h - pad - 8 * dpr) / N);
    const ox = pad + (w - pad - 8 * dpr - cs * N) / 2, oy = pad;
    const cx = (q) => ox + (q - 0.5) * cs, cy = (p) => oy + (p - 0.5) * cs;
    c.font = mono(dpr, Math.max(8, Math.min(12, cs / dpr / 3.2))); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = theme.muted;
    for (let i = 1; i <= N; i++) { c.fillText(String(i), cx(i), oy - 12 * dpr); c.fillText(String(i), ox - 12 * dpr, cy(i)); }
    // path so far
    c.strokeStyle = hsl(215, 0.5); c.lineWidth = 1.5 * dpr; c.beginPath();
    for (let i = 0; i < k; i++) { const z = Z[i]; i ? c.lineTo(cx(z.q), cy(z.p)) : c.moveTo(cx(z.q), cy(z.p)); }
    c.stroke();
    for (let p = 1; p <= N; p++) for (let q = 1; q <= N; q++) {
      const i = Z.findIndex((z) => z.p === p && z.q === q), done = i >= 0 && i < k, z = Z[i];
      c.fillStyle = done ? (z.fresh ? hsl(25, 0.9) : theme.line) : theme.fg;
      c.globalAlpha = done ? 1 : 0.35;
      c.fillText(`${p}/${q}`, cx(q), cy(p) - (done && z.fresh ? 5 * dpr : 0));
      if (done && z.fresh) { c.fillStyle = hsl(215, 1); c.font = mono(dpr, 9); c.fillText('#' + z.n, cx(q), cy(p) + 7 * dpr); c.font = mono(dpr, Math.max(8, Math.min(12, cs / dpr / 3.2))); }
    }
    c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    const cur = Z[Math.max(0, k - 1)];
    $('inf-v2').textContent = k ? (cur.fresh ? `#${cur.n} is ${cur.p}/${cur.q}` : `${cur.p}/${cur.q} skipped`) : 'press play';
  }
  $('inf-N').oninput = () => { ct.N = +$('inf-N').value; $('inf-Nv').textContent = ct.N; ct.k = 0; };
  playButton('inf-play2', () => ct.play, (v) => { ct.play = v; });

  // ---------- 3. Cantor's diagonal ----------
  const dg = { rows: 10, list: [], k: 0, play: !reduceMotion, seed: 1 };
  function newList() {
    let x = dg.seed++ * 2654435761 >>> 0;
    const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) & 1; };
    dg.list = Array.from({ length: dg.rows }, () => Array.from({ length: dg.rows + 6 }, r)); dg.k = 0;
  }
  function drawDiag() {
    const { c, w, h, dpr } = canvas('inf-c3'), R = dg.rows, L = dg.list, k = Math.min(R, Math.floor(dg.k));
    const cols = R + 6, cw = Math.min((w - 70 * dpr) / (cols + 2), (h - 16 * dpr) / (R + 2.4)), ox = 62 * dpr, oy = 8 * dpr + cw * 0.5;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = mono(dpr, Math.max(9, Math.min(14, cw / dpr * 0.6)));
    for (let i = 0; i < R; i++) {
      c.fillStyle = theme.muted; c.textAlign = 'right'; c.fillText(`row ${i + 1}  0.`, ox - 2 * dpr, oy + i * cw); c.textAlign = 'center';
      for (let j = 0; j < cols; j++) {
        const on = i === j;
        if (on) { c.fillStyle = hsl(25, i < k ? 0.35 : 0.15); c.fillRect(ox + j * cw + 1, oy + i * cw - cw / 2 + 1, cw - 2, cw - 2); }
        c.fillStyle = on ? theme.fg : theme.muted; c.fillText(String(L[i][j]), ox + (j + 0.5) * cw, oy + i * cw);
      }
      c.fillStyle = theme.muted; c.fillText('...', ox + (cols + 0.6) * cw, oy + i * cw);
    }
    c.fillStyle = theme.muted; c.fillText('...', ox + 2 * cw, oy + R * cw - cw * 0.15);
    const ny = oy + (R + 1) * cw;
    c.textAlign = 'right'; c.fillStyle = hsl(215, 1); c.fillText('new  0.', ox - 2 * dpr, ny); c.textAlign = 'center';
    for (let j = 0; j < k; j++) { c.fillStyle = hsl(215, 0.18); c.fillRect(ox + j * cw + 1, ny - cw / 2 + 1, cw - 2, cw - 2); c.fillStyle = hsl(215, 1); c.fillText(String(1 - L[j][j]), ox + (j + 0.5) * cw, ny); }
    c.textBaseline = 'alphabetic';
    $('inf-v3').textContent = k === 0 ? 'press play' : k < R ? `differs from row ${k} at digit ${k}` : `differs from all ${R} rows`;
  }
  $('inf-rows').oninput = () => { dg.rows = +$('inf-rows').value; $('inf-rowsv').textContent = dg.rows; newList(); };
  $('inf-new').onclick = newList;
  playButton('inf-play3', () => dg.play, (v) => { dg.play = v; });
  newList();

  // ---------- 4. the free group: one piece, moved, becomes three ----------
  const PIECE_HUE = { a: 25, A: 215, b: 145, B: 300 };
  const fg = { depth: 6, L: 1.9, x: 'a', t: 0, dir: 1, hold: 0, play: !reduceMotion, W: null, key: '' };
  function fgData() {
    const k = fg.depth + ',' + fg.L;
    if (fg.key !== k) {
      const W = I.words(fg.depth), idx = new Map(W.map((w, i) => [w, i]));
      const pts = W.map((w) => I.place(w, fg.L)), edges = [];
      W.forEach((w, i) => { if (w) edges.push([idx.get(w.slice(0, -1)), i]); });
      fg.W = { W, pts, edges }; fg.key = k;
    }
    return fg.W;
  }
  // the geodesic between two points of the disk, as an arc
  function geo(c, p, q, X) {
    const cr = p[0] * q[1] - p[1] * q[0];
    if (Math.abs(cr) < 1e-6) { c.moveTo(X(p)[0], X(p)[1]); c.lineTo(X(q)[0], X(q)[1]); return; }
    const pp = (1 + p[0] * p[0] + p[1] * p[1]) / 2, qq = (1 + q[0] * q[0] + q[1] * q[1]) / 2;
    const cx = (pp * q[1] - qq * p[1]) / cr, cy = (p[0] * qq - q[0] * pp) / cr, r = Math.hypot(p[0] - cx, p[1] - cy);
    const a0 = Math.atan2(p[1] - cy, p[0] - cx), a1 = Math.atan2(q[1] - cy, q[0] - cx);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const P0 = X(p), C0 = X([cx, cy]), s = (X([1, 0])[0] - X([0, 0])[0]);
    c.moveTo(P0[0], P0[1]); c.arc(C0[0], C0[1], r * s, -a0, -(a0 + d), d > 0);
  }
  function drawGroup() {
    const { c, w, h, dpr } = canvas('inf-c4'), D = fgData(), R = Math.min(w, h) / 2 - 8 * dpr, cx0 = w / 2, cy0 = h / 2;
    const X = (z) => [cx0 + z[0] * R, cy0 - z[1] * R];
    const ease = (u) => u * u * (3 - 2 * u), M = I.step(I.DIR[fg.x], ease(fg.t) * fg.L);
    const moving = I.INV[fg.x], img = (z) => I.apply(M, z);
    c.fillStyle = theme.panel; c.beginPath(); c.arc(cx0, cy0, R, 0, 7); c.fill();
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.stroke();
    // caps: the half-planes the four pieces live in; only the moving piece moves
    for (const x of I.LETTERS) {
      const cap = I.cap(x, fg.L).map((z) => (x === moving ? img(z) : z));
      c.fillStyle = hsl(PIECE_HUE[x], x === moving ? 0.22 : fg.t > 0.05 ? 0.06 : 0.12);
      c.beginPath(); cap.forEach((z, i) => { const s = X(z); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.closePath(); c.fill();
    }
    // the tree: the moving piece carried by the move, the rest left where it is, faded
    const pos = D.W.map((wd, i) => (wd[0] === moving ? img(D.pts[i]) : D.pts[i]));
    for (const [i, j] of D.edges) {
      const wd = D.W[j], mv = wd[0] === moving;
      c.strokeStyle = hsl(PIECE_HUE[wd[0]], !mv && fg.t > 0.05 ? 0.22 : 0.95, -6);
      const p = i === 0 && mv ? img(D.pts[0]) : pos[i], q = pos[j];
      const sz = Math.hypot(p[0] - q[0], p[1] - q[1]) * R;
      if (sz < 0.8 * dpr) continue;
      c.lineWidth = Math.max(0.9, Math.min(2.6, (1 - Math.hypot(...q) ** 2) * 9)) * dpr;
      c.beginPath(); geo(c, p, q, X); c.stroke();
    }
    for (let j = 1; j < pos.length; j++) {
      const z = pos[j], k = 1 - (z[0] * z[0] + z[1] * z[1]), wd = D.W[j], mv = wd[0] === moving;
      if (k * R < 1.2 * dpr) continue;
      const s = X(z); c.fillStyle = hsl(PIECE_HUE[wd[0]], !mv && fg.t > 0.05 ? 0.25 : 1, -10);
      c.beginPath(); c.arc(s[0], s[1], Math.min(3.2 * dpr, k * R * 0.05 + 0.8 * dpr), 0, 7); c.fill();
    }
    // the identity, where the move puts it
    const e = X([0, 0]); c.fillStyle = theme.fg; c.beginPath(); c.arc(e[0], e[1], 3.5 * dpr, 0, 7); c.fill();
    const em = X(img([0, 0])); c.strokeStyle = hsl(PIECE_HUE[moving], 1); c.lineWidth = 1.5 * dpr; c.beginPath(); c.arc(em[0], em[1], 5 * dpr, 0, 7); c.stroke();
    c.font = mono(dpr, 11); c.fillStyle = theme.fg; c.textAlign = 'left';
    const name = { a: 'a', A: 'a⁻¹', b: 'b', B: 'b⁻¹' };
    c.fillText(`W(${name[moving]}) moved by ${name[fg.x]}`, 10 * dpr, 18 * dpr);
    const per = (3 ** fg.depth - 1) / 2;
    $('inf-v4').textContent = fg.L < I.MIN_STEP ? `caps overlap below ${I.MIN_STEP.toFixed(3)}` : `${per} words become ${per}: all not starting with ${name[fg.x]}`;
  }
  $('inf-piece').onchange = () => { fg.x = $('inf-piece').value; fg.t = 0; fg.dir = 1; };
  $('inf-depth').oninput = () => { fg.depth = +$('inf-depth').value; $('inf-depthv').textContent = fg.depth; };
  $('inf-L').oninput = () => { fg.L = +$('inf-L').value; $('inf-Lv').textContent = fg.L.toFixed(2); };
  $('inf-mt').oninput = () => { fg.t = +$('inf-mt').value; fg.play = false; $('inf-play4').textContent = 'Play'; };
  playButton('inf-play4', () => fg.play, (v) => { fg.play = v; });

  // ---------- 5. Gabriel's horn ----------
  const hn = { lg: 3 };
  function drawHorn() {
    const { c, w, h, dpr } = canvas('inf-c5'), L = 10 ** hn.lg, top = h * 0.5;
    // the horn, out to x = 10, drawn in perspective
    const x0 = 22 * dpr, sx = (w - 40 * dpr) / 9, ry = top * 0.42, cy = top * 0.52;
    const xe = Math.min(10, L), X = (x) => x0 + (x - 1) * sx;
    c.strokeStyle = hsl(215, 0.9); c.lineWidth = 1.4 * dpr; c.beginPath();
    for (let i = 0; i <= 200; i++) { const x = 1 + (i / 200) * (xe - 1); i ? c.lineTo(X(x), cy - ry / x) : c.moveTo(X(x), cy - ry / x); }
    for (let i = 200; i >= 0; i--) { const x = 1 + (i / 200) * (xe - 1); c.lineTo(X(x), cy + ry / x); }
    c.closePath(); c.fillStyle = hsl(215, 0.12); c.fill(); c.stroke();
    c.lineWidth = dpr;
    for (let x = 1; x <= xe + 1e-9; x += x < 3 ? 0.5 : 1) { c.strokeStyle = hsl(215, x === 1 ? 0.9 : 0.35); c.beginPath(); c.ellipse(X(x), cy, ry / x / 4, ry / x, 0, 0, 7); c.stroke(); }
    c.fillStyle = theme.muted; c.font = mono(dpr, 10); c.textAlign = 'right';
    c.fillText(L > 10 ? `... and on to x = ${L >= 1e4 ? '10^' + hn.lg.toFixed(hn.lg % 1 ? 1 : 0) : Math.round(L)}` : `x = ${L.toFixed(1)}`, w - 8 * dpr, 14 * dpr);
    // volume and surface as the horn grows, on a log scale of length
    const gx0 = 40 * dpr, gx1 = w - 10 * dpr, gy0 = h - 18 * dpr, gy1 = top + 10 * dpr, smax = I.hornSurface(1e12), GX = (lg) => gx0 + (lg / 12) * (gx1 - gx0), GY = (v) => gy0 - (v / smax) * (gy0 - gy1);
    c.strokeStyle = theme.line; c.beginPath(); c.moveTo(gx0, gy1); c.lineTo(gx0, gy0); c.lineTo(gx1, gy0); c.stroke();
    const curve = (f, col) => { c.strokeStyle = col; c.lineWidth = 2 * dpr; c.beginPath(); for (let i = 0; i <= 120; i++) { const lg = (12 * i) / 120, v = f(10 ** lg); i ? c.lineTo(GX(lg), GY(v)) : c.moveTo(GX(lg), GY(v)); } c.stroke(); };
    curve(I.hornSurface, hsl(25, 1)); curve(I.hornVolume, hsl(215, 1));
    c.setLineDash([3 * dpr, 3 * dpr]); c.strokeStyle = hsl(215, 0.5); c.lineWidth = dpr; c.beginPath(); c.moveTo(gx0, GY(Math.PI)); c.lineTo(gx1, GY(Math.PI)); c.stroke(); c.setLineDash([]);
    c.strokeStyle = theme.fg; c.beginPath(); c.moveTo(GX(hn.lg), gy0); c.lineTo(GX(hn.lg), gy1); c.stroke();
    c.textAlign = 'left'; c.fillStyle = hsl(25, 1); c.fillText('surface', gx0 + 6 * dpr, gy1 + 8 * dpr); c.fillStyle = hsl(215, 1); c.fillText('volume, never past π', gx0 + 6 * dpr, GY(Math.PI) - 6 * dpr);
    c.fillStyle = theme.muted; c.textAlign = 'center'; c.fillText('length 1 to 10^12, log scale', (gx0 + gx1) / 2, h - 4 * dpr);
    $('inf-v5a').textContent = I.hornVolume(L).toFixed(6);
    $('inf-v5b').textContent = I.hornSurface(L).toFixed(3);
  }
  $('inf-L5').oninput = () => { hn.lg = +$('inf-L5').value; $('inf-L5v').textContent = hn.lg < 4 ? (10 ** hn.lg).toFixed(1) : '10^' + hn.lg.toFixed(1); };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!UI.shown('s-infinity')) return;
    if (fl.play) { fl.t = (fl.t + dt * 0.03) % (1 - fl.w); $('inf-t').value = fl.t; }
    if (ct.play) { ct.k += dt * 3; if (ct.k > ct.N * ct.N * 1.3 + 8) ct.k = 0; }
    if (dg.play) { dg.k += dt * 1.6; if (dg.k > dg.rows + 4) newList(); }
    if (fg.play) {
      if (fg.hold > 0) fg.hold -= dt;
      else { fg.t += fg.dir * dt * 0.35; if (fg.t >= 1 || fg.t <= 0) { fg.t = clamp(fg.t, 0, 1); fg.dir = -fg.dir; fg.hold = 1.6; } }
      $('inf-mt').value = fg.t;
    }
    if (UI.visible('inf-c1')) drawFill();
    if (UI.visible('inf-c2')) drawCount();
    if (UI.visible('inf-c3')) drawDiag();
    if (UI.visible('inf-c4')) drawGroup();
    if (UI.visible('inf-c5')) drawHorn();
  }
  setOrderRange();
  UI.loop(frame);
})();
