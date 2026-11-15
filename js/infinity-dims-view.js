// Three Infinity cards that tie infinity to dimension: where a patch of the
// square came from on the line, a Hilbert curve through a cube of any
// dimension, and a box with infinitely many sides and a finite diagonal.
(function () {
  const I = window.Infinite, D = window.InfDims;
  const $ = (id) => document.getElementById(id);
  if (!$('inf-c7')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let theme = UI.theme;
  UI.onTheme((t) => { theme = t; });
  const hsl = (h, a, dl = 0) => `hsla(${h}, ${theme.es}, ${clamp(theme.el + dl, 8, 92)}%, ${a})`;
  const mono = (dpr, px = 11) => `${px * dpr}px "IBM Plex Mono", monospace`;
  function playButton(id, on, set) {
    const b = $(id), show = () => { b.textContent = on() ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', on()); };
    b.onclick = () => { set(!on()); show(); }; show();
  }
  const slider = (id, out, fmt, set) => { const el = $(id), f = () => { const v = +el.value; set(v); if (out) $(out).textContent = fmt(v); }; el.oninput = f; f(); };

  // ---------- 7. where a patch of the square came from ----------
  const pa = { kind: 'hilbert', n: 6, r: 0.14, x: 0.42, y: 0.58, drag: false, t: 0, wander: !reduceMotion, cache: {} };
  const pathOf = (k, n) => pa.cache[k + n] || (pa.cache[k + n] = I.curvePath(k, Math.min(n, I.CURVES[k].maxOrder)));
  function drawPatch() {
    const { c, w, h, dpr } = UI.canvas('inf-c7'), P = pathOf(pa.kind, pa.n), N = P.length;
    const bar = 46 * dpr, side = Math.min(h - bar - 14 * dpr, w - 16 * dpr), ox = (w - side) / 2, oy = 8 * dpr;
    const X = (x) => ox + x * side, Y = (y) => oy + (1 - y) * side;
    pa.box = { ox, oy, side, dpr };
    const res = D.preimage(P, pa.x, pa.y, pa.r), cell = side / Math.sqrt(N);
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.strokeRect(ox, oy, side, side);
    // the curve, faint, coloured by time
    const segs = Math.min(N - 1, 512);
    c.lineWidth = Math.max(0.5, Math.min(1.4, cell / 4)) * dpr;
    for (let s = 0; s < segs; s++) {
      const a = Math.floor((s * (N - 1)) / segs), b = Math.floor(((s + 1) * (N - 1)) / segs);
      c.strokeStyle = hsl((300 * s) / segs, 0.22);
      c.beginPath(); c.moveTo(X(P[a][0]), Y(P[a][1])); for (let i = a + 1; i <= b; i++) c.lineTo(X(P[i][0]), Y(P[i][1])); c.stroke();
    }
    // cells inside the disk, coloured by when the line reaches them
    for (let i = 0; i < N; i++) {
      const p = P[i]; if (Math.hypot(p[0] - pa.x, p[1] - pa.y) > pa.r) continue;
      c.fillStyle = hsl((300 * i) / N, 0.75); c.fillRect(X(p[0]) - cell / 2, Y(p[1]) - cell / 2, cell + 0.5, cell + 0.5);
    }
    c.strokeStyle = theme.fg; c.lineWidth = 1.6 * dpr; c.beginPath(); c.arc(X(pa.x), Y(pa.y), pa.r * side, 0, 7); c.stroke();
    // the line [0, 1] with the pieces that land in the disk
    const bx0 = 12 * dpr, bx1 = w - 12 * dpr, by = h - bar + 18 * dpr, L = bx1 - bx0;
    for (let s = 0; s < 120; s++) { c.fillStyle = hsl((300 * s) / 120, 0.18); c.fillRect(bx0 + (L * s) / 120, by - 6 * dpr, L / 120 + 0.5, 12 * dpr); }
    for (const [a, b] of res.pieces) { c.fillStyle = hsl((300 * (a + b)) / 2, 0.95); c.fillRect(bx0 + a * L, by - 9 * dpr, Math.max(1.2 * dpr, (b - a) * L), 18 * dpr); }
    c.fillStyle = theme.muted; c.font = mono(dpr, 10); c.textAlign = 'left'; c.fillText('0', bx0, by + 22 * dpr); c.textAlign = 'right'; c.fillText('1', bx1, by + 22 * dpr);
    c.textAlign = 'center'; c.fillText('the line', (bx0 + bx1) / 2, by + 22 * dpr);
    const other = pa.kind === 'zorder' ? 'hilbert' : 'zorder', ro = D.preimage(pathOf(other, pa.n), pa.x, pa.y, pa.r);
    $('inf-v7a').textContent = `${(100 * res.fraction).toFixed(1)}% (disk area ${(100 * Math.PI * pa.r * pa.r).toFixed(1)}%)`;
    $('inf-v7b').textContent = `${res.pieces.length}`;
    $('inf-v7c').textContent = `${ro.pieces.length} for the ${I.CURVES[other].name}`;
  }
  const c7 = $('inf-c7');
  const at7 = (e) => { const r = c7.getBoundingClientRect(), b = pa.box, d = b.dpr; return [((e.clientX - r.left) * d - b.ox) / b.side, 1 - ((e.clientY - r.top) * d - b.oy) / b.side]; };
  c7.addEventListener('pointerdown', (e) => { if (!pa.box) return; pa.drag = true; pa.wander = false; showWander(); const [x, y] = at7(e); pa.x = clamp(x, 0, 1); pa.y = clamp(y, 0, 1); c7.setPointerCapture(e.pointerId); });
  c7.addEventListener('pointermove', (e) => { if (!pa.drag) return; const [x, y] = at7(e); pa.x = clamp(x, 0, 1); pa.y = clamp(y, 0, 1); });
  for (const ev of ['pointerup', 'pointercancel']) c7.addEventListener(ev, () => { pa.drag = false; });
  $('inf-pk').onchange = () => { pa.kind = $('inf-pk').value; const m = I.CURVES[pa.kind].maxOrder; $('inf-pn').max = Math.min(7, m); pa.n = Math.min(pa.n, +$('inf-pn').max); $('inf-pn').value = pa.n; $('inf-pnv').textContent = pa.n; };
  slider('inf-pn', 'inf-pnv', (v) => String(v), (v) => { pa.n = v; });
  slider('inf-pr', 'inf-prv', (v) => v.toFixed(2), (v) => { pa.r = v; });
  const showWander = () => { const b = $('inf-play7'); b.textContent = pa.wander ? 'Pause' : 'Wander'; b.setAttribute('aria-pressed', pa.wander); };
  $('inf-play7').onclick = () => { pa.wander = !pa.wander; showWander(); }; showWander();

  // ---------- 8. a line through every dimension ----------
  const MAXB = { 2: 6, 3: 4, 4: 3, 5: 2, 6: 2 };
  const hd = { wk: 4, d: 3, b: 3, t: 0, play: !reduceMotion, yaw: 0.6, pitch: 0.35, spin: 0, cache: {}, drag: null };
  const hpath = () => hd.cache[hd.d + '.' + hd.b] || (hd.cache[hd.d + '.' + hd.b] = D.hilbertPath(hd.d, hd.b));
  // a view of d-space: the first three axes as usual, the rest turned in slowly
  function project(p, rot) {
    // turn axis 3 into axis 0, axis 4 into axis 1, ...
    const q = p.slice(0, Math.max(3, p.length)); while (q.length < 3) q.push(0);
    for (let k = 3; k < p.length; k++) { const a = rot * (k - 2) * 0.9 + k, i = (k - 3) % 3, c = Math.cos(a), s = Math.sin(a); const x = q[i], y = q[k]; q[i] = c * x + s * y * 0.9; q[k] = -s * x + c * y; }
    const cy = Math.cos(hd.yaw), sy = Math.sin(hd.yaw), cp = Math.cos(hd.pitch), sp = Math.sin(hd.pitch);
    const x1 = cy * q[0] + sy * q[2], z1 = -sy * q[0] + cy * q[2], y2 = cp * q[1] - sp * z1, z2 = sp * q[1] + cp * z1;
    return [x1, y2, z2];
  }
  function drawHD() {
    const { c, w, h, dpr } = UI.canvas('inf-c8'), P = hpath(), N = P.length, d = hd.d;
    const S = Math.min(w, h) * (d === 2 ? 0.8 : 0.52), cx = w / 2, cy = h / 2 + 6 * dpr, cam = 3.2;
    const pts = P.map((p) => { const [x, y, z] = project(d === 2 ? [p[0], p[1], 0] : p, hd.spin), k = cam / (cam - z); return [cx + x * S * k, cy - y * S * k, z]; });
    // the window: a sixteenth of the line
    const wl = 2 ** -hd.wk, i0 = Math.floor(hd.t * N) % N, i1 = i0 + Math.max(1, Math.floor(N * wl));
    c.lineJoin = 'round';
    const segs = [];
    for (let i = 0; i < N - 1; i++) segs.push(i);
    segs.sort((a, b) => pts[a][2] + pts[a + 1][2] - pts[b][2] - pts[b + 1][2]);
    const lw = Math.max(0.6, Math.min(2.4, 14 / Math.cbrt(N))) * dpr;
    for (const i of segs) {
      const inW = (i >= i0 && i < i1) || (i1 > N && i < i1 - N), z = (pts[i][2] + pts[i + 1][2]) / 2, fog = clamp(0.55 + z * 0.6, 0.15, 1);
      c.strokeStyle = inW ? hsl(25, 0.95 * fog + 0.05, -6) : hsl(190 + (130 * i) / N, 0.6 * fog);
      c.lineWidth = inW ? lw * 2.2 : lw;
      c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
    }
    // spread of the window: its widest extent along any axis
    let spread = 0;
    for (let a = 0; a < d; a++) { let lo = 1, hi = -1; for (let i = i0; i < i1; i++) { const v = P[i % N][a]; lo = Math.min(lo, v); hi = Math.max(hi, v); } spread = Math.max(spread, hi - lo + 1 / 2 ** hd.b); }
    c.fillStyle = theme.muted; c.font = mono(dpr, 10); c.textAlign = 'left';
    c.fillText(`${d}D, ${N.toLocaleString()} cells`, 10 * dpr, 16 * dpr);
    $('inf-v8a').textContent = `${N.toLocaleString()} = 2^${d * hd.b}`;
    $('inf-v8b').textContent = `${spread.toFixed(3)} of the side`;
    $('inf-v8c').textContent = `2^(-${hd.wk}/${d}) = ${(2 ** (-hd.wk / d)).toFixed(3)}`;
  }
  function setD(v) { hd.d = v; $('inf-db').max = MAXB[v]; hd.b = Math.min(hd.b, MAXB[v]); $('inf-db').value = hd.b; $('inf-dbv').textContent = hd.b; }
  slider('inf-dd', 'inf-ddv', (v) => String(v), setD);
  slider('inf-db', 'inf-dbv', (v) => String(v), (v) => { hd.b = v; });
  slider('inf-dw', 'inf-dwv', (v) => `1/${2 ** v}`, (v) => { hd.wk = v; $('inf-v8l').textContent = `1/${2 ** v} of the line spans`; });
  playButton('inf-play8', () => hd.play, (v) => { hd.play = v; });
  const c8 = $('inf-c8');
  c8.addEventListener('pointerdown', (e) => { hd.drag = [e.clientX, e.clientY]; c8.setPointerCapture(e.pointerId); });
  c8.addEventListener('pointermove', (e) => { if (!hd.drag) return; hd.yaw += (e.clientX - hd.drag[0]) * 0.01; hd.pitch = clamp(hd.pitch + (e.clientY - hd.drag[1]) * 0.01, -1.5, 1.5); hd.drag = [e.clientX, e.clientY]; });
  for (const ev of ['pointerup', 'pointercancel']) c8.addEventListener(ev, () => { hd.drag = null; });

  // ---------- 9. infinitely many sides, a finite diagonal ----------
  // sides 1/k^p: p = 0 is the unit cube, p = 1 the Hilbert cube
  const REFS = [{ p: 0, hue: 210, tag: '√n' }, { p: 0.5, hue: 140, tag: 'p=½' }, { p: 1, hue: 25, tag: 'π/√6' }];
  const hueOf = (p) => (p <= 0.5 ? 210 - 140 * p : 140 - 230 * (p - 0.5)) % 360;
  const hc = { n: 12, p: 1, t: 0, play: !reduceMotion, scale: 0 };
  // a turning plane in n dimensions: two fixed random directions mixed with two others
  const seeds = [];
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; }; })();
  for (let k = 0; k < 4; k++) { const v = []; for (let i = 0; i < 80; i++) v.push(rnd()); seeds.push(v); }
  function frame2(n, t) {
    const A = seeds[0].slice(0, n).map((x, i) => Math.cos(t) * x + Math.sin(t) * seeds[2][i]);
    const B = seeds[1].slice(0, n).map((x, i) => Math.cos(t * 0.7) * x + Math.sin(t * 0.7) * seeds[3][i]);
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), na = Math.sqrt(dot(A, A)), u = A.map((x) => x / na);
    const pb = dot(B, u), v0 = B.map((x, i) => x - pb * u[i]), nb = Math.sqrt(dot(v0, v0)) || 1, v = v0.map((x) => x / nb);
    return [u, v];
  }
  function drawBox() {
    const { c, w, h, dpr } = UI.canvas('inf-c9'), s = D.powerSides(hc.n, hc.p), B = { hue: (hueOf(hc.p) + 360) % 360 };
    const plotH = h * 0.34, top = h - plotH, cx = w / 2, cy = top / 2;
    const [u, v] = hc.n >= 2 ? frame2(hc.n, hc.t) : [[1], [0]];
    const gs = s.map((x, k) => [x * u[k], x * (v[k] || 0)]), poly = D.zonogon(gs);
    const ext = poly.reduce((m, p) => Math.max(m, Math.abs(p[0]), Math.abs(p[1])), 0.05);
    const want = (Math.min(w, top) * 0.42) / ext;
    hc.scale = hc.scale ? hc.scale + (want - hc.scale) * 0.08 : want;
    const k = hc.scale, X = (p) => cx + p[0] * k, Y = (p) => cy - p[1] * k;
    c.fillStyle = hsl(B.hue, 0.14); c.strokeStyle = hsl(B.hue, 0.8); c.lineWidth = 1.4 * dpr;
    c.beginPath(); poly.forEach((p, i) => (i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)))); c.closePath(); c.fill(); c.stroke();
    // the main diagonal, walked edge by edge: one step along each dimension
    let p = [-gs.reduce((a, g) => a + g[0], 0) / 2, -gs.reduce((a, g) => a + g[1], 0) / 2];
    c.lineWidth = 2 * dpr;
    gs.forEach((g, i) => { const q = [p[0] + g[0], p[1] + g[1]]; c.strokeStyle = hsl((i * 47) % 360, 0.9); c.beginPath(); c.moveTo(X(p), Y(p)); c.lineTo(X(q), Y(q)); c.stroke(); p = q; });
    c.fillStyle = theme.muted; c.font = mono(dpr, 10); c.textAlign = 'left';
    c.fillText(`shadow of the ${hc.n}D box`, 10 * dpr, 16 * dpr);
    // the diagonal against dimension, for all three boxes
    const NM = 60, px0 = 34 * dpr, px1 = w - 44 * dpr, py0 = h - 18 * dpr, py1 = top + 10 * dpr, ymax = 8;
    const PX = (n) => px0 + ((n - 1) / (NM - 1)) * (px1 - px0), PY = (y) => py0 - (Math.min(y, ymax) / ymax) * (py0 - py1);
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath(); c.moveTo(px0, py1); c.lineTo(px0, py0); c.lineTo(px1, py0); c.stroke();
    c.fillStyle = theme.muted; c.textAlign = 'right';
    for (const y of [2, 4, 6, 8]) c.fillText(String(y), px0 - 4 * dpr, PY(y) + 3 * dpr);
    c.textAlign = 'center'; c.fillText('dimension', (px0 + px1) / 2, h - 4 * dpr);
    c.setLineDash([3 * dpr, 3 * dpr]); c.strokeStyle = hsl(25, 0.6); c.beginPath(); c.moveTo(px0, PY(D.BASEL)); c.lineTo(px1, PY(D.BASEL)); c.stroke(); c.setLineDash([]);
    for (const r of [...REFS, { p: hc.p, hue: B.hue, tag: '', mine: true }]) {
      c.strokeStyle = hsl(r.hue, r.mine ? 1 : 0.45); c.lineWidth = (r.mine ? 2.2 : 1.2) * dpr; c.beginPath();
      for (let n = 1; n <= NM; n++) { const y = D.diag(D.powerSides(n, r.p)); n === 1 ? c.moveTo(PX(n), PY(y)) : c.lineTo(PX(n), PY(y)); }
      c.stroke();
      if (r.tag) { c.fillStyle = hsl(r.hue, 1, -8); c.textAlign = 'left'; c.fillText(r.tag, px1 + 4 * dpr, PY(D.diag(D.powerSides(NM, r.p))) + (r.p === 1 ? 4 : r.p === 0.5 ? -4 : 3) * dpr); }
    }
    c.fillStyle = theme.fg; c.beginPath(); c.arc(PX(Math.min(hc.n, NM)), PY(D.diag(s)), 3.5 * dpr, 0, 7); c.fill();
    const vol = s.reduce((a, x) => a * x, 1);
    $('inf-v9a').textContent = D.diag(s).toFixed(4);
    $('inf-v9b').textContent = hc.p > 0.5 ? `√ζ(${(2 * hc.p).toFixed(2)}) = ${Math.sqrt(D.zeta(2 * hc.p)).toFixed(4)}${Math.abs(hc.p - 1) < 1e-9 ? ' = π/√6' : ''}` : hc.p === 0.5 ? 'none: it grows like √(ln n)' : `none: it grows like n^${(0.5 - hc.p).toFixed(2)}`;
    $('inf-v9c').textContent = vol < 1e-4 ? vol.toExponential(2) : vol.toFixed(4);
  }
  slider('inf-hn', 'inf-hnv', (v) => String(v), (v) => { hc.n = v; });
  slider('inf-hp', 'inf-hpv', (v) => v.toFixed(2), (v) => { hc.p = v; hc.scale = 0; });
  for (const b of document.querySelectorAll('#inf-hpre button')) b.onclick = () => { $('inf-hp').value = b.dataset.p; $('inf-hp').dispatchEvent(new Event('input')); };
  playButton('inf-play9', () => hc.play, (v) => { hc.play = v; });

  let last = performance.now();
  UI.loop((now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (!UI.shown('s-infinity')) return;
    if (pa.wander) { pa.t += dt * 0.25; pa.x = 0.5 + 0.32 * Math.sin(pa.t * 1.3); pa.y = 0.5 + 0.32 * Math.sin(pa.t * 0.9 + 1); }
    if (hd.play) { hd.t = (hd.t + dt * 0.03) % 1; hd.spin += dt * 0.35; if (!hd.drag) hd.yaw += dt * 0.15; }
    if (hc.play) hc.t += dt * 0.25;
    if (UI.visible('inf-c7')) drawPatch();
    if (UI.visible('inf-c8')) drawHD();
    if (UI.visible('inf-c9')) drawBox();
  });
})();
