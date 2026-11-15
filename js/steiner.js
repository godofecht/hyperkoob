// Steiner's porism. Between two circles, one inside the other, fit a chain of
// circles each touching both and its neighbours. If the chain closes up once,
// it closes up from every starting circle. Proof: an inversion makes the two
// circles concentric, where the chain is a ring that can simply turn.
(function (g) {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const conj = (a) => [a[0], -a[1]];
  // the disk's rigid motion taking a to 0: z -> (z - a) / (1 - conj(a) z)
  const move = (a) => (z) => div(sub(z, a), sub([1, 0], mul(conj(a), z)));
  // the circle through three points
  function circle3(p, q, r) {
    const ax = p[0], ay = p[1], bx = q[0], by = q[1], cx = r[0], cy = r[1];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d, uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    return { c: [ux, uy], r: Math.hypot(ax - ux, ay - uy) };
  }
  // a circle's image under a Mobius map, from three of its points
  function image(f, C) {
    const P = [0, 2.1, 4.2].map((t) => f([C.c[0] + C.r * Math.cos(t), C.c[1] + C.r * Math.sin(t)]));
    return circle3(P[0], P[1], P[2]);
  }
  // inner radius at which n circles close up after winding k times
  const closingRadius = (n, k = 1) => { const s = Math.sin((Math.PI * k) / n); return (1 - s) / (1 + s); };
  // The chain in the concentric picture: outer circle 1, inner circle r,
  // starting at angle t. `gap` is the angle left over after n circles;
  // zero when the chain closes.
  function ring(n, r, t, k = 1) {
    const R = (1 + r) / 2, c = (1 - r) / 2, step = 2 * Math.asin(Math.min(1, c / R)), out = [];
    for (let i = 0; i < n; i++) { const a = t + i * step; out.push({ c: [R * Math.cos(a), R * Math.sin(a)], r: c }); }
    return { circles: out, step, gap: 2 * Math.PI * k - n * step };
  }
  // The same chain after moving the centre to a: the outer circle stays the
  // unit circle, the inner one moves off centre, and every circle stays a circle.
  function chain(n, r, t, a, k = 1) {
    const f = move(a), R = ring(n, r, t, k);
    return { outer: { c: [0, 0], r: 1 }, inner: image(f, { c: [0, 0], r }), circles: R.circles.map((C) => image(f, C)), gap: R.gap };
  }
  g.Steiner = { move, circle3, image, closingRadius, ring, chain };
})(typeof window !== 'undefined' ? window : globalThis);
