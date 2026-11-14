// Checks for infinity.js. Run with: node tests/infinity.test.js
require('../js/infinity.js');
const I = globalThis.Infinite;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
// 1. Curves that fill a square: every cell exactly once, and for Hilbert and
// Peano each step goes to a neighbouring cell. Z-order visits every cell but jumps.
for (const [kind, n] of [['hilbert', 1], ['hilbert', 5], ['peano', 1], ['peano', 3], ['zorder', 5]]) {
  const C = I.CURVES[kind], side = C.base ** n, seen = new Set();
  for (let d = 0; d < side * side; d++) { const [x, y] = C.f(n, d); if (x >= 0 && y >= 0 && x < side && y < side) seen.add(x + ',' + y); }
  const step = I.longestStep(kind, n);
  check(`${C.name}, order ${n}: all ${side * side} cells once, longest step ${step.toFixed(2)} cells`, seen.size === side * side && (kind === 'zorder' ? step > 1 : step === 1));
}
// the Hilbert curve is nested: the first quarter of order n+1 fills one quarter square
{
  const P = I.curvePath('hilbert', 6), q = P.slice(0, P.length / 4);
  check('Hilbert: the first quarter of the time fills one quarter of the square', q.every(([x, y]) => x < 0.5 && y < 0.5));
}
{
  const P = I.curvePath('peano', 3), q = P.slice(0, P.length / 9);
  check('Peano: the first ninth of the time fills one ninth of the square', q.every(([x, y]) => x < 1 / 3 && y < 1 / 3));
}
// 2. Counting fractions: every p/q with p, q <= 12 in lowest terms gets one number.
{
  const Z = I.zigzag(400), got = new Map();
  for (const z of Z) if (z.fresh) got.set(z.p + '/' + z.q, (got.get(z.p + '/' + z.q) || 0) + 1);
  let all = true;
  for (let p = 1; p <= 12; p++) for (let q = 1; q <= 12; q++) if (I.gcd(p, q) === 1 && got.get(p + '/' + q) !== 1) all = false;
  check('the zigzag numbers every fraction in lowest terms exactly once', all, `${got.size} fractions in the first 400 steps`);
  check('2/4 is skipped as 1/2', Z.find((z) => z.p === 2 && z.q === 4).fresh === false);
}
// 3. Cantor's diagonal differs from every row.
{
  let x = 7; const r = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 < 0.5 ? 0 : 1);
  const rows = Array.from({ length: 50 }, () => Array.from({ length: 50 }, r)), d = I.diagonal(rows);
  check("Cantor's new number differs from row i at digit i, for all 50 rows", rows.every((row, i) => row[i] !== d[i]));
}
// 4. The free group: a times the words starting with A is everything not starting with a.
{
  const D = 7, W = I.words(D), short = new Set(I.words(D - 1));
  check(`words of length up to ${D}: 1 + 4(3^${D} - 1)/2 = ${W.length}`, W.length === 1 + 2 * (3 ** D - 1));
  const moved = new Set(I.piece(W, 'A').map((w) => I.times('a', w)));
  const rest = [...short].filter((w) => w[0] !== 'a');
  check('a W(A) is the identity plus W(A), W(b) and W(B): three quarters from one', rest.every((w) => moved.has(w)) && [...moved].every((w) => w[0] !== 'a'), `${rest.length} words up to length ${D - 1}`);
  const movedB = new Set(I.piece(W, 'B').map((w) => I.times('b', w)));
  check('b W(B) is everything not starting with b', [...short].filter((w) => w[0] !== 'b').every((w) => movedB.has(w)));
  // the hyperbolic picture: the move a sends the point of w to the point of aw
  const L = 2.2, Ma = I.wordMatrix('a', L);
  let worst = 0;
  for (const w of W.slice(0, 400)) { const p = I.apply(Ma, I.place(w, L)), q = I.place(I.times('a', w), L); worst = Math.max(worst, Math.hypot(p[0] - q[0], p[1] - q[1])); }
  check('in the disk, the move a carries the point of w onto the point of aw', worst < 1e-9, worst.toExponential(1));
  // ping-pong: with long enough steps, each piece stays inside its own cap
  const inside = (x, z) => { const u = I.DIR[x], x0 = Math.tanh(L / 4), c = (1 + x0 * x0) / (2 * x0), rho = c - x0; return Math.hypot(z[0] - c * u[0], z[1] - c * u[1]) < rho; };
  check(`with steps of ${L} (> ${I.MIN_STEP.toFixed(3)}), every word lies in the cap of its first letter`, W.filter((w) => w).every((w) => inside(w[0], I.place(w, L))));
  {
    const Ls = 1.2, x0 = Math.tanh(Ls / 4), c = (1 + x0 * x0) / (2 * x0), rho = c - x0;
    const out = W.filter((w) => w).filter((w) => { const u = I.DIR[w[0]], z = I.place(w, Ls); return Math.hypot(z[0] - c * u[0], z[1] - c * u[1]) >= rho; });
    check(`with steps of ${Ls}, below ${I.MIN_STEP.toFixed(3)}, the caps overlap and words leave them`, out.length > 0, `${out.length} words outside`);
  }
  check('and different words land on different points', new Set(W.map((w) => I.place(w, L).map((v) => v.toFixed(9)).join())).size === W.length);
}
// 5. Gabriel's horn: volume tends to pi, surface grows without bound like 2 pi ln L.
{
  const L = 1e9, v = I.hornVolume(L), s = I.hornSurface(L);
  check(`horn to x = 10^9: volume ${v.toFixed(6)} < pi, surface ${s.toFixed(2)} > 2 pi ln L = ${(2 * Math.PI * Math.log(L)).toFixed(2)}`, v < Math.PI && Math.PI - v < 1e-8 && s > 2 * Math.PI * Math.log(L) && s < 2 * Math.PI * Math.log(L) + 2);
  const s2 = I.hornSurface(2);
  check('surface to x = 2 matches a fine direct sum', (() => { let t = 0; const n = 200000; for (let i = 0; i < n; i++) { const x = 1 + (i + 0.5) / n; t += Math.sqrt(1 + 1 / x ** 4) / x / n; } return Math.abs(2 * Math.PI * t - s2) < 1e-6; })(), s2.toFixed(5));
}
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
