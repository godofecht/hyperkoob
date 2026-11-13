// High-dimensional geometry that defies intuition. Exact formulas where they
// exist; seeded samples where they do not.
(function (g) {
  // log Gamma by Lanczos, good to about 1e-14 for x > 0
  const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lnGamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
    x -= 1; let a = 0.99999999999980993; const t = x + 7.5;
    for (let i = 0; i < 8; i++) a += LG[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  // log of the volume of the unit ball in n dimensions: pi^(n/2) / Gamma(n/2 + 1)
  const lnBall = (n) => (n / 2) * Math.log(Math.PI) - lnGamma(n / 2 + 1);
  // where the volume peaks, by golden-section search on the smooth formula
  function ballPeak() {
    let a = 2, b = 10;
    for (let i = 0; i < 200; i++) { const m1 = b - (b - a) / 1.618033988749895, m2 = a + (b - a) / 1.618033988749895; if (lnBall(m1) < lnBall(m2)) a = m1; else b = m2; }
    return (a + b) / 2;
  }
  // share of a ball's volume in its outer shell of relative thickness eps
  const shell = (n, eps) => 1 - Math.exp(n * Math.log1p(-eps));
  // density of the radius of a uniform point in the unit n-ball: n r^(n-1)
  const radiusDensity = (n, r) => (r <= 0 ? (n === 1 ? 1 : 0) : Math.exp(Math.log(n) + (n - 1) * Math.log(r)));
  // density of the angle between two random directions in n dimensions,
  // proportional to sin^(n-2): normalised with Gamma functions
  function angleDensity(n, th) {
    if (n < 2) return 0;
    const s = Math.sin(th);
    if (s <= 0) return n === 2 ? 1 / Math.PI : 0;
    const lnC = lnGamma(n / 2) - lnGamma((n - 1) / 2) - 0.5 * Math.log(Math.PI);
    return Math.exp(lnC + (n - 2) * Math.log(s));
  }
  // standard deviation of that angle, from the density by quadrature
  function angleSpread(n) {
    const N = 4000; let m = 0, v = 0, z = 0;
    for (let i = 0; i < N; i++) { const th = ((i + 0.5) / N) * Math.PI, p = angleDensity(n, th) * (Math.PI / N); z += p; m += p * th; v += p * th * th; }
    m /= z; return Math.sqrt(v / z - m * m);
  }
  // In a box of side 4, put a unit sphere in each of the 2^n corners. The
  // sphere in the middle that touches them all has radius sqrt(n) - 1, and
  // from n = 10 on it reaches past the walls at distance 2.
  const middleSphere = (n) => Math.sqrt(n) - 1;

  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296; }
  // Distances from one random point of the unit n-cube to `count` others.
  // Coordinates are streamed so huge n needs no big arrays.
  function distances(n, count, seed = 7) {
    const r = rng(seed), q = new Float64Array(Math.min(n, 1 << 20));
    // the query point is regenerated in blocks from its own seed
    const out = new Float64Array(count);
    const rq = rng(seed * 31 + 1);
    const blocks = Math.ceil(n / q.length);
    for (let b = 0; b < blocks; b++) {
      const len = Math.min(q.length, n - b * q.length);
      for (let i = 0; i < len; i++) q[i] = rq();
      for (let j = 0; j < count; j++) {
        let s = 0;
        for (let i = 0; i < len; i++) { const d = r() - q[i]; s += d * d; }
        out[j] += s;
      }
    }
    for (let j = 0; j < count; j++) out[j] = Math.sqrt(out[j]);
    return out;
  }
  // (farthest - nearest) / nearest: how much "near" still means anything
  function contrast(ds) { let lo = Infinity, hi = 0; for (const d of ds) { lo = Math.min(lo, d); hi = Math.max(hi, d); } return (hi - lo) / lo; }

  // Format a number given by its natural log, as a power of ten when tiny or huge.
  function fmtLn(lnx, digits = 3) {
    const l10 = lnx / Math.LN10;
    if (l10 > -4 && l10 < 6) return Number(Math.exp(lnx).toPrecision(digits)).toLocaleString('en-US', { maximumSignificantDigits: digits });
    const e = Math.floor(l10), m = 10 ** (l10 - e);
    return `${m.toFixed(digits - 1)} × 10^${e}`;
  }

  g.HighD = { lnGamma, lnBall, ballPeak, shell, radiusDensity, angleDensity, angleSpread, middleSphere, distances, contrast, fmtLn };
})(typeof window !== 'undefined' ? window : globalThis);
