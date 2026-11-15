// Walking through space filled with cubes, m round every edge. Three round
// an edge leave a gap: the cubes close up into the 3-sphere, as the 8 cells
// of a tesseract. Four fit exactly: flat space. Five or six overfill each
// edge, and the cubes need hyperbolic space. Pure maths; runs in Node too.
//
// Points are 4-vectors (t, x, y, z) in one model for all three, with
// curvature K = 1, 0 or -1:
//   sphere      t² + |x|² = 1
//   flat        t = 1
//   hyperbolic  t² - |x|² = 1, t > 0
// In every case a geodesic segment is the straight segment between its ends,
// pushed back onto the space, so (x, y, z) seen from the origin is the
// direction you look in. Rigid motions are 4x4 matrices.
(function (g) {
  const sinK = (K, s) => (K > 0 ? Math.sin(s) : K < 0 ? Math.sinh(s) : s);
  const cosK = (K, s) => (K > 0 ? Math.cos(s) : K < 0 ? Math.cosh(s) : 1);
  const tanK = (K, s) => sinK(K, s) / cosK(K, s);
  const I4 = () => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  function mul(A, B) {
    const C = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j] + A[i][3] * B[3][j];
    return C;
  }
  const apply = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2] + r[3] * v[3]);
  // a step of length s along axis a (1, 2 or 3)
  function translate(K, a, s) {
    const M = I4(), C = cosK(K, s), S = sinK(K, s);
    M[0][0] = C; M[0][a] = -K * S; M[a][0] = S; M[a][a] = C;
    return M;
  }
  // a turn by angle q from axis a towards axis b (both 1..3)
  function rotate(a, b, q) {
    const M = I4(), c = Math.cos(q), s = Math.sin(q);
    M[a][a] = c; M[a][b] = -s; M[b][a] = s; M[b][b] = c;
    return M;
  }
  // the bilinear form the motions keep: K t t' + x x' (for K = 0, x x' only)
  const form = (K, a, b) => K * a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  function inverse(K, M) {
    if (K !== 0) { // M^-1 = E M^T E, with E = diag(K, 1, 1, 1)
      const R = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], e = [K, 1, 1, 1];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) R[i][j] = e[i] * M[j][i] * e[j];
      return R;
    }
    // flat: M = [[1, 0], [b, Q]] acting on (t, x); inverse [[1, 0], [-Q^T b, Q^T]]
    const R = I4();
    for (let i = 1; i < 4; i++) { let s = 0; for (let j = 1; j < 4; j++) { R[i][j] = M[j][i]; s += M[j][i] * M[j][0]; } R[i][0] = -s; }
    return R;
  }
  // put a point back on the space (or, for an ideal point, leave it)
  function normal(K, v) {
    if (K === 0) return v.map((x) => x / v[0]);
    const q = v[0] * v[0] + K * (v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
    if (q <= 1e-12) return v;
    const s = 1 / Math.sqrt(q) * (K < 0 && v[0] < 0 ? -1 : 1);
    return v.map((x) => x * s);
  }
  function distance(K, p, q) {
    if (K === 0) return Math.hypot(p[1] / p[0] - q[1] / q[0], p[2] / p[0] - q[2] / q[0], p[3] / p[0] - q[3] / q[0]);
    const a = normal(K, p), b = normal(K, q), d = K * form(K, a, b);
    return K > 0 ? Math.acos(Math.max(-1, Math.min(1, d))) : Math.acosh(Math.max(1, d));
  }
  // distance from the origin (1, 0, 0, 0) of a point in camera coordinates
  const depth = (K, v) => distance(K, [1, 0, 0, 0], v);

  // The honeycomb with m cubes round each edge. r is the distance from a
  // cube's centre to its faces: the faces of the central cube meet at angle
  // 2π/m exactly when cos(2π/m) = -K sinK(r)².
  const GEOMETRY = {
    3: { K: 1, name: 'the 3-sphere', r: Math.PI / 4 },
    4: { K: 0, name: 'flat space', r: 0.5 },
    5: { K: -1, name: 'hyperbolic space', r: Math.asinh(Math.sqrt(Math.cos((2 * Math.PI) / 5))) },
    6: { K: -1, name: 'hyperbolic space, corners at infinity', r: Math.asinh(Math.sqrt(Math.cos((2 * Math.PI) / 6))) },
  };
  // the central cube's corners, as 4-vectors: (1, ±τ, ±τ, ±τ), τ = tanK(r)
  function corners(K, r) {
    const tau = tanK(K, r), out = [];
    for (let i = 0; i < 8; i++) out.push(normal(K, [1, i & 1 ? tau : -tau, i & 2 ? tau : -tau, i & 4 ? tau : -tau]));
    return out;
  }
  // the six steps across a face to the next cube's centre
  const steps = (K, r) => [1, 2, 3].flatMap((a) => [translate(K, a, 2 * r), translate(K, a, -2 * r)]);
  const keyOf = (K, v, k = 1e4) => {
    const n = K > 0 ? normal(K, v) : v.map((x) => x / v[0]);
    return n.map((x) => Math.round(x * k)).join(',');
  };
  // Every cube whose centre is within reach of the origin, found by stepping
  // across faces; each cube's 12 edges, kept once.
  function honeycomb(m, reach) {
    const G = GEOMETRY[m], K = G.K, T = steps(K, G.r), O = [1, 0, 0, 0], C0 = corners(K, G.r);
    const cells = [{ M: I4(), c: O, d: 0 }], seen = new Set([keyOf(K, O)]);
    for (let q = 0; q < cells.length; q++) {
      for (const S of T) {
        const M = mul(cells[q].M, S), c = apply(M, O), k = keyOf(K, c);
        if (seen.has(k)) continue; seen.add(k);
        const d = distance(K, O, c);
        if (d > reach + 1e-9) continue;
        cells.push({ M, c, d });
      }
    }
    const edges = [], eseen = new Set();
    for (const cell of cells) {
      const P = C0.map((v) => apply(cell.M, v));
      for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) {
        if (i & bit) continue;
        const a = P[i], b = P[i | bit], mid = a.map((x, k) => x + b[k]), k = keyOf(K, mid);
        if (eseen.has(k)) continue; eseen.add(k);
        edges.push({ a, b, d: cell.d, axis: bit === 4 ? 2 : bit - 1 });
      }
    }
    return { K, r: G.r, name: G.name, cells, edges, steps: T };
  }

  // A camera: columns are its place and its right, up and forward directions.
  // Steps and turns act in the camera's own frame, so they multiply on the right.
  const walk = (K, M, s) => mul(M, translate(K, 3, s));
  const strafe = (K, M, s) => mul(M, translate(K, 1, s));
  const turn = (M, q) => mul(M, rotate(3, 1, q));
  const tilt = (M, q) => mul(M, rotate(3, 2, q));
  // keep the columns exactly orthonormal for the form after many steps
  function clean(K, M) {
    const col = (j) => [M[0][j], M[1][j], M[2][j], M[3][j]], C = [0, 1, 2, 3].map(col);
    if (K === 0) {
      C[0] = C[0].map((x) => x / C[0][0]);
      for (let j = 1; j < 4; j++) {
        C[j][0] = 0;
        for (let i = 1; i < j; i++) { const d = form(0, C[j], C[i]); C[j] = C[j].map((x, k) => x - d * C[i][k]); }
        const n = Math.sqrt(form(0, C[j], C[j])); C[j] = C[j].map((x) => x / n);
      }
    } else {
      C[0] = normal(K, C[0]);
      for (let j = 1; j < 4; j++) {
        for (let i = 0; i < j; i++) { const d = form(K, C[j], C[i]) / form(K, C[i], C[i]); C[j] = C[j].map((x, k) => x - d * C[i][k]); }
        const n = Math.sqrt(form(K, C[j], C[j])); C[j] = C[j].map((x) => x / n);
      }
    }
    return [0, 1, 2, 3].map((i) => C.map((c) => c[i]));
  }
  // If the camera has crossed into a neighbouring cube, slide the whole
  // honeycomb back one step, which leaves it looking the same.
  function recentre(H, M) {
    const K = H.K, O = [1, 0, 0, 0];
    for (let n = 0; n < 4; n++) {
      const p = [M[0][0], M[1][0], M[2][0], M[3][0]], d0 = distance(K, O, p);
      let best = null, bd = d0 - 1e-9;
      for (const S of H.steps) { const d = distance(K, apply(S, O), p); if (d < bd) { bd = d; best = S; } }
      if (!best) break;
      M = mul(inverse(K, best), M);
    }
    return M;
  }
  g.Space3 = { sinK, cosK, tanK, I4, mul, apply, translate, rotate, form, inverse, normal, distance, depth, GEOMETRY, corners, steps, honeycomb, walk, strafe, turn, tilt, clean, recentre };
})(typeof window !== 'undefined' ? window : globalThis);
