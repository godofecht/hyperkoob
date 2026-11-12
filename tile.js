// Shadows that tile. A box with edges L_1..L_n, projected along its own
// long diagonal, gives a shape one dimension down that tiles that space.
// The translations are the box-lattice vectors sum(x_i L_i e_i) with
// integer x_i summing to zero, projected the same way. For the unit 3-cube
// that is the hexagon tiling; for the tesseract it is the rhombic
// dodecahedron honeycomb on the FCC lattice. It holds at fractional D too,
// because the newest edge just has length t.
//
// The animation runs in two phases:
//   turn: rotate in the plane of (diagonal, e_n) until the diagonal lies along e_n
//   drop: scale the e_n coordinate to zero
// Coordinates 1..n-1 are then the target space. For n <= 3 the target is
// the floor and e_n is drawn as "up", so the picture is exact 3D. For n = 4
// the target is all of 3D space and e_4 is drawn along a slanted direction W.
(function (g) {
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const W = (() => { const v = [0.78, 0.38, 0.5]; const l = Math.hypot(...v); return v.map((x) => x / l); })();

  // Plane rotation turning unit vector u toward e_n.
  function planeFor(u) {
    const n = u.length, c = u[n - 1];
    const b = u.map((v, i) => (i === n - 1 ? 1 : 0) - c * v);
    const l = Math.hypot(...b);
    if (l < 1e-12) return null;
    return { a: u, b: b.map((v) => v / l), theta: Math.acos(Math.max(-1, Math.min(1, c))) };
  }
  function rotate(x, pl, ang) {
    if (!pl || ang === 0) return x.slice();
    const xa = dot(x, pl.a), xb = dot(x, pl.b), c = Math.cos(ang), s = Math.sin(ang);
    return x.map((v, i) => v + (c - 1) * (xa * pl.a[i] + xb * pl.b[i]) + s * (xa * pl.b[i] - xb * pl.a[i]));
  }

  // Q_k fixes the orientation of the target space so that, at every whole
  // dimension, the shadow from branch n (t = 0) lands exactly where the
  // shadow from branch n-1 (t = 1) was. Q_1 = id, Q_k = (Q_{k-1} + 1) R_k,
  // where R_k turns the unit k-cube's diagonal onto e_k.
  const Rk = {};
  for (let k = 2; k <= 4; k++) Rk[k] = planeFor(Array(k).fill(1 / Math.sqrt(k)));
  function Q(h) {
    const k = h.length;
    if (k === 1) return h.slice();
    const r = rotate(h, Rk[k], Rk[k].theta);
    return [...Q(r.slice(0, k - 1)), r[k - 1]];
  }

  // Target-space coordinates + out-of-space coordinate -> display xyz (y is up).
  function toDisplay(n, hq, out) {
    if (n === 2) return [hq[0], out, 0];
    if (n === 3) return [hq[0], out, hq[1]];
    return [hq[0] + out * W[0], hq[2] + out * W[1], hq[1] + out * W[2]];
  }

  function setup(D) {
    D = Math.max(1, Math.min(4, D));
    const n = Math.max(2, Math.ceil(D - 1e-9));
    const t = clamp01(D - (n - 1));
    const L = Array.from({ length: n }, (_, i) => (i < n - 1 ? 1 : t));
    const len = Math.hypot(...L);
    const u = L.map((v) => v / len);
    return { D, n, t, L, u, pl: planeFor(u), halfDiag: len / 2 };
  }

  function phases(p) {
    return { turn: smooth(clamp01(p / 0.45)), drop: smooth(clamp01((p - 0.5) / 0.45)) };
  }

  // One point of R^n through the animation.
  function place(S, x, turn, drop) {
    const y = rotate(x, S.pl, S.pl ? S.pl.theta * turn : 0);
    const hq = Q(y.slice(0, S.n - 1));
    const out = y[S.n - 1];
    return { pos: toDisplay(S.n, hq, out * (1 - drop)), foot: toDisplay(S.n, hq, 0), hq };
  }

  function vertices(S, turn, drop) {
    const N = 1 << S.n, res = [];
    for (let v = 0; v < N; v++) res.push(place(S, S.L.map((l, i) => ((v >> i) & 1 ? l / 2 : -l / 2)), turn, drop));
    return res;
  }

  // Lattice translations within `ring` steps (sum of positive parts <= ring).
  function translations(S, ring) {
    const n = S.n, out = [];
    const rec = (i, x) => {
      if (i === n) {
        if (x.reduce((a, b) => a + b, 0) !== 0) return;
        const pos = x.reduce((a, b) => a + Math.max(0, b), 0);
        if (pos === 0 || pos > ring) return;
        let T = x.map((xi, j) => xi * S.L[j]);
        const c = dot(T, S.u);
        T = T.map((v, j) => v - c * S.u[j]);
        const p = place(S, T, 1, 1);
        if (Math.hypot(...p.foot) < 1e-9) return; // t = 0 makes some vectors vanish
        out.push({ x: x.slice(), d: p.foot, hq: p.hq });
        return;
      }
      for (let k = -ring; k <= ring; k++) { x[i] = k; rec(i + 1, x); }
    };
    rec(0, Array(n).fill(0));
    // drop duplicates that the zero-length axis creates
    const seen = new Set();
    return out.filter((T) => { const k = T.d.map((v) => v.toFixed(6)).join(); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  // Generators of the shadow in target coordinates (for tests and readouts).
  function generators(S) {
    return S.L.map((l, i) => {
      const e = Array(S.n).fill(0); e[i] = l;
      return place(S, e, 1, 1).hq;
    });
  }

  // ---------- slices of higher honeycombs (cube dimension above 4) ----------
  // For n >= 5 the shadow lives in n-1 >= 4 dimensions. A 3D slice through
  // the honeycomb is itself a tiling of 3D by convex cells, so that is what
  // gets drawn. With z_k = y_k / L_k, a point y of the shadow space lies in
  // the cell of integer vector x exactly when
  //     max_k (z_k - x_k) - min_k (z_k - x_k) <= 1,
  // i.e. one pair of inequalities per pair of axes, n(n-1) faces in all.
  // Adding (1, ..., 1) to x gives the same cell, so x is kept with x_0 = 0.
  const orth = (r, basis) => { for (const b of basis) { const d = dot(r, b); r = r.map((v, i) => v - d * b[i]); } return r; };
  const unit = (r) => { const l = Math.hypot(...r); return r.map((v) => v / l); };

  function sliceSetup(D) {
    const n = Math.max(5, Math.ceil(D - 1e-9));
    const t = Math.max(0.04, clamp01(D - (n - 1)));
    const L = Array.from({ length: n }, (_, i) => (i < n - 1 ? 1 : t));
    const len = Math.hypot(...L), u = L.map((v) => v / len);
    // Slice along the rows of the symmetric 3D frame, pushed into the shadow space.
    const cols = g.Hyper.frame3(Math.max(D, 4.0001), 'diag');
    const W = [];
    for (let a = 0; a < 3; a++) W.push(unit(orth(cols.map((c) => c[a]), [u, ...W])));
    const v = unit(orth(Array.from({ length: n }, (_, k) => Math.cos(2.3 * k + 0.7)), [u, ...W]));
    // Every corner of the box is |L|/2 from its centre, so no point of a cell
    // is further than that from the cell centre.
    const circR = len / 2;
    return { D, n, t, L, u, W, v, circR, volume: (n * L.reduce((a, b) => a * b, 1)) / len };
  }

  // Clip a convex polyhedron (list of faces, each a list of 3D points) to a.x <= b.
  function clip(faces, a, b) {
    const out = [], cap = [];
    for (const f of faces) {
      const nf = [];
      for (let i = 0; i < f.length; i++) {
        const p = f[i], q = f[(i + 1) % f.length];
        const dp = a[0] * p[0] + a[1] * p[1] + a[2] * p[2] - b, dq = a[0] * q[0] + a[1] * q[1] + a[2] * q[2] - b;
        if (dp <= 1e-12) nf.push(p);
        if ((dp < -1e-12 && dq > 1e-12) || (dp > 1e-12 && dq < -1e-12)) {
          const r = dp / (dp - dq), ip = [p[0] + (q[0] - p[0]) * r, p[1] + (q[1] - p[1]) * r, p[2] + (q[2] - p[2]) * r];
          nf.push(ip); cap.push(ip);
        }
      }
      if (nf.length >= 3) out.push(nf);
    }
    if (cap.length >= 3) {
      const c = [0, 1, 2].map((k) => cap.reduce((s2, p) => s2 + p[k], 0) / cap.length);
      const e1 = unit(orth([a[1] + 0.3, a[2] - 0.7, a[0] + 0.1], [unit(a)]));
      const an = unit(a), e2 = [an[1] * e1[2] - an[2] * e1[1], an[2] * e1[0] - an[0] * e1[2], an[0] * e1[1] - an[1] * e1[0]];
      const ang = (p) => Math.atan2(dot(p.map((v, k) => v - c[k]), e2), dot(p.map((v, k) => v - c[k]), e1));
      const uniq = [];
      for (const p of cap.sort((p, q) => ang(p) - ang(q))) if (!uniq.length || Math.hypot(p[0] - uniq[uniq.length - 1][0], p[1] - uniq[uniq.length - 1][1], p[2] - uniq[uniq.length - 1][2]) > 1e-9) uniq.push(p);
      if (uniq.length >= 3) out.push(uniq);
    }
    return out;
  }

  function cellOf(S, o, x, Rmax = Infinity) {
    const { n, L, W } = S;
    // centre of this cell in slice coordinates, to seat the starting box
    const tau = x.map((xi, k) => xi * L[k]);
    const tu = dot(tau, S.u);
    const rel = tau.map((v, k) => v - tu * S.u[k] - o[k]);
    const ctr = W.map((w) => dot(rel, w));
    const perp2 = dot(rel, rel) - ctr.reduce((s2, v) => s2 + v * v, 0);
    if (perp2 > S.circR * S.circR) return null; // the slice misses this cell
    if (Math.hypot(...ctr) - S.circR > Rmax) return null; // too far out to show
    const R = S.circR * 1.05;
    const lo = ctr.map((v) => v - R), hi = ctr.map((v) => v + R);
    const P = (i) => [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]];
    let faces = [[0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6], [0, 1, 3, 2], [4, 6, 7, 5]].map((f) => f.map(P));
    // Clip only by the constraint that the current shape breaks the most,
    // until every corner satisfies max_k d_k - min_k d_k <= 1, where
    // d_k = z_k - x_k. Only planes that become real faces are ever used.
    const zc = (p, k) => (o[k] + p[0] * W[0][k] + p[1] * W[1][k] + p[2] * W[2][k]) / L[k] - x[k];
    for (let iter = 0; iter < 4 * n * n && faces.length; iter++) {
      let worst = 1e-10, wi = -1, wj = -1;
      for (const f of faces) for (const p of f) {
        let mx = -Infinity, mn = Infinity, imx = 0, imn = 0;
        for (let k = 0; k < n; k++) { const d = zc(p, k); if (d > mx) { mx = d; imx = k; } if (d < mn) { mn = d; imn = k; } }
        if (mx - mn - 1 > worst) { worst = mx - mn - 1; wi = imx; wj = imn; }
      }
      if (wi < 0) break;
      const A = [0, 1, 2].map((q) => W[q][wi] / L[wi] - W[q][wj] / L[wj]);
      faces = clip(faces, A, 1 + x[wi] - x[wj] - (o[wi] / L[wi] - o[wj] / L[wj]));
    }
    if (faces.length < 4) return null;
    const pts = [].concat(...faces);
    const centroid = [0, 1, 2].map((k) => pts.reduce((s2, p) => s2 + p[k], 0) / pts.length);
    const reach = Math.min(...pts.map((p) => Math.hypot(...p)));
    return { x, faces, centroid, reach };
  }

  // Where a cell's centre sits relative to the slice: in-slice coordinates
  // and squared distance off the slice. O(n), used to rank and reject.
  function locate(S, o, x) {
    const tau = x.map((xi, k) => xi * S.L[k]);
    const tu = dot(tau, S.u);
    const rel = tau.map((v, k) => v - tu * S.u[k] - o[k]);
    const ctr = S.W.map((w) => dot(rel, w));
    return { ctr, perp2: dot(rel, rel) - ctr.reduce((s2, v) => s2 + v * v, 0) };
  }

  // Cells of the slice within radius R of its origin, nearest first. The walk
  // starts at the cell holding the origin and steps to face neighbours
  // x + e_i - e_j, always expanding the closest unvisited candidate, so a
  // cap on the count still keeps the middle complete.
  function slice(S, s, R, maxCells = 160) {
    const o = S.v.map((v) => v * s);
    const norm0 = (x) => x.map((v) => v - x[0]);
    const key = (x) => x.join(',');
    const heap = [];
    const push = (item) => { heap.push(item); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].d <= heap[i].d) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l].d < heap[m].d) m = l; if (r < heap.length && heap[r].d < heap[m].d) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const x0 = norm0(o.map((y, k) => Math.floor(y / S.L[k])));
    const seen = new Set([key(x0)]);
    push({ x: x0, d: 0 });
    const cells = [];
    while (heap.length && cells.length < maxCells) {
      const { x } = pop();
      // The cell holding the origin is always shown, whatever R is.
      const cell = cellOf(S, o, x, cells.length ? R : Infinity);
      if (!cell) continue;
      cell.home = cells.length === 0;
      cells.push(cell);
      for (let i = 0; i < S.n; i++) for (let j = 0; j < S.n; j++) {
        if (i === j) continue;
        const y = x.slice(); y[i]++; y[j]--;
        const ny = norm0(y), k = key(ny);
        if (seen.has(k)) continue;
        seen.add(k);
        const at = locate(S, o, ny);
        if (at.perp2 > S.circR * S.circR) continue;
        const d = Math.hypot(...at.ctr);
        if (d - S.circR > R) continue;
        push({ x: ny, d });
      }
    }
    return cells;
  }

  const tileNames = { 1: 'a point', 2: 'a segment, tiling a line', 3: 'a hexagon, tiling the plane', 4: 'a rhombic dodecahedron, tiling space' };
  const between = { 2: 'a segment that grows out of a point', 3: 'a hexagon that grows out of a segment', 4: 'a rhombic dodecahedron that inflates out of a flat hexagon' };

  g.Tile = { sliceSetup, slice, cellOf,  setup, phases, place, vertices, translations, generators, tileNames, between, W };
})(typeof window !== 'undefined' ? window : globalThis);
