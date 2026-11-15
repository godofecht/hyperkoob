// Checks for sphere3.js, steiner.js and the Collatz part of infinity.js.
// Run with: node tests/curved2.test.js
require('../js/sphere3.js'); require('../js/steiner.js'); require('../js/infinity.js'); require('../js/solids4.js');
const S = globalThis.Sphere3, St = globalThis.Steiner, I = globalThis.Infinite;
let failures = 0;
function check(name, ok, detail) { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failures++; }
// 1. The 3-sphere.
{
  const F = S.startFrame(), orth = F.every((a, i) => F.every((b, j) => Math.abs(S.dot(a, b) - (i === j)) < 1e-12));
  check('the starting frame is orthonormal', orth);
  let G = F; for (let i = 0; i < 1000; i++) G = S.walk(G, (2 * Math.PI) / 1000);
  check('walking 2π straight ahead brings you home, facing the same way', G.every((r, i) => r.every((x, k) => Math.abs(x - F[i][k]) < 1e-9)));
  const half = S.walk(F, Math.PI);
  check('half way round you stand at the antipode', F[0].every((x, k) => Math.abs(half[0][k] + x) < 1e-12));
  // a ball a quarter turn away looks exactly its own size; at d and π - d it looks the same
  const r = 0.1, at = (d) => S.images(F, S.walk(F, d)[0], r)[0];
  check('a ball a quarter turn away has angular radius equal to its radius', Math.abs(at(Math.PI / 2).ang - r) < 1e-9);
  check('balls at distance 0.6 and π - 0.6 look the same size', Math.abs(at(0.6).ang - at(Math.PI - 0.6).ang) < 1e-9, `${at(0.6).ang.toFixed(4)} rad`);
  check('a ball near the antipode fills the sky', at(Math.PI - 0.05).ang === Math.PI);
  const two = S.images(F, S.walk(F, 1)[0], r);
  check('the second image is behind you, 2π - d away', Math.abs(two[1].dist - (2 * Math.PI - 1)) < 1e-9 && Math.abs(two[1].dir[0] + 1) < 1e-9 && Math.abs(two[0].dir[0] - 1) < 1e-9);
  const V = globalThis.Solids4.cell600().V;
  let min = 9; for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) min = Math.min(min, S.distance(V[i], V[j]));
  check("the 600-cell's 120 corners are 36° apart on the 3-sphere", Math.abs(min - Math.PI / 5) < 1e-9);
}
// 2. Steiner's porism.
{
  const tang = (A, B, inside) => (inside ? Math.abs(Math.hypot(A.c[0] - B.c[0], A.c[1] - B.c[1]) - Math.abs(A.r - B.r)) : Math.abs(Math.hypot(A.c[0] - B.c[0], A.c[1] - B.c[1]) - (A.r + B.r)));
  for (const [n, k] of [[5, 1], [7, 2], [12, 1]]) {
    const r = St.closingRadius(n, k); let worst = 0;
    for (const [a, t] of [[[0.3, 0.1], 0], [[-0.2, 0.45], 1.3], [[0.5, -0.3], 2.9]]) {
      const C = St.chain(n, r, t, a, k);
      C.circles.forEach((c, i) => { worst = Math.max(worst, tang(c, C.outer, true), tang(c, C.inner, false), tang(c, C.circles[(i + 1) % n], false)); });
    }
    check(`${n} circles winding ${k}: every circle touches both and its neighbours, from any start`, worst < 1e-9, worst.toExponential(1));
  }
  const off = St.ring(6, St.closingRadius(6) * 1.1, 0);
  check('change the inner radius and the chain no longer closes', Math.abs(off.gap) > 0.05, `gap ${(off.gap * 180 / Math.PI).toFixed(1)}°`);
}
// 3. Collatz.
{
  const p = I.collatz(27);
  check('27 takes 111 steps and climbs to 9232', p.length - 1 === 111 && Math.max(...p) === 9232);
  let all = true; for (let n = 1; n <= 100000; n++) if (I.collatz(n).at(-1) !== 1) all = false;
  check('every start up to 100,000 comes down to 1', all);
  const T = I.collatzTree(64, 0.2, 0.4);
  check('the tree has one path per start, sharing the root', T.length === 64 && T.every((q) => q[0] === 0 && q[1] === 0) && T[7].length / 2 - 1 === I.collatz(8).length - 1);
}
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
