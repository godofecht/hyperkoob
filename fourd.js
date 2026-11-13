// Geometry for "What a fourth dimension could do to you": slices of a
// tesseract, a hand turned through 4D, a knot pulled apart in 4D, and a
// flat world seen from above.
(function (g) {
  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => Math.hypot(...a);

  // Convex hull of a few 3D points, as faces with outward normals. Brute
  // force over triples, which is fine for the 32 points or fewer used here.
  function hull3(P, eps = 1e-9) {
    const n = P.length, faces = [], seen = new Set();
    if (n < 4) return { V: P, faces };
    const c = [0, 1, 2].map((k) => P.reduce((a, p) => a + p[k], 0) / n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      let nn = cross(sub(P[j], P[i]), sub(P[k], P[i]));
      const l = norm(nn);
      if (l < 1e-12) continue;
      nn = nn.map((x) => x / l);
      let h = dot(nn, P[i]);
      if (dot(nn, c) > h) { nn = nn.map((x) => -x); h = -h; }
      if (P.some((p) => dot(nn, p) > h + eps)) continue;
      const key = nn.map((x) => Math.round(x * 1e6)).join() + ',' + Math.round(h * 1e6);
      if (seen.has(key)) continue;
      seen.add(key);
      const idx = [];
      P.forEach((p, q) => { if (Math.abs(dot(nn, p) - h) < 1e-7) idx.push(q); });
      const fc = [0, 1, 2].map((q) => idx.reduce((a, t) => a + P[t][q], 0) / idx.length);
      const e1 = sub(P[idx[0]], fc), l1 = norm(e1), u = e1.map((x) => x / l1), v = cross(nn, u);
      idx.sort((a, b) => { const pa = sub(P[a], fc), pb = sub(P[b], fc); return Math.atan2(dot(pa, v), dot(pa, u)) - Math.atan2(dot(pb, v), dot(pb, u)); });
      faces.push({ idx, n: nn });
    }
    return { V: P, faces };
  }
  function hullVolume(H) {
    const c = [0, 1, 2].map((k) => H.V.reduce((a, p) => a + p[k], 0) / H.V.length);
    let v = 0;
    for (const f of H.faces) {
      const p0 = H.V[f.idx[0]];
      for (let i = 1; i + 1 < f.idx.length; i++) v += Math.abs(dot(sub(p0, c), cross(sub(H.V[f.idx[i]], c), sub(H.V[f.idx[i + 1]], c)))) / 6;
    }
    return v;
  }

  // The tesseract [-1,1]^4 * L/2 sliced by the hyperplane d . x = t, where d
  // is its long diagonal (1,1,1,1)/2. `basis` is three orthonormal 4-vectors
  // spanning the hyperplane, used as our x, y, z. t runs over [-L, L].
  function tesseractSlice(L, t, basis) {
    const n = [0.5, 0.5, 0.5, 0.5], pts = [];
    const corner = (m) => [0, 1, 2, 3].map((k) => ((m >> k) & 1 ? L / 2 : -L / 2));
    for (let m = 0; m < 16; m++) for (let k = 0; k < 4; k++) {
      if ((m >> k) & 1) continue;
      const a = corner(m), b = corner(m | (1 << k)), fa = dot(n, a) - t, fb = dot(n, b) - t;
      if ((fa < 0) === (fb < 0) && Math.abs(fa) > 1e-12 && Math.abs(fb) > 1e-12) continue;
      if (Math.abs(fa - fb) < 1e-12) continue;
      const s = fa / (fa - fb);
      if (s < -1e-9 || s > 1 + 1e-9) continue;
      const p = a.map((x, q) => x + s * (b[q] - x));
      const y = basis.map((e) => dot(e, p));
      if (!pts.some((o) => Math.abs(o[0] - y[0]) + Math.abs(o[1] - y[1]) + Math.abs(o[2] - y[2]) < 1e-7)) pts.push(y);
    }
    return hull3(pts);
  }
  // Three orthonormal 4-vectors square to (1,1,1,1): the tetrahedral frame.
  const SLICE_BASIS = (() => {
    const r = [[1, 1, -1, -1], [1, -1, 1, -1], [1, -1, -1, 1]];
    return r.map((v) => v.map((x) => x / 2));
  })();
  function sliceName(nv) { return nv === 0 ? 'nothing' : nv === 1 ? 'a point' : nv === 4 ? 'tetrahedron' : nv === 6 ? 'octahedron' : nv === 12 ? 'truncated tetrahedron' : `${nv}-corner solid`; }

  // A right hand made of boxes: palm, four fingers, and a thumb on the -x
  // side. Each box is [x0, y0, z0, x1, y1, z1] in hand coordinates.
  const HAND = [
    [-0.55, -0.9, -0.14, 0.55, 0.45, 0.14],          // palm
    [-0.52, 0.48, -0.11, -0.28, 1.25, 0.11],         // index
    [-0.24, 0.48, -0.11, 0.0, 1.38, 0.11],           // middle
    [0.04, 0.48, -0.11, 0.28, 1.28, 0.11],           // ring
    [0.32, 0.48, -0.1, 0.52, 1.0, 0.1],              // little
    [-1.15, -0.55, -0.11, -0.6, -0.3, 0.11],         // thumb base, sticking out to -x
    [-1.15, -0.3, -0.11, -0.92, 0.25, 0.11],         // thumb tip, pointing up
    [-0.45, -1.45, -0.18, 0.45, -0.92, 0.18],        // wrist
  ];
  // Turn by theta in the x-w plane: (x, y, z, 0) -> (x cos, y, z, x sin).
  function turnXW(p, theta) { return [p[0] * Math.cos(theta), p[1], p[2], p[0] * Math.sin(theta)]; }
  // Handedness of a frame after the turn, seen in 3D: sign of det of the
  // images of the x, y, z unit vectors with w dropped.
  function handedness(theta) {
    const [a, b, c] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => turnXW(e, theta).slice(0, 3));
    const d = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    return Math.abs(d) < 1e-9 ? 0 : Math.sign(d);
  }

  // A trefoil knot, and the circle it is pulled to.
  function trefoil(t) { return [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)]; }
  function circle(t) { return [2.6 * Math.sin(t), 2.6 * Math.cos(t), 0]; }
  // The rope at time s in [0, 1]: a straight blend in x, y, z, which in 3D
  // would pass the rope through itself, plus a lift into w that keeps the
  // strands apart wherever they meet.
  function rope(s, N = 240) {
    const pts = [], lift = Math.sin(Math.PI * s);
    for (let i = 0; i < N; i++) {
      const t = (2 * Math.PI * i) / N, a = trefoil(t), b = circle(t);
      pts.push([0, 1, 2].map((k) => a[k] * (1 - s) + b[k] * s).concat([1.4 * lift * Math.sin(t + 0.4)]));
    }
    return pts;
  }
  // Closest approach between parts of the rope that are not neighbours.
  function closest(pts, dims) {
    const N = pts.length, skip = Math.ceil(N / 24);
    let best = Infinity, at = null;
    for (let i = 0; i < N; i++) for (let j = i + skip; j < N; j++) {
      if (N - (j - i) < skip) continue;
      let d = 0; for (let k = 0; k < dims; k++) d += (pts[i][k] - pts[j][k]) ** 2;
      if (d < best) { best = d; at = [i, j]; }
    }
    return { d: Math.sqrt(best), at };
  }

  // Flatland: a house, a creature in it with organs, and a second creature
  // outside looking in. All in the plane; units are arbitrary.
  const FLAT = {
    house: [[-3, -2.2], [3, -2.2], [3, 2.2], [-3, 2.2]],
    body: { c: [0, 0], r: 1.25 },
    organs: [
      { name: 'heart', c: [-0.35, 0.3], r: 0.32, hue: 0 },
      { name: 'stomach', c: [0.45, -0.25], r: 0.42, hue: 35 },
      { name: 'lung', c: [-0.25, -0.55], r: 0.26, hue: 200 },
      { name: 'eye', c: [0.9, 0.55], r: 0.18, hue: 260 },
    ],
    viewer: { c: [-6.2, 0.4], look: [1, -0.05], fov: 1.0 },
  };
  // What the outside creature sees: one colour per ray, the first thing hit.
  function retina(rays = 160) {
    const v = FLAT.viewer, base = Math.atan2(v.look[1], v.look[0]), out = [];
    const segs = FLAT.house.map((p, i) => [p, FLAT.house[(i + 1) % 4]]);
    for (let r = 0; r < rays; r++) {
      const a = base + (r / (rays - 1) - 0.5) * v.fov, d = [Math.cos(a), Math.sin(a)];
      let best = Infinity, what = 'sky';
      for (const [p, q] of segs) {
        const e = sub(q, p), den = d[0] * -e[1] - d[1] * -e[0];
        if (Math.abs(den) < 1e-12) continue;
        const w = sub(p, v.c), t = (w[0] * -e[1] - w[1] * -e[0]) / den, u = (d[0] * w[1] - d[1] * w[0]) / den;
        if (t > 0 && u >= 0 && u <= 1 && t < best) { best = t; what = 'wall'; }
      }
      out.push({ what, dist: best });
    }
    return out;
  }

  g.FourD = { hull3, hullVolume, tesseractSlice, SLICE_BASIS, sliceName, HAND, turnXW, handedness, trefoil, circle, rope, closest, FLAT, retina };
})(typeof window !== 'undefined' ? window : globalThis);
