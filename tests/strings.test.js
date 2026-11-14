// Checks for strings.js. Run with: node tests/strings.test.js
require('../js/strings.js');
const S = globalThis.Strings;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
for (const R of [0.1, 0.37, 2.5, 13]) {
  const a = S.spectrum(R), b = S.spectrum(1 / R);
  check(`T-duality: the spectrum at R = ${R} equals the spectrum at 1/R`, a.every((x, i) => Math.abs(x - b[i]) < 1e-9));
}
check('the self-dual radius is 1, where momentum and winding cost the same', Math.abs(S.level(1, 0, 1) - S.level(0, 1, 1)) < 1e-12);
check('Kaluza-Klein steps grow as the circle shrinks', S.kk(1, 0.01) === 100 && S.kk(3, 1) === 3);
check('critical dimensions: 26 for the bosonic string, 10 for the superstring', S.bosonic(26) === 1 && S.superstring(10) === 0.5 && S.bosonic(10) !== 1);
{
  const f = (e) => S.smoothedSum(e) - 1 / (e * e);
  check('1 + 2 + 3 + ... smoothed, less its divergence, tends to -1/12', Math.abs(f(0.01) + 1 / 12) < 1e-4 && Math.abs(f(0.001) + 1 / 12) < 1e-6, `${f(0.01).toFixed(6)}, ${f(0.001).toFixed(8)}`);
}
for (const n of [3, 5, 7]) {
  const P = S.calabiYau(n, 8);
  let worst = 0; for (const p of P) for (const row of p.grid) for (const q of row) worst = Math.max(worst, S.residual(q, n));
  check(`Calabi-Yau slice for n = ${n}: every point satisfies z1^n + z2^n = 1`, P.length === n * n && worst < 1e-9, `${P.length} patches, worst ${worst.toExponential(1)}`);
}
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
