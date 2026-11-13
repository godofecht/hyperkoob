// Tilings of the sphere, the plane and the hyperbolic plane by regular
// p-gons, q at each corner: the {p, q} tilings.
//
// 1/p + 1/q > 1/2: the sphere (the Platonic solids). = 1/2: the plane.
// < 1/2: the hyperbolic plane. Points live in one complex coordinate z: the
// stereographic view of the sphere, the plane itself, or the Poincare disk.
// In each, z -> (z - a) / (1 - k conj(a) z) moves a to 0 rigidly, with k =
// -1, 0, 1; through 0 every geodesic is a straight line, which makes
// reflections and edges simple.
(function (g) {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const conj = (a) => [a[0], -a[1]], abs = (a) => Math.hypot(a[0], a[1]);
  const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const sc = (a, s) => [a[0] * s, a[1] * s];

  function kind(p, q) { const s = 1 / p + 1 / q; return Math.abs(s - 0.5) < 1e-12 ? 'plane' : s > 0.5 ? 'sphere' : 'hyperbolic'; }
  const K = { sphere: -1, plane: 0, hyperbolic: 1 };
  // distance from a tile's centre to its corners, in the model's coordinate
  function cornerRadius(p, q) {
    const k = kind(p, q), c = 1 / (Math.tan(Math.PI / p) * Math.tan(Math.PI / q));
    if (k === 'hyperbolic') return Math.tanh(Math.acosh(c) / 2);
    if (k === 'sphere') return Math.tan(Math.acos(c) / 2);
    return 0.3;
  }
  // move a to 0, and back
  const T = (a, k) => (z) => div(sub(z, a), sub([1, 0], sc(mul(conj(a), z), k)));
  const Ti = (a, k) => (w) => div(add(w, a), add([1, 0], sc(mul(conj(a), w), k)));
  // reflect z in the geodesic through a and b
  function reflect(z, a, b, k) {
    const f = T(a, k), w = f(z), bb = f(b), u = sc(bb, 1 / abs(bb));
    return Ti(a, k)(mul(mul(u, u), conj(w)));
  }
  // points along the geodesic from a to b
  function geodesic(a, b, k, n = 12) {
    const bb = T(a, k)(b), back = Ti(a, k), out = [];
    for (let i = 0; i <= n; i++) out.push(back(sc(bb, i / n)));
    return out;
  }
  // Build tiles outward from the one centred at 0 by reflecting across
  // edges. Stops when tiles get too small to see, too far, or too many.
  function tiles(p, q, opts = {}) {
    const k = K[kind(p, q)], r = cornerRadius(p, q), max = opts.max || 3000, far = opts.far || 6;
    const first = opts.first ? { c: opts.first.c, v: opts.first.v, parity: opts.first.parity || 0, depth: 0 } : { c: [0, 0], v: Array.from({ length: p }, (_, j) => [r * Math.cos((2 * Math.PI * j) / p + Math.PI / p), r * Math.sin((2 * Math.PI * j) / p + Math.PI / p)]), parity: 0, depth: 0 };
    const key = (c) => (abs(c) > 1e4 ? 'inf' : Math.round(c[0] * 1e6) + ',' + Math.round(c[1] * 1e6));
    const seen = new Map([[key(first.c), first]]), out = [first], queue = [first];
    while (queue.length && out.length < max) {
      const t = queue.shift();
      for (let j = 0; j < p; j++) {
        const a = t.v[j], b = t.v[(j + 1) % p];
        const c = abs(t.c) > 1e4 ? null : reflect(t.c, a, b, k);
        const kk = c ? key(c) : 'inf';
        if (seen.has(kk)) continue;
        const v = t.v.map((z) => reflect(z, a, b, k)).reverse();
        const nt = { c: c || [1e9, 0], v, parity: 1 - t.parity, depth: t.depth + 1 };
        seen.set(kk, nt);
        // too small or too far to matter
        if (k === 1) { const e = abs(sub(v[0], v[1])); if (e < (opts.minEdge || 0.002)) continue; }
        if (k === 0 && abs(nt.c) > far) continue;
        out.push(nt); queue.push(nt);
      }
    }
    return { tiles: out, k, kind: kind(p, q), r };
  }
  // Gauss-Bonnet: a tile's area is how far its angle sum falls short of a
  // flat polygon's (or exceeds it, on the sphere), in units where |K| = 1.
  const tileArea = (p, q) => Math.abs((p - 2) * Math.PI - (2 * Math.PI * p) / q);
  // length of a circle of radius r in each geometry, curvature -1, 0, 1
  const circumference = (r, k) => (k === 1 ? 2 * Math.PI * Math.sinh(r) : k === -1 ? 2 * Math.PI * Math.sin(r) : 2 * Math.PI * r);

  // Other views of the hyperbolic plane, from the Poincare disk.
  function atanh(z) { // 0.5 * log((1 + z) / (1 - z))
    const w = div(add([1, 0], z), sub([1, 0], z)); return [0.5 * Math.log(abs(w)), 0.5 * Math.atan2(w[1], w[0])];
  }
  const VIEWS = {
    poincare: (z) => z,
    klein: (z) => sc(z, 2 / (1 + z[0] * z[0] + z[1] * z[1])),
    halfplane: (z) => { const w = div(add([1, 0], z), sub([1, 0], z)); return [-w[1], w[0]]; },
    band: (z) => sc(atanh(z), 2 / Math.PI),
  };
  // A moving viewpoint is a chain of moves; compose them as 2x2 matrices.
  const moveMatrix = (a, k) => [[1, 0], [-a[0], -a[1]], [-k * a[0], k * a[1]], [1, 0]]; // [[1, -a], [-k conj(a), 1]]
  function mmul(A, B) { const [a, b, c, d] = A, [e, f, gg, h] = B; return [add(mul(a, e), mul(b, gg)), add(mul(a, f), mul(b, h)), add(mul(c, e), mul(d, gg)), add(mul(c, f), mul(d, h))]; }
  const mapply = (M, z) => div(add(mul(M[0], z), M[1]), add(mul(M[2], z), M[3]));

  g.Curved = { kind, K, cornerRadius, T, Ti, reflect, geodesic, tiles, tileArea, circumference, VIEWS, moveMatrix, mmul, mapply, abs, sub, add, mul, div, conj };
})(typeof window !== 'undefined' ? window : globalThis);
