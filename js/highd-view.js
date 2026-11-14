// "Where intuition fails": five panels driven by one dimension n.
(function () {
  const D = window.HighD;
  const $ = (id) => document.getElementById(id);
  if (!$('hd-n')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = (x, d = 0) => x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const st = { eps: 0.01, count: 300, n: 3, play: false, v: Math.log10(3), dist: null, distN: 0, dirty: true };

  let theme = {};
  function readTheme() {
    theme = UI.theme;
    st.dirty = true;
  }
  const canvas = UI.canvas;
  // A filled curve y = f(x) on [x0, x1], scaled to its own maximum.
  function curve(cx, w, h, dpr, f, x0, x1, opts = {}) {
    const pad = { l: 12 * dpr, r: 12 * dpr, t: 10 * dpr, b: 22 * dpr }, N = 400, ys = [];
    for (let i = 0; i <= N; i++) ys.push(f(x0 + ((x1 - x0) * i) / N));
    const ymax = Math.max(...ys.filter(Number.isFinite), 1e-300);
    const X = (i) => pad.l + ((w - pad.l - pad.r) * i) / N, Y = (y) => h - pad.b - (clamp(y / ymax, 0, 1) * (h - pad.t - pad.b));
    if (opts.band) {
      const [a, b] = opts.band, ia = ((a - x0) / (x1 - x0)) * N, ib = ((b - x0) / (x1 - x0)) * N;
      cx.fillStyle = theme.accent; cx.globalAlpha = 0.12; cx.fillRect(X(ia), pad.t, X(ib) - X(ia), h - pad.t - pad.b); cx.globalAlpha = 1;
    }
    cx.beginPath(); cx.moveTo(X(0), Y(0));
    ys.forEach((y, i) => cx.lineTo(X(i), Y(y)));
    cx.lineTo(X(N), Y(0)); cx.closePath();
    cx.fillStyle = theme.accent; cx.globalAlpha = 0.25; cx.fill(); cx.globalAlpha = 1;
    cx.beginPath(); ys.forEach((y, i) => (i ? cx.lineTo(X(i), Y(y)) : cx.moveTo(X(i), Y(y)))); cx.strokeStyle = theme.accent; cx.lineWidth = 2 * dpr; cx.stroke();
    cx.strokeStyle = theme.line; cx.lineWidth = dpr; cx.beginPath(); cx.moveTo(pad.l, h - pad.b); cx.lineTo(w - pad.r, h - pad.b); cx.stroke();
    cx.fillStyle = theme.muted; cx.font = `${10 * dpr}px "IBM Plex Mono", monospace`; cx.textBaseline = 'top';
    (opts.ticks || []).forEach(([x, s]) => { const i = ((x - x0) / (x1 - x0)) * N; cx.textAlign = i < 2 ? 'left' : i > N - 2 ? 'right' : 'center'; cx.fillText(s, X(i), h - pad.b + 5 * dpr); });
  }

  function drawPeel() {
    const { c, w, h, dpr } = canvas('hd-c1'), n = st.n;
    curve(c, w, h, dpr, (r) => D.radiusDensity(n, r), 0, 1, { band: [1 - st.eps, 1], ticks: [[0, 'centre'], [0.5, '0.5'], [1, 'surface']] });
    const s = D.shell(n, st.eps);
    $('hd-v1').textContent = s > 0.99999 ? '> 99.999%' : `${fmt(100 * s, s > 0.999 ? 3 : 1)}%`;
  }
  function drawAngles() {
    const { c, w, h, dpr } = canvas('hd-c2'), n = st.n;
    if (n < 2) { $('hd-v2').textContent = 'needs 2 dimensions'; return; }
    curve(c, w, h, dpr, (t) => D.angleDensity(n, t), 0, Math.PI, { ticks: [[0, '0°'], [Math.PI / 2, '90°'], [Math.PI, '180°']] });
    const sd = (D.angleSpread(Math.min(n, 1e6)) * 180) / Math.PI * (n > 1e6 ? Math.sqrt(1e6 / n) : 1);
    $('hd-v2').textContent = `90° ± ${sd < 0.1 ? sd.toPrecision(2) : fmt(sd, 1)}°`;
  }
  function drawBall() {
    const { c, w, h, dpr } = canvas('hd-c3'), n = st.n;
    const top = Math.max(30, Math.ceil(n * 1.3)), pad = { l: 12 * dpr, r: 12 * dpr, t: 12 * dpr, b: 22 * dpr };
    const N = 300, xs = [], ys = [];
    for (let i = 0; i <= N; i++) { const x = 1 + ((top - 1) * i) / N; xs.push(x); ys.push(D.lnBall(x) / Math.LN10); }
    const ymax = Math.max(...ys), ymin = Math.min(...ys), span = Math.max(ymax - ymin, 1);
    const X = (x) => pad.l + ((x - 1) / (top - 1)) * (w - pad.l - pad.r), Y = (y) => pad.t + ((ymax - y) / span) * (h - pad.t - pad.b);
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath(); c.moveTo(pad.l, Y(0)); c.lineTo(w - pad.r, Y(0)); c.stroke();
    c.beginPath(); xs.forEach((x, i) => (i ? c.lineTo(X(x), Y(ys[i])) : c.moveTo(X(x), Y(ys[i])))); c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.stroke();
    const pk = D.ballPeak(); c.fillStyle = theme.muted; c.beginPath(); c.arc(X(pk), Y(D.lnBall(pk) / Math.LN10), 3 * dpr, 0, 7); c.fill();
    c.fillStyle = theme.fg; c.beginPath(); c.arc(X(n), Y(D.lnBall(n) / Math.LN10), 5 * dpr, 0, 7); c.fill();
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textBaseline = 'top'; c.textAlign = 'left';
    c.fillText(`peak at n = ${pk.toFixed(4)}`, X(pk) + 6 * dpr, Y(D.lnBall(pk) / Math.LN10));
    c.fillText('volume 1', pad.l, Y(0) + 3 * dpr);
    c.textAlign = 'center'; c.fillText(`n = 1 to ${fmt(top)}, volume on a log scale`, w / 2, h - pad.b + 5 * dpr);
    $('hd-v3').textContent = D.fmtLn(D.lnBall(n));
    $('hd-v3b').textContent = D.fmtLn(D.lnBall(n) - n * Math.LN2);
  }
  function drawBox() {
    const { c, w, h, dpr } = canvas('hd-c4'), n = st.n, r = D.middleSphere(n);
    // distances from the centre, to scale: walls at 2, the middle sphere's
    // edge at sqrt(n) - 1, a corner sphere's centre at sqrt(n) along a diagonal
    const reach = Math.max(2.6, Math.sqrt(n) + 1.15), sc = (Math.min(w, h) * 0.46) / reach;
    const cx = w * 0.62, cy = h * 0.5, X = (x) => cx + x * sc, Y = (y) => cy - y * sc;
    const lw = 1.5 * dpr;
    // the walls: no point of the box's surface is closer than 2
    c.fillStyle = theme.accent; c.globalAlpha = 0.08; c.beginPath(); c.arc(cx, cy, 2 * sc, 0, 7); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = theme.fg; c.setLineDash([5 * dpr, 4 * dpr]); c.lineWidth = lw; c.beginPath(); c.arc(cx, cy, 2 * sc, 0, 7); c.stroke(); c.setLineDash([]);
    // corner spheres along the diagonals
    const dirs = [0.6, 2.2, 3.8, 5.3].map((a) => [Math.cos(a), Math.sin(a)]);
    for (const [dx, dy] of dirs) {
      const p = [dx * Math.sqrt(n), dy * Math.sqrt(n)];
      c.strokeStyle = theme.muted; c.lineWidth = lw; c.beginPath(); c.arc(X(p[0]), Y(p[1]), sc, 0, 7); c.stroke();
    }
    // the middle sphere, red where it reaches past the walls
    const out = r > 2;
    c.fillStyle = out ? 'hsla(0, 80%, 55%, 0.25)' : 'hsla(140, 50%, 45%, 0.25)'; c.strokeStyle = out ? 'hsl(0, 75%, 50%)' : 'hsl(140, 50%, 38%)';
    c.lineWidth = 2 * dpr; c.beginPath(); c.arc(cx, cy, Math.max(0, r) * sc, 0, 7); c.fill(); c.stroke();
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('dashed: nearest point of a wall', 8 * dpr, 8 * dpr);
    c.fillText('grey: corner spheres, along diagonals', 8 * dpr, 22 * dpr);
    $('hd-v4').textContent = `${fmt(r, 3)}${out ? ', past the walls' : r === 2 ? ', touching the walls' : ''}`;
  }
  function drawDist() {
    const { c, w, h, dpr } = canvas('hd-c5'), n = st.n;
    if (st.distN !== n || st.distCount !== st.count) {
      // exact samples while affordable; past that, the normal limit of the
      // squared distance (a sum of n terms with mean 1/6, variance 7/180)
      const count = st.count; st.distCount = count;
      if (n * count <= 3e7) { st.dist = D.distances(n, count); st.distHow = 'sampled'; }
      else {
        let x = 12345; const r = () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296;
        st.dist = Float64Array.from({ length: count }, () => Math.sqrt(n / 6 + Math.sqrt((7 * n) / 180) * Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r())));
        st.distHow = 'normal limit';
      }
      st.distN = n;
    }
    const ds = st.dist, mean = ds.reduce((a, b) => a + b, 0) / ds.length, bins = new Array(60).fill(0);
    for (const d of ds) bins[clamp(Math.floor((d / mean) * 30), 0, 59)]++;
    const pad = { l: 12 * dpr, r: 12 * dpr, t: 10 * dpr, b: 22 * dpr }, bw = (w - pad.l - pad.r) / 60, mx = Math.max(...bins);
    c.fillStyle = theme.accent;
    bins.forEach((b, i) => { const bh = (b / mx) * (h - pad.t - pad.b); c.fillRect(pad.l + i * bw + 1, h - pad.b - bh, bw - 2, bh); });
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath(); c.moveTo(pad.l, h - pad.b); c.lineTo(w - pad.r, h - pad.b); c.stroke();
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textBaseline = 'top';
    c.textAlign = 'left'; c.fillText('0', pad.l, h - pad.b + 5 * dpr);
    c.textAlign = 'center'; c.fillText('average distance', pad.l + 30 * bw, h - pad.b + 5 * dpr);
    c.textAlign = 'right'; c.fillText('2x', w - pad.r, h - pad.b + 5 * dpr);
    const k = D.contrast(ds);
    $('hd-v5').textContent = `${fmt(100 * k, k < 0.1 ? 2 : 0)}% farther`;
    $('hd-f5').textContent = `${st.count.toLocaleString('en-US')} random points of the unit cube, ${st.distHow}`;
  }

  function drawAll() {
    drawPeel(); drawAngles(); drawBall(); drawBox(); drawDist();
    $('hd-say').textContent = say(st.n);
  }
  function say(n) {
    if (n <= 3) return 'Everything here matches what your eyes know. Push the dimension up.';
    if (n < 10) return 'The ball is near its largest. The middle sphere still fits in its box.';
    if (n < 100) return 'The middle sphere has gone through the walls of its box, while touching only spheres that sit inside it.';
    if (n < 10000) return 'Almost all of the ball is skin. Almost every pair of directions is a right angle.';
    return 'Every point is about as far from every other. "Nearest" has stopped meaning anything.';
  }

  const num = $('hd-n'), sl = $('hd-s');
  function setN(v, fromSlider, keepV) {
    if (!Number.isFinite(v)) return;
    st.n = Math.max(1, Math.round(v));
    if (!keepV) st.v = Math.log10(st.n);
    if (!fromSlider) sl.value = Math.min(st.v, +sl.max);
    if (document.activeElement !== num) num.value = String(st.n);
    st.dirty = true;
  }
  sl.addEventListener('input', () => { st.play = false; showPlay(); setN(10 ** +sl.value, true); });
  const commit = () => setN(parseFloat(num.value));
  num.addEventListener('change', commit);
  num.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); num.blur(); } });
  for (const b of document.querySelectorAll('#hd-ticks button')) b.onclick = () => setN(+b.dataset.n);
  $('hd-eps').addEventListener('input', () => { st.eps = 10 ** +$('hd-eps').value; $('hd-l1').textContent = `Volume in the outer ${+(st.eps * 100).toPrecision(2)}%`; st.dirty = true; });
  $('hd-cnt').addEventListener('input', () => { st.count = Math.round(10 ** +$('hd-cnt').value); $('hd-cntv').textContent = st.count.toLocaleString('en-US'); st.dirty = true; });
  const playBtn = $('hd-play');
  const showPlay = () => { playBtn.setAttribute('aria-pressed', st.play); playBtn.textContent = st.play ? 'Pause' : 'Play'; };
  playBtn.onclick = () => { st.play = !st.play; if (st.play && st.v >= 4.99) st.v = 0; showPlay(); };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('s-high').hidden) {
      if (st.play) { st.v = Math.min(5, st.v + dt * 0.35); setN(10 ** st.v, false, true); if (st.v >= 5) { st.play = false; showPlay(); } }
      if (st.dirty) { st.dirty = false; drawAll(); }
    }
  }
  UI.onTheme(readTheme);
  window.addEventListener('resize', () => { st.dirty = true; });
  setN(3); showPlay();
  UI.loop(frame);
})();
