// E8: its roots, its Coxeter plane, and the Elser-Sloane quasicrystal cut
// from it.
//
// The Coxeter element w of E8 (the product of the eight simple
// reflections) has order 30. R^8 splits into four planes that w turns by
// 2 pi m / 30 for the exponents m = 1, 7, 11, 13 (and their negatives).
// The m = 1 plane is the Coxeter plane, where the 240 roots show 30-fold
// symmetry. The m = 1 and m = 11 planes together are a 4D space on which E8
// projects with the symmetry of the 600-cell (H4); the other two planes are
// the hidden space. Cutting E8 with a window in the hidden space gives the
// Elser-Sloane quasicrystal.
(function (g) {
  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

  function roots() {
    const out = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const v = Array(8).fill(0); v[i] = a; v[j] = b; out.push(v);
    }
    for (let m = 0; m < 256; m++) {
      let neg = 0; const v = [];
      for (let k = 0; k < 8; k++) { const s = (m >> k) & 1; neg += s; v.push(s ? -0.5 : 0.5); }
      if (neg % 2 === 0) out.push(v);
    }
    return out;
  }
  const SIMPLE = [
    [0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5],
    [1, 1, 0, 0, 0, 0, 0, 0],
    [-1, 1, 0, 0, 0, 0, 0, 0],
    [0, -1, 1, 0, 0, 0, 0, 0],
    [0, 0, -1, 1, 0, 0, 0, 0],
    [0, 0, 0, -1, 1, 0, 0, 0],
    [0, 0, 0, 0, -1, 1, 0, 0],
    [0, 0, 0, 0, 0, -1, 1, 0],
  ];
  const I8 = () => Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => (i === j ? 1 : 0)));
  const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const reflect = (a) => { const n = dot(a, a); return I8().map((r, i) => r.map((v, j) => v - (2 * a[i] * a[j]) / n)); };
  const W = SIMPLE.reduce((M, a) => mul(M, reflect(a)), I8());
  // Projector onto the real plane that w turns by 2 pi m / 30.
  function projector(m) {
    let P = Array.from({ length: 8 }, () => Array(8).fill(0)), Wk = I8();
    for (let k = 0; k < 30; k++) {
      const c = (2 / 30) * Math.cos((2 * Math.PI * m * k) / 30);
      P = P.map((r, i) => r.map((v, j) => v + c * Wk[i][j]));
      Wk = mul(Wk, W);
    }
    return P;
  }
  // Two orthonormal rows spanning a projector's image, oriented so that w
  // turns the first towards the second.
  function plane(m) {
    const P = projector(m);
    let best = 0; P.forEach((r, i) => { if (dot(r, r) > dot(P[best], P[best])) best = i; });
    const u = P[best].map((x) => x / Math.hypot(...P[best]));
    // the image of u under w, minus its u part, gives the second direction
    const wu = W.map((r) => dot(r, u)), v0 = wu.map((x, i) => x - dot(wu, u) * u[i]), lv = Math.hypot(...v0);
    return [u, v0.map((x) => x / lv)];
  }
  const COXETER = plane(1);
  const PHYS = [...plane(1), ...plane(11)], PERP = [...plane(7), ...plane(13)];

  // Points of E8 with squared length at most r2: integer vectors with even
  // sum, and half-integer vectors with even sum.
  function points(r2) {
    const out = [], v = new Array(8);
    const go = (k, left, half, sum) => {
      if (k === 8) { if (((sum % 2) + 2) % 2 === 0) out.push(v.map((x) => x + (half ? 0.5 : 0))); return; }
      const lim = Math.floor(Math.sqrt(left) + (half ? 0.5 : 0) + 1e-9);
      for (let a = -lim - 1; a <= lim; a++) {
        const x = a + (half ? 0.5 : 0), x2 = x * x;
        if (x2 > left + 1e-9) continue;
        v[k] = a; go(k + 1, left - x2, half, sum + (half ? a : a));
      }
    };
    go(0, r2, false, 0);
    // half-integer vectors: coordinates a + 1/2; the sum of the (a + 1/2) is even
    const hv = new Array(8);
    const goH = (k, left, sum2) => {
      if (k === 8) { if (sum2 % 4 === 0) out.push(hv.map((a) => a + 0.5)); return; }
      for (let a = -4; a <= 3; a++) { const x = a + 0.5, x2 = x * x; if (x2 > left + 1e-9) continue; hv[k] = a; goH(k + 1, left - x2, sum2 + 2 * a + 1); }
    };
    goH(0, r2, 0);
    return out;
  }
  // The Elser-Sloane quasicrystal: E8 points whose hidden part lies in a
  // ball of radius `win` (a ball stands in for their 600-cell window), seen in
  // the 4D physical space.
  function quasicrystal(r2, win) {
    const out = [];
    for (const p of points(r2)) {
      const h = PERP.map((r) => dot(r, p));
      if (Math.hypot(...h) <= win) out.push({ p, x: PHYS.map((r) => dot(r, p)), h: Math.hypot(...h) });
    }
    return out;
  }

  g.E8 = { roots, SIMPLE, W, projector, plane, COXETER, PHYS, PERP, points, quasicrystal, dot, mul };
})(typeof window !== 'undefined' ? window : globalThis);
