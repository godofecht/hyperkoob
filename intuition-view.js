// Four cards of intuition spread over the tabs: Cauchy's average shadow
// and the parts of the n-cube (Shadows), the share of a ball near its
// equator (High dimensions), and an arrow carried round a triangle on a
// sphere (Curved space).
(function () {
  const I = window.Intuition;
  const $ = (id) => document.getElementById(id);
  if (!I) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let theme = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    theme = { fg: g('--fg'), muted: g('--muted'), line: g('--line'), accent: g('--accent'), panel: g('--panel'), el: parseFloat(g('--edge-l')) || 50 };
  }
  function canvas(id) {
    const c = $(id), r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
    return { c: x, w, h, dpr };
  }
  const visible = (id) => { const el = $(id); return el && el.offsetParent !== null; };

  // ---------- Cauchy's average shadow ----------
  const ca = { solid: 'cube', run: !reduceMotion, n: 0, sum: 0, hist: [], dir: [0, 0, 1], seed: 7 };
  const rnd = () => ((ca.seed ^= ca.seed << 13, ca.seed ^= ca.seed >>> 17, ca.seed ^= ca.seed << 5) >>> 0) / 4294967296;
  function cauchyReset() { ca.n = 0; ca.sum = 0; ca.hist = []; }
  function drawCauchy() {
    const S = I.SOLIDS[ca.solid];
    if (ca.run) for (let i = 0; i < 40; i++) { ca.dir = I.randomDir(rnd); const a = I.shadow(S.V, ca.dir).area; ca.sum += a; ca.n++; if (ca.n % 4 === 0) ca.hist.push(ca.sum / ca.n); }
    if (ca.hist.length > 600) ca.hist = ca.hist.filter((_, i) => i % 2 === 0);
    const { c, w, h, dpr } = canvas('cau-c'), half = w * 0.42;
    // left: this shadow, as seen down the light
    const sh = I.shadow(S.V, ca.dir), sc = Math.min(half, h) * 0.32, cx = half / 2 + 6 * dpr, cy = h / 2;
    c.beginPath(); sh.hull.forEach((p, i) => (i ? c.lineTo(cx + p[0] * sc, cy - p[1] * sc) : c.moveTo(cx + p[0] * sc, cy - p[1] * sc))); c.closePath();
    c.fillStyle = theme.fg; c.globalAlpha = 0.75; c.fill(); c.globalAlpha = 1;
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.fillText(`this shadow: ${sh.area.toFixed(3)}`, cx, h - 8 * dpr);
    // right: the running average settling on a quarter of the surface
    const x0 = half + 14 * dpr, pw = w - x0 - 8 * dpr, target = S.area / 4, lo = target * 0.8, hi = target * 1.2;
    const X = (i) => x0 + (i / Math.max(1, ca.hist.length - 1)) * pw, Y = (v) => 10 * dpr + (1 - (clamp(v, lo, hi) - lo) / (hi - lo)) * (h - 30 * dpr);
    c.strokeStyle = theme.muted; c.setLineDash([4 * dpr, 4 * dpr]); c.lineWidth = dpr; c.beginPath(); c.moveTo(x0, Y(target)); c.lineTo(x0 + pw, Y(target)); c.stroke(); c.setLineDash([]);
    c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); ca.hist.forEach((v, i) => (i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)))); c.stroke();
    c.fillStyle = theme.muted; c.textAlign = 'left'; c.fillText('average so far; dashed: surface / 4', x0, h - 8 * dpr);
    const mean = ca.n ? ca.sum / ca.n : 0;
    $('cau-n').textContent = ca.n.toLocaleString('en-US');
    $('cau-m').textContent = `${mean.toFixed(4)} against ${target.toFixed(4)}`;
    $('cau-d').textContent = ca.n ? `${((100 * (mean - target)) / target).toFixed(2)}%` : '';
  }

  // ---------- parts of the n-cube ----------
  function drawParts() {
    const n = clamp(Math.round(+$('parts-n').value || 4), 0, 60), P = I.cubeParts(n);
    const rows = P.map((v, k) => `<tr><td>${k}</td><td>${I.partName(k)}</td><td>${v.toLocaleString('en-US')}</td><td>${k % 2 ? '-' : '+'}</td></tr>`).join('');
    $('parts-t').innerHTML = `<thead><tr><th>dim</th><th>part</th><th>how many</th><th>sign</th></tr></thead><tbody>${rows}</tbody>`;
    $('parts-s').textContent = `${P.reduce((a, v, k) => a + (k % 2 ? -v : v), 0)}`;
  }

  // ---------- near the equator ----------
  const eq = { h: 0.1 };
  function drawEquator() {
    const n = Math.max(1, Math.round(+$('hd-n').value || 3)), { c, w, h, dpr } = canvas('eq-c'), pad = { l: 12 * dpr, r: 12 * dpr, t: 10 * dpr, b: 22 * dpr };
    const N = 400, ys = []; for (let i = 0; i <= N; i++) ys.push(I.equatorDensity(n, -1 + (2 * i) / N));
    const ymax = Math.max(...ys), X = (i) => pad.l + ((w - pad.l - pad.r) * i) / N, Y = (y) => h - pad.b - (y / ymax) * (h - pad.t - pad.b);
    const ia = ((1 - eq.h) / 2) * N, ib = ((1 + eq.h) / 2) * N;
    c.fillStyle = theme.accent; c.globalAlpha = 0.12; c.fillRect(X(ia), pad.t, X(ib) - X(ia), h - pad.t - pad.b); c.globalAlpha = 1;
    c.beginPath(); c.moveTo(X(0), Y(0)); ys.forEach((y, i) => c.lineTo(X(i), Y(y))); c.lineTo(X(N), Y(0)); c.closePath(); c.fillStyle = theme.accent; c.globalAlpha = 0.25; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); ys.forEach((y, i) => (i ? c.lineTo(X(i), Y(y)) : c.moveTo(X(i), Y(y)))); c.stroke();
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText('-1', pad.l, h - pad.b + 5 * dpr); c.textAlign = 'center'; c.fillText('equator', w / 2, h - pad.b + 5 * dpr); c.textAlign = 'right'; c.fillText('1', w - pad.r, h - pad.b + 5 * dpr);
    const s = I.equatorShare(Math.min(n, 1e6), eq.h);
    $('eq-v').textContent = s > 0.99999 ? '> 99.999%' : `${(100 * s).toFixed(s > 0.999 ? 3 : 1)}%`;
  }

  // ---------- an arrow round a triangle ----------
  const ho = { span: 90, t: 0, play: !reduceMotion, yaw: 0.9, pitch: 0.55 };
  function drawHolonomy(dt) {
    const span = (ho.span * Math.PI) / 180, path = I.trianglePath(span, 900), v0 = [0, 1, 0], vs = I.transport(path, v0);
    if (ho.play) ho.t = (ho.t + dt / 9) % 1.15;
    const k = Math.min(path.length - 1, Math.floor(clamp(ho.t, 0, 1) * (path.length - 1)));
    const { c, w, h, dpr } = canvas('ho-c'), R = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
    const cy0 = Math.cos(ho.yaw), sy0 = Math.sin(ho.yaw), cp = Math.cos(ho.pitch), sp = Math.sin(ho.pitch);
    const rot = (p) => { const x1 = cy0 * p[0] + sy0 * p[1], y1 = -sy0 * p[0] + cy0 * p[1]; return [x1, cp * p[2] - sp * y1, sp * p[2] + cp * y1]; };
    const S = (p) => { const q = rot(p); return [cx + q[0] * R, cy - q[1] * R, q[2]]; };
    c.fillStyle = theme.panel; c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.stroke();
    // a few meridians and the equator, front side only
    const seg = (pts, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); let on = false; for (const p of pts) { const s = S(p); if (s[2] < 0) { on = false; continue; } if (on) c.lineTo(s[0], s[1]); else { c.moveTo(s[0], s[1]); on = true; } } c.stroke(); };
    for (let m = 0; m < 12; m++) { const a = (m * Math.PI) / 6, pts = []; for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI; pts.push([Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), Math.cos(t)]); } seg(pts, theme.line, dpr); }
    { const pts = []; for (let i = 0; i <= 120; i++) { const a = (i / 120) * 2 * Math.PI; pts.push([Math.cos(a), Math.sin(a), 0]); } seg(pts, theme.line, dpr); }
    seg(path, theme.accent, 2.5 * dpr);
    // the arrow at the start, and where it is now
    const arrow = (p, v, col) => { const a = S(p), b = S(p.map((x, i) => x + 0.28 * v[i])); if (a[2] < 0) return; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3 * dpr; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - 9 * dpr * Math.cos(ang - 0.45), b[1] - 9 * dpr * Math.sin(ang - 0.45)); c.lineTo(b[0] - 9 * dpr * Math.cos(ang + 0.45), b[1] - 9 * dpr * Math.sin(ang + 0.45)); c.closePath(); c.fill(); };
    arrow(path[0], v0, theme.muted);
    arrow(path[k], vs[k], 'hsl(15, 80%, 50%)');
    const turned = (Math.abs(I.turnAngle(v0, vs[vs.length - 1], [0, 0, 1])) * 180) / Math.PI;
    $('ho-sum').textContent = `${(180 + ho.span).toFixed(0)}°, which is 180° + ${ho.span.toFixed(0)}°`;
    $('ho-area').textContent = `${((ho.span / 720) * 100).toFixed(1)}% of the sphere`;
    $('ho-turn').textContent = `${turned.toFixed(1)}°`;
  }

  // controls
  if ($('cau-solid')) {
    $('cau-solid').addEventListener('change', (e) => { ca.solid = e.target.value; cauchyReset(); });
    $('cau-run').onclick = () => { ca.run = !ca.run; $('cau-run').setAttribute('aria-pressed', ca.run); $('cau-run').textContent = ca.run ? 'Pause' : 'Run'; };
    $('cau-run').setAttribute('aria-pressed', ca.run); $('cau-run').textContent = ca.run ? 'Pause' : 'Run';
    $('cau-reset').onclick = cauchyReset;
    $('parts-n').addEventListener('input', drawParts);
  }
  if ($('eq-h')) $('eq-h').addEventListener('input', () => { eq.h = +$('eq-h').value; $('eq-hv').textContent = eq.h.toFixed(2); });
  if ($('ho-span')) {
    $('ho-span').addEventListener('input', () => { ho.span = +$('ho-span').value; $('ho-spanv').textContent = `${ho.span}°`; ho.t = 0; });
    $('ho-play').onclick = () => { ho.play = !ho.play; $('ho-play').setAttribute('aria-pressed', ho.play); $('ho-play').textContent = ho.play ? 'Pause' : 'Play'; };
    $('ho-play').setAttribute('aria-pressed', ho.play); $('ho-play').textContent = ho.play ? 'Pause' : 'Play';
    const hc = $('ho-c'); let drag = null;
    hc.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; hc.setPointerCapture(e.pointerId); });
    hc.addEventListener('pointermove', (e) => { if (!drag) return; ho.yaw += (e.clientX - drag.x) * 0.01; ho.pitch = clamp(ho.pitch + (e.clientY - drag.y) * 0.01, -1.5, 1.5); drag = { x: e.clientX, y: e.clientY }; });
    hc.addEventListener('pointerup', () => { drag = null; });
  }

  let last = performance.now(), partsDone = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible('cau-c')) { drawCauchy(); if (!partsDone) { drawParts(); partsDone = true; } }
    if (visible('eq-c')) drawEquator();
    if (visible('ho-c')) drawHolonomy(dt);
    requestAnimationFrame(frame);
  }
  readTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  requestAnimationFrame(frame);
})();
