// Checks for curved.js. Run with: node tests/curved.test.js
require('../curved.js');
const C = globalThis.Curved;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
// 1. On the sphere the tilings close up into the Platonic solids.
for (const [p, q, n, name] of [[3, 3, 4, 'tetrahedron'], [4, 3, 6, 'cube'], [3, 4, 8, 'octahedron'], [5, 3, 12, 'dodecahedron'], [3, 5, 20, 'icosahedron']]) {
  const T = C.tiles(p, q);
  check(`{${p}, ${q}} on the sphere has ${n} faces: the ${name}`, T.kind === 'sphere' && T.tiles.length === n, String(T.tiles.length));
}
// 2. Exactly q tiles meet at every corner, in every geometry.
for (const [p, q] of [[4, 4], [6, 3], [3, 6], [7, 3], [5, 4], [4, 5], [8, 8], [3, 7]]) {
  const T = C.tiles(p, q, { max: 4000 }), v = T.tiles[0].v[0];
  const meet = T.tiles.filter((t) => t.v.some((z) => C.abs(C.sub(z, v)) < 1e-6)).length;
  check(`{${p}, ${q}} (${T.kind}): ${q} tiles at a corner`, meet === q, String(meet));
}
// 3. Each corner's angle is 2 pi / q.
for (const [p, q] of [[7, 3], [5, 4], [4, 3], [6, 3]]) {
  const k = C.K[C.kind(p, q)], r = C.cornerRadius(p, q), v = Array.from({ length: p }, (_, j) => [r * Math.cos((2 * Math.PI * j) / p), r * Math.sin((2 * Math.PI * j) / p)]);
  const f = C.T(v[0], k), a = f(v[1]), b = f(v[p - 1]);
  let ang = Math.abs(Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])); if (ang > Math.PI) ang = 2 * Math.PI - ang;
  check(`{${p}, ${q}}: corner angle is 360/${q} degrees`, Math.abs(ang - (2 * Math.PI) / q) < 1e-9, ((ang * 180) / Math.PI).toFixed(6));
}
// 4. Hyperbolic tiles never leave the disk; reflections are their own undo.
{
  const T = C.tiles(7, 3, { max: 3000 });
  check('{7, 3}: every tile lies inside the Poincare disk', T.tiles.every((t) => t.v.every((z) => C.abs(z) < 1)), `${T.tiles.length} tiles`);
  const z = [0.3, -0.2], a = [0.1, 0.4], b = [-0.5, 0.2];
  const back = C.reflect(C.reflect(z, a, b, 1), a, b, 1);
  check('reflecting twice gives the point back', C.abs(C.sub(back, z)) < 1e-12);
}
// 5. Areas and circles.
check('Gauss-Bonnet: the cube face covers a sixth of the sphere', Math.abs(C.tileArea(4, 3) - (4 * Math.PI) / 6) < 1e-12);
check('Gauss-Bonnet: an icosahedron face covers a twentieth', Math.abs(C.tileArea(3, 5) - (4 * Math.PI) / 20) < 1e-12);
check('flat tilings have zero curvature', C.tileArea(4, 4) === 0 && C.tileArea(6, 3) === 0);
check('a hyperbolic circle of radius 10 is about 69,000 long', Math.abs(C.circumference(10, 1) - 69198.1) < 1);
// 6. A move composed as matrices matches doing it step by step.
{
  const a = [0.2, 0.1], b = [-0.3, 0.25], z = [0.1, -0.4];
  const M = C.mmul(C.moveMatrix(b, 1), C.moveMatrix(a, 1)), step = C.T(b, 1)(C.T(a, 1)(z));
  check('composed moves match single moves', C.abs(C.sub(C.mapply(M, z), step)) < 1e-12);
}
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
