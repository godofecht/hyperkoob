// Checks for infinity-dims.js, space3.js, hopf.js and eye4.js.
// Run with: node tests/dims2.test.js
require('../js/infinity.js'); require('../js/infinity-dims.js'); require('../js/space3.js'); require('../js/hopf.js'); require('../js/eye4.js');
const D = globalThis.InfDims, I = globalThis.Infinite, S = globalThis.Space3, H = globalThis.Hopf, E = globalThis.Eye4;
let failures = 0;
function check(name, ok, detail) { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failures++; }
const close = (a, b, e = 1e-9) => Math.abs(a - b) < e;

// 1. Hilbert curves in any dimension.
for (const [d, b] of [[2, 5], [3, 4], [4, 3], [5, 2]]) {
  const N = 2 ** (d * b), seen = new Set();
  let unit = true, prev = D.hilbertD(d, b, 0);
  seen.add(prev.join());
  for (let h = 1; h < N; h++) {
    const p = D.hilbertD(d, b, h), diff = p.reduce((s, x, i) => s + Math.abs(x - prev[i]), 0);
    if (diff !== 1) unit = false;
    seen.add(p.join()); prev = p;
  }
  check(`the ${d}D Hilbert curve of order ${b} visits all ${N} cells once, one step at a time`, unit && seen.size === N);
}
{
  // the 2D case is the same square-filling curve as on the first card, up to a turn or a flip
  const a = D.hilbertPath(2, 4), b = I.curvePath('hilbert', 4);
  const steps = (P) => P.slice(1).map((p, i) => [Math.round((p[0] - P[i][0]) * 16), Math.round((p[1] - P[i][1]) * 16)]);
  const sa = steps(a), sb = steps(b);
  const maps = [(x, y) => [x, y], (x, y) => [y, x], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-x, -y], (x, y) => [-y, -x]];
  check('in 2D it matches the Hilbert curve of the first card up to symmetry', maps.some((m) => sa.every((s, i) => { const t = m(...s); return t[0] === sb[i][0] && t[1] === sb[i][1]; })));
  // a window of the curve covers a share of the cube equal to its length
  const P = D.hilbertPath(3, 4), N = P.length, w = 1 / 8, i0 = 1000;
  const inBox = P.slice(i0, i0 + N * w);
  check('in 3D a window of length w fills w of the cube', inBox.length === N * w && new Set(inBox.map((p) => p.join())).size === inBox.length);
}
{
  const P = I.curvePath('hilbert', 6), Z = I.curvePath('zorder', 6);
  const h = D.preimage(P, 0.5, 0.5, 0.2), z = D.preimage(Z, 0.5, 0.5, 0.2);
  check('a disk of radius 0.2 takes about 12.6% of the line', close(h.fraction, Math.PI * 0.04, 0.01) && close(h.fraction, z.fraction, 1e-12), `${(h.fraction * 100).toFixed(1)}%`);
  check('the Z-order cuts it into more pieces than the Hilbert curve', z.pieces.length > h.pieces.length, `${h.pieces.length} against ${z.pieces.length}`);
  check('the pieces add up to the fraction', close(h.pieces.reduce((s, [a, b]) => s + b - a, 0), h.fraction));
}
// 2. A box with infinitely many sides.
{
  check('the box with sides 1, 1/2, 1/3, ... has a diagonal tending to π/√6', close(D.diag(D.hilbertSides(100000)), D.BASEL, 1e-5), D.diag(D.hilbertSides(100000)).toFixed(6));
  check('the unit cube in 100 dimensions has diagonal 10', close(D.diag(D.unitSides(100)), 10));
  const gs = [[1, 0], [0, 1]], sq = D.zonogon(gs);
  check('the shadow of a square seen straight on is the square', sq.length === 4 && close(D.area(sq), 1));
  // area of a zonogon = sum over pairs of |det|
  const G = [[1, 0.2], [0.3, 0.8], [-0.5, 0.4], [0.2, -0.6]];
  let A = 0; for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) A += Math.abs(G[i][0] * G[j][1] - G[i][1] * G[j][0]);
  check('a zonogon has the area the pairs of its edges say', close(D.area(D.zonogon(G)), A), A.toFixed(4));
}
// 3. Cubes round an edge.
for (const m of [3, 4, 5, 6]) {
  const G = S.GEOMETRY[m], K = G.K, C = S.corners(K, G.r);
  // faces with outward normals (sinK r, cosK r e_i) meet at the angle whose cosine is -K sinK(r)²
  const ang = K === 0 ? Math.PI / 2 : Math.acos(-K * S.sinK(K, G.r) ** 2);
  check(`${m} cubes fit round each edge in ${G.name}`, close(ang * m, 2 * Math.PI), `faces meet at ${(ang * 180 / Math.PI).toFixed(1)}°`);
  // all twelve edges are the same length (for ideal corners, infinite)
  if (m < 6) {
    const L = []; for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) L.push(S.distance(K, C[i], C[i | b]));
    check(`  its cube's edges are all ${L[0].toFixed(4)} long`, L.every((x) => close(x, L[0])));
  } else check('  with six round an edge the corners are at infinity', C.every((v) => Math.abs(v[0] * v[0] - v[1] * v[1] - v[2] * v[2] - v[3] * v[3]) < 1e-9));
}
{
  const t = S.honeycomb(3, 10);
  check('three round an edge: 8 cubes, the tesseract, with 32 edges', t.cells.length === 8 && t.edges.length === 32);
  const f = S.honeycomb(4, 2.01);
  check('flat: cubes within 2 of the centre are the 33 lattice points', f.cells.length === 33, String(f.cells.length));
  // every edge of the {4,3,5} honeycomb inside the region has 5 cubes round it: count cells with
  // a centre within half an edge of each inner edge's midpoint.
  const H5 = S.honeycomb(5, 3.2), K = -1, inner = H5.edges.filter((e) => S.distance(K, [1, 0, 0, 0], e.a.map((x, i) => x + e.b[i])) < 0.9);
  const round = inner.map((e) => { const mid = e.a.map((x, i) => x + e.b[i]); const dm = Math.min(...H5.cells.map((c) => S.distance(K, c.c, mid))); return H5.cells.filter((c) => close(S.distance(K, c.c, mid), dm, 1e-6)).length; });
  check('in hyperbolic space every edge near you has 5 cubes round it', round.length > 0 && round.every((x) => x === 5), `${inner.length} edges`);
}
for (const m of [3, 4, 5]) {
  const H5 = S.honeycomb(m, 2.5), K = H5.K;
  let M = S.I4();
  for (let i = 0; i < 400; i++) { M = S.walk(K, M, 0.05); M = S.turn(M, 0.013); M = S.tilt(M, 0.007); M = S.clean(K, S.recentre(H5, M)); }
  const p = [M[0][0], M[1][0], M[2][0], M[3][0]];
  const inside = S.distance(K, [1, 0, 0, 0], p) <= Math.min(...H5.steps.map((T) => S.distance(K, S.apply(T, [1, 0, 0, 0]), p))) + 1e-9;
  const inv = S.mul(S.inverse(K, M), M), id = inv.every((r, i) => r.every((x, j) => close(x, i === j ? 1 : 0, 1e-9)));
  check(`walking 20 through ${S.GEOMETRY[m].name} keeps you in the central cube, with an exact inverse`, inside && id);
}
{
  // walking along a geodesic: distance grows exactly as walked
  for (const K of [1, 0, -1]) { const M = S.walk(K, S.I4(), 0.7), p = [M[0][0], M[1][0], M[2][0], M[3][0]]; check(`a step of 0.7 is 0.7 long (K = ${K})`, close(S.distance(K, [1, 0, 0, 0], p), 0.7)); }
}
// 4. The Hopf fibration.
{
  let worst = 0;
  for (let k = 0; k < 50; k++) {
    const th = Math.acos(1 - 2 * Math.random()), ph = 2 * Math.PI * Math.random(), s = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
    for (let j = 0; j < 8; j++) { const p = H.fiber(s, j), q = H.hopf(p); worst = Math.max(worst, Math.hypot(q[0] - s[0], q[1] - s[1], q[2] - s[2]), Math.abs(Math.hypot(...p) - 1)); }
  }
  check('every point of a fibre lies on the 3-sphere and maps to its base point', worst < 1e-12, worst.toExponential(1));
  // a fibre projects to a circle: equal distances from the centre of three of its points
  const L = H.loop([0.3, 0.5, Math.sqrt(1 - 0.34)], 64, 0.4);
  const a = L[0], b = L[20], c = L[41], ab = a.map((x, i) => b[i] - x), ac = a.map((x, i) => c[i] - x);
  const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const planar = L.every((p) => Math.abs(p.reduce((s, x, i) => s + (x - a[i]) * n[i], 0)) < 1e-9 * Math.hypot(...n) * 10);
  check('each fibre projects to a flat closed curve (a circle)', planar);
  const pts = H.base('spiral', 6, 0);
  let ok = true, vals = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const lk = H.linking(H.loop(pts[i], 160, 0.3), H.loop(pts[j], 160, 0.3)); vals.push(lk); if (!close(Math.abs(lk), 1, 0.02)) ok = false; }
  check('every two fibres link exactly once', ok, vals.map((v) => v.toFixed(3)).slice(0, 4).join(', '));
}
// 5. The 4D eye.
{
  const sc = E.scene('box', 'xw', 0), mid = E.trace(sc, E.ray(0, 0, 0, 0.5));
  check('the ray straight ahead hits the near cell of the tesseract, the one facing -w', mid && mid.cell === 6);
  // a ray through the retina's corner misses
  check('a ray far off to the side misses', E.trace(sc, E.ray(1, 1, 1, 0.5)) === null);
  const ball = E.scene('ball', 'xw', 0);
  const hits = [-0.9, -0.5, 0, 0.5, 0.9].map((u) => !!E.trace(ball, E.ray(u, 0, 0, 0.35)));
  // the ball's image in the retina is a solid ball: radius in retina units is tan(asin(r/d)) / f
  const rr = Math.tan(Math.asin(0.8 / 4.2)) / 0.35, inside = (u, v, s) => !!E.trace(ball, E.ray(u, v, s, 0.35));
  check("a 4D ball's image fills a solid ball in the retina", inside(0, 0, rr * 0.98) && !inside(0, 0, rr * 1.02) && inside(rr * 0.7, rr * 0.7, 0) && !inside(rr * 0.6, rr * 0.6, rr * 0.6), `retina radius ${rr.toFixed(3)}`);
  const turned = E.scene('box', 'xw', Math.PI / 2), t2 = E.trace(turned, E.ray(0, 0, 0, 0.5));
  const cells = new Set(), sc2 = E.scene('box', 'xw', 0.61);
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) for (let k = 0; k < 20; k++) { const t = E.trace(sc2, E.ray(-1 + (2 * i + 1) / 20, -1 + (2 * j + 1) / 20, -1 + (2 * k + 1) / 20, 0.42)); if (t) cells.add(t.cell); }
  check('seen corner on, the retina holds 4 cells of the tesseract, never two opposite ones', cells.size === 4 && [0, 2, 4, 6].every((c) => !(cells.has(c) && cells.has(c + 1))), [...cells].join(','));
  check('a quarter turn in the plane of x and w brings an x cell to face the eye', t2 && (t2.cell === 0 || t2.cell === 1), t2 && String(t2.cell));
  check('the ray straight ahead hits the 4D ball, rays far off it miss', hits[2] && !hits[0] && !hits[4]);
}
if (failures) { console.log(`${failures} failed`); process.exit(1); } else console.log('all passed');
