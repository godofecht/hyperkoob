// Quasicrystals as shadows of the cube grid Z^m (de Bruijn's multigrid,
// equivalent to cut-and-project with the canonical window), in any slice
// dimension d.
//
// A d-dimensional slice through Z^m is spanned by the d orthonormal rows of
// G (d x m). Column g_i of G is where axis i of the grid lands in the slice.
// For each grid i draw the hyperplanes z . g_i + gam_i = integer. Every point
// where d of these grids cross becomes one tile: the face of the cube grid at
// lattice point K, with K_i = ceil(z . g_i + gam_i), spanned by the crossing
// axes. Cast onto the slice it is a parallelotope: a segment (d = 1), a
// rhombus (d = 2), a rhombohedron (d = 3) and so on. When the slice holds
// other lattice points the tiling repeats.
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
  function totient(n) { let r = n; for (let p = 2; p * p <= n; p++) if (n % p === 0) { while (n % p === 0) n /= p; r -= r / p; } if (n > 1) r -= r / n; return r; }
  function binom(n, k) { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; }

  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296; }

  // The star of m directions with exponent j, rows (cos, sin). Odd m uses
  // 2*pi*j*k/m, the classic Penrose star for m = 5, j = 1. Even m uses
  // pi*j*k/m, since 2*pi*k/m would repeat directions. Both give 2m-fold symmetry.
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
      for (let pass = 0; pass < 2; pass++) for (const b of [...against, ...out]) { const p = dot(r, b); for (let i = 0; i < r.length; i++) r[i] -= p * b[i]; }
      const l = Math.hypot(...r);
      if (l > 1e-7 * Math.max(1, Math.hypot(...r0))) { out.push(r.map((x) => x / l)); if (out.length === want) break; }
    }
    return out;
  }

  // Square matrices of any size: inverse and determinant by elimination.
  function invert(M) {
    const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;
      [A[c], A[p]] = [A[p], A[c]];
      const v = A[c][c];
      for (let k = 0; k < 2 * n; k++) A[c][k] /= v;
      for (let r = 0; r < n; r++) if (r !== c && A[r][c]) { const f = A[r][c]; for (let k = 0; k < 2 * n; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((r) => r.slice(n));
  }
  function det(M) {
    const n = M.length, A = M.map((r) => r.slice());
    let D = 1;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-15) return 0;
      if (p !== c) { [A[c], A[p]] = [A[p], A[c]]; D = -D; }
      D *= A[c][c];
      for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; }
    }
    return D;
  }
  // Closest orthogonal matrix (polar factor) of a small square matrix.
  function polar(A) {
    let X = A.map((r) => r.slice());
    for (let it = 0; it < 30; it++) {
      const inv = invert(X);
      if (!inv) break;
      X = X.map((r, i) => r.map((v, j) => (v + inv[j][i]) / 2));
    }
    return X;
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

  // The 1D slice: axis k lands at length tau^-k, so with m = 2 the tiles are
  // a long and a short segment in the golden ratio, the Fibonacci chain.
  function slice1(m, step) {
    if (m === 2 && step < STEPS) { const [p, q] = FIB[step]; return { rows: [[p, q]], ints: [[p, q]], label: `${p}/${q}` }; }
    return { rows: [Array.from({ length: m }, (_, k) => PHI ** -k)], ints: null, label: m === 2 ? 'golden ratio' : 'exact', fixed: m !== 2 };
  }

  // Slices of dimension 4 and up: planes from the conjugate stars. Exponents
  // j coprime to N give one irreducible block of dimension phi(N), which has
  // no lattice points until the slice takes all of it.
  function sliceN(d, m) {
    const odd = m % 2 === 1, N = odd ? m : 2 * m;
    const top = odd ? (m - 1) / 2 : m - 1, co = [], rest = [];
    for (let j = 1; j <= top; j++) { if (!odd && j % 2 === 0) continue; (gcd(j, N) === 1 ? co : rest).push(j); }
    for (let j = 2; !odd && j < m; j += 2) rest.push(j);
    const cand = [];
    for (const j of [...co, ...rest]) cand.push(...star(m, j));
    cand.push(Array(m).fill(1));
    for (let k = 0; k < m; k++) cand.push(Array.from({ length: m }, (_, i) => (i === k ? 1 : 0)));
    return { rows: orthonormal(cand, [], d), ints: null, label: 'exact', fixed: true, repeats: d >= totient(N) };
  }

  // Everything needed to build the tiling: grid vectors, offsets, scale.
  function setup(d, m, step = STEPS, seed = 1) {
    d = Math.max(1, Math.round(d));
    m = Math.max(d, Math.round(m));
    let G, sl, repeats;
    if (m === d) {
      G = Array.from({ length: d }, (_, a) => Array.from({ length: m }, (_, i) => (i === a ? 1 : 0)));
      sl = { rows: G, ints: null, label: 'the grid itself', fixed: true }; repeats = true;
    } else if (d === 1) {
      sl = slice1(m, step); G = orthonormal(sl.rows); repeats = !!sl.ints;
    } else if (d === 2) {
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
      repeats = !!sl.ints;
    } else if (d === 3) {
      const cols = H.frame3(m, 'diag');
      G = [0, 1, 2].map((a) => cols.map((c) => c[a]));
      sl = { rows: G, ints: null, label: 'exact', fixed: true }; repeats = m <= 4;
    } else {
      sl = sliceN(d, m); G = sl.rows; repeats = sl.repeats;
    }
    const cols = G[0].map((_, i) => G.map((r) => r[i]));
    // Offsets: generic, so no d+1 grid planes meet at a point. For the
    // Penrose case they sum to zero, which is what makes the tiling Penrose's.
    const r = rng(seed * 7919 + m * 104729 + d);
    const gam = Array.from({ length: m }, () => r() * 0.8 + 0.1);
    if (m === 5 && d === 2) { const mean = gam.reduce((a, b) => a + b) / 5; for (let i = 0; i < 5; i++) gam[i] -= mean; }
    const s = Math.sqrt(m / d); // makes the average edge length 1
    // Tiles per unit volume: one per crossing of d grids.
    let density = 0;
    const count = binom(m, d);
    if (count <= 200000) {
      const S = Array.from({ length: d }, (_, i) => i);
      for (;;) {
        density += Math.abs(det(S.map((i) => cols[i])));
        let a = d - 1; while (a >= 0 && S[a] === m - d + a) a--;
        if (a < 0) break;
        S[a]++; for (let b = a + 1; b < d; b++) S[b] = S[b - 1] + 1;
      }
    } else {
      const rr = rng(99), N = 60000; let acc = 0;
      for (let t = 0; t < N; t++) {
        const pick = new Set(); while (pick.size < d) pick.add(Math.floor(rr() * m));
        acc += Math.abs(det([...pick].map((i) => cols[i])));
      }
      density = (acc / N) * count;
    }
    density /= s ** d;
    // Internal view: two directions in the hidden space.
    let inner = [];
    if (d === 2) {
      let j = m % 2 ? 2 : 3;
      while (gcd(j, 2 * m) !== 1 && j < 2 * m) j++;
      const cand = [...star(m, j), m % 2 ? null : Array(m).fill(1)].filter(Boolean);
      inner = orthonormal(cand, G, 2);
    }
    if (inner.length < 2) {
      const cand = [];
      for (let j = 1; j <= m; j++) cand.push(...star(m, j));
      cand.push(Array(m).fill(1));
      for (let k = 0; k < m; k++) cand.push(Array.from({ length: m }, (_, i) => (i === k ? 1 : 0)));
      inner.push(...orthonormal(cand, [...G, ...inner], 2 - inner.length));
    }
    while (inner.length < 2) inner.push(Array(m).fill(0));
    // Corners sit on layers by coordinate sum when the slice is square to the diagonal.
    const layered = m > d && Math.hypot(...G.map((row) => row.reduce((a, b) => a + b, 0))) < 1e-9;
    return { d, m, step, seed, G, cols, gam, s, density, inner, slice: sl, repeats, layered, shapes: new Map() };
  }

  function shapeOf(S, P) {
    if (P.d === 2 && P.m > 2) { const k = Math.abs(S[1] - S[0]); return Math.min(k, P.m - k); }
    const v = Math.abs(det(S.map((i) => P.cols[i]))).toFixed(6);
    if (!P.shapes.has(v)) P.shapes.set(v, P.shapes.size + 1);
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

  // Integer points n with (n - t)' A (n - t) <= C, for positive definite A
  // (Fincke and Pohst): fix coordinates from the last one down, each within
  // the bounds the remaining budget allows.
  function ellipsoidPoints(A, t, C) {
    const d = t.length, L = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) {
      let v = A[i][j]; for (let k = 0; k < j; k++) v -= L[i][k] * L[j][k];
      if (i === j) { if (v <= 0) return []; L[i][i] = Math.sqrt(v); } else L[i][j] = v / L[j][j];
    }
    // A = U'U with U = L'; q = sum_i (U_ii (y_i + sum_{j>i} U_ij/U_ii y_j))^2
    const out = [], n = new Array(d), rem = new Array(d + 1);
    rem[d] = C;
    const go = (i) => {
      let c = t[i];
      for (let j = i + 1; j < d; j++) c -= (L[j][i] / L[i][i]) * (n[j] - t[j]);
      const r = Math.sqrt(Math.max(0, rem[i + 1])) / L[i][i];
      for (let v = Math.ceil(c - r - 1e-12); v <= c + r + 1e-12; v++) {
        const e = L[i][i] * (v - c);
        rem[i] = rem[i + 1] - e * e;
        if (rem[i] < -1e-12) continue;
        n[i] = v;
        if (i === 0) out.push(n.slice()); else go(i - 1);
      }
    };
    go(d - 1);
    return out;
  }

  // Build every tile whose centre lies within radius R. For d >= 4 pass
  // `off`, the slice offset in coordinates 4..d: only tiles that can meet the
  // 3D slice through `off` are kept, and R limits the first three coordinates.
  // A generator, so a caller can spread the work across animation frames.
  function* build(P, R, out, off) {
    const { d, m, cols, gam, s } = P;
    const tiles = out || [];
    const slab = d > 3 && off != null;
    const o = slab ? off : null;
    // A tile's centre sits at s * (z + G (u - 1/2)) for some u in [0,1]^m,
    // where z is its crossing. Search z a little wider than the region.
    const margin = Math.min(1.5, 0.5 * Math.sqrt(d * m));
    const Rz = R / s + margin;
    // In the extra coordinates each of the d-3 parts of G (u - 1/2) has
    // variance 1/12; their length stays under sqrt(1/12) (sqrt(d-3) + 4)
    // except with negligible chance.
    const gX = cols.map((c) => { let t = 0; for (let a = 3; a < d; a++) t += c[a] * c[a]; return Math.sqrt(t); });
    const margX = slab ? Math.min(0.5 * gX.reduce((a, b) => a + b, 0), Math.sqrt(1 / 12) * (Math.sqrt(d - 3) + 4)) : 0;
    const S = Array.from({ length: d }, (_, i) => i);
    const total = binom(m, d);
    let since = 0, done = 0;
    const norm3 = slab ? (v) => Math.hypot(v[0], v[1], v[2]) : (v) => Math.hypot(...v);
    const normX = (v) => { let t = 0; for (let a = 3; a < v.length; a++) t += v[a] * v[a]; return Math.sqrt(t); };
    for (;;) {
      const Mi = invert(S.map((i) => cols[i]));
      if (Mi) {
        // Crossing points are z = Mi (n - gam_S) for integer n. Enumerate the
        // n whose z lies in an ellipsoid around the region, then filter.
        const zc = Array.from({ length: d }, (_, a) => (slab && a >= 3 ? o[a - 3] / s : 0));
        const tc = S.map((i, a) => gam[i] + dot(cols[i], zc));
        const Sz = slab ? 0.5 * S.reduce((acc, i) => acc + gX[i], 0) + margX : 1;
        const w = Array.from({ length: d }, (_, a) => (a < 3 ? 1 / (Rz * Rz) : 1 / (Sz * Sz)));
        const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => { let t = 0; for (let a = 0; a < d; a++) t += Mi[a][i] * w[a] * Mi[a][j]; return t; }));
        for (const n of ellipsoidPoints(A, tc, slab ? 2 : 1)) {
          const rhs = n.map((v, a) => v - gam[S[a]]);
          const z = Mi.map((row) => dot(row, rhs));
          let ok = norm3(z) <= Rz;
          if (ok && slab) { let t = 0; for (let a = 3; a < d; a++) t += (z[a] - o[a - 3] / s) ** 2; ok = Math.sqrt(t) <= Sz; }
          if (ok) {
            const K = lift(P, z, S, n);
            const base = place(P, K);
            const edges = S.map((i) => cols[i].map((x) => x * s));
            const center = base.map((x, a) => x + edges.reduce((acc, e) => acc + e[a] / 2, 0));
            const rc = norm3(center);
            let keep = rc <= R;
            // keep a cut cell only if its box in the extra coordinates holds the slice
            for (let a = 3; keep && slab && a < d; a++) {
              let lo = base[a], hi = base[a];
              for (const e of edges) { if (e[a] < 0) lo += e[a]; else hi += e[a]; }
              keep = o[a - 3] >= lo - 1e-9 && o[a - 3] <= hi + 1e-9;
            }
            if (keep) tiles.push({ S: S.slice(), z, base, edges, center, r: rc, shape: shapeOf(S, P), layer: K.reduce((a, b) => a + b, 0) });
          }
        }
      }
      done++;
      if (++since >= 32) { since = 0; yield done / total; }
      let a = d - 1;
      while (a >= 0 && S[a] === m - d + a) a--;
      if (a < 0) break;
      S[a]++;
      for (let b = a + 1; b < d; b++) S[b] = S[b - 1] + 1;
    }
    return tiles;
  }
  // Rough count of crossings a slab build visits, so callers can size R.
  function slabCost(P, R) {
    const { d, m, s } = P;
    if (d <= 3) return P.density * (d === 1 ? 2 * R : d === 2 ? Math.PI * R * R : (4 / 3) * Math.PI * R ** 3);
    const k = d - 3, unit = Math.PI ** (k / 2) / gammaHalf(k);
    const Sz = Math.sqrt((d - 3) / m) * d * 0.5 + Math.sqrt(1 / 12) * (Math.sqrt(k) + 4);
    const R3 = R + Math.min(1.5, 0.5 * Math.sqrt(d * m)) * s;
    return P.density * (4 / 3) * Math.PI * R3 ** 3 * unit * (Sz * s) ** k;
  }
  // Gamma(k/2 + 1)
  function gammaHalf(k) { let g = k % 2 ? Math.sqrt(Math.PI) / 2 : 1; for (let x = k % 2 ? 1.5 : 1; x <= k / 2; x++) g *= x; return k % 2 ? g : g; }
  function buildAll(P, R, off) { const it = build(P, R, [], off); let r; do { r = it.next(); } while (!r.done); return r.value; }

  // Lattice coordinates of the tile's lower corner, for display.
  function latticeOf(P, t) { return lift(P, t.z, t.S, t.S.map((i) => Math.round(t.z.reduce((acc, v, a) => acc + v * P.cols[i][a], 0) + P.gam[i]))); }

  // Corners with their positions in the hidden directions.
  function vertices(P, tiles) {
    const seen = new Map(), q = 1e6, d = P.d, nc = 1 << Math.min(d, 12);
    for (const t of tiles) {
      const K = latticeOf(P, t);
      for (let e = 0; e < nc; e++) {
        const KK = K.slice();
        for (let a = 0; a < d; a++) if (e & (1 << a)) KK[t.S[a]]++;
        const x = place(P, KK), key = x.map((v) => Math.round(v * q)).join();
        if (seen.has(key)) continue;
        seen.set(key, { x, K: KK, y: P.inner.map((row) => dot(row, KK)), layer: KK.reduce((a, b) => a + b, 0), r: Math.hypot(...x.slice(0, 3)) });
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

  // Period of a rational 1D or 2D slice, in physical space, reduced.
  function period(P) {
    if (!P.slice || !P.slice.ints) return null;
    const phys = (K) => P.G.map((row) => P.s * dot(row, K));
    if (P.d === 1) {
      const v = P.slice.ints[0], gg = v.reduce((a, x) => gcd(a, x), 0), t = v.map((x) => x / gg), p = phys(t);
      const len = Math.abs(p[0]);
      return { lattice: [t], vecs: [p], area: len, tiles: Math.round(len * P.density) };
    }
    const L = planeLattice(...P.slice.ints);
    if (!L) return null;
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

  // Does tile t contain point p (full d coordinates)?
  function contains(t, p) {
    const d = t.edges.length, M = Array.from({ length: d }, (_, r) => t.edges.map((e) => e[r]));
    const Mi = invert(M);
    if (!Mi) return false;
    const u = Mi.map((row) => dot(row, p.map((v, k) => v - t.base[k])));
    return u.every((x) => x >= -1e-9 && x <= 1 + 1e-9);
  }

  // A tile as a 3D convex polytope: vertices, and faces with outward normals.
  // For d = 3 the tile itself; for d >= 4 its cut by the 3D slice through
  // `off` (coordinates 4..d). Returns null when the slice misses it.
  function solid(t, off) {
    const d = t.edges.length;
    if (d === 3) {
      const V = [];
      for (let e = 0; e < 8; e++) V.push([0, 1, 2].map((k) => t.base[k] + (e & 1 ? t.edges[0][k] : 0) + (e & 2 ? t.edges[1][k] : 0) + (e & 4 ? t.edges[2][k] : 0)));
      const faces = [];
      for (let a = 0; a < 3; a++) {
        const b = (a + 1) % 3, c = (a + 2) % 3, A = 1 << a, B = 1 << b, C = 1 << c;
        const ea = t.edges[a], eb = t.edges[b], ec = t.edges[c];
        let n = [ea[1] * eb[2] - ea[2] * eb[1], ea[2] * eb[0] - ea[0] * eb[2], ea[0] * eb[1] - ea[1] * eb[0]];
        if (dot(n, ec) > 0) n = n.map((x) => -x);
        faces.push({ idx: [0, A, A | B, B], n });
        faces.push({ idx: [C, C | A, C | A | B, C | B], n: n.map((x) => -x) });
      }
      return { V, faces, center: t.center.slice(0, 3), shape: t.shape };
    }
    // u = Einv (x - base) with x = (y, off); the cell is 0 <= u <= 1.
    const M = Array.from({ length: d }, (_, r) => t.edges.map((e) => e[r]));
    const Ei = invert(M);
    if (!Ei) return null;
    const xb = t.base.map((b, k) => (k < 3 ? -b : off[k - 3] - b));
    const A = Ei.map((row) => [row[0], row[1], row[2]]), c = Ei.map((row) => dot(row, xb));
    // planes: A_i . y + c_i = 0 (outward -A_i) and = 1 (outward +A_i)
    const planes = [];
    for (let i = 0; i < d; i++) { planes.push({ n: A[i].map((x) => -x), h: c[i] }); planes.push({ n: A[i], h: 1 - c[i] }); }
    // n . y <= h for every plane
    const inside = (y) => planes.every((p) => dot(p.n, y) <= p.h + 1e-9);
    const V = [], onP = [];
    const P = planes.length;
    for (let i = 0; i < P; i++) for (let j = i + 1; j < P; j++) for (let k = j + 1; k < P; k++) {
      const Mi = invert([planes[i].n, planes[j].n, planes[k].n]);
      if (!Mi) continue;
      const y = Mi.map((row) => row[0] * planes[i].h + row[1] * planes[j].h + row[2] * planes[k].h);
      if (!inside(y)) continue;
      if (V.some((v) => Math.abs(v[0] - y[0]) + Math.abs(v[1] - y[1]) + Math.abs(v[2] - y[2]) < 1e-7)) continue;
      V.push(y);
    }
    if (V.length < 4) return null;
    const center = [0, 1, 2].map((k) => V.reduce((a, v) => a + v[k], 0) / V.length);
    const faces = [];
    for (const p of planes) {
      const nl = Math.hypot(...p.n);
      const idx = [];
      V.forEach((v, i) => { if (Math.abs(dot(p.n, v) - p.h) < 1e-7 * Math.max(1, nl)) idx.push(i); });
      if (idx.length < 3) continue;
      const fc = [0, 1, 2].map((k) => idx.reduce((a, i) => a + V[i][k], 0) / idx.length);
      const u = V[idx[0]].map((x, k) => x - fc[k]), lu = Math.hypot(...u);
      const e1 = u.map((x) => x / lu), nn = p.n.map((x) => x / nl);
      const e2 = [nn[1] * e1[2] - nn[2] * e1[1], nn[2] * e1[0] - nn[0] * e1[2], nn[0] * e1[1] - nn[1] * e1[0]];
      idx.sort((i, j) => { const a = V[i].map((x, k) => x - fc[k]), b = V[j].map((x, k) => x - fc[k]); return Math.atan2(dot(a, e2), dot(a, e1)) - Math.atan2(dot(b, e2), dot(b, e1)); });
      faces.push({ idx, n: nn });
    }
    return { V, faces, center, shape: t.shape };
  }

  // Volume of a convex polytope from solid(): sum of pyramids from its centre.
  function volume(sol) {
    let v = 0;
    for (const f of sol.faces) {
      const p0 = sol.V[f.idx[0]];
      const h = dot(f.n, p0.map((x, k) => x - sol.center[k]));
      let area = [0, 0, 0];
      for (let i = 1; i + 1 < f.idx.length; i++) {
        const a = sol.V[f.idx[i]].map((x, k) => x - p0[k]), b = sol.V[f.idx[i + 1]].map((x, k) => x - p0[k]);
        area = area.map((s, k) => s + [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]][k] / 2);
      }
      v += (Math.abs(dot(area, f.n)) * h) / 3;
    }
    return v;
  }

  g.Quasi = { PHI, FIB, DEN, STEPS, star, setup, build, buildAll, latticeOf, vertices, window2, period, planeLattice, contains, place, solid, volume, totient, slabCost };
})(typeof window !== 'undefined' ? window : globalThis);
