// Standing inside the 3-sphere: the points of R^4 at distance 1 from the
// origin. Light runs along great circles, so every object is seen twice,
// once each way round, and things beyond a quarter turn away look bigger
// the farther they are: the antipode fills the whole sky.
(function (g) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const norm = (a) => { const n = Math.sqrt(dot(a, a)); return a.map((x) => x / n); };
  // A frame is four orthonormal rows: where you stand, ahead, up, right.
  function startFrame() {
    // a spot between the solids' corners, then Gram-Schmidt for the rest
    const rows = [norm([0.31, 0.47, -0.22, 0.79]), [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
    for (let i = 1; i < 4; i++) {
      let v = rows[i];
      for (let j = 0; j < i; j++) { const d = dot(v, rows[j]); v = v.map((x, k) => x - d * rows[j][k]); }
      rows[i] = norm(v);
    }
    return rows;
  }
  // turn rows i and j into each other by angle a
  function rotate(F, i, j, a) {
    const c = Math.cos(a), s = Math.sin(a), out = F.map((r) => r.slice());
    out[i] = F[i].map((x, k) => c * x + s * F[j][k]);
    out[j] = F[j].map((x, k) => -s * F[i][k] + c * x);
    return out;
  }
  const walk = (F, s) => rotate(F, 0, 1, s); // along the great circle ahead
  const turn = (F, a) => rotate(F, 1, 3, a); // ahead toward right
  const tilt = (F, a) => rotate(F, 1, 2, a); // ahead toward up
  // Re-orthonormalise, so rounding never builds up over a long walk.
  function clean(F) { return startFrameFrom(F); }
  function startFrameFrom(F) {
    const rows = [];
    for (let i = 0; i < 4; i++) { let v = F[i]; for (let j = 0; j < i; j++) { const d = dot(v, rows[j]); v = v.map((x, k) => x - d * rows[j][k]); } rows.push(norm(v)); }
    return rows;
  }
  // Where a ball of radius r centred at p appears: two images, each with a
  // direction (ahead, up, right), the distance light travels, and the
  // angular radius, from sin(angle) = sin r / sin(distance).
  function images(F, p, r) {
    const c = F.map((row) => dot(row, p)), rho = Math.acos(Math.max(-1, Math.min(1, c[0])));
    const s = Math.hypot(c[1], c[2], c[3]), d = s > 1e-12 ? [c[1] / s, c[2] / s, c[3] / s] : [1, 0, 0];
    const size = (dist) => { const k = Math.sin(r) / Math.abs(Math.sin(dist)); return k >= 1 ? Math.PI : Math.asin(k); };
    return [
      { dir: d, dist: rho, ang: size(rho) },
      { dir: [-d[0], -d[1], -d[2]], dist: 2 * Math.PI - rho, ang: size(rho) },
    ];
  }
  // Great-circle distance between two points.
  const distance = (p, q) => Math.acos(Math.max(-1, Math.min(1, dot(p, q))));
  g.Sphere3 = { dot, norm, startFrame, rotate, walk, turn, tilt, clean, images, distance };
})(typeof window !== 'undefined' ? window : globalThis);
