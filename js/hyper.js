// Hypercube geometry for fractional dimension D.
// An n-cube is an (n-1)-cube extruded along a new axis. For D in (n-1, n]
// the cube has n axes; the first n-1 have length 1 and the newest has
// length t = D - (n-1). Every projection of a cube is a zonotope, so area,
// volume and surface come straight from the projected axis vectors.
(function (g) {
  const SLIDER_MAX = 16; // default slider range; dimensions above it are allowed
  const PHI = (1 + Math.sqrt(5)) / 2;

  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const smooth = (t) => t * t * (3 - 2 * t);

  function mul3(A, B) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
    return C;
  }
  const tr3 = (A) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => A[j][i]));
  const mv3 = (A, v) => [0, 1, 2].map((i) => A[i][0] * v[0] + A[i][1] * v[1] + A[i][2] * v[2]);

  // Jacobi eigen-decomposition of a symmetric 3x3 matrix.
  function jacobi3(A0) {
    const a = A0.map((r) => r.slice());
    const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let sweep = 0; sweep < 60; sweep++) {
      const off = a[0][1] ** 2 + a[0][2] ** 2 + a[1][2] ** 2;
      if (off < 1e-24) break;
      for (let p = 0; p < 2; p++) for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < 3; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = c * x - s * y; a[k][q] = s * x + c * y; }
        for (let k = 0; k < 3; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = c * x - s * y; a[q][k] = s * x + c * y; }
        for (let k = 0; k < 3; k++) { const x = V[k][p], y = V[k][q]; V[k][p] = c * x - s * y; V[k][q] = s * x + c * y; }
      }
    }
    return { vals: [a[0][0], a[1][1], a[2][2]], V };
  }

  function invSqrt3(S) {
    const { vals, V } = jacobi3(S);
    const D = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) D[i][i] = 1 / Math.sqrt(Math.max(vals[i], 1e-12));
    return mul3(mul3(V, D), tr3(V));
  }

  // Rescale a set of n >= 3 directions so they become the columns of a true
  // orthogonal projection R^n -> R^3 (rows orthonormal, sum of c c^T = I).
  function tighten(cols) {
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const c of cols) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] += c[i] * c[j];
    const W = invSqrt3(S);
    return cols.map((c) => mv3(W, c));
  }

  // Nearest orthogonal matrix to M (polar factor), used to align frames.
  function polar(M) {
    return mul3(M, invSqrt3(mul3(tr3(M), M)));
  }

  // Symmetric 3D frames. 4 axes: tetrahedral (tesseract -> rhombic
  // dodecahedron). 5 and 6 axes: icosahedral (6-cube -> rhombic
  // triacontahedron). 7 or more: a fixed spiral sequence of directions on
  // the hemisphere (height from a sqrt(2) step, angle from the golden
  // angle). Axis i always starts from the same direction, whatever n is, so
  // there is no table to build and no upper limit on n.
  const ICOSA = [[0, 1, PHI], [0, 1, -PHI], [1, PHI, 0], [1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1]];
  const GA = Math.PI * (3 - Math.sqrt(5));
  function seqDir(i) {
    const z = ((0.5 + i * (Math.SQRT2 - 1)) % 1 + 1) % 1 * 0.98 + 0.01, r = Math.sqrt(1 - z * z);
    return [r * Math.cos(i * GA), r * Math.sin(i * GA), z];
  }
  function baseFrame3(n) {
    const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (n <= 3) return E.slice(0, n);
    let dirs;
    if (n === 4) dirs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    else if (n <= 6) dirs = ICOSA.slice(0, n);
    else dirs = Array.from({ length: n }, (_, i) => seqDir(i));
    return tighten(dirs.map(norm));
  }
  // Rotate frame B so its first m axes sit as close as possible to frame A.
  function alignTo(A, B, m) {
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < m; i++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[a][b] += A[i][a] * B[i][b];
    const R = polar(M);
    return B.map((c) => mv3(R, c));
  }
  // Frames 1..7 are chained so each keeps the previous one's axes in place.
  // Every frame past 7 reuses frame 7's alignment, since the spiral
  // directions do not move as n grows.
  const F3 = [null];
  for (let n = 1; n <= 7; n++) F3.push(n <= 3 ? baseFrame3(n) : alignTo(F3[n - 1], baseFrame3(n), n - 1));
  const R7 = (() => {
    const B = baseFrame3(7), M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 6; i++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[a][b] += F3[6][i][a] * B[i][b];
    return polar(M);
  })();
  const frameCache = new Map();
  function F(n) {
    if (n <= 7) return F3[n];
    if (frameCache.has(n)) return frameCache.get(n);
    const f = baseFrame3(n).map((c) => mv3(R7, c));
    if (frameCache.size > 6) frameCache.delete(frameCache.keys().next().value);
    frameCache.set(n, f);
    return f;
  }

  function split(D) {
    D = Math.max(0, Number.isFinite(D) ? D : 0);
    const n = Math.max(1, Math.ceil(D - 1e-9));
    const t = Math.max(0, Math.min(1, D - (n - 1)));
    const L = Array.from({ length: n }, (_, i) => (i < n - 1 ? 1 : t));
    return { D, n, t, L };
  }

  // 3D projection columns (one 3-vector per axis) for dimension D.
  function frame3(D, mode) {
    const { n, t } = split(D);
    if (mode === 'face') return Array.from({ length: n }, (_, i) => (i < 3 ? [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0] : [0, 0, 0]));
    const s = smooth(t), A = F(Math.max(1, n - 1)), B = F(n);
    const cols = B.map((c, i) => (i < n - 1 ? [0, 1, 2].map((k) => A[i][k] * (1 - s) + c[k] * s) : c.slice()));
    if (n < 4 || s <= 0 || s >= 1) return cols;
    // Re-tighten so the blend stays a true orthogonal projection. The new
    // axis is weighted by s, so at s = 0 this leaves frame n-1 untouched.
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    cols.forEach((c, j) => { const w = j < n - 1 ? 1 : s; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) S[a][b] += w * c[a] * c[b]; });
    const W = invSqrt3(S);
    return cols.map((c) => mv3(W, c));
  }

  // 2D projection: the Petrie projection, axis k at angle k*pi/D. For whole D
  // this is the n-cube's 2n-gon shadow. Between whole numbers the angles
  // open up smoothly.
  function frame2(D, mode) {
    const { n } = split(D);
    if (mode === 'face') return Array.from({ length: n }, (_, i) => (i < 2 ? [i === 0 ? 1 : 0, i === 1 ? 1 : 0] : [0, 0]));
    const dd = Math.max(D, 1), sc = Math.sqrt(2 / Math.max(D, 2));
    return Array.from({ length: n }, (_, k) => [sc * Math.cos((k * Math.PI) / dd), sc * Math.sin((k * Math.PI) / dd)]);
  }

  // Rotation in R^n: Givens rotations in planes (i, i+1). The plane that
  // touches the newest axis is scaled by s so nothing jumps at whole D.
  function tumble(cols, n, time, s) {
    const out = cols.map((c) => c.slice());
    for (let i = 0; i < n - 1; i++) {
      let th = time * (0.31 + 0.17 * ((i * 7) % 5)) * (i % 2 ? -1 : 1);
      if (i === n - 2) th *= s;
      const c = Math.cos(th), sn = Math.sin(th);
      const a = out[i], b = out[i + 1];
      out[i] = a.map((x, k) => c * x + sn * b[k]);
      out[i + 1] = b.map((x, k) => -sn * a[k] + c * x);
    }
    return out;
  }

  // Zonotope measures from generators g_j = L_j * col_j. Exact sums over
  // pairs and triples while that is cheap; past that, an unbiased estimate
  // from a fixed random sample of pairs or triples (flagged approx).
  const PAIR_LIMIT = 4000, TRIPLE_LIMIT = 120, SAMPLES = 150000;
  // Pass a smaller `samples` for quick estimates (the roundness chart does).
  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5) >>> 0) / 4294967296; }
  function measure2(cols, L, SAMPLES = 150000) {
    const g = cols.map((c, j) => [c[0] * L[j], c[1] * L[j]]), m = g.length;
    let A = 0, P = 0;
    for (let i = 0; i < m; i++) P += 2 * Math.hypot(g[i][0], g[i][1]);
    const approx = m > PAIR_LIMIT;
    if (!approx) {
      for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) A += Math.abs(g[i][0] * g[j][1] - g[i][1] * g[j][0]);
    } else {
      const r = rng(7);
      for (let k = 0; k < SAMPLES; k++) {
        const i = Math.floor(r() * m), j = Math.floor(r() * m);
        A += Math.abs(g[i][0] * g[j][1] - g[i][1] * g[j][0]);
      }
      A *= (m * m) / SAMPLES / 2;
    }
    return { A, P, Q: P > 1e-12 ? (4 * Math.PI * A) / (P * P) : 0, approx };
  }
  function measure3(cols, L, SAMPLES = 150000) {
    const g = cols.map((c, j) => c.map((x) => x * L[j])), m = g.length;
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    let V = 0, S = 0;
    const approx = m > TRIPLE_LIMIT;
    if (!approx) {
      for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
        const c = cross(g[i], g[j]);
        S += 2 * Math.hypot(c[0], c[1], c[2]);
        for (let k = j + 1; k < m; k++) V += Math.abs(c[0] * g[k][0] + c[1] * g[k][1] + c[2] * g[k][2]);
      }
    } else {
      const r = rng(11);
      if (m <= PAIR_LIMIT) {
        for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const c = cross(g[i], g[j]); S += 2 * Math.hypot(c[0], c[1], c[2]); }
      } else {
        for (let k = 0; k < SAMPLES; k++) { const c = cross(g[Math.floor(r() * m)], g[Math.floor(r() * m)]); S += Math.hypot(c[0], c[1], c[2]); }
        S *= (m * m) / SAMPLES;
      }
      for (let k = 0; k < SAMPLES; k++) {
        const c = cross(g[Math.floor(r() * m)], g[Math.floor(r() * m)]), h = g[Math.floor(r() * m)];
        V += Math.abs(c[0] * h[0] + c[1] * h[1] + c[2] * h[2]);
      }
      V *= (m * m * m) / SAMPLES / 6;
    }
    return { V, S, Q: S > 1e-12 ? (36 * Math.PI * V * V) / (S * S * S) : 0, approx };
  }

  // Corners projected through cols; dim = 2 or 3.
  //   all:      every corner, while 2^n fits the budget
  //   sampled:  a fixed random set of real corners (same set every frame)
  //   gaussian: past GAUSS_FROM axes, points drawn from the normal limit of
  //             a random corner, covariance (1/4) sum L_j^2 c_j c_j^T. This
  //             keeps the cost per frame flat however large n gets.
  // Returns { pos, N, total, how } where total = 2^n as a float.
  const GAUSS_FROM = 2048, GAUSS_POINTS = 20000;
  function cornerBudget(n) { return Math.max(1024, Math.floor(3e6 / n)); }
  function project(cols, L, dim, out) {
    const n = cols.length, total = Math.pow(2, n);
    if (n > GAUSS_FROM) return projectGauss(cols, L, dim, out, total);
    const budget = cornerBudget(n);
    const sampled = total > budget, N = sampled ? budget : total;
    const pos = out && out.length >= N * dim ? out : new Float64Array(N * dim);
    const hx = new Float64Array(n), hy = new Float64Array(n), hz = new Float64Array(n);
    for (let j = 0; j < n; j++) { hx[j] = cols[j][0] * L[j] / 2; hy[j] = cols[j][1] * L[j] / 2; hz[j] = dim === 3 ? cols[j][2] * L[j] / 2 : 0; }
    const r = rng(1234567);
    for (let v = 0; v < N; v++) {
      let x = 0, y = 0, z = 0, bits = 0;
      for (let j = 0; j < n; j++) {
        if (sampled) { if ((j & 31) === 0) bits = Math.floor(r() * 4294967296); }
        const on = sampled ? (bits >>> (j & 31)) & 1 : (v >> j) & 1;
        if (on) { x += hx[j]; y += hy[j]; z += hz[j]; } else { x -= hx[j]; y -= hy[j]; z -= hz[j]; }
      }
      pos[v * dim] = x; pos[v * dim + 1] = y; if (dim === 3) pos[v * dim + 2] = z;
    }
    return { pos, N, total, how: sampled ? 'sampled' : 'all' };
  }
  function projectGauss(cols, L, dim, out, total) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    cols.forEach((c, j) => { const w = (L[j] * L[j]) / 4; for (let a = 0; a < dim; a++) for (let b = 0; b < dim; b++) C[a][b] += w * c[a] * c[b]; });
    if (dim === 2) C[2][2] = 1;
    // Cholesky of the 3x3 covariance
    const K = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) {
      let v = C[i][j];
      for (let k = 0; k < j; k++) v -= K[i][k] * K[j][k];
      K[i][j] = i === j ? Math.sqrt(Math.max(v, 1e-18)) : v / K[j][j];
    }
    const N = GAUSS_POINTS, pos = out && out.length >= N * dim ? out : new Float64Array(N * dim);
    const r = rng(424242);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    for (let v = 0; v < N; v++) {
      const z = [gauss(), gauss(), gauss()];
      for (let a = 0; a < dim; a++) pos[v * dim + a] = K[a][0] * z[0] + K[a][1] * z[1] + K[a][2] * z[2];
    }
    return { pos, N, total, how: 'gaussian' };
  }

  // Exact outline of the 2D shadow (a zonogon with up to 2n corners).
  function outline2(cols, L) {
    const g = cols.map((c, j) => { let x = c[0] * L[j], y = c[1] * L[j]; if (y < 0 || (y === 0 && x < 0)) { x = -x; y = -y; } return [x, y]; })
      .filter((v) => Math.hypot(v[0], v[1]) > 1e-12)
      .sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    let x = 0, y = 0;
    for (const v of g) { x -= v[0] / 2; y -= v[1] / 2; }
    const pts = [[x, y]];
    for (const v of g) { x += v[0]; y += v[1]; pts.push([x, y]); }
    for (const v of g) { x -= v[0]; y -= v[1]; pts.push([x, y]); }
    return pts;
  }

  function distinct(pos, N, dim, scale) {
    const set = new Set(), q = 1e5 / Math.max(scale, 1e-9);
    for (let v = 0; v < N; v++) {
      let key = '';
      for (let k = 0; k < dim; k++) key += Math.round(pos[v * dim + k] * q) + ',';
      set.add(key);
    }
    return set.size;
  }

  const small2 = ['point', 'segment', 'square', 'hexagon', 'octagon', 'decagon', 'dodecagon'];
  const small3 = ['point', 'segment', 'square', 'cube', 'rhombic dodecahedron', '20-face zonohedron', 'rhombic triacontahedron'];
  const names2 = (k) => small2[k] || (2 * k).toLocaleString('en-US') + '-gon';
  const names3 = (k) => small3[k] || (k * (k - 1)).toLocaleString('en-US') + '-face zonohedron';

  g.Hyper = { SLIDER_MAX, GAUSS_FROM, split, outline2, cornerBudget, frame2, frame3, tumble, measure2, measure3, project, distinct, smooth, names2, names3 };
})(typeof window !== 'undefined' ? window : globalThis);
