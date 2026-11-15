// What a 4D eye sees. Our retina is a surface; theirs is a solid. Each of
// its points takes the light along one ray through the pupil, so the eye sees
// a whole 3D picture, inside and all. Here rays are traced through a small
// 4D scene. Pure maths; runs in Node too.
(function (g) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  // a turn by angle q in the plane of axes i and j
  function turn(i, j, q) {
    const M = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], c = Math.cos(q), s = Math.sin(q);
    M[i][i] = c; M[i][j] = -s; M[j][i] = s; M[j][j] = c;
    return M;
  }
  const mul = (A, B) => A.map((r) => [0, 1, 2, 3].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j] + r[3] * B[3][j]));
  const apply = (M, v) => M.map((r) => dot(r, v));
  const applyT = (M, v) => [0, 1, 2, 3].map((j) => M[0][j] * v[0] + M[1][j] * v[1] + M[2][j] * v[2] + M[3][j] * v[3]);

  // The eye sits on the w axis looking towards +w. A retina point (u, v, s)
  // in [-1, 1]^3 takes the ray with direction (u f, v f, s f, 1).
  const EYE = [0, 0, 0, -4.2];
  const ray = (u, v, s, f) => { const d = [u * f, v * f, s * f, 1], n = Math.sqrt(dot(d, d)); return d.map((x) => x / n); };

  // A tesseract with half-side h, turned by R about its centre c. Returns the
  // distance along the ray and which of its 8 cells was hit, or null.
  function hitBox(o, d, box) {
    const p = applyT(box.R, o.map((x, i) => x - box.c[i])), q = applyT(box.R, d);
    let t0 = -Infinity, t1 = Infinity, face = -1;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(q[i]) < 1e-12) { if (Math.abs(p[i]) > box.h) return null; continue; }
      let a = (-box.h - p[i]) / q[i], b = (box.h - p[i]) / q[i], f = 2 * i;
      if (a > b) { const k = a; a = b; b = k; f = 2 * i + 1; }
      if (a > t0) { t0 = a; face = f; }
      t1 = Math.min(t1, b);
      if (t0 > t1) return null;
    }
    if (t1 < 0) return null;
    const ax = face >> 1, sg = face & 1 ? 1 : -1, nl = [0, 0, 0, 0]; nl[ax] = sg;
    return { t: t0, cell: face, n: apply(box.R, nl) };
  }
  // a 4D ball, the glome
  function hitBall(o, d, ball) {
    const m = o.map((x, i) => x - ball.c[i]), b = dot(m, d), c = dot(m, m) - ball.r * ball.r, D = b * b - c;
    if (D < 0) return null;
    const t = -b - Math.sqrt(D);
    if (t < 0) return null;
    const n = o.map((x, i) => (x + t * d[i] - ball.c[i]) / ball.r);
    return { t, n };
  }
  // The 8 cells of the tesseract, by the axis they face along: -x, +x, -y, ...
  // Hue by axis (x red, y green, z blue, w gold); the minus side is darker.
  const CELL_HUE = [5, 5, 135, 135, 215, 215, 45, 45];
  const CELL_DARK = [0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1];
  const LIGHT = (() => { const l = [-0.5, 0.7, -0.35, -0.45], n = Math.sqrt(dot(l, l)); return l.map((x) => x / n); })();
  // Trace one ray: what colour (hue, lightness 0..1) it brings back, or null.
  function trace(scene, d) {
    let best = null;
    for (const ob of scene) {
      const h = ob.kind === 'box' ? hitBox(EYE, d, ob) : hitBall(EYE, d, ob);
      if (h && (!best || h.t < best.t)) best = { ...h, ob };
    }
    if (!best) return null;
    const lit = 0.4 + 0.6 * Math.max(0, dot(best.n, LIGHT));
    const hue = best.ob.kind === 'box' ? CELL_HUE[best.cell] : best.ob.hue;
    return { hue, lit: best.ob.kind === 'box' ? lit * CELL_DARK[best.cell] : lit, t: best.t, cell: best.cell };
  }
  // The scene at angle a of its turn: which objects and in which plane.
  // With wobble, the tilt into w sways as it turns, so it is rarely seen square on.
  function scene(kind, plane, a, wobble = false) {
    const P = { xw: [0, 3], yw: [1, 3], zw: [2, 3], xy: [0, 1] }[plane] || [0, 3];
    // A fixed tilt into w, applied after the turn, so the eye always looks at
    // the tesseract corner on and sees several cells; wobble sways the tilt.
    const T = mul(turn(1, 3, 0.5 + (wobble ? 0.25 * Math.sin(a * 1.3) : 0)), turn(2, 3, 0.38 + (wobble ? 0.2 * Math.cos(a * 0.7) : 0)));
    const R = mul(turn(1, 2, 0.45), mul(T, turn(P[0], P[1], a)));
    const out = [];
    if (kind !== 'ball') out.push({ kind: 'box', c: kind === 'both' ? [-0.75, 0, 0, 0.6] : [0, 0, 0, 0], h: 0.7, R });
    if (kind !== 'box') out.push({ kind: 'ball', c: kind === 'both' ? [0.95, 0.15, 0, 0.9 + 0.6 * Math.sin(a)] : [0, 0, 0, 0], r: 0.8, hue: 290 });
    return out;
  }
  g.Eye4 = { dot, turn, mul, apply, EYE, ray, hitBox, hitBall, trace, scene, CELL_HUE, CELL_DARK, LIGHT };
})(typeof window !== 'undefined' ? window : globalThis);
