// Checks for fractal.js and intuition.js. Run with: node tests/intuition.test.js
require('../js/fractal.js');
require('../js/intuition.js');
const F = globalThis.Fractal, I = globalThis.Intuition;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
// 1. Fractal dimensions: the rule, and counting boxes.
const want = { cantor: Math.log(2) / Math.log(3), koch: Math.log(4) / Math.log(3), sierpinski: Math.log(3) / Math.log(2), carpet: Math.log(8) / Math.log(3), vicsek: Math.log(5) / Math.log(3), menger: Math.log(20) / Math.log(3) };
for (const [k, d] of Object.entries(want)) {
  const Fr = F.get(k), sd = F.similarityDim(Fr), L = F.levelFor(Fr, 300000), P = F.points(Fr, L);
  const bd = F.fitSizes(P, F.levelSizes(Fr, L));
  check(`${Fr.name}: dimension ${d.toFixed(4)} by the rule, ${bd.slope.toFixed(3)} by counting boxes`, Math.abs(sd - d) < 1e-9 && Math.abs(bd.slope - d) < 0.035, `${P.length} points, level ${L}`);
}
// The dragon fills an area, dimension 2, but its edge is a fractal of
// dimension about 1.52, so box counts approach 2 only slowly as boxes shrink.
{
  const Fr = F.get('dragon'), L = F.levelFor(Fr, 300000), P = F.points(Fr, L);
  const coarse = F.fitSizes(P, F.levelSizes(Fr, L, 1)).slope, fine = F.fitSizes(P, F.levelSizes(Fr, L, 8)).slope;
  check('Heighway dragon: dimension 2 by the rule; box counts rise toward it', Math.abs(F.similarityDim(Fr) - 2) < 1e-9 && fine > coarse && fine < 2 && fine > 1.7, `${coarse.toFixed(3)} from all sizes, ${fine.toFixed(3)} from the smaller ones`);
}
{
  const Fr = F.get('flake', 6, 1 / 3), sd = F.similarityDim(Fr);
  check('a flake of 6 copies at a third: dimension log 6 / log 3', Math.abs(sd - Math.log(6) / Math.log(3)) < 1e-12, sd.toFixed(4));
}
// 2. Cauchy: the average shadow is a quarter of the surface area.
{
  let x = 12345; const r = () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296;
  for (const k of ['cube', 'tetra', 'octa', 'ico', 'box']) {
    const S = I.SOLIDS[k], N = 60000; let sum = 0;
    for (let i = 0; i < N; i++) sum += I.shadow(S.V, I.randomDir(r)).area;
    const mean = sum / N;
    check(`${S.name}: average shadow ${mean.toFixed(4)}, a quarter of its surface ${(S.area / 4).toFixed(4)}`, Math.abs(mean / (S.area / 4) - 1) < 0.01);
  }
  // the surfaces themselves, from the edge lengths
  const e = (V) => { let d = Infinity; for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) d = Math.min(d, Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2])); return d; };
  check('tetrahedron, octahedron and icosahedron have edge 1', ['tetra', 'octa', 'ico'].every((k) => Math.abs(e(I.SOLIDS[k].V) - 1) < 1e-12));
}
// 3. Parts of the n-cube, and Euler: corners - edges + squares - ... = 1.
for (const n of [3, 4, 5, 10, 20]) {
  const P = I.cubeParts(n), alt = P.reduce((a, c, k) => a + (k % 2 ? -c : c), 0);
  check(`${n}-cube: ${P.slice(0, 3).join(', ')}... parts, alternating sum 1`, alt === 1 && P[0] === 2 ** n && P[n] === 1 && P[1] === n * 2 ** (n - 1));
}
check('a tesseract has 16 corners, 32 edges, 24 squares, 8 cubes', JSON.stringify(I.cubeParts(4)) === JSON.stringify([16, 32, 24, 8, 1]));
// 4. Near an equator: in 3D, the slab |x| < 0.1 holds 14.95% of the ball; in 1000D almost all.
check('3-ball: a slab of half-width 0.1 at the equator holds 14.95%', Math.abs(I.equatorShare(3, 0.1) - 0.14950) < 1e-3, I.equatorShare(3, 0.1).toFixed(5));
check('1000-ball: the same slab holds over 99.8%', I.equatorShare(1000, 0.1) > 0.998, I.equatorShare(1000, 0.1).toFixed(5));
// 5. An arrow carried round a triangle turns by the triangle's area.
for (const span of [0.3, Math.PI / 2, 2.2]) {
  const path = I.trianglePath(span, 3000), v0 = [0, 1, 0], vs = I.transport(path, v0), turn = I.turnAngle(v0, vs[vs.length - 1], [0, 0, 1]);
  check(`triangle with area ${span.toFixed(3)}: the arrow comes back turned by ${Math.abs(turn).toFixed(3)}`, Math.abs(Math.abs(turn) - span) < 0.01);
}
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
