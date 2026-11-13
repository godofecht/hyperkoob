// String theory's hidden dimensions, in the parts that are plain maths:
// a circle dimension and its tower of waves, T-duality, the critical
// dimension, and a cross-section of a Calabi-Yau shape.
// Units: the string length sqrt(alpha') is 1.
(function (g) {
  // A wave going round a hidden circle of radius R must fit a whole number n
  // of wavelengths, so its momentum round the circle, and its energy, is n/R.
  const kk = (n, R) => Math.abs(n) / R;
  // A closed string on the circle also winds w times round it, costing w R.
  // Ignoring oscillations, its energy is sqrt((n/R)^2 + (w R)^2).
  const level = (n, w, R) => Math.hypot(n / R, w * R);
  function spectrum(R, nmax = 3, wmax = 3) {
    const out = [];
    for (let n = -nmax; n <= nmax; n++) for (let w = -wmax; w <= wmax; w++) out.push(level(n, w, R));
    return out.sort((a, b) => a - b);
  }
  // The zero-point energy of D - 2 vibrating directions is (D - 2) times
  // half of 1 + 2 + 3 + ..., which is -1/12 once regularised; a consistent
  // string needs it to be -1, so (D - 2) / 24 = 1 and D = 26. With
  // superpartners each direction gives -1/16 in total and the target is
  // -1/2, so D = 10.
  const bosonic = (D) => (D - 2) / 24;
  const superstring = (D) => (D - 2) / 16;
  // The smoothed sum of 1 + 2 + 3 + ... with damping e^(-eps n): it is
  // 1/eps^2 - 1/12 + O(eps^2), so after the divergent 1/eps^2 the part left is -1/12.
  function smoothedSum(eps) { const q = Math.exp(-eps); return q / (1 - q) ** 2; }

  // Complex numbers as [re, im].
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cexp = (a) => { const e = Math.exp(a[0]); return [e * Math.cos(a[1]), e * Math.sin(a[1])]; };
  const clog = (a) => [Math.log(Math.hypot(a[0], a[1])), Math.atan2(a[1], a[0])];
  const cpow = (a, p) => (a[0] === 0 && a[1] === 0 ? [0, 0] : cexp([p * clog(a)[0], p * clog(a)[1]]));
  const ccos = (x, y) => [Math.cos(x) * Math.cosh(y), -Math.sin(x) * Math.sinh(y)];
  const csin = (x, y) => [Math.sin(x) * Math.cosh(y), Math.cos(x) * Math.sinh(y)];
  // The curve z1^n + z2^n = 1 in C^2 = R^4, after A. J. Hanson: n^2 patches
  // z1 = e^(2 pi i k1 / n) cos(xi)^(2/n), z2 = e^(2 pi i k2 / n) sin(xi)^(2/n)
  // over xi = a + i b with a in [0, pi/2]. For n = 5 it is a slice of the
  // quintic, the Calabi-Yau shape most used as an example.
  function calabiYau(n, res = 10, B = 1.2) {
    const patches = [];
    for (let k1 = 0; k1 < n; k1++) for (let k2 = 0; k2 < n; k2++) {
      const u1 = cexp([0, (2 * Math.PI * k1) / n]), u2 = cexp([0, (2 * Math.PI * k2) / n]), grid = [];
      for (let i = 0; i <= res; i++) {
        const row = [];
        for (let j = 0; j <= res; j++) {
          const a = (Math.PI / 2) * (i / res), b = -B + 2 * B * (j / res);
          const z1 = cmul(u1, cpow(ccos(a, b), 2 / n)), z2 = cmul(u2, cpow(csin(a, b), 2 / n));
          row.push([z1[0], z2[0], z1[1], z2[1]]);
        }
        grid.push(row);
      }
      patches.push({ k1, k2, grid });
    }
    return patches;
  }
  const residual = (p, n) => { const z1 = [p[0], p[2]], z2 = [p[1], p[3]]; let a = [1, 0], b = [1, 0]; for (let i = 0; i < n; i++) { a = cmul(a, z1); b = cmul(b, z2); } return Math.hypot(a[0] + b[0] - 1, a[1] + b[1]); };

  g.Strings = { kk, level, spectrum, bosonic, superstring, smoothedSum, calabiYau, residual };
})(typeof window !== 'undefined' ? window : globalThis);
