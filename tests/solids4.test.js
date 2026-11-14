// Checks for solids4.js. Run with: node tests/solids4.test.js
require('../js/solids4.js');
const S = globalThis.Solids4;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
// 1. The six regular 4D solids: corners, edges, and Euler's V - E + F - C = 0.
const want = { cell5: [5, 10], tesseract: [16, 32], cell16: [8, 24], cell24: [24, 96], cell600: [120, 720], cell120: [600, 1200] };
for (const [k, [v, e]] of Object.entries(want)) {
  const O = S.OBJECTS[k], M = O.make();
  const lens = M.E.map(([a, b]) => S.dist(M.V[a], M.V[b])), spread = Math.max(...lens) - Math.min(...lens);
  const radii = M.V.map((p) => Math.hypot(...p)), rs = Math.max(...radii) - Math.min(...radii);
  const deg = M.V.map(() => 0); M.E.forEach(([a, b]) => { deg[a]++; deg[b]++; });
  check(`${O.name}: ${v} corners, ${e} edges, all edges equal, all corners on one sphere, every corner alike`,
    M.V.length === v && M.E.length === e && spread < 1e-9 && rs < 1e-9 && deg.every((d) => d === deg[0]),
    `${M.V.length} corners, ${M.E.length} edges, ${deg[0]} at each corner, Euler ${v - e + O.faces - O.cells}`);
}
check('the 600-cell has 600 tetrahedra', S.cell120().tets === 600);
// 2. Rotations: one plane leaves a plane fixed; two leave only the centre.
{
  const one = S.rotation([0, 0, 0.7, 0, 0, 0]), two = S.rotation([0.7, 0, 0, 0, 0, 0.7]), three = S.rotation([0.3, 0.2, 0, 0.5, 0, 0]);
  check('a turn in one plane fixes a whole plane', S.fixedDim(one) === 2);
  check('a double rotation fixes only the centre', S.fixedDim(two) === 0);
  check('a 3D rotation, seen in 4D, fixes a plane: its axis and w', S.fixedDim(three) === 2);
  const ortho = (M) => M.every((r, i) => M.every((q, j) => Math.abs(r.reduce((s, v, k) => s + v * q[k], 0) - (i === j ? 1 : 0)) < 1e-12));
  check('every rotation keeps lengths', ortho(S.rotation([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])));
  // in the double rotation x-y and z-w at equal speed, every point moves the same distance
  const p = [[0.3, 0.1, 0.7, 0.2], [0.9, 0.1, 0.1, 0.2], [0, 0, 0.5, 0.5]].map((q) => { const n = Math.hypot(...q); return q.map((x) => x / n); });
  const moved = p.map((q) => S.dist(q, S.apply(two, q)));
  check('in an equal double rotation every point of the sphere moves the same distance', moved.every((m) => Math.abs(m - moved[0]) < 1e-12), moved[0].toFixed(4));
}
// 3. The net folds into the tesseract.
{
  const flat = S.net(0), shut = S.net(Math.PI / 2);
  const key = (p) => p.map((x) => Math.round(x * 1e6)).join();
  const corners = new Set(shut.V.map(key));
  const isT = [...corners].every((k) => { const p = k.split(',').map((x) => +x / 1e6); return [0, 1, 2].every((i) => Math.abs(Math.abs(p[i]) - 1) < 1e-6) && (Math.abs(p[3]) < 1e-6 || Math.abs(p[3] - 2) < 1e-6); });
  check('the flat net lies in 3D', flat.V.every((p) => p[3] === 0));
  check('folded at a right angle, the 8 cubes meet at the 16 corners of a tesseract', corners.size === 16 && isT, `${corners.size} corners`);
  let worst = 0; for (const f of [0.3, 0.9, 1.4]) { const N = S.net(f); worst = Math.max(worst, ...N.E.map(([a, b]) => Math.abs(S.dist(N.V[a], N.V[b]) - 2))); }
  check('folding never bends a cube', worst < 1e-12);
}
// 4. The Klein bottle meets itself in 3D, never in 4D.
{
  const pts = [], N = 160;
  for (let i = 0; i < N; i++) for (let j = 0; j < 40; j++) pts.push({ u: (2 * Math.PI * i) / N, v: (2 * Math.PI * j) / 40, p: S.kleinPoint((2 * Math.PI * i) / N, (2 * Math.PI * j) / 40) });
  let min3 = Infinity, min4 = Infinity;
  // near on the surface: close in u and v, or across the seam at u = 0,
  // where (2 pi, v) is the point (0, -v)
  const ang = (x) => { x = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return Math.min(x, 2 * Math.PI - x); };
  const far = (a, b) => { const du = Math.abs(a.u - b.u); if (du <= 0.5) return ang(a.v - b.v) > 0.5; if (du >= 2 * Math.PI - 0.5) return ang(a.v + b.v) > 0.5; return true; };
  for (let a = 0; a < pts.length; a += 3) for (let b = a + 1; b < pts.length; b += 2) {
    if (!far(pts[a], pts[b])) continue;
    const d4 = S.dist(pts[a].p, pts[b].p), d3 = Math.hypot(pts[a].p[0] - pts[b].p[0], pts[a].p[1] - pts[b].p[1], pts[a].p[2] - pts[b].p[2]);
    min3 = Math.min(min3, d3); min4 = Math.min(min4, d4);
  }
  // the circle u = pi: (pi, v) and (pi, -v) land on one point once w is dropped
  const a = S.kleinPoint(Math.PI, 1.1), b = S.kleinPoint(Math.PI, -1.1);
  const d3 = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), d4 = S.dist(a, b);
  check('the Klein bottle meets itself when w is dropped, but not in 4D', d3 < 1e-12 && d4 > 0.5, `3D ${d3.toExponential(0)}, 4D ${d4.toFixed(3)}; sampled 3D minimum ${min3.toFixed(3)}`);
  check('in 4D distant parts of the Klein bottle stay apart', min4 > 0.1, min4.toFixed(4));
}
// 5. The Clifford torus lies on the unit 3-sphere and is flat.
{
  const T = S.cliffordTorus(24);
  check('Clifford torus: on the unit 3-sphere', T.V.every((p) => Math.abs(Math.hypot(...p) - 1) < 1e-12));
  const lens = T.E.map(([a, b]) => S.dist(T.V[a], T.V[b]));
  check('Clifford torus: every grid edge the same length, as on a flat sheet', Math.max(...lens) - Math.min(...lens) < 1e-12);
}
// 6. Slicing along any direction.
{
  const T = S.tesseract(), c = S.approach(T, 'corner'), f = S.frameFor(c);
  check('corner first: the tesseract meets the slice at a tetrahedron, then an octahedron', S.sliceAt(T, f.n, -0.7, f.basis).length === 4 && S.sliceAt(T, f.n, 0, f.basis).length === 6);
  const cell = S.approach(T, 'cell'), g2 = S.frameFor(cell);
  check('cell first: the tesseract slices as a cube all the way through', [-0.4, 0, 0.3].every((t) => S.sliceAt(T, g2.n, t, g2.basis).length === 8));
  const s16 = S.cell16(), n16 = S.approach(s16, 'cell'), h16 = Math.max(...s16.V.map((v) => v.reduce((a, x, i) => a + x * n16[i], 0)));
  check('cell first: the 16-cell meets the slice along a tetrahedron, 4 corners at once', s16.V.filter((v) => Math.abs(v.reduce((a, x, i) => a + x * n16[i], 0) - h16) < 1e-9).length === 4);
  const s600 = S.cell600(), h = S.approach(s600, 'cell'), sup = Math.max(...s600.V.map((v) => v.reduce((a, x, i) => a + x * h[i], 0)));
  check("cell first finds the 600-cell's tetrahedra: its 4 farthest corners tie", s600.V.filter((v) => Math.abs(v.reduce((a, x, i) => a + x * h[i], 0) - sup) < 1e-9).length === 4);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
