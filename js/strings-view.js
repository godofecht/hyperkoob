// The "String theory" tab: a curled-up dimension, the waves it allows,
// T-duality, the critical dimension, and a Calabi-Yau cross-section.
(function () {
  const S = window.Strings;
  const $ = (id) => document.getElementById(id);
  if (!$('st-R')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const st = { R: 1, zoom: 0.15, D: 26, eps: 0.1, n: 5, alpha: 45, yaw: 0.4, pitch: 0.5, spin: !reduceMotion, drag: null, cy: null, cyN: 0, t: 0 };

  let theme = {};
  function readTheme() {
    theme = UI.theme;
  }
  const canvas = UI.canvas;
  const fmt = (x) => (x >= 1000 || x < 0.01 ? x.toExponential(1).replace('e', ' × 10^').replace('+', '') : x.toPrecision(3));

  // 1. a hose: far away a line, close up a tube with a circle round it
  function drawHose() {
    const { c, w, h, dpr } = canvas('st-c1'), R = st.R;
    const half = R * 10 ** (3 - 3 * st.zoom), px = w / 2 / half, thick = 2 * R * px, cy = h * 0.5;
    if (thick < 2.5 * dpr) {
      c.strokeStyle = theme.fg; c.lineWidth = Math.max(thick, 0.6 * dpr); c.beginPath(); c.moveTo(0, cy); c.lineTo(w, cy); c.stroke();
    } else {
      const ry = thick / 2, rx = ry * 0.35;
      const g0 = c.createLinearGradient(0, cy - ry, 0, cy + ry);
      g0.addColorStop(0, `hsl(220, 30%, ${clamp(theme.el + 25, 20, 90)}%)`); g0.addColorStop(0.5, `hsl(220, 30%, ${clamp(theme.el + 5, 15, 85)}%)`); g0.addColorStop(1, `hsl(220, 30%, ${clamp(theme.el - 15, 10, 80)}%)`);
      c.fillStyle = g0; c.fillRect(0, cy - ry, w, thick);
      c.strokeStyle = theme.fg; c.lineWidth = dpr;
      for (let k = -6; k <= 6; k++) { const x = w / 2 + k * Math.max(thick * 0.9, 40 * dpr); if (x < -rx || x > w + rx) continue; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(x, cy, rx, ry, 0, 0, 7); c.stroke(); }
      c.globalAlpha = 1;
      // an ant walking round the circle
      const a = st.t * 1.5, ax = w / 2 + rx * Math.cos(a), ay = cy - ry * Math.sin(a);
      c.fillStyle = Math.cos(a) > 0 ? 'hsl(15, 80%, 45%)' : 'hsla(15, 80%, 45%, 0.35)'; c.beginPath(); c.arc(ax, ay, Math.max(3 * dpr, ry * 0.08), 0, 7); c.fill();
    }
    $('st-v1').textContent = thick < 2.5 * dpr ? `a line, ${(thick / dpr).toFixed(3)} px thick` : 'a tube: a line with a circle at every point';
  }
  // 2. waves that fit round the circle, and the energy each one costs
  function drawWaves() {
    const { c, w, h, dpr } = canvas('st-c2'), R = st.R, cx = w * 0.27, cy = h * 0.5, r0 = Math.min(w * 0.2, h * 0.36);
    const n = Math.floor(st.t / 2.2) % 5;
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath(); c.arc(cx, cy, r0, 0, 7); c.stroke();
    c.strokeStyle = theme.accent; c.lineWidth = 2.5 * dpr; c.beginPath();
    for (let i = 0; i <= 240; i++) { const th = (i / 240) * 2 * Math.PI, r = r0 * (1 + 0.14 * Math.cos(n * th) * Math.cos(st.t * 3)); const x = cx + r * Math.cos(th), y = cy - r * Math.sin(th); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = theme.muted; c.font = `${11 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.fillText(`n = ${n}`, cx, cy + r0 + 18 * dpr);
    // the ladder: energies n / R, up to a fixed budget of 10
    const lx = w * 0.58, lw = w * 0.36, top = h * 0.1, bot = h * 0.88, Emax = 10;
    c.strokeStyle = theme.line; c.beginPath(); c.moveTo(lx, bot); c.lineTo(lx, top); c.stroke();
    for (let k = 0; k <= 30; k++) {
      const E = S.kk(k, R); if (E > Emax) break;
      const y = bot - (E / Emax) * (bot - top);
      c.strokeStyle = k === n ? theme.accent : theme.fg; c.lineWidth = (k === n ? 2.5 : 1) * dpr; c.beginPath(); c.moveTo(lx, y); c.lineTo(lx + lw, y); c.stroke();
    }
    c.fillStyle = theme.muted; c.textAlign = 'left'; c.fillText('energy budget', lx + 4 * dpr, top - 4 * dpr);
    const fits = Math.floor(Emax * R);
    $('st-v2').textContent = `1/R = ${fmt(1 / R)}; ${fits === 0 ? 'only n = 0 is affordable' : `${fits} wave${fits > 1 ? 's' : ''} above n = 0 fit the budget`}`;
  }
  // 3. T-duality: the levels of a string on a circle, against log R
  const PAIRS = [[1, 0], [0, 1], [2, 0], [0, 2], [1, 1], [2, 1], [1, 2], [3, 0], [0, 3]];
  function drawDual() {
    const { c, w, h, dpr } = canvas('st-c3'), pad = { l: 12 * dpr, r: 12 * dpr, t: 10 * dpr, b: 22 * dpr }, L = 1.5, Ymax = 6;
    const X = (lr) => pad.l + ((lr + L) / (2 * L)) * (w - pad.l - pad.r), Y = (E) => h - pad.b - (Math.min(E, Ymax) / Ymax) * (h - pad.t - pad.b);
    PAIRS.forEach(([n, wd], i) => {
      c.strokeStyle = `hsla(${(i * 41 + 200) % 360}, 65%, ${clamp(theme.el, 30, 70)}%, 0.9)`; c.lineWidth = 1.6 * dpr; c.beginPath();
      for (let k = 0; k <= 200; k++) { const lr = -L + (2 * L * k) / 200, E = S.level(n, wd, 10 ** lr); k ? c.lineTo(X(lr), Y(E)) : c.moveTo(X(lr), Y(E)); }
      c.stroke();
    });
    const lr = Math.log10(st.R);
    c.strokeStyle = theme.fg; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(X(lr), pad.t); c.lineTo(X(lr), h - pad.b); c.stroke();
    c.setLineDash([4 * dpr, 4 * dpr]); c.beginPath(); c.moveTo(X(-lr), pad.t); c.lineTo(X(-lr), h - pad.b); c.stroke(); c.setLineDash([]);
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textBaseline = 'top';
    c.textAlign = 'left'; c.fillText('R = 0.03', pad.l, h - pad.b + 5 * dpr); c.textAlign = 'center'; c.fillText('R = 1', X(0), h - pad.b + 5 * dpr); c.textAlign = 'right'; c.fillText('R = 30', w - pad.r, h - pad.b + 5 * dpr);
    const a = S.spectrum(st.R), b = S.spectrum(1 / st.R), diff = Math.max(...a.map((x, i) => Math.abs(x - b[i])));
    $('st-v3').textContent = `R = ${fmt(st.R)} and 1/R = ${fmt(1 / st.R)}: ${diff < 1e-9 ? 'identical' : `differ by ${diff.toExponential(1)}`}`;
  }
  // 4. a cross-section of a Calabi-Yau shape
  function drawCY() {
    const { c, w, h, dpr } = canvas('st-c4');
    if (!st.cy || st.cyN !== st.n) { st.cy = S.calabiYau(st.n, 9); st.cyN = st.n; }
    const al = (st.alpha * Math.PI) / 180, ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const to3 = (p) => [p[0], p[1], Math.cos(al) * p[2] + Math.sin(al) * p[3]];
    const rot = (p) => { const x1 = ca * p[0] + sa * p[2], z1 = -sa * p[0] + ca * p[2]; return [x1, cp * p[1] - sp * z1, sp * p[1] + cp * z1]; };
    const sc = Math.min(w, h) * 0.3, proj = (q) => { const k = 6 / (6 - q[2]); return [w / 2 + q[0] * sc * k, h / 2 - q[1] * sc * k]; };
    const quads = [];
    for (const P of st.cy) {
      const G = P.grid.map((row) => row.map((p) => rot(to3(p))));
      for (let i = 0; i + 1 < G.length; i++) for (let j = 0; j + 1 < G[i].length; j++) {
        const q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]];
        const u = q[1].map((v, k) => v - q[0][k]), v2 = q[3].map((v, k) => v - q[0][k]), nz = u[0] * v2[1] - u[1] * v2[0];
        quads.push({ q, z: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, hue: (P.k1 * 360) / st.n + P.k2 * 12, shade: nz });
      }
    }
    quads.sort((a, b) => a.z - b.z);
    c.lineWidth = 0.6 * dpr;
    for (const Q of quads) {
      const pts = Q.q.map(proj);
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
      const l = clamp(theme.el + (Q.shade > 0 ? 8 : -8), 20, 80);
      c.fillStyle = `hsla(${Q.hue % 360}, 60%, ${l}%, 0.9)`; c.fill(); c.strokeStyle = `hsla(${Q.hue % 360}, 60%, ${l - 15}%, 0.6)`; c.stroke();
    }
    $('st-v4').textContent = `${st.n * st.n} patches, z1^${st.n} + z2^${st.n} = 1`;
  }
  // 5. why 26 and 10
  function drawCrit() {
    const D = st.D, b = S.bosonic(D), s = S.superstring(D);
    $('st-v5a').textContent = `(D - 2)/24 = ${b.toFixed(3)}${b === 1 ? ', consistent' : ', needs 1'}`;
    $('st-v5b').textContent = `(D - 2)/16 = ${s.toFixed(3)}${s === 0.5 ? ', consistent' : ', needs 0.5'}`;
    const f = S.smoothedSum(st.eps), div = 1 / (st.eps * st.eps);
    $('st-v5c').textContent = `${f.toPrecision(8)} - ${div.toPrecision(8)} = ${(f - div).toFixed(6)}`;
  }

  // controls
  const Rin = $('st-R');
  Rin.addEventListener('input', () => { st.R = 10 ** +Rin.value; $('st-Rv').textContent = fmt(st.R); });
  $('st-zoom').addEventListener('input', () => { st.zoom = +$('st-zoom').value; });
  $('st-n').addEventListener('input', () => { st.n = +$('st-n').value; $('st-nv').textContent = st.n; });
  $('st-alpha').addEventListener('input', () => { st.alpha = +$('st-alpha').value; $('st-alphav').textContent = `${st.alpha}°`; });
  $('st-D').addEventListener('change', () => { const v = Math.round(+$('st-D').value); if (Number.isFinite(v)) st.D = v; });
  $('st-D').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = Math.round(+$('st-D').value); if (Number.isFinite(v)) st.D = v; } });
  $('st-eps').addEventListener('input', () => { st.eps = 10 ** +$('st-eps').value; });
  $('st-spin').onclick = () => { st.spin = !st.spin; $('st-spin').setAttribute('aria-pressed', st.spin); };
  $('st-spin').setAttribute('aria-pressed', st.spin);
  const cyc = $('st-c4');
  cyc.addEventListener('pointerdown', (e) => { st.drag = { x: e.clientX, y: e.clientY }; cyc.setPointerCapture(e.pointerId); });
  cyc.addEventListener('pointermove', (e) => { if (!st.drag) return; st.yaw += (e.clientX - st.drag.x) * 0.008; st.pitch = clamp(st.pitch + (e.clientY - st.drag.y) * 0.008, -1.5, 1.5); st.drag = { x: e.clientX, y: e.clientY }; });
  const end = () => { st.drag = null; };
  cyc.addEventListener('pointerup', end); cyc.addEventListener('pointercancel', end);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('s-strings').hidden) {
      st.t += reduceMotion ? 0 : dt;
      if (st.spin && !st.drag) st.yaw += dt * 0.25;
      drawHose(); drawWaves(); drawDual(); drawCY(); drawCrit();
    }
  }
  UI.onTheme(readTheme);
  $('st-Rv').textContent = fmt(st.R);
  UI.loop(frame);
})();
