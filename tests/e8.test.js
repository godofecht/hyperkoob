// Checks for e8.js. Run with: node tests/e8.test.js
require('../e8.js');
const E = globalThis.E8;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const R = E.roots(), dot = E.dot;
check('240 roots, all of squared length 2', R.length === 240 && R.every((r) => Math.abs(dot(r, r) - 2) < 1e-12));
check('roots meet at whole-number products', R.every((a) => R.every((b) => Math.abs(dot(a, b) - Math.round(dot(a, b))) < 1e-12)));
check('each root has 56 nearest neighbours', R.every((a) => R.filter((b) => Math.abs(dot(a, b) - 1) < 1e-9).length === 56));
// the Coxeter element has order exactly 30
{
  let M = E.W, k = 1;
  const isI = (A) => A.every((r, i) => r.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < 1e-9));
  while (!isI(M) && k < 100) { M = E.mul(M, E.W); k++; }
  check('the Coxeter element has order 30', k === 30, String(k));
}
// the four planes split R^8 orthogonally
{
  const rows = [...E.PHYS, ...E.PERP];
  let worst = 0; rows.forEach((a, i) => rows.forEach((b, j) => { worst = Math.max(worst, Math.abs(dot(a, b) - (i === j ? 1 : 0))); }));
  check('physical and hidden spaces are orthonormal and fill R^8', worst < 1e-9, worst.toExponential(1));
}
// 30-fold symmetry in the Coxeter plane
{
  const P = R.map((r) => E.COXETER.map((c) => dot(c, r)));
  const key = (p) => Math.round(p[0] * 1e5) + ',' + Math.round(p[1] * 1e5);
  const set = new Set(P.map(key)), a = (2 * Math.PI) / 30;
  const turned = P.map((p) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]);
  check('roots in the Coxeter plane turn into themselves by 12 degrees', turned.every((p) => set.has(key(p))));
  const radii = [...new Set(P.map((p) => Math.hypot(...p).toFixed(5)))];
  check('they sit on 8 rings of 30', radii.length === 8 && radii.every((r) => P.filter((p) => Math.hypot(...p).toFixed(5) === r).length === 30), radii.join(', '));
}
// in the 4D physical space the roots form two 600-cells, sizes in the golden ratio
{
  const L = R.map((r) => Math.hypot(...E.PHYS.map((c) => dot(c, r))));
  const ls = [...new Set(L.map((x) => x.toFixed(6)))].map(Number).sort((a, b) => a - b);
  const phi = (1 + Math.sqrt(5)) / 2;
  check('roots project to two shells of 120, radii in the golden ratio', ls.length === 2 && Math.abs(ls[1] / ls[0] - phi) < 1e-6 && L.filter((x) => Math.abs(x - ls[0]) < 1e-6).length === 120, ls.join(', '));
}
// lattice points: the first shells of E8 hold 1, 240, 2160, 6720 points
{
  const P = E.points(6), byN = {};
  for (const p of P) { const n = Math.round(dot(p, p)); byN[n] = (byN[n] || 0) + 1; }
  check('E8 shells: 1, 240, 2160, 6720', byN[0] === 1 && byN[2] === 240 && byN[4] === 2160 && byN[6] === 6720, JSON.stringify(byN));
  check('every point is in E8', P.every((p) => { const t = p.map((x) => x * 2); const allInt = t.every((x) => x % 2 === 0), allHalf = t.every((x) => Math.abs(x % 2) === 1); return (allInt || allHalf) && Math.abs(p.reduce((a, b) => a + b, 0) % 2) < 1e-9; }));
}
// the quasicrystal: points kept, all within the window, no two too close
{
  const Q = E.quasicrystal(8, 1.0);
  let dmin = Infinity;
  for (let i = 0; i < Q.length; i++) for (let j = i + 1; j < Q.length; j++) dmin = Math.min(dmin, Math.hypot(...Q[i].x.map((v, k) => v - Q[j].x[k])));
  check('Elser-Sloane points: all inside the window, and well spaced', Q.every((q) => q.h <= 1.0) && dmin > 0.3, `${Q.length} points, closest pair ${dmin.toFixed(3)}`);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
