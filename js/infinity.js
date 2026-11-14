// Infinity: a line that fills a square, counting the fractions but not the
// reals, the free group that splits into copies of itself, and a horn you can
// fill but cannot paint. Pure maths; runs in the browser and in Node.
(function (g) {
  // ---------- curves that fill a square ----------
  // Cell (x, y) of a 2^n grid visited d-th by the Hilbert curve.
  function hilbert(n, d) {
    let x = 0, y = 0, t = d;
    for (let s = 1; s < 1 << n; s <<= 1) {
      const rx = 1 & (t >> 1), ry = 1 & (t ^ rx);
      if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const k = x; x = y; y = k; }
      x += s * rx; y += s * ry; t >>= 2;
    }
    return [x, y];
  }
  // Peano's own curve on a 3^n grid: t = 0.a1 a2 a3 ... in base 3, with
  // x = 0.a1 k^(a2)(a3) ... and y = 0.k^(a1)(a2) k^(a1+a3)(a4) ..., where k(a) = 2 - a.
  function peano(n, d) {
    const a = [];
    for (let i = 0; i < 2 * n; i++) { a.unshift(d % 3); d = Math.floor(d / 3); }
    let x = 0, y = 0, sx = 0, sy = 0;
    for (let i = 0; i < n; i++) {
      const p = a[2 * i], q = a[2 * i + 1];
      sy += p; // digits of y flip after an odd sum of x's digits so far
      x = 3 * x + (sx % 2 ? 2 - p : p);
      y = 3 * y + (sy % 2 ? 2 - q : q);
      sx += q;
    }
    return [x, y];
  }
  // The Z-order: interleave the bits. Every cell once, but with jumps.
  function zorder(n, d) {
    let x = 0, y = 0;
    for (let i = 0; i < n; i++) { x |= ((d >> (2 * i)) & 1) << i; y |= ((d >> (2 * i + 1)) & 1) << i; }
    return [x, y];
  }
  const CURVES = {
    hilbert: { name: 'Hilbert', base: 2, f: hilbert, maxOrder: 8 },
    peano: { name: 'Peano', base: 3, f: peano, maxOrder: 5 },
    zorder: { name: 'Z-order', base: 2, f: zorder, maxOrder: 8 },
  };
  // The cells in order, as points in the unit square at the cell centres.
  function curvePath(kind, n) {
    const C = CURVES[kind], side = C.base ** n, N = side * side, out = new Array(N);
    for (let d = 0; d < N; d++) { const [x, y] = C.f(n, d); out[d] = [(x + 0.5) / side, (y + 0.5) / side]; }
    return out;
  }
  // Longest step between consecutive cells, in cells.
  function longestStep(kind, n) {
    const C = CURVES[kind], N = C.base ** (2 * n); let m = 0, p = C.f(n, 0);
    for (let d = 1; d < N; d++) { const q = C.f(n, d); m = Math.max(m, Math.hypot(q[0] - p[0], q[1] - p[1])); p = q; }
    return m;
  }

  // ---------- counting ----------
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // Positive fractions p/q in Cantor's zigzag order through the grid, with
  // the ones already counted (2/4 is 1/2) marked as skipped.
  function zigzag(count) {
    const out = []; let k = 0;
    for (let s = 2; out.length < count; s++) {
      const up = s % 2 === 0; // alternate direction on each diagonal
      for (let i = 1; i < s && out.length < count; i++) {
        const p = up ? i : s - i, q = s - p;
        const fresh = gcd(p, q) === 1;
        out.push({ p, q, fresh, n: fresh ? ++k : 0 });
      }
    }
    return out;
  }
  // Cantor's diagonal: a number whose i-th digit differs from row i's.
  function diagonal(rows) { return rows.map((r, i) => 1 - r[i]); }

  // ---------- the free group on a and b ----------
  // Words are strings over a, A (a inverse), b, B. Reduced: no aA, Aa, bB, Bb.
  const INV = { a: 'A', A: 'a', b: 'B', B: 'b' };
  const LETTERS = ['a', 'b', 'A', 'B'];
  function words(depth) {
    const out = [''];
    let layer = [''];
    for (let l = 0; l < depth; l++) {
      const next = [];
      for (const w of layer) for (const x of LETTERS) if (!w.length || INV[w[w.length - 1]] !== x) next.push(w + x);
      out.push(...next); layer = next;
    }
    return out;
  }
  // x times w, reduced
  const times = (x, w) => (w[0] === INV[x] ? w.slice(1) : x + w);
  // the piece W(x): words that start with x
  const piece = (ws, x) => ws.filter((w) => w[0] === x);

  // The group acts on the hyperbolic plane (Poincare disk): a moves a step of
  // length L to the right, b a step up. Each word is the point its moves send
  // the centre to. Moves are 2x2 complex matrices [[1, r u], [r conj(u), 1]].
  const cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
  const cadd = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const cdiv = (p, q) => { const d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; };
  const DIR = { a: [1, 0], A: [-1, 0], b: [0, 1], B: [0, -1] };
  // a step of hyperbolic length s in direction u
  function step(u, s) { const r = Math.tanh(s / 2); return [[1, 0], [r * u[0], r * u[1]], [r * u[0], -r * u[1]], [1, 0]]; }
  function mmul(M, N) {
    return [cadd(cm(M[0], N[0]), cm(M[1], N[2])), cadd(cm(M[0], N[1]), cm(M[1], N[3])), cadd(cm(M[2], N[0]), cm(M[3], N[2])), cadd(cm(M[2], N[1]), cm(M[3], N[3]))];
  }
  const apply = (M, z) => cdiv(cadd(cm(M[0], z), M[1]), cadd(cm(M[2], z), M[3]));
  const I2 = [[1, 0], [0, 0], [0, 0], [1, 0]];
  function wordMatrix(w, L) { let M = I2; for (const x of w) M = mmul(M, step(DIR[x], L)); return M; }
  const place = (w, L) => apply(wordMatrix(w, L), [0, 0]);
  // The step length at which the four pieces' half-planes stop overlapping,
  // the condition of the ping-pong lemma: tanh(L/2) > cos 45 degrees.
  const MIN_STEP = 2 * Math.atanh(Math.SQRT1_2);
  // The boundary of the half-plane holding W(x): a geodesic crossing x's axis
  // halfway along the first step, as a closed outline of the cap it cuts off.
  function cap(x, L, n = 48) {
    const x0 = Math.tanh(L / 4), c = (1 + x0 * x0) / (2 * x0), rho = c - x0, phi = Math.acos(1 / c);
    const psi = Math.atan2(Math.sin(phi), Math.cos(phi) - c), out = [];
    for (let i = 0; i <= n; i++) { const t = psi + (i / n) * 2 * (Math.PI - psi); out.push([c + rho * Math.cos(t), rho * Math.sin(t)]); }
    for (let i = 0; i <= n; i++) { const t = -phi + (i / n) * 2 * phi; out.push([Math.cos(t), Math.sin(t)]); }
    const u = DIR[x];
    return out.map(([p, q]) => [u[0] * p - u[1] * q, u[1] * p + u[0] * q]);
  }

  // ---------- Gabriel's horn: y = 1/x from 1 to L, spun round the x axis ----------
  const hornVolume = (L) => Math.PI * (1 - 1 / L);
  // surface 2 pi int_1^L sqrt(1 + 1/x^4) / x dx, in u = ln x
  function hornSurface(L) {
    const U = Math.log(L), n = Math.max(200, Math.ceil(U * 200)), h = U / n;
    let s = 0;
    for (let i = 0; i <= n; i++) { const x = Math.exp(i * h), f = Math.sqrt(1 + 1 / x ** 4); s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * f; }
    return 2 * Math.PI * (s * h) / 3;
  }

  g.Infinite = { CURVES, hilbert, peano, zorder, curvePath, longestStep, gcd, zigzag, diagonal, INV, LETTERS, words, times, piece, DIR, step, mmul, apply, wordMatrix, place, MIN_STEP, cap, hornVolume, hornSurface };
})(typeof window !== 'undefined' ? window : globalThis);
