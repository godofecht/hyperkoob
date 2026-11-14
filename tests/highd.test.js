// Checks for highd.js and the diffraction in quasi.js. Run with: node tests/highd.test.js
require('../js/hyper.js');
require('../js/quasi.js');
require('../js/highd.js');
const D = globalThis.HighD, Q = globalThis.Quasi;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

check('ball volumes: 2, pi, 4pi/3, pi^2/2', [1, 2, 3, 4].every((n, i) => near(Math.exp(D.lnBall(n)), [2, Math.PI, (4 * Math.PI) / 3, Math.PI ** 2 / 2][i], 1e-10)));
check('ball volume peaks at n = 5.2569', near(D.ballPeak(), 5.2569464, 1e-5), D.ballPeak().toFixed(6));
check('100-ball is about 2.37e-40', near(D.lnBall(100) / Math.LN10, Math.log10(2.368e-40), 1e-3), D.fmtLn(D.lnBall(100)));
check('outer 1% of a 1000-ball holds 99.996% of it', near(D.shell(1000, 0.01), 0.99995683, 1e-7), D.shell(1000, 0.01).toFixed(8));
// densities integrate to 1
for (const n of [2, 3, 10, 1000]) {
  let a = 0, r = 0; const N = 20000;
  for (let i = 0; i < N; i++) { const t = ((i + 0.5) / N) * Math.PI; a += D.angleDensity(n, t) * (Math.PI / N); r += D.radiusDensity(n, (i + 0.5) / N) / N; }
  check(`n=${n}: angle and radius densities integrate to 1`, near(a, 1, 1e-4) && near(r, 1, 2e-3), `${a.toFixed(5)}, ${r.toFixed(5)}`);
}
// the angle spread shrinks like 1/sqrt(n)
for (const n of [100, 10000]) check(`n=${n}: angle spread is about 1/sqrt(n)`, Math.abs(D.angleSpread(n) * Math.sqrt(n) - 1) < 0.02, `${((D.angleSpread(n) * 180) / Math.PI).toFixed(3)} degrees`);
// and a sampled check of that density against real random vectors
{
  let x = 88172645; const r = () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296;
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const n = 400, M = 600; let s = 0, s2 = 0;
  for (let k = 0; k < M; k++) { let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { const a = gauss(), b = gauss(); ab += a * b; aa += a * a; bb += b * b; } const t = Math.acos(ab / Math.sqrt(aa * bb)); s += t; s2 += t * t; }
  const sd = Math.sqrt(s2 / M - (s / M) ** 2);
  check('sampled angles in 400D match the formula', Math.abs(s / M - Math.PI / 2) < 0.01 && Math.abs(sd / D.angleSpread(n) - 1) < 0.12, `mean ${((s / M) * 180 / Math.PI).toFixed(2)} deg, spread ${sd.toFixed(4)} vs ${D.angleSpread(n).toFixed(4)}`);
}
check('middle sphere: touches the walls at n = 9, pokes out from n = 10', near(D.middleSphere(9), 2) && D.middleSphere(10) > 2 && D.middleSphere(4) === 1);
{
  const c = [2, 10, 100, 10000].map((n) => D.contrast(D.distances(n, 300)));
  check('nearest and farthest neighbours converge', c.every((x, i) => !i || x < c[i - 1]) && c[3] < 0.05, c.map((x) => x.toFixed(3)).join(' > '));
}

// Diffraction of the Penrose tiling: sharp peaks with tenfold symmetry.
{
  const P = Q.setup(2, 5, Q.STEPS), V = Q.vertices(P, Q.buildAll(P, 20)).map((v) => v.x);
  const res = 81, kmax = 9, I = Q.diffraction(V, kmax, res, 20);
  // brightest spot away from the centre
  let best = -1, bi = 0;
  for (let i = 0; i < res * res; i++) { const x = (i % res) - (res - 1) / 2, y = Math.floor(i / res) - (res - 1) / 2; if (x * x + y * y < 16) continue; if (I[i] > best) { best = I[i]; bi = i; } }
  let kx = ((bi % res) - (res - 1) / 2) * ((2 * kmax) / (res - 1)); let ky = (Math.floor(bi / res) - (res - 1) / 2) * ((2 * kmax) / (res - 1));
  const at = (x, y) => Q.diffraction(V, 0, 1, 20, [[x, y]])[0];
  // walk from the grid point to the top of the peak
  let h = (2 * kmax) / (res - 1) / 2;
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (const [dx, dy] of [[h, 0], [-h, 0], [0, h], [0, -h]]) if (at(kx + dx, ky + dy) > at(kx, ky)) { kx += dx; ky += dy; moved = true; }
    if (!moved) h /= 2;
  }
  let worst = 1;
  for (let k = 1; k < 10; k++) { const a = (k * Math.PI) / 5, x = kx * Math.cos(a) - ky * Math.sin(a), y = kx * Math.sin(a) + ky * Math.cos(a); worst = Math.min(worst, at(x, y) / at(kx, ky)); }
  // A finite patch is close to tenfold symmetric: 95.7% at radius 10, 99.7% at 20.
  check('Penrose diffraction has tenfold symmetry', worst > 0.99, `weakest of 10 copies at ${(worst * 100).toFixed(1)}%`);
  let mean = 0; for (const v of I) mean += v; mean /= I.length;
  check('Penrose diffraction has sharp peaks', best / mean > 40, `peak ${(best / mean).toFixed(0)} times the mean`);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
