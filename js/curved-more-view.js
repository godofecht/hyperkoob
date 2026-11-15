// Two more cards for the Curved space tab: standing inside the 3-sphere,
// and Steiner's porism.
(function () {
  const S = window.Sphere3, St = window.Steiner, S4 = window.Solids4;
  const $ = (id) => document.getElementById(id);
  if (!$('s3-c')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let theme = UI.theme;
  UI.onTheme((t) => { theme = t; });
  const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;
  const mono = (dpr, px = 11) => `${px * dpr}px "IBM Plex Mono", monospace`;

  // ---------- inside the 3-sphere ----------
  const SETS = { cell600: '600-cell corners (120)', cell24: '24-cell corners (24)', cell120: '120-cell corners (600)', tesseract: 'tesseract corners (16)' };
  const w3 = { fov: 116, set: 'cell600', r: 0.09, both: true, walk: !reduceMotion, F: S.startFrame(), walked: 0, drag: null, keys: new Set(), V: null };
  const home = w3.F[0].slice();
  function objects() {
    if (!w3.V || w3.V.set !== w3.set) { const V = S4[w3.set]().V.map(S.norm); V.set = w3.set; w3.V = V; }
    return w3.V;
  }
  // a colour for each corner from where it sits in 4D, so it can be recognised from any side
  const hueOf = (p) => ((Math.atan2(p[1], p[0]) + Math.atan2(p[3], p[2]) * 0.5) * 180 / Math.PI + 720) % 360;
  function drawWalk() {
    const { c, w, h, dpr } = UI.canvas('s3-c'), F = w3.F, f = Math.max(w, h) / 2 / Math.tan((w3.fov * Math.PI) / 360), cx = w / 2, cy = h / 2;
    const dark = theme.bg && /^#0|^#1/.test(theme.bg);
    c.fillStyle = dark ? '#05060a' : '#0b0e18'; c.fillRect(0, 0, w, h);
    const list = [];
    const V = objects();
    for (let i = 0; i < V.length; i++) {
      const ims = S.images(F, V[i], w3.r);
      for (let k = 0; k < (w3.both ? 2 : 1); k++) list.push({ ...ims[k], hue: hueOf(V[i]), home: false, k });
    }
    const hi = S.images(F, home, w3.r * 1.6);
    for (let k = 0; k < (w3.both ? 2 : 1); k++) list.push({ ...hi[k], hue: 0, home: true, k });
    list.sort((a, b) => b.dist - a.dist);
    const LIM = 1.5, edge = Math.atan(Math.hypot(w, h) / 2 / f);
    let seen = 0;
    for (const o of list) {
      if (o.k === 0 && o.dist < (o.home ? w3.r * 1.6 : w3.r)) continue; // standing inside it
      const fog = clamp(1 - o.dist / (2 * Math.PI), 0.12, 1), sat = o.home ? 90 : 62, light = o.home ? 55 : 58;
      if (o.ang >= Math.PI - 1e-9) { c.fillStyle = hsl(o.hue, sat, light * fog, 0.9); c.fillRect(0, 0, w, h); seen++; continue; }
      const th = Math.acos(clamp(o.dir[0], -1, 1));
      if (th - o.ang > edge) continue;
      const lo = th - o.ang, hiA = Math.min(th + o.ang, LIM);
      if (lo >= LIM) continue;
      const t0 = Math.tan(Math.max(lo, -LIM)), t1 = Math.tan(hiA), rad = Math.max(0.6 * dpr, (f * (t1 - t0)) / 2), mid = (f * (t1 + t0)) / 2;
      const s = Math.hypot(o.dir[1], o.dir[2]), ux = s > 1e-9 ? o.dir[2] / s : 0, uy = s > 1e-9 ? o.dir[1] / s : 0;
      const x = cx + ux * mid, y = cy - uy * mid;
      if (x + rad < 0 || x - rad > w || y + rad < 0 || y - rad > h) continue;
      const g = c.createRadialGradient(x - rad * 0.35, y - rad * 0.35, rad * 0.05, x, y, rad);
      g.addColorStop(0, hsl(o.hue, sat - 20, Math.min(95, (light + 30) * fog + 10)));
      g.addColorStop(1, hsl(o.hue, sat, light * fog * 0.55));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill();
      if (o.home && rad > 6 * dpr) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = mono(dpr, 11); c.textAlign = 'center'; c.fillText(o.k ? 'home, the long way' : 'home', x, y + 4 * dpr); }
      seen++;
    }
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = dpr;
    c.beginPath(); c.moveTo(cx - 8 * dpr, cy); c.lineTo(cx + 8 * dpr, cy); c.moveTo(cx, cy - 8 * dpr); c.lineTo(cx, cy + 8 * dpr); c.stroke();
    const dHome = S.distance(F[0], home), hs = S.images(F, home, w3.r * 1.6)[0].ang;
    $('s3-v1').textContent = `${(w3.walked / Math.PI).toFixed(2)} π`;
    $('s3-v2').textContent = `${(dHome / Math.PI).toFixed(2)} π away, ${hs >= Math.PI - 1e-9 ? 'all around you' : (2 * hs * 180 / Math.PI).toFixed(1) + '° wide'}`;
    $('s3-v3').textContent = String(seen);
  }
  function step(dt) {
    let F = w3.F;
    const k = w3.keys, sp = 0.6 * dt, tr = 1.2 * dt;
    let moved = 0;
    if (w3.walk) moved += sp * 0.6;
    if (k.has('ArrowUp') || k.has('w')) moved += sp;
    if (k.has('ArrowDown') || k.has('s')) moved -= sp;
    if (k.has('ArrowLeft') || k.has('a')) F = S.turn(F, -tr);
    if (k.has('ArrowRight') || k.has('d')) F = S.turn(F, tr);
    if (moved) { F = S.walk(F, moved); w3.walked += moved; }
    w3.F = S.clean(F);
  }
  const cv = $('s3-c');
  cv.addEventListener('pointerdown', (e) => { w3.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.focus(); });
  cv.addEventListener('pointermove', (e) => {
    if (!w3.drag) return;
    w3.F = S.tilt(S.turn(w3.F, -(e.clientX - w3.drag.x) * 0.005), (e.clientY - w3.drag.y) * 0.005);
    w3.drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { w3.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { w3.keys.add(e.key); e.preventDefault(); } });
  cv.addEventListener('keyup', (e) => w3.keys.delete(e.key));
  cv.addEventListener('blur', () => w3.keys.clear());
  const hold = (id, key) => { const b = $(id); b.addEventListener('pointerdown', () => w3.keys.add(key)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => w3.keys.delete(key)); };
  hold('s3-fwd', 'ArrowUp'); hold('s3-back', 'ArrowDown'); hold('s3-left', 'ArrowLeft'); hold('s3-right', 'ArrowRight');
  const sel = $('s3-set'); sel.innerHTML = Object.entries(SETS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  sel.onchange = () => { w3.set = sel.value; };
  $('s3-r').oninput = () => { w3.r = +$('s3-r').value; $('s3-rv').textContent = w3.r.toFixed(2); };
  $('s3-fov').oninput = () => { w3.fov = +$('s3-fov').value; $('s3-fovv').textContent = w3.fov + '°'; };
  $('s3-both').onchange = () => { w3.both = $('s3-both').checked; };
  const wb = $('s3-play'), showW = () => { wb.textContent = w3.walk ? 'Stop' : 'Walk'; wb.setAttribute('aria-pressed', w3.walk); };
  wb.onclick = () => { w3.walk = !w3.walk; showW(); }; showW();
  $('s3-home').onclick = () => { w3.F = S.startFrame(); w3.walked = 0; };

  // ---------- Steiner's porism ----------
  const sp = { n: 7, k: 1, off: 0.45, nudge: 0, t: 0, play: !reduceMotion };
  function drawSteiner() {
    const { c, w, h, dpr } = UI.canvas('st-c'), R = Math.min(w, h) / 2 - 10 * dpr, cx = w / 2, cy = h / 2;
    const r = St.closingRadius(sp.n, sp.k) * (1 + sp.nudge), a = [sp.off, 0.12 * sp.off];
    const C = St.chain(sp.n, r, sp.t, a, sp.k), X = (z) => [cx + z[0] * R, cy - z[1] * R];
    const ring = (circ, stroke, fill, lw = 1.4) => { const p = X(circ.c); c.beginPath(); c.arc(p[0], p[1], circ.r * R, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw * dpr; c.stroke(); } };
    ring(C.outer, theme.fg, null, 1.6); ring(C.inner, theme.fg, null, 1.6);
    const closes = Math.abs(C.gap) < 1e-6;
    C.circles.forEach((ci, i) => {
      const bad = !closes && i === sp.n - 1;
      ring(ci, hsl(bad ? 0 : (i * 360) / sp.n, 70, bad ? 50 : 45), hsl(bad ? 0 : (i * 360) / sp.n, 70, 55, bad ? 0.35 : 0.22));
    });
    // inset: the concentric picture the inversion came from
    const iR = Math.min(w, h) * 0.14, ix = w - iR - 8 * dpr, iy = h - iR - 8 * dpr, rg = St.ring(sp.n, r, sp.t, sp.k);
    c.fillStyle = theme.panel; c.globalAlpha = 0.9; c.fillRect(ix - iR - 4 * dpr, iy - iR - 4 * dpr, 2 * iR + 8 * dpr, 2 * iR + 8 * dpr); c.globalAlpha = 1;
    c.strokeStyle = theme.muted; c.lineWidth = dpr;
    c.beginPath(); c.arc(ix, iy, iR, 0, 7); c.stroke(); c.beginPath(); c.arc(ix, iy, iR * r, 0, 7); c.stroke();
    rg.circles.forEach((ci, i) => { c.strokeStyle = hsl((i * 360) / sp.n, 70, 45); c.beginPath(); c.arc(ix + ci.c[0] * iR, iy - ci.c[1] * iR, ci.r * iR, 0, 7); c.stroke(); });
    c.fillStyle = theme.muted; c.font = mono(dpr, 9); c.textAlign = 'center'; c.fillText('before inversion', ix, iy - iR - 8 * dpr);
    $('stn-v1').textContent = r.toFixed(4);
    $('stn-v2').textContent = closes ? 'closes, from every start' : `${C.gap > 0 ? 'gap' : 'overlap'} of ${Math.abs(C.gap * 180 / Math.PI).toFixed(1)}°`;
  }
  const kMax = () => Math.max(1, Math.floor((sp.n - 1) / 2));
  function syncK() { $('stn-k').max = kMax(); sp.k = Math.min(sp.k, kMax()); $('stn-k').value = sp.k; $('stn-kv').textContent = sp.k; }
  $('stn-n').oninput = () => { sp.n = +$('stn-n').value; $('stn-nv').textContent = sp.n; syncK(); };
  $('stn-k').oninput = () => { sp.k = +$('stn-k').value; $('stn-kv').textContent = sp.k; };
  $('stn-off').oninput = () => { sp.off = +$('stn-off').value; };
  $('stn-nudge').oninput = () => { sp.nudge = +$('stn-nudge').value / 100; $('stn-nudgev').textContent = (sp.nudge >= 0 ? '+' : '') + (sp.nudge * 100).toFixed(1) + '%'; };
  $('stn-snap').onclick = () => { sp.nudge = 0; $('stn-nudge').value = 0; $('stn-nudgev').textContent = '+0.0%'; };
  const pb = $('stn-play'), showP = () => { pb.textContent = sp.play ? 'Pause' : 'Play'; pb.setAttribute('aria-pressed', sp.play); };
  pb.onclick = () => { sp.play = !sp.play; showP(); }; showP();

  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (!UI.shown('s-curved')) return;
    if (UI.visible('s3-c')) { step(dt); drawWalk(); }
    if (sp.play) sp.t += dt * 0.4;
    if (UI.visible('st-c')) drawSteiner();
  }
  syncK();
  UI.loop(frame);
})();
