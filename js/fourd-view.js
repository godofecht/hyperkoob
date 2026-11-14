// "What a fourth dimension could do to you": four animated demos drawn on
// one canvas. Geometry lives in fourd.js.
(function () {
  const F = window.FourD;
  const $ = (id) => document.getElementById(id);
  const cv = $('c4');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (u, a, b) => smooth((u - a) / (b - a));

  const DEMOS = {
    reach: { secs: 20, name: 'Reach inside', sub: 'a sealed box, and the inset shows w',
      text: 'A tesseract drifts along w through our space. Its slice appears inside the sealed box from nothing, changes shape and vanishes. Then the key is lifted a little way in w, which takes it out of our space altogether, and set down outside. The box is never opened.' },
    mirror: { secs: 14, name: 'Mirror you', sub: 'colour shows w: blue below, orange above',
      text: 'The hand turns in the plane of x and w. It trades its x for w, so in our space it flattens, then comes back the other way round. Every length in the hand stays fixed in 4D. A half turn makes a right hand into a left hand, which no turn in 3D can do.' },
    see: { secs: 13, name: 'See inside you', sub: 'a world one dimension down',
      text: 'This creature lives in a plane. Its neighbour, looking from outside, sees only the wall of the house: the strip at the bottom. From above you see every organ inside its closed body. A finger from above touches its heart without breaking its skin. A 4D eye would look at you the way you look at this page.' },
  };
  const st = { demo: 'reach', t: 0, play: !reduceMotion, spin: !reduceMotion, yaw: 0.6, pitch: 0.32, drag: null, visible: false };

  let theme = {};
  function readTheme() {
    theme = UI.theme;
  }
  const hsl = (h, a, dl = 0, s) => `hsla(${h}, ${s || theme.es}, ${clamp(theme.el + dl, 8, 92)}%, ${a})`;
  // w as colour: blue below, grey at zero, orange above
  const wColor = (w, a, dl = 0) => { const k = clamp(Math.abs(w), 0, 1); return `hsla(${w < 0 ? 215 : 25}, ${Math.round(10 + 75 * k)}%, ${clamp(theme.el + dl, 8, 92)}%, ${a})`; };

  const sizeCanvas = () => UI.fit(cv);
  function camera(w, h, scale, cy = 0) {
    const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const rot = (p) => { const x1 = ca * p[0] + sa * p[2], z1 = -sa * p[0] + ca * p[2]; return [x1, cp * p[1] - sp * z1, sp * p[1] + cp * z1]; };
    const camD = 14, sc = Math.min(w, h) * scale;
    const proj = (q) => { const k = camD / (camD - q[2]); return [w / 2 + q[0] * sc * k, h / 2 + cy * h - q[1] * sc * k]; };
    return { rot, proj, eye: [0, 0, camD], sc };
  }
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); }
  const LIGHT = (() => { const l = [-0.4, 0.6, 0.7], n = Math.hypot(...l); return l.map((x) => x / n); })();

  function setStats(rows) { rows.forEach(([l, v], i) => { $('fd-l' + (i + 1)).textContent = l; $('fd-v' + (i + 1)).textContent = v; }); }

  // ---------- reach inside ----------
  const B = 1.75, L = 1.5, KEY_IN = [0.85, -1.05, 0.55], KEY_OUT_X = 2.75;
  // what passes through the box, and which way it comes
  const rc = { obj: 'tesseract', how: 'corner', tilt: [0, 0, 0], cache: null };
  function reachShape() {
    const key = rc.obj + rc.how + rc.tilt.join();
    if (rc.cache && rc.cache.key === key) return rc.cache;
    const S4 = window.Solids4;
    let out;
    if (rc.obj === 'ball' || !S4) out = { key, ball: true, lo: -L, hi: L, n: [0, 0, 0, 1] };
    else {
      const M0 = S4.OBJECTS[rc.obj].make(), M = { V: M0.V.map((v) => v.map((x) => x * L)), E: M0.E };
      let n = S4.approach(M, rc.how);
      const R = S4.rotation([0, 0, (rc.tilt[0] * Math.PI) / 180, 0, (rc.tilt[1] * Math.PI) / 180, (rc.tilt[2] * Math.PI) / 180]);
      n = S4.apply(R, n);
      const fr = S4.frameFor(n), along = M.V.map((v) => v.reduce((a, x, i) => a + x * fr.n[i], 0));
      // the solid's shadow on the plane of x and w, for the inset
      const pts2 = M.V.map((v, i) => [v.reduce((a, x, k) => a + x * fr.basis[0][k], 0), along[i]]);
      out = { key, M, n: fr.n, basis: fr.basis, lo: Math.min(...along), hi: Math.max(...along), hull2: hull2(pts2) };
    }
    rc.cache = out; return out;
  }
  function hull2(P) {
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.slice().reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  const OBJ_NAMES = { tesseract: 'tesseract', cell5: '5-cell', cell16: '16-cell', cell24: '24-cell', cell600: '600-cell', cell120: '120-cell', ball: '4D ball' };
  function reachState(u) {
    const sh = reachShape(), pad = (sh.hi - sh.lo) * 0.02;
    const tt = lerp(sh.lo - pad, sh.hi + pad, clamp(u / 0.5, 0, 1));
    let kx = KEY_IN[0], kw = 0;
    if (u > 0.52 && u < 0.66) { const f = (u - 0.52) / 0.14; kx = lerp(KEY_IN[0], KEY_OUT_X, smooth(f)); kw = Math.sin(Math.PI * f); }
    else if (u >= 0.66 && u <= 0.84) kx = KEY_OUT_X;
    else if (u > 0.84 && u < 0.98) { const f = (u - 0.84) / 0.14; kx = lerp(KEY_OUT_X, KEY_IN[0], smooth(f)); kw = Math.sin(Math.PI * f); }
    return { tt, kx, kw, slicing: u <= 0.5 };
  }
  function drawReach(c, w, h, dpr) {
    const u = st.t, S = reachState(u);
    const cam = camera(w, h, 0.13, -0.06), { rot, proj, eye } = cam;
    const sh = reachShape();
    let H = { V: [], faces: [] }, ballR = 0;
    if (S.slicing && sh.ball) ballR = Math.sqrt(Math.max(0, L * L - S.tt * S.tt));
    else if (S.slicing) { const pts = window.Solids4.sliceAt(sh.M, sh.n, S.tt, sh.basis); if (pts.length >= 4) H = F.hull3(pts); else H = { V: pts, faces: [] }; }
    const items = [];
    // the box: six faces, translucent
    const cube = [];
    for (let m = 0; m < 8; m++) cube.push([m & 1 ? B : -B, m & 2 ? B : -B, m & 4 ? B : -B]);
    const boxFaces = [[0, 1, 3, 2, [0, 0, -1]], [4, 5, 7, 6, [0, 0, 1]], [0, 1, 5, 4, [0, -1, 0]], [2, 3, 7, 6, [0, 1, 0]], [0, 2, 6, 4, [-1, 0, 0]], [1, 3, 7, 5, [1, 0, 0]]];
    for (const f of boxFaces) {
      const P = f.slice(0, 4).map((i) => rot(cube[i])), n = rot(f[4]);
      const front = dot3(n, sub3(eye, P[0])) > 0;
      items.push({ z: front ? 1e3 : -1e3, draw: () => { poly(c, P.map(proj)); c.fillStyle = hsl(220, front ? 0.05 : 0.08, 10); c.fill(); c.strokeStyle = theme.muted; c.lineWidth = 1.2 * dpr; c.stroke(); } });
    }
    // the slice of the tesseract
    const V = H.V.map(rot);
    for (const f of H.faces) {
      const n = rot(f.n), P = f.idx.map((i) => V[i]);
      if (dot3(n, sub3(eye, P[0])) <= 0) continue;
      const lit = dot3(n, LIGHT);
      items.push({ z: P.reduce((a, p) => a + p[2], 0) / P.length, draw: () => { poly(c, P.map(proj)); c.fillStyle = hsl(285, 0.92, lit * 18 - 6); c.fill(); c.strokeStyle = theme.panel; c.lineWidth = dpr; c.stroke(); } });
    }
    if (ballR > 0) {
      const p = rot([0, 0, 0]), sp = proj(p), r = ballR * cam.sc * (14 / (14 - p[2]));
      items.push({ z: 0, draw: () => { const gr = c.createRadialGradient(sp[0] - r * 0.35, sp[1] - r * 0.35, r * 0.1, sp[0], sp[1], r); gr.addColorStop(0, hsl(285, 1, 22)); gr.addColorStop(1, hsl(285, 1, -14)); c.fillStyle = gr; c.beginPath(); c.arc(sp[0], sp[1], r, 0, 7); c.fill(); } });
    }
    // the key: in our space only when its w is zero
    if (Math.abs(S.kw) < 1e-3) {
      const p = rot([S.kx, KEY_IN[1], KEY_IN[2]]), sp = proj(p), r = 0.26 * cam.sc * (14 / (14 - p[2]));
      items.push({ z: p[2], draw: () => {
        const gr = c.createRadialGradient(sp[0] - r * 0.35, sp[1] - r * 0.35, r * 0.1, sp[0], sp[1], r);
        gr.addColorStop(0, 'hsl(48, 95%, 78%)'); gr.addColorStop(1, 'hsl(40, 85%, 42%)');
        c.fillStyle = gr; c.beginPath(); c.arc(sp[0], sp[1], r, 0, 7); c.fill();
      } });
    }
    items.sort((a, b) => a.z - b.z).forEach((it) => it.draw());

    // inset: x across, w up. Our space is the line w = 0.
    const iw = Math.min(w * 0.36, 300 * dpr), ih = iw * 0.62, ix = 12 * dpr, iy = h - ih - 34 * dpr;
    c.fillStyle = theme.panel; c.strokeStyle = theme.line; c.lineWidth = dpr;
    c.fillRect(ix, iy, iw, ih); c.strokeRect(ix, iy, iw, ih);
    const X = (x) => ix + iw / 2 + (x / 3.4) * (iw / 2), Y = (wv) => iy + ih / 2 - (wv / 2.2) * (ih / 2);
    c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(ix + 6 * dpr, Y(0)); c.lineTo(ix + iw - 6 * dpr, Y(0)); c.stroke();
    c.strokeStyle = theme.fg; c.lineWidth = 3 * dpr;
    for (const x of [-B, B]) { c.beginPath(); c.moveTo(X(x), Y(0) - 6 * dpr); c.lineTo(X(x), Y(0) + 6 * dpr); c.stroke(); }
    // the solid's shadow on the plane of x and w, moving down through our line
    if (S.slicing || u < 0.52) {
      c.strokeStyle = hsl(285, 1); c.fillStyle = hsl(285, 0.18); c.lineWidth = 1.5 * dpr; c.beginPath();
      if (sh.ball) c.arc(X(0), Y(-S.tt), (L / 3.4) * (iw / 2), 0, 7);
      else sh.hull2.forEach((q, i) => (i ? c.lineTo(X(q[0]), Y(q[1] - S.tt)) : c.moveTo(X(q[0]), Y(q[1] - S.tt))));
      c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = 'hsl(44, 90%, 50%)'; c.beginPath(); c.arc(X(S.kx), Y(S.kw * 1.3), 4 * dpr, 0, 7); c.fill();
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
    c.textAlign = 'right'; c.fillText('our space, w = 0', ix + iw - 8 * dpr, Y(0) - 8 * dpr); c.textAlign = 'left';
    c.fillText('w', ix + 8 * dpr, iy + 14 * dpr);
    c.textAlign = 'right'; c.fillText('box walls', X(B) + 4 * dpr, Y(0) + 18 * dpr);

    const oname = OBJ_NAMES[rc.obj] || rc.obj;
    const name = !S.slicing ? 'gone' : sh.ball ? (ballR > 0 ? `a ball of radius ${ballR.toFixed(2)}` : 'a point') : H.faces.length ? F.sliceName(H.V.length, H.faces.map((f) => f.idx.length)) : F.sliceName(H.V.length);
    $('fd-foot').textContent = S.slicing ? `the ${oname}'s slice: ${name}` : Math.abs(S.kw) > 1e-3 ? 'the key is lifted in w: it is nowhere in our space' : S.kx > B ? 'the key is outside. The box was never opened.' : 'the key is back inside';
    setStats([
      [`Slice of the ${oname}`, S.slicing ? name : 'nothing'],
      ['Where our slice meets it', S.slicing ? `${(((S.tt - sh.lo) / (sh.hi - sh.lo)) * 100).toFixed(0)}% of the way through` : 'past it'],
      ['The key', Math.abs(S.kw) > 1e-3 ? 'not in our space' : S.kx > B ? 'outside the box' : 'inside the box'],
    ]);
  }

  // ---------- mirror you ----------
  const mr = { axis: 0 };
  function mirrorAngle(u) { return u < 0.12 ? 0 : u < 0.5 ? Math.PI * ramp(u, 0.12, 0.5) : u < 0.76 ? Math.PI : u < 0.95 ? Math.PI * (1 - ramp(u, 0.76, 0.95)) : 0; }
  function drawMirror(c, w, h, dpr) {
    const th = mirrorAngle(st.t), cam = camera(w, h, 0.17, -0.02), { rot, proj, eye } = cam;
    const items = [];
    const addHand = (shift, theta, ghost) => {
      for (const bx of F.HAND) {
        const C4 = [];
        for (let m = 0; m < 8; m++) C4.push(F.turnXW([m & 1 ? bx[3] : bx[0], m & 2 ? bx[4] : bx[1], m & 4 ? bx[5] : bx[2]], theta, mr.axis));
        const P = C4.map((p) => rot([p[0] + shift, p[1], p[2]]));
        const ctr = [0, 1, 2].map((k) => P.reduce((a, p) => a + p[k], 0) / 8);
        const quads = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
        for (const q of quads) {
          const Q = q.map((i) => P[i]), fc = [0, 1, 2].map((k) => Q.reduce((a, p) => a + p[k], 0) / 4);
          let n = cross(sub3(Q[1], Q[0]), sub3(Q[3], Q[0]));
          const ln = Math.hypot(...n);
          if (ln > 1e-9) { n = n.map((x) => x / ln); if (dot3(n, sub3(fc, ctr)) < 0) n = n.map((x) => -x); if (dot3(n, sub3(eye, fc)) <= 0) continue; }
          const wv = q.reduce((a, i) => a + C4[i][3], 0) / 4, lit = ln > 1e-9 ? dot3(n, LIGHT) : 0;
          items.push({ z: fc[2], draw: () => {
            poly(c, Q.map(proj));
            if (ghost) { c.strokeStyle = theme.muted; c.lineWidth = dpr; c.setLineDash([3 * dpr, 3 * dpr]); c.stroke(); c.setLineDash([]); return; }
            c.fillStyle = wColor(wv / 1.15, 1, lit * 16 - 2); c.fill(); c.strokeStyle = theme.panel; c.lineWidth = 0.8 * dpr; c.stroke();
          } });
        }
      }
    };
    addHand(-1.2, th, false);
    addHand(1.9, 0, true);
    items.sort((a, b) => a.z - b.z).forEach((it) => it.draw());
    const label = (p, s) => { const q = proj(rot(p)); c.fillStyle = theme.muted; c.font = `${12 * dpr}px "IBM Plex Sans", sans-serif`; c.textAlign = 'center'; c.fillText(s, q[0], q[1]); };
    label([1.6, -2.0, 0], 'a right hand, for comparison');
    const hd = F.handedness(th, mr.axis);
    label([-1.5, -2.0, 0], hd > 0 ? 'right hand' : hd < 0 ? 'left hand' : 'flat in our space');
    $('fd-foot').textContent = hd > 0 && th > 0.01 ? 'turning through the fourth dimension' : hd < 0 && th > Math.PI - 0.01 ? 'a left hand. Nothing was bent or cut.' : hd < 0 ? 'coming back the other way round' : hd === 0 ? 'flat: all of its x is in w' : 'a right hand';
    setStats([
      [`Turn in the ${'xyz'[mr.axis]}-w plane`, `${Math.round((th * 180) / Math.PI)} degrees`],
      ['In our space', hd > 0 ? 'right hand' : hd < 0 ? 'left hand' : 'flat'],
      ['Lengths in 4D', 'unchanged'],
    ]);
  }

  // ---------- see inside you ----------
  function drawSee(c, w, h, dpr) {
    const W = F.FLAT, u = st.t;
    const top = h * 0.08, bottom = h * 0.72, left = w * 0.04, right = w * 0.96;
    const sx = (right - left) / 11.5, sy = (bottom - top) / 6.6, sc = Math.min(sx, sy);
    const ox = (left + right) / 2 + 1.6 * sc, oy = (top + bottom) / 2;
    const X = (p) => ox + p[0] * sc, Y = (p) => oy - p[1] * sc;
    // the finger: a ball from above, cutting the plane in a circle
    const Rf = 0.62, hgt = lerp(1.0, -1.0, ramp(u, 0.18, 0.82)), rr = Math.abs(hgt) < Rf ? Math.sqrt(Rf * Rf - hgt * hgt) : 0;
    const heart = W.organs[0];
    // the viewer's rays
    const rays = F.retina(90), v = W.viewer, base = Math.atan2(v.look[1], v.look[0]);
    c.strokeStyle = theme.line; c.lineWidth = dpr;
    rays.forEach((r, i) => { if (i % 6) return; const a = base + (i / 89 - 0.5) * v.fov, e = [v.c[0] + Math.cos(a) * r.dist, v.c[1] + Math.sin(a) * r.dist]; c.beginPath(); c.moveTo(X(v.c), Y(v.c)); c.lineTo(X(e), Y(e)); c.stroke(); });
    // house
    poly(c, W.house.map((p) => [X(p), Y(p)])); c.fillStyle = hsl(30, 0.08); c.fill(); c.strokeStyle = hsl(28, 1, -12, '45%'); c.lineWidth = 6 * dpr; c.stroke();
    // body and organs
    const pulse = rr > 0 ? 1 + 0.18 * Math.sin(performance.now() / 90) * (rr / Rf) : 1;
    c.fillStyle = hsl(140, 0.35, 10); c.strokeStyle = hsl(140, 1, -15); c.lineWidth = 3 * dpr;
    c.beginPath(); c.arc(X(W.body.c), Y(W.body.c), W.body.r * sc, 0, 7); c.fill(); c.stroke();
    for (const o of W.organs) {
      const r = o.r * sc * (o === heart ? pulse : 1);
      c.fillStyle = hsl(o.hue, 0.9, o.name === 'eye' ? 10 : 0); c.beginPath(); c.arc(X(o.c), Y(o.c), r, 0, 7); c.fill();
    }
    if (rr > 0) {
      const p = [heart.c[0] + 0.18, heart.c[1] + 0.12];
      c.fillStyle = 'hsla(330, 70%, 60%, 0.55)'; c.strokeStyle = 'hsl(330, 70%, 40%)'; c.lineWidth = 2 * dpr;
      c.beginPath(); c.arc(X(p), Y(p), rr * sc, 0, 7); c.fill(); c.stroke();
    }
    // the neighbour outside
    c.fillStyle = hsl(260, 0.45, 10); c.strokeStyle = hsl(260, 1, -15); c.lineWidth = 3 * dpr;
    c.beginPath(); c.arc(X(v.c), Y(v.c), 0.55 * sc, 0, 7); c.fill(); c.stroke();
    c.fillStyle = theme.fg; c.beginPath(); c.arc(X([v.c[0] + 0.32, v.c[1]]), Y(v.c), 0.12 * sc, 0, 7); c.fill();
    c.fillStyle = theme.muted; c.font = `${12 * dpr}px "IBM Plex Sans", sans-serif`; c.textAlign = 'center';
    c.fillText('the neighbour', X(v.c), Y([0, v.c[1] - 0.95]));
    c.fillText('a closed house', X([0, 2.65]), Y([0, 2.65]));
    // side inset: the plane edge-on, and the ball coming down through it
    const iw = Math.min(w * 0.22, 190 * dpr), ih = iw * 0.8, ix = w - iw - 12 * dpr, iy = 12 * dpr;
    c.fillStyle = theme.panel; c.strokeStyle = theme.line; c.lineWidth = dpr; c.fillRect(ix, iy, iw, ih); c.strokeRect(ix, iy, iw, ih);
    const IX = (x) => ix + iw / 2 + x * iw * 0.28, IY = (z) => iy + ih / 2 - z * ih * 0.3;
    c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(ix + 6 * dpr, IY(0)); c.lineTo(ix + iw - 6 * dpr, IY(0)); c.stroke();
    c.strokeStyle = hsl(140, 1, -15); c.lineWidth = 5 * dpr; c.beginPath(); c.moveTo(IX(-1.25), IY(0)); c.lineTo(IX(1.25), IY(0)); c.stroke();
    c.fillStyle = 'hsla(330, 70%, 60%, 0.55)'; c.beginPath(); c.arc(IX(0), IY(hgt), Rf * iw * 0.28, 0, 7); c.fill();
    c.fillStyle = theme.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
    c.fillText('their plane, edge on', ix + 6 * dpr, iy + ih - 8 * dpr);
    // what the neighbour sees: one row of colour
    const ry = h * 0.8, rh = 22 * dpr, rx = w * 0.08, rw = w * 0.84, R = F.retina(160);
    R.forEach((r, i) => {
      const k = clamp(1 - (r.dist - 3) / 7, 0.2, 1);
      c.fillStyle = r.what === 'wall' ? `hsl(28, 40%, ${Math.round(18 + 34 * k)}%)` : theme.bg;
      c.fillRect(rx + (i * rw) / R.length, ry, rw / R.length + 1, rh);
    });
    c.strokeStyle = theme.line; c.strokeRect(rx, ry, rw, rh);
    c.fillStyle = theme.muted; c.font = `${11 * dpr}px "IBM Plex Sans", sans-serif`; c.textAlign = 'left';
    c.fillText('what the neighbour sees: a strip of wall, nothing more', rx, ry - 6 * dpr);
    $('fd-foot').textContent = rr > 0 ? 'the finger is inside the body, touching the heart' : hgt > 0 ? 'a finger from above, not yet in their plane' : 'gone again, and the skin is whole';
    setStats([
      ['The finger, in their plane', rr > 0 ? `a circle, radius ${rr.toFixed(2)}` : 'nothing'],
      ['The neighbour sees', 'only the wall'],
      ['Skin or walls broken', 'none'],
    ]);
  }

  const DRAW = { reach: drawReach, mirror: drawMirror, see: drawSee };
  // Other files add demos here: knots, the maze and the Hopf fibration.
  const HOOKS = {};
  window.FourDView = {
    register(id, spec) { DEMOS[id] = spec; DRAW[id] = spec.draw; HOOKS[id] = spec; if (st.demo === id) setDemo(id); },
    st, camera, wColor, hsl, poly, setStats, dot3, cross, sub3, LIGHT, theme: () => theme, clamp, smooth, lerp, ramp,
  };

  function setDemo(d) {
    if (!DEMOS[d]) return;
    st.demo = d; st.t = 0;
    for (const b of document.querySelectorAll('#fd-demo button')) b.setAttribute('aria-pressed', b.dataset.demo === d);
    $('fd-cap').textContent = DEMOS[d].name; $('fd-sub').textContent = DEMOS[d].sub; $('fd-text').textContent = DEMOS[d].text;
    $('fd-spin').hidden = d === 'see';
    $('fd-trow').hidden = DEMOS[d].timed === false;
    for (const el of document.querySelectorAll('.fd-opts')) el.hidden = el.dataset.for !== d;
    cv.classList.toggle('orbit', d !== 'see');
    if (HOOKS[d] && HOOKS[d].onShow) HOOKS[d].onShow();
  }
  for (const b of document.querySelectorAll('#fd-demo button')) b.onclick = () => setDemo(b.dataset.demo);
  if ($('rc-obj')) {
    $('rc-obj').addEventListener('change', (e) => { rc.obj = e.target.value; $('rc-howrow').hidden = rc.obj === 'ball'; });
    for (const b of document.querySelectorAll('#rc-how button')) b.onclick = () => { rc.how = b.dataset.h; for (const o of document.querySelectorAll('#rc-how button')) o.setAttribute('aria-pressed', o === b); };
    [0, 1, 2].forEach((k) => $('rc-t' + k).addEventListener('input', () => { rc.tilt[k] = +$('rc-t' + k).value; $('rc-tv' + k).textContent = rc.tilt[k] + '°'; }));
    for (const b of document.querySelectorAll('#mr-axis button')) b.onclick = () => { mr.axis = +b.dataset.a; for (const o of document.querySelectorAll('#mr-axis button')) o.setAttribute('aria-pressed', o === b); };
  }
  const playBtn = $('fd-play'), tIn = $('fd-t');
  const showPlay = () => { playBtn.setAttribute('aria-pressed', st.play); playBtn.textContent = st.play ? 'Pause' : 'Play'; };
  playBtn.onclick = () => { st.play = !st.play; showPlay(); };
  tIn.addEventListener('input', () => { st.t = +tIn.value; st.play = false; showPlay(); });
  $('fd-spin').onclick = () => { st.spin = !st.spin; $('fd-spin').setAttribute('aria-pressed', st.spin); };
  $('fd-spin').setAttribute('aria-pressed', st.spin);
  cv.addEventListener('pointerdown', (e) => { if (st.demo === 'see') return; st.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!st.drag) return;
    st.yaw += (e.clientX - st.drag.x) * 0.008; st.pitch = clamp(st.pitch + (e.clientY - st.drag.y) * 0.008, -1.4, 1.4);
    st.drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { st.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  new IntersectionObserver((es) => es.forEach((e) => { st.visible = e.isIntersecting; })).observe(cv);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.visible) {
      if (st.play && DEMOS[st.demo].timed !== false) { st.t = (st.t + dt / DEMOS[st.demo].secs) % 1; tIn.value = st.t; }
      if (st.spin && !st.drag && st.demo !== 'see') st.yaw += dt * 0.15;
      const { w, h, dpr } = sizeCanvas();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
      DRAW[st.demo](ctx, w, h, dpr);
    }
  }
  UI.onTheme(readTheme);
  setDemo('reach'); showPlay();
  UI.loop(frame);
})();
