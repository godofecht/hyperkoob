// Quasicrystals as shadows of the cube grid Z^m (de Bruijn's multigrid,
// equivalent to cut-and-project with the canonical window).
//
// A d-dimensional slice through Z^m is spanned by the d orthonormal rows of
// G (d x m). Column g_i of G is where axis i of the grid lands in the slice.
// For each grid i draw the lines z . g_i + gam_i = integer. Every point where
// d of these grids cross becomes one tile: the face of the m-cube grid at the
// lattice point K, with K_i = ceil(z . g_i + gam_i), spanned by the crossing
// axes. Cast onto the slice, that face is a rhombus (d = 2) or a rhombohedron
// (d = 3). When the slice contains other lattice points the tiling repeats.
(function (g) {
  const H = g.Hyper;
  const PHI = (1 + Math.sqrt(5)) / 2;
  // Fibonacci ratios p/q, the best fractions for the golden ratio.
  const FIB = [[1, 1], [2, 1], [3, 2], [5, 3], [8, 5], [13, 8], [21, 13], [34, 21]];
  // Denominators for other m: each entry of the slice is rounded to a fraction.
  const DEN = [2, 3, 4, 6, 8, 12, 16, 24];
  const STEPS = FIB.length; // step STEPS is the exact slice

  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296; }

  // The star of m directions, rows (cos, sin). Odd m uses 2*pi*k/m, the
  // classic Penrose star for m = 5. Even m uses pi*k/m, since 2*pi*k/m would
  // repeat directions. Both give 2m-fold symmetry. j picks a conjugate star.
  function star(m, j = 1) {
    const odd = m % 2 === 1, c = new Array(m), s = new Array(m);
    for (let k = 0; k < m; k++) { const a = ((odd ? 2 : 1) * Math.PI * k * j) / m; c[k] = Math.cos(a); s[k] = Math.sin(a); }
    return [c, s];
  }

  // Gram-Schmidt: orthonormal rows spanning the given rows, skipping any that
  // are dependent. `against` rows are projected out first.
  function orthonormal(rows, against = [], want = rows.length) {
    const out = [];
    for (const r0 of rows) {
      const r = r0.slice();
      for (const b of [...against, ...out]) { const p = dot(r, b); for (let i = 0; i < r.length; i++) r[i] -= p * b[i]; }
      const l = Math.hypot(...r);
      if (l > 1e-7 * Math.max(1, Math.hypot(...r0))) { out.push(r.map((x) => x / l)); if (out.length === want) break; }
    }
    return out;
  }

  // Closest orthogonal matrix (polar factor) of a small square matrix.
  function polar(A) {
    const d = A.length;
    let X = A.map((r) => r.slice());
    for (let it = 0; it < 30; it++) {
      const inv = invert(X);
      if (!inv) break;
      X = X.map((r, i) => r.map((v, j) => (v + inv[j][i]) / 2));
    }
    return X;
  }
  function det(M) {
    if (M.length === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
    return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  }
  function invert(M) {
    const D = det(M);
    if (Math.abs(D) < 1e-14) return null;
    if (M.length === 2) return [[M[1][1] / D, -M[0][1] / D], [-M[1][0] / D, M[0][0] / D]];
    const [a, b, c] = M[0], [d, e, f] = M[1], [gg, h, i] = M[2];
    return [
      [(e * i - f * h) / D, (c * h - b * i) / D, (b * f - c * e) / D],
      [(f * gg - d * i) / D, (a * i - c * gg) / D, (c * d - a * f) / D],
      [(d * h - e * gg) / D, (b * gg - a * h) / D, (a * e - b * d) / D],
    ];
  }

  // The 2D slice for grid dimension m at tilt step `step` (0..STEPS).
  // Returns integer rows when the slice is rational, so its period is exact.
  function slice2(m, step) {
    const [c, s] = star(m);
    // Three directions at 120 degrees span the plane x + y + z = 0, which
    // holds the lattice points (1,-1,0) and (0,1,-1): it always repeats.
    if (m === 3) return { rows: [c, s], ints: [[1, -1, 0], [0, 1, -1]], label: 'always repeats', fixed: true };
    if (step >= STEPS) return { rows: [c, s], ints: null, label: m === 5 ? 'golden ratio' : 'exact' };
    let v1, v2, label;
    if (m === 5) {
      // c = (1, a, b, b, a) with a = (tau - 1)/2 and b = -tau/2. Put tau = p/q
      // and scale by 2q. Turning the star by 72 degrees shifts the entries.
      const [p, q] = FIB[step];
      v1 = [2 * q, p - q, -p, -p, p - q];
      v2 = [v1[4], v1[0], v1[1], v1[2], v1[3]];
      label = `${p}/${q}`;
    } else {
      const Q = DEN[step];
      v1 = c.map((x) => Math.round(x * Q)); v2 = s.map((x) => Math.round(x * Q));
      label = `rounded to 1/${Q}`;
    }
    if (orthonormal([v1, v2]).length < 2) return slice2(m, step + 1);
    return { rows: [v1, v2], ints: [v1, v2], label };
  }

  // Integer lattice of the rational plane spanned by integer rows v1, v2:
  // the saturation of Z v1 + Z v2 inside Z^m.
  function planeLattice(v1, v2) {
    const g1 = v1.reduce((a, x) => gcd(a, x), 0);
    const u1 = v1.map((x) => x / g1);
    let I = 0;
    for (let i = 0; i < u1.length; i++) for (let j = i + 1; j < u1.length; j++) I = gcd(I, u1[i] * v2[j] - u1[j] * v2[i]);
    if (!I) return null;
    for (let k = 0; k < I; k++) {
      const w = v2.map((x, i) => x + k * u1[i]);
      if (w.every((x) => x % I === 0)) return [u1, w.map((x) => x / I)];
    }
    return null;
  }

  // Everything needed to build the tiling: grid vectors, offsets, scale.
  // d = 2: m-fold star, with a tilt step. d = 3: the page's own 3D frame.
  function setup(d, m, step = STEPS, seed = 1) {
    m = Math.max(3, Math.round(m));
    let G, sl = null;
    if (d === 2) {
      sl = slice2(m, step);
      G = orthonormal(sl.rows);
      // Turn the approximate slice to line up with the exact one, so the
      // tiling does not spin as the tilt changes.
      if (sl.ints && !sl.fixed) {
        const E = orthonormal(star(m));
        const A = [0, 1].map((i) => [0, 1].map((j) => dot(E[i], G[j])));
        const R = polar(A);
        G = [0, 1].map((i) => G[0].map((_, k) => R[i][0] * G[0][k] + R[i][1] * G[1][k]));
      }
    } else {
      const cols = H.frame3(m, 'diag');
      G = [0, 1, 2].map((a) => cols.map((c) => c[a]));
    }
    const cols = G[0].map((_, i) => G.map((r) => r[i]));
    // Offsets: generic, so no d+1 grid lines meet at a point. For m = 5 they
    // sum to zero, which is what makes the tiling Penrose's.
    const r = rng(seed * 7919 + m * 104729 + d);
    const gam = Array.from({ length: m }, () => r() * 0.8 + 0.1);
    if (m === 5 && d === 2) { const mean = gam.reduce((a, b) => a + b) / 5; for (let i = 0; i < 5; i++) gam[i] -= mean; }
    const s = Math.sqrt(m / d); // makes the average edge length 1
    // Tiles per unit volume: one per crossing of d grids.
    let density = 0;
    if (d === 2) {
      for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) density += Math.abs(cols[i][0] * cols[j][1] - cols[i][1] * cols[j][0]);
    } else {
      const C3 = (m * (m - 1) * (m - 2)) / 6;
      if (C3 <= 400000) {
        for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) for (let k = j + 1; k < m; k++) density += Math.abs(det([cols[i], cols[j], cols[k]]));
      } else {
        const rr = rng(99); let acc = 0; const N = 200000;
        for (let t = 0; t < N; t++) {
          const i = Math.floor(rr() * m); let j = Math.floor(rr() * m), k = Math.floor(rr() * m);
          if (i === j || j === k || i === k) { t--; continue; }
          acc += Math.abs(det([cols[i], cols[j], cols[k]]));
        }
        density = (acc / N) * C3;
      }
    }
    density /= s ** d;
    // Internal view: two directions in the hidden space, from a conjugate star.
    let inner = [];
    if (d === 2) {
      let j = m % 2 ? 2 : 3;
      while (gcd(j, 2 * m) !== 1 && j < 2 * m) j++;
      const cand = [...star(m, j), m % 2 ? null : Array(m).fill(1)].filter(Boolean);
      inner = orthonormal(cand, G, 2);
      if (m % 2 === 1 && inner.length < 2) inner.push(...orthonormal([Array(m).fill(1)], [...G, ...inner], 2 - inner.length));
      while (inner.length < 2) inner.push(Array(m).fill(0));
    }
    const shapes = new Map();
    return { d, m, step, seed, G, cols, gam, s, density, inner, slice: sl, shapes };
  }

  function shapeOf(S, P) {
    if (P.d === 2) { const k = Math.abs(P.S0 = S[1] - S[0]); return Math.min(k, P.m - k); }
    const v = Math.abs(det(S.map((i) => P.cols[i]))).toFixed(6);
    if (!P.shapes.has(v)) P.shapes.set(v, P.shapes.size);
    return P.shapes.get(v);
  }

  // Lattice point at slice position z: K_i = ceil(z . g_i + gam_i).
  function lift(P, z, S, n) {
    const K = new Array(P.m);
    for (let i = 0; i < P.m; i++) { let t = P.gam[i]; for (let a = 0; a < P.d; a++) t += z[a] * P.cols[i][a]; K[i] = Math.ceil(t); }
    S.forEach((i, a) => { K[i] = n[a]; });
    return K;
  }

  // Physical position of lattice point K: s * G (K - gam - 1/2).
  function place(P, K) {
    const out = new Array(P.d).fill(0);
    for (let i = 0; i < P.m; i++) { const w = K[i] - P.gam[i] - 0.5; for (let a = 0; a < P.d; a++) out[a] += P.cols[i][a] * w; }
    return out.map((x) => x * P.s);
  }

  // Build every tile whose crossing lies within radius R. A generator, so a
  // caller can spread the work across animation frames.
  function* build(P, R, out) {
    const { d, m, cols, gam, s } = P;
    // A tile sits near s * z, give or take the shadow of half a cube, so
    // search a little wider in z and keep tiles by their real position.
    const Rz = R / s + Math.min(1.5, 0.5 * Math.sqrt(d * m));
    const tiles = out || [];
    const S = new Array(d).fill(0).map((_, i) => i);
    let since = 0;
    const total = d === 2 ? (m * (m - 1)) / 2 : (m * (m - 1) * (m - 2)) / 6;
    let done = 0;
    for (;;) {
      const M = S.map((i) => cols[i]), Mi = invert(M);
      if (Mi) {
        const lo = S.map((i) => Math.ceil(gam[i] - Rz * Math.hypot(...cols[i]) - 1e-9));
        const hi = S.map((i) => Math.floor(gam[i] + Rz * Math.hypot(...cols[i]) + 1e-9));
        const n = lo.slice();
        for (;;) {
          const rhs = n.map((v, a) => v - gam[S[a]]);
          const z = Mi.map((row) => dot(row, rhs));
          if (Math.hypot(...z) <= Rz) {
            const K = lift(P, z, S, n);
            const base = place(P, K);
            const edges = S.map((i) => cols[i].map((x) => x * s));
            const center = base.map((x, a) => x + edges.reduce((acc, e) => acc + e[a] / 2, 0));
            const rc = Math.hypot(...center);
            if (rc <= R) tiles.push({ S: S.slice(), z, base, edges, center, r: rc, shape: shapeOf(S, P), layer: K.reduce((a, b) => a + b, 0) });
          }
          let a = d - 1;
          while (a >= 0 && n[a] >= hi[a]) { n[a] = lo[a]; a--; }
          if (a < 0) break;
          n[a]++;
        }
      }
      done++;
      if (++since >= 64) { since = 0; yield done / total; }
      // next d-subset of 0..m-1
      let a = d - 1;
      while (a >= 0 && S[a] === m - d + a) a--;
      if (a < 0) break;
      S[a]++;
      for (let b = a + 1; b < d; b++) S[b] = S[b - 1] + 1;
    }
    return tiles;
  }
  function buildAll(P, R) { const it = build(P, R, []); let r; do { r = it.next(); } while (!r.done); return r.value; }

  // Corners of a tile in physical space.
  function corners(t) {
    if (t.edges.length === 2) {
      const [a, b] = t.edges, o = t.base;
      return [o, [o[0] + a[0], o[1] + a[1]], [o[0] + a[0] + b[0], o[1] + a[1] + b[1]], [o[0] + b[0], o[1] + b[1]]];
    }
    const out = [];
    for (let e = 0; e < 8; e++) out.push(t.base.map((x, k) => x + (e & 1 ? t.edges[0][k] : 0) + (e & 2 ? t.edges[1][k] : 0) + (e & 4 ? t.edges[2][k] : 0)));
    return out;
  }

  // Lattice coordinates of the tile's lower corner, for display.
  function latticeOf(P, t) { return lift(P, t.z, t.S, t.S.map((i) => Math.round(t.z.reduce((acc, v, a) => acc + v * P.cols[i][a], 0) + P.gam[i]))); }

  // Vertices with their positions in the hidden directions (2D only).
  function vertices(P, tiles) {
    const seen = new Map(), q = 1e6;
    for (const t of tiles) {
      const K = latticeOf(P, t);
      for (let e = 0; e < 4; e++) {
        const KK = K.slice();
        if (e & 1) KK[t.S[0]]++;
        if (e & 2) KK[t.S[1]]++;
        const x = place(P, KK), key = Math.round(x[0] * q) + ',' + Math.round(x[1] * q);
        if (seen.has(key)) continue;
        seen.set(key, { x, y: P.inner.map((row) => dot(row, KK)), layer: KK.reduce((a, b) => a + b, 0), r: Math.hypot(...x) });
      }
    }
    return [...seen.values()];
  }

  // The outline of the window in the internal view: every corner's hidden
  // coordinates land inside the shadow of [0,1]^m, shifted by gam.
  function window2(P) {
    const cols = P.inner[0].map((_, i) => [P.inner[0][i], P.inner[1][i]]);
    const ctr = [0, 1].map((a) => P.inner[a].reduce((acc, v, i) => acc + v * (P.gam[i] + 0.5), 0));
    return H.outline2(cols, Array(P.m).fill(1)).map((p) => [p[0] + ctr[0], p[1] + ctr[1]]);
  }

  // Period of a rational 2D slice, in physical space, Lagrange-reduced.
  function period(P) {
    if (!P.slice || !P.slice.ints) return null;
    const L = planeLattice(...P.slice.ints);
    if (!L) return null;
    const phys = (K) => [0, 1].map((a) => P.s * dot(P.G[a], K));
    let a = L[0], b = L[1];
    let pa = phys(a), pb = phys(b);
    for (let it = 0; it < 100; it++) {
      if (Math.hypot(...pb) < Math.hypot(...pa)) { [a, b] = [b, a]; [pa, pb] = [pb, pa]; }
      const mu = Math.round(dot(pa, pb) / dot(pa, pa));
      if (!mu) break;
      b = b.map((x, i) => x - mu * a[i]); pb = phys(b);
    }
    const area = Math.abs(pa[0] * pb[1] - pa[1] * pb[0]);
    return { lattice: [a, b], vecs: [pa, pb], area, tiles: Math.round(area * P.density) };
  }

  // Which tiles contain point p (for checks and hover).
  function contains(t, p) {
    const d = t.edges.length, M = [0, 1, 2].slice(0, d).map((r) => t.edges.map((e) => e[r]));
    const Mi = invert(M);
    if (!Mi) return false;
    const u = Mi.map((row) => dot(row, p.map((v, k) => v - t.base[k])));
    return u.every((x) => x >= -1e-9 && x <= 1 + 1e-9);
  }

  g.Quasi = { PHI, FIB, DEN, STEPS, star, setup, build, buildAll, corners, latticeOf, vertices, window2, period, planeLattice, contains, place };
})(typeof window !== 'undefined' ? window : globalThis);
