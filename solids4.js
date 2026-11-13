// Objects in 4D, and rotations in any of its six planes.
//
// The six regular 4D solids (the 5-cell, tesseract, 16-cell, 24-cell,
// 120-cell and 600-cell), the Clifford torus, a Klein bottle that needs 4D
// to avoid cutting through itself, and the tesseract's net folding up.
(function (g) {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);
  const scale = (V, r) => { const m = Math.max(...V.map((v) => Math.hypot(...v))); return V.map((v) => v.map((x) => (x * r) / m)); };
  // every pair of vertices at the shortest distance becomes an edge
  function edgesByLength(V) {
    let d = Infinity;
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) d = Math.min(d, dist(V[i], V[j]));
    const E = [];
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) if (dist(V[i], V[j]) < d * 1.0001) E.push([i, j]);
    return E;
  }
  function evenPerms() {
    const out = [], p = [0, 1, 2, 3];
    const perm = (a, k) => { if (k === a.length) { let inv = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (a[i] > a[j]) inv++; if (inv % 2 === 0) out.push(a.slice()); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
    perm(p, 0); return out;
  }
  function cell5() {
    // the corners of the 4-simplex: unit vectors of R^5, seen in the
    // hyperplane where coordinates sum to zero
    const B = [[1, -1, 0, 0, 0], [1, 1, -2, 0, 0], [1, 1, 1, -3, 0], [1, 1, 1, 1, -4]].map((r) => r.map((x) => x / Math.hypot(...r)));
    const V = Array.from({ length: 5 }, (_, i) => B.map((r) => r[i]));
    return { V: scale(V, 1), E: edgesByLength(V) };
  }
  function tesseract() { const V = []; for (let m = 0; m < 16; m++) V.push([0, 1, 2, 3].map((k) => ((m >> k) & 1 ? 1 : -1))); return { V: scale(V, 1), E: edgesByLength(V) }; }
  function cell16() { const V = []; for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { const v = [0, 0, 0, 0]; v[k] = s; V.push(v); } return { V, E: edgesByLength(V) }; }
  function cell24() {
    const V = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (const a of [-1, 1]) for (const b of [-1, 1]) { const v = [0, 0, 0, 0]; v[i] = a; v[j] = b; V.push(v); }
    return { V: scale(V, 1), E: edgesByLength(V) };
  }
  function cell600() {
    const V = [];
    for (let m = 0; m < 16; m++) V.push([0, 1, 2, 3].map((k) => ((m >> k) & 1 ? 0.5 : -0.5)));
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { const v = [0, 0, 0, 0]; v[k] = s; V.push(v); }
    const base = [PHI / 2, 0.5, 1 / (2 * PHI), 0];
    for (const p of evenPerms()) for (let m = 0; m < 8; m++) {
      const signs = [m & 1 ? -1 : 1, m & 2 ? -1 : 1, m & 4 ? -1 : 1, 1];
      const v = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) v[p[k]] = base[k] * signs[k];
      V.push(v);
    }
    return { V, E: edgesByLength(V) };
  }
  // The 120-cell is the 600-cell's dual: a corner at the middle of each of
  // its 600 tetrahedra, joined across shared triangles.
  function cell120() {
    const { V, E } = cell600(), N = V.map(() => new Set());
    for (const [a, b] of E) { N[a].add(b); N[b].add(a); }
    const tets = [];
    for (let a = 0; a < V.length; a++) for (const b of N[a]) { if (b <= a) continue; for (const c of N[a]) { if (c <= b || !N[b].has(c)) continue; for (const d of N[a]) { if (d <= c || !N[b].has(d) || !N[c].has(d)) continue; tets.push([a, b, c, d]); } } }
    const C = tets.map((t) => [0, 1, 2, 3].map((k) => t.reduce((s, i) => s + V[i][k], 0) / 4));
    const faces = new Map(), E2 = [];
    tets.forEach((t, i) => { for (let skip = 0; skip < 4; skip++) { const key = t.filter((_, k) => k !== skip).join(); if (faces.has(key)) E2.push([faces.get(key), i]); else faces.set(key, i); } });
    return { V: scale(C, 1), E: E2, tets: tets.length };
  }

  // The Clifford torus: a flat torus that lies in the 3-sphere.
  function cliffordTorus(n = 32) {
    const V = [], E = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = (2 * Math.PI * i) / n, b = (2 * Math.PI * j) / n; V.push([Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)].map((x) => x / Math.SQRT2)); }
    const id = (i, j) => ((i + n) % n) * n + ((j + n) % n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { E.push([id(i, j), id(i + 1, j)]); E.push([id(i, j), id(i, j + 1)]); }
    return { V, E };
  }
  // A Klein bottle in 4D: the tube's cross-section turns half a turn in
  // the z-w plane as it goes round, so it meets itself with the wrong side.
  // Dropping w squeezes it flat along one circle; in 4D it never meets itself.
  function kleinPoint(u, v, R = 1, r = 0.42) { return [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v) * Math.cos(u / 2), r * Math.sin(v) * Math.sin(u / 2)]; }
  function klein(nu = 48, nv = 16) {
    const V = [], E = [];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) V.push(kleinPoint((2 * Math.PI * i) / nu, (2 * Math.PI * j) / nv));
    const id = (i, j) => i * nv + ((j % nv) + nv) % nv;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      E.push([id(i, j), id(i, j + 1)]);
      // going round u once flips v: (2 pi, v) is the point (0, -v)
      E.push([id(i, j), i + 1 < nu ? id(i + 1, j) : id(0, nv - j)]);
    }
    return { V, E };
  }

  // The tesseract's net: a cross of 8 cubes in 3D. Each outer cube turns
  // by `fold` about the face it shares, into w; at a right angle the net
  // closes up into the tesseract [-1,1]^3 x [0,2].
  const NET = [
    { axis: null }, { axis: 0, s: 1 }, { axis: 0, s: -1 }, { axis: 1, s: 1 }, { axis: 1, s: -1 }, { axis: 2, s: 1 }, { axis: 2, s: -1 }, { axis: 2, s: -1, far: true },
  ];
  // turn p in the plane of axis k and w about the face at s * x_k = h
  function hinge(p, k, s, h, th) {
    const u = s * p[k] - h, v = p[3], c = Math.cos(th), sn = Math.sin(th), q = p.slice();
    q[k] = s * (h + u * c - v * sn); q[3] = u * sn + v * c;
    return q;
  }
  function net(fold) {
    const V = [], E = [];
    NET.forEach((cube) => {
      const off = [0, 0, 0];
      if (cube.axis !== null) off[cube.axis] = cube.s * (cube.far ? 4 : 2);
      const base = V.length;
      for (let m = 0; m < 8; m++) {
        let p = [0, 1, 2].map((k) => off[k] + ((m >> k) & 1 ? 1 : -1)).concat([0]);
        if (cube.far) p = hinge(p, cube.axis, cube.s, 3, fold);
        if (cube.axis !== null) p = hinge(p, cube.axis, cube.s, 1, fold);
        V.push(p);
      }
      for (let m = 0; m < 8; m++) for (let k = 0; k < 3; k++) if (!((m >> k) & 1)) E.push([base + m, base + (m | (1 << k))]);
    });
    return { V, E };
  }

  const PLANES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  const PLANE_NAMES = ['x-y', 'x-z', 'x-w', 'y-z', 'y-w', 'z-w'];
  // the product of turns by angles[k] in plane PLANES[k]
  function rotation(angles) {
    let M = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    angles.forEach((a, k) => {
      if (!a) return;
      const [i, j] = PLANES[k], c = Math.cos(a), s = Math.sin(a);
      M = M.map((row) => { const r = row.slice(); r[i] = row[i] * c + row[j] * s; r[j] = -row[i] * s + row[j] * c; return r; });
    });
    return M;
  }
  const apply = (M, p) => M.map((r) => r[0] * p[0] + r[1] * p[1] + r[2] * p[2] + r[3] * p[3]);
  // dimension of the space a matrix leaves fixed: 4 minus the rank of M - I
  function fixedDim(M) {
    const A = M.map((r, i) => r.map((v, j) => v - (i === j ? 1 : 0)));
    let rank = 0;
    for (let c = 0; c < 4 && rank < 4; c++) {
      let p = rank; for (let r = rank + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-9) continue;
      [A[rank], A[p]] = [A[p], A[rank]];
      for (let r = 0; r < 4; r++) if (r !== rank) { const f = A[r][c] / A[rank][c]; for (let k = 0; k < 4; k++) A[r][k] -= f * A[rank][k]; }
      rank++;
    }
    return 4 - rank;
  }

  const OBJECTS = {
    cell5: { name: '5-cell', make: cell5, cells: 5, faces: 10 },
    tesseract: { name: 'tesseract', make: tesseract, cells: 8, faces: 24 },
    cell16: { name: '16-cell', make: cell16, cells: 16, faces: 32 },
    cell24: { name: '24-cell', make: cell24, cells: 24, faces: 96 },
    cell120: { name: '120-cell', make: cell120, cells: 120, faces: 720 },
    cell600: { name: '600-cell', make: cell600, cells: 600, faces: 1200 },
    clifford: { name: 'Clifford torus', make: () => cliffordTorus(32), surface: true },
    klein: { name: 'Klein bottle', make: () => klein(48, 16), surface: true },
    net: { name: 'tesseract net', make: (f) => net(f), folding: true },
  };

  g.Solids4 = { PHI, OBJECTS, PLANES, PLANE_NAMES, rotation, apply, fixedDim, edgesByLength, net, klein, kleinPoint, cliffordTorus, cell5, tesseract, cell16, cell24, cell120, cell600, dist };
})(typeof window !== 'undefined' ? window : globalThis);
