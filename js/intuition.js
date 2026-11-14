// Small pieces of intuition, each exact or sampled with a known answer:
// Cauchy's average shadow, the parts of an n-cube, how much of a ball sits
// near an equator, and an arrow carried round a triangle on a sphere.
(function (g) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };

  // ---------- Cauchy: the average shadow of a convex solid is a quarter of its surface ----------
  const PHI = (1 + Math.sqrt(5)) / 2;
  const SOLIDS = {
    cube: { name: 'cube', V: [], area: 6 },
    tetra: { name: 'tetrahedron', V: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((v) => v.map((x) => x / (2 * Math.SQRT2))), area: Math.sqrt(3) },
    octa: { name: 'octahedron', V: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((v) => v.map((x) => x / Math.SQRT2)), area: 2 * Math.sqrt(3) },
    ico: { name: 'icosahedron', V: [], area: 5 * Math.sqrt(3) },
    box: { name: 'long box, 1 by 1 by 3', V: [], area: 14 },
  };
  for (let m = 0; m < 8; m++) SOLIDS.cube.V.push([m & 1 ? 0.5 : -0.5, m & 2 ? 0.5 : -0.5, m & 4 ? 0.5 : -0.5]);
  for (let m = 0; m < 8; m++) SOLIDS.box.V.push([m & 1 ? 0.5 : -0.5, m & 2 ? 0.5 : -0.5, m & 4 ? 1.5 : -1.5]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { SOLIDS.ico.V.push([0, a / 2, (b * PHI) / 2], [a / 2, (b * PHI) / 2, 0], [(b * PHI) / 2, 0, a / 2]); }
  // edge length 1 for the tetrahedron, octahedron and icosahedron above, so
  // their areas are sqrt(3), 2 sqrt(3) and 5 sqrt(3)
  function hullArea2(P) {
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.slice().reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    const h = lo.slice(0, -1).concat(hi.slice(0, -1));
    let A = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; A += a[0] * b[1] - a[1] * b[0]; }
    return { area: Math.abs(A) / 2, hull: h };
  }
  // a random direction, evenly spread over the sphere
  function randomDir(r) { const z = 2 * r() - 1, t = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z); return [s * Math.cos(t), s * Math.sin(t), z]; }
  // the shadow cast along direction d onto the plane square to it
  function shadow(V, d) {
    const a = norm(Math.abs(d[0]) < 0.9 ? cross(d, [1, 0, 0]) : cross(d, [0, 1, 0])), b = cross(d, a);
    return hullArea2(V.map((v) => [dot(v, a), dot(v, b)]));
  }

  // ---------- parts of the n-cube ----------
  // an n-cube has C(n, k) 2^(n-k) faces of dimension k
  function binom(n, k) { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return Math.round(r); }
  const cubeParts = (n) => Array.from({ length: n + 1 }, (_, k) => binom(n, k) * 2 ** (n - k));
  const PART_NAMES = ['corners', 'edges', 'squares', 'cubes', 'tesseracts'];
  const partName = (k) => PART_NAMES[k] || `${k}-cubes`;

  // ---------- near an equator ----------
  // a uniform point of the n-ball has first coordinate x with density
  // proportional to (1 - x^2)^((n - 1)/2); the share with |x| < h:
  function equatorShare(n, h, steps = 4000) {
    let inside = 0, all = 0;
    for (let i = 0; i < steps; i++) { const x = -1 + (2 * (i + 0.5)) / steps, f = Math.exp(((n - 1) / 2) * Math.log(Math.max(1e-300, 1 - x * x))); all += f; if (Math.abs(x) < h) inside += f; }
    return inside / all;
  }
  const equatorDensity = (n, x) => Math.exp(((n - 1) / 2) * Math.log(Math.max(1e-300, 1 - x * x)));

  // ---------- an arrow carried round a triangle on the unit sphere ----------
  // The triangle: the north pole, then two points on the equator `span`
  // apart. Carry a tangent arrow along each side without turning it (at
  // every small step, remove the part that leaves the sphere). It comes
  // back turned by the triangle's area, here equal to `span`.
  function trianglePath(span, steps = 600) {
    const N = [0, 0, 1], A = [1, 0, 0], B = [Math.cos(span), Math.sin(span), 0];
    const arc = (p, q, n) => { const ang = Math.acos(Math.max(-1, Math.min(1, dot(p, q)))), out = []; for (let i = 0; i <= n; i++) { const t = i / n, s1 = Math.sin((1 - t) * ang) / Math.sin(ang), s2 = Math.sin(t * ang) / Math.sin(ang); out.push([s1 * p[0] + s2 * q[0], s1 * p[1] + s2 * q[1], s1 * p[2] + s2 * q[2]]); } return out; };
    const k = Math.max(1, Math.round(steps / 3));
    return [...arc(N, A, k), ...arc(A, B, k).slice(1), ...arc(B, N, k).slice(1)];
  }
  function transport(path, v0) {
    const out = [v0];
    let v = v0;
    for (let i = 1; i < path.length; i++) {
      const n = path[i], len = Math.hypot(...v), d = dot(v, n);
      v = norm([v[0] - d * n[0], v[1] - d * n[1], v[2] - d * n[2]]).map((x) => x * len);
      out.push(v);
    }
    return out;
  }
  // signed angle from a to b, both tangent at point p
  function turnAngle(a, b, p) { return Math.atan2(dot(cross(a, b), p), dot(a, b)); }

  g.Intuition = { SOLIDS, hullArea2, randomDir, shadow, cubeParts, partName, binom, equatorShare, equatorDensity, trianglePath, transport, turnAngle };
})(typeof window !== 'undefined' ? window : globalThis);
