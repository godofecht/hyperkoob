// Two more Curved space cards: the Hopf fibration, and a first-person walk
// through space packed with cubes, 3, 4, 5 or 6 round every edge.
(function () {
  const Hf = window.Hopf, S = window.Space3;
  const $ = (id) => document.getElementById(id);
  if (!$('hf-c')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let theme = UI.theme;
  UI.onTheme((t) => { theme = t; });
  const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;
  const mono = (dpr, px = 11) => `${px * dpr}px "IBM Plex Mono", monospace`;
  const sl = (id, out, fmt, set) => { const el = $(id), f = () => { set(+el.value); if (out) $(out).textContent = fmt(+el.value); }; el.oninput = f; f(); };

  // ---------- the Hopf fibration ----------
  const hf = { plane: 'mix', kind: 'ring', n: 24, lat: 0.35, a: 0.6, play: !reduceMotion, flow: true, t: 0, yaw: 0.4, pitch: 0.5, drag: null, link: '', linkKey: '' };
  const HUE = (s) => ((Math.atan2(s[1], s[0]) * 180) / Math.PI + 360) % 360;
  function drawHopf() {
    const { c, w, h, dpr } = UI.canvas('hf-c'), cx = w / 2, cy = h / 2, f = Math.min(w, h) * 0.14, cam = 9;
    const base = Hf.base(hf.kind, hf.n, hf.lat, hf.t * 0.15);
    const cyw = Math.cos(hf.yaw), syw = Math.sin(hf.yaw), cp = Math.cos(hf.pitch), sp = Math.sin(hf.pitch);
    const V = (p) => { const x1 = cyw * p[0] + syw * p[1], y1 = -syw * p[0] + cyw * p[1]; return [x1, cp * p[2] - sp * y1, sp * p[2] + cp * y1]; };
    const segs = [], LIM = 7, NP = 120;
    base.forEach((s, k) => {
      const L = Hf.loop(s, NP, hf.a, hf.plane).map(V), hue = HUE(s), light = 50 + 18 * s[2];
      for (let i = 0; i < NP; i++) {
        const p = L[i], q = L[(i + 1) % NP];
        if (Math.hypot(...p) > LIM || Math.hypot(...q) > LIM) continue;
        segs.push([p, q, hue, light, k, i]);
      }
    });
    segs.sort((A, B) => A[0][2] + A[1][2] - B[0][2] - B[1][2]);
    const X = (p) => { const k = cam / (cam - p[2]); return [cx + p[0] * f * k, cy - p[1] * f * k, k]; };
    c.lineCap = 'round';
    for (const [p, q, hue, light, , i] of segs) {
      const a = X(p), b = X(q), z = (p[2] + q[2]) / 2, depth = clamp(0.5 + z / 8, 0.15, 1);
      const pulse = hf.flow ? 0.5 + 0.5 * Math.cos(((i / NP) * 2 * Math.PI) * 3 - hf.t * 3) : 1;
      c.strokeStyle = hsl(hue, 75, light * (0.55 + 0.45 * depth), 0.35 + 0.65 * depth * (0.55 + 0.45 * pulse));
      c.lineWidth = Math.max(0.7, 2.6 * a[2] * depth) * dpr;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    // the base sphere, with the points whose circles are drawn
    const r = Math.min(w, h) * 0.11, bx = r + 12 * dpr, by = h - r - 12 * dpr;
    c.fillStyle = theme.panel; c.globalAlpha = 0.85; c.beginPath(); c.arc(bx, by, r + 6 * dpr, 0, 7); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = theme.line; c.lineWidth = dpr; c.beginPath(); c.arc(bx, by, r, 0, 7); c.stroke();
    for (const s of base) {
      const p = V(s);
      c.fillStyle = hsl(HUE(s), 75, 50 + 18 * s[2], p[2] > 0 ? 1 : 0.35);
      c.beginPath(); c.arc(bx + p[0] * r, by - p[1] * r, (p[2] > 0 ? 3.2 : 2.2) * dpr, 0, 7); c.fill();
    }
    c.fillStyle = theme.muted; c.font = mono(dpr, 9); c.textAlign = 'center'; c.fillText('the sphere below', bx, by - r - 9 * dpr);
    // linking number of the first two circles, recomputed when they change
    const key = `${hf.plane}|${hf.kind}|${hf.n}|${hf.lat.toFixed(3)}|${Math.round(hf.t * 0.15 * 20)}|${hf.a.toFixed(2)}`;
    if (key !== hf.linkKey && base.length > 1) {
      hf.linkKey = key;
      const lk = Hf.linking(Hf.loop(base[0], 72, hf.a, hf.plane), Hf.loop(base[1], 72, hf.a, hf.plane));
      hf.link = Math.abs(lk).toFixed(2);
    }
    $('hf-v1').textContent = String(base.length);
    $('hf-v2').textContent = hf.link;
    $('hf-v3').textContent = { ring: 'a torus', rings: 'three nested tori', meridian: 'a torus through infinity', spiral: 'a spiral of tori' }[hf.kind];
  }
  const hc = $('hf-c');
  hc.addEventListener('pointerdown', (e) => { hf.drag = [e.clientX, e.clientY]; hc.setPointerCapture(e.pointerId); });
  hc.addEventListener('pointermove', (e) => { if (!hf.drag) return; hf.yaw += (e.clientX - hf.drag[0]) * 0.01; hf.pitch = clamp(hf.pitch + (e.clientY - hf.drag[1]) * 0.01, -1.5, 1.5); hf.drag = [e.clientX, e.clientY]; });
  for (const ev of ['pointerup', 'pointercancel']) hc.addEventListener(ev, () => { hf.drag = null; });
  $('hf-kind').onchange = () => { hf.kind = $('hf-kind').value; };
  sl('hf-n', 'hf-nv', (v) => String(v), (v) => { hf.n = v; });
  sl('hf-lat', 'hf-latv', (v) => `${v}°`, (v) => { hf.lat = (v * Math.PI) / 180; });
  sl('hf-a', 'hf-av', (v) => `${v}°`, (v) => { hf.a = (v * Math.PI) / 180; });
  $('hf-plane').onchange = () => { hf.plane = $('hf-plane').value; };
  $('hf-flow').onchange = () => { hf.flow = $('hf-flow').checked; };
  const hb = $('hf-play'), showH = () => { hb.textContent = hf.play ? 'Pause' : 'Play'; hb.setAttribute('aria-pressed', hf.play); };
  hb.onclick = () => { hf.play = !hf.play; showH(); }; showH();

  // ---------- walking among cubes ----------
  const REACH = { 3: 10, 4: 5.2, 5: 3.3, 6: 3.7 };
  const wk = { fov: 70, thick: 0.03, fog: 1, speed: 1, m: 5, H: {}, M: null, walk: !reduceMotion, walked: 0, keys: new Set(), drag: null };
  const honey = () => wk.H[wk.m] || (wk.H[wk.m] = S.honeycomb(wk.m, REACH[wk.m]));
  function start() {
    const K = honey().K;
    let M = S.I4();
    M = S.turn(S.tilt(M, 0.22), 0.38);
    M = S.strafe(K, M, 0.08);
    wk.M = M; wk.walked = 0; nearAt = 0;
  }
  const AXIS_HUE = [22, 190, 285];
  // the same as Space3.apply and Space3.depth, without the allocations, for thousands of edges a frame
  const ap = (M, v) => [0, 1, 2, 3].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2] + M[i][3] * v[3]);
  function depthOf(K, t, x, y, z) {
    const r2 = x * x + y * y + z * z;
    if (K === 0) return Math.sqrt(r2) / t;
    const q = t * t + K * r2, c = t / Math.sqrt(q);
    return K > 0 ? Math.acos(clamp(c, -1, 1)) : Math.acosh(Math.max(1, c));
  }
  let nearText = '', nearAt = 0;
  function drawWalk() {
    const { c, w, h, dpr } = UI.canvas('hw-c'), H = honey(), K = H.K, Mi = S.inverse(K, wk.M);
    const f = Math.max(w, h) / 2 / Math.tan((wk.fov * Math.PI) / 360), cx = w / 2, cy = h / 2;
    c.fillStyle = '#06070c'; c.fillRect(0, 0, w, h);
    const list = [], eps = 1e-3, rho = wk.thick;
    const images = K > 0 ? [1, -1] : [1];
    for (const e of H.edges) {
      const a = ap(Mi, e.a), b = ap(Mi, e.b);
      if (K <= 0 && a[3] <= eps * a[0] && b[3] <= eps * b[0]) continue; // wholly behind you
      let d = depthOf(K, a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]);
      for (const sg of images) {
        if (sg < 0) d = 2 * Math.PI - d;
        const A = [a[1] * sg, a[2] * sg, a[3] * sg], B = [b[1] * sg, b[2] * sg, b[3] * sg];
        const ga = A[2] - (K <= 0 ? eps * a[0] : eps), gb = B[2] - (K <= 0 ? eps * b[0] : eps);
        if (ga <= 0 && gb <= 0) continue;
        let P = A, Q = B;
        if (ga <= 0) { const s = ga / (ga - gb); P = A.map((x, i) => x + s * (B[i] - x)); }
        if (gb <= 0) { const s = ga / (ga - gb); Q = A.map((x, i) => x + s * (B[i] - x)); }
        list.push([P, Q, d, e.axis, sg]);
      }
    }
    list.sort((A, B) => B[2] - A[2]);
    const fogLen = (K < 0 ? 2.1 : K === 0 ? 4.5 : 9) * wk.fog;
    c.lineCap = 'round';
    let drawn = 0;
    for (const [P, Q, d, axis, sg] of list) {
      const x0 = cx + (f * P[0]) / P[2], y0 = cy - (f * P[1]) / P[2], x1 = cx + (f * Q[0]) / Q[2], y1 = cy - (f * Q[1]) / Q[2];
      if ((x0 < 0 && x1 < 0) || (x0 > w && x1 > w) || (y0 < 0 && y1 < 0) || (y0 > h && y1 > h)) continue;
      const sk = K === 0 ? d : Math.abs(S.sinK(K, d)), wid = clamp((f * rho) / Math.max(sk, 1e-3), 0.5 * dpr, 9 * dpr);
      const fog = Math.exp(-d / fogLen);
      c.strokeStyle = hsl(AXIS_HUE[axis], sg > 0 ? 70 : 45, 30 + 40 * fog, clamp(0.15 + 0.85 * fog, 0.08, 1));
      c.lineWidth = wid;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      drawn++;
    }
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = dpr;
    c.beginPath(); c.moveTo(cx - 7 * dpr, cy); c.lineTo(cx + 7 * dpr, cy); c.moveTo(cx, cy - 7 * dpr); c.lineTo(cx, cy + 7 * dpr); c.stroke();
    // readouts
    const p = [wk.M[0][0], wk.M[1][0], wk.M[2][0], wk.M[3][0]];
    const near = (R) => H.cells.filter((cl) => S.distance(K, cl.c, p) <= R).length;
    if (performance.now() - nearAt > 400) { nearAt = performance.now(); nearText = K > 0 ? 'all 8' : `${near(1.5)} within 1.5, ${near(2.5)} within 2.5`; }
    const ang = K === 0 ? 90 : (Math.acos(-K * S.sinK(K, H.r) ** 2) * 180) / Math.PI;
    $('hw-v1').textContent = `${H.name}, faces meet at ${ang.toFixed(1)}°`;
    $('hw-v2').textContent = nearText;
    $('hw-v3').textContent = `${wk.walked.toFixed(2)}${K > 0 ? ` (${(wk.walked / Math.PI).toFixed(2)} π)` : ''}`;
    $('hw-v4').textContent = String(drawn);
  }
  function stepWalk(dt) {
    const H = honey(), K = H.K, k = wk.keys, sp = 0.55 * dt * wk.speed, tr = 1.1 * dt;
    let M = wk.M, moved = 0;
    if (wk.walk) moved += sp * 0.55;
    if (k.has('ArrowUp') || k.has('w')) moved += sp;
    if (k.has('ArrowDown') || k.has('s')) moved -= sp;
    if (k.has('ArrowLeft') || k.has('a')) M = S.turn(M, -tr);
    if (k.has('ArrowRight') || k.has('d')) M = S.turn(M, tr);
    if (wk.walk && !k.size && !wk.drag) M = S.turn(M, dt * 0.06);
    if (moved) { M = S.walk(K, M, moved); wk.walked += Math.abs(moved); }
    wk.M = S.clean(K, S.recentre(H, M));
  }
  const cv = $('hw-c');
  cv.addEventListener('pointerdown', (e) => { wk.drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); cv.focus(); });
  cv.addEventListener('pointermove', (e) => {
    if (!wk.drag) return;
    wk.M = S.tilt(S.turn(wk.M, (e.clientX - wk.drag[0]) * 0.005), -(e.clientY - wk.drag[1]) * 0.005);
    wk.drag = [e.clientX, e.clientY];
  });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { wk.drag = null; });
  cv.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { wk.keys.add(e.key); e.preventDefault(); } });
  cv.addEventListener('keyup', (e) => wk.keys.delete(e.key));
  cv.addEventListener('blur', () => wk.keys.clear());
  const hold = (id, key) => { const b = $(id); b.addEventListener('pointerdown', () => wk.keys.add(key)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => wk.keys.delete(key)); };
  hold('hw-fwd', 'ArrowUp'); hold('hw-back', 'ArrowDown'); hold('hw-left', 'ArrowLeft'); hold('hw-right', 'ArrowRight');
  for (const b of document.querySelectorAll('#hw-m button')) b.onclick = () => {
    wk.m = +b.dataset.m; for (const o of document.querySelectorAll('#hw-m button')) o.setAttribute('aria-pressed', o === b); start();
  };
  const wb = $('hw-play'), showW = () => { wb.textContent = wk.walk ? 'Stop' : 'Walk'; wb.setAttribute('aria-pressed', wk.walk); };
  wb.onclick = () => { wk.walk = !wk.walk; showW(); }; showW();
  $('hw-home').onclick = start;
  sl('hw-fov', 'hw-fovv', (v) => `${v}°`, (v) => { wk.fov = v; });
  sl('hw-thick', 'hw-thickv', (v) => v.toFixed(3), (v) => { wk.thick = v; });
  sl('hw-fog', 'hw-fogv', (v) => `${v.toFixed(1)}×`, (v) => { wk.fog = v; });
  sl('hw-speed', 'hw-speedv', (v) => `${v.toFixed(1)}×`, (v) => { wk.speed = v; });
  start();

  let last = performance.now();
  UI.loop((now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (!UI.shown('s-curved')) return;
    if (hf.play) { hf.t += dt; hf.a = (hf.a + dt * 0.12) % (2 * Math.PI); const deg = Math.round((hf.a * 180) / Math.PI); $('hf-a').value = deg; $('hf-av').textContent = `${deg}°`; if (!hf.drag) hf.yaw += dt * 0.12; }
    if (UI.visible('hf-c')) drawHopf();
    if (UI.visible('hw-c')) { stepWalk(dt); drawWalk(); }
  });
})();
