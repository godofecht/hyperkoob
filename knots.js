// Knots, their diagrams, the Alexander polynomial, and unknotting through w.
//
// A knot is a closed polyline in R^4 (w = 0 while it lives in 3D). A
// diagram is its shadow on a plane, with each crossing marked over or under
// by a depth axis. Switching a crossing in 3D means passing one strand
// through another; in 4D the strand goes round the other through w.
(function (g) {
  const TAU = Math.PI * 2;
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

  // ---------- knots ----------
  const KNOTS = {
    unknot: { name: 'unknot', f: (t) => [2.4 * Math.cos(t), 2.4 * Math.sin(t), 0] },
    trefoil: { name: 'trefoil', torus: [2, 3] },
    figure8: { name: 'figure-eight', f: (t) => [(2 + Math.cos(2 * t)) * Math.cos(3 * t), (2 + Math.cos(2 * t)) * Math.sin(3 * t), Math.sin(4 * t)] },
    cinquefoil: { name: 'cinquefoil', torus: [2, 5] },
    t34: { name: '(3, 4) torus knot', torus: [3, 4] },
    t35: { name: '(3, 5) torus knot', torus: [3, 5] },
  };
  // The (p, q) torus knot winds p times round the axis and q times through
  // the hole. p and q must share no factor, or the curve is a link.
  function torus(p, q) { return (t) => { const r = 2 + 0.9 * Math.cos(q * t); return [r * Math.cos(p * t), r * Math.sin(p * t), -0.9 * Math.sin(q * t)]; }; }
  function sample(f, N) { const pts = []; for (let i = 0; i < N; i++) { const p = f((TAU * i) / N); pts.push([p[0], p[1], p[2], 0]); } return pts; }
  function make(kind, N = 180, p = 2, q = 3) {
    if (kind === 'torus') { if (gcd(p, q) !== 1) return null; return sample(torus(p, q), N); }
    const k = KNOTS[kind];
    return sample(k.torus ? torus(...k.torus) : k.f, N);
  }

  // ---------- diagrams ----------
  // Project with screen axes a, b and depth axis c (4-vectors).
  function diagram(pts, a, b, c) {
    const N = pts.length, d = (p, v) => p[0] * v[0] + p[1] * v[1] + p[2] * v[2] + p[3] * v[3];
    const P = pts.map((p) => [d(p, a), d(p, b)]), Z = pts.map((p) => d(p, c));
    const X = [];
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N, A = P[i], B = P[i2];
      for (let j = i + 2; j < N; j++) {
        const j2 = (j + 1) % N;
        if (j2 === i) continue;
        const C = P[j], D = P[j2];
        const r = [B[0] - A[0], B[1] - A[1]], s = [D[0] - C[0], D[1] - C[1]], den = r[0] * s[1] - r[1] * s[0];
        if (Math.abs(den) < 1e-14) continue;
        const qp = [C[0] - A[0], C[1] - A[1]], u = (qp[0] * s[1] - qp[1] * s[0]) / den, v = (qp[0] * r[1] - qp[1] * r[0]) / den;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        const zi = Z[i] + u * (Z[i2] - Z[i]), zj = Z[j] + v * (Z[j2] - Z[j]);
        const li = i + u, lj = j + v, iOver = zi > zj;
        X.push({ over: iOver ? li : lj, under: iOver ? lj : li, gap: Math.abs(zi - zj), at: [A[0] + u * r[0], A[1] + u * r[1]],
          dOver: iOver ? r : s, dUnder: iOver ? s : r });
      }
    }
    return { P, X, N };
  }

  // ---------- Alexander polynomial ----------
  // Exact: integer determinants at several t by Bareiss elimination, then
  // the polynomial by Lagrange interpolation in BigInt fractions.
  function bareiss(M) {
    const n = M.length; if (!n) return 1n;
    const A = M.map((r) => r.slice());
    let prev = 1n, sign = 1n;
    for (let k = 0; k < n - 1; k++) {
      if (A[k][k] === 0n) {
        let p = k + 1; while (p < n && A[p][k] === 0n) p++;
        if (p === n) return 0n;
        [A[k], A[p]] = [A[p], A[k]]; sign = -sign;
      }
      for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) A[i][j] = (A[i][j] * A[k][k] - A[i][k] * A[k][j]) / prev;
      prev = A[k][k];
    }
    return sign * A[n - 1][n - 1];
  }
  const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  function frac(n, d = 1n) { if (d < 0n) { n = -n; d = -d; } const g0 = bgcd(n, d) || 1n; return [n / g0, d / g0]; }
  const fadd = (x, y) => frac(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
  const fmul = (x, y) => frac(x[0] * y[0], x[1] * y[1]);
  // overrides: set of crossing indices whose over and under are swapped
  function alexander(D, flips = new Set()) {
    const X = D.X, n = X.length;
    if (n === 0) return [1];
    const unders = X.map((x, k) => ({ k, l: x.under })).sort((a, b) => a.l - b.l);
    const underOf = (k) => (flips.has(k) ? X[k].over : X[k].under), overOf = (k) => (flips.has(k) ? X[k].under : X[k].over);
    const U = X.map((_, k) => ({ k, l: underOf(k) })).sort((a, b) => a.l - b.l);
    const arcAt = (l) => { let idx = U.length - 1; for (let i = 0; i < U.length; i++) if (U[i].l <= l) idx = i; return idx; };
    // arc i runs from undercrossing U[i] to U[i+1]
    const rows = [];
    for (let k = 0; k < n; k++) {
      const pos = U.findIndex((u) => u.k === k), out = pos, inc = (pos - 1 + n) % n, ov = arcAt(overOf(k));
      // which incoming arc is on the left of the over strand
      const o = flips.has(k) ? X[k].dUnder : X[k].dOver, u = flips.has(k) ? X[k].dOver : X[k].dUnder;
      const incLeft = o[0] * -u[1] - o[1] * -u[0] > 0;
      rows.push({ ov, left: incLeft ? inc : out, right: incLeft ? out : inc });
    }
    const detAt = (t) => {
      const M = Array.from({ length: n }, () => Array(n).fill(0n));
      rows.forEach((r, k) => { M[k][r.ov] += 1n - t; M[k][r.left] += t; M[k][r.right] += -1n; });
      return bareiss(M.slice(0, n - 1).map((r) => r.slice(0, n - 1)));
    };
    // interpolate the degree < n polynomial through t = 2..n+1
    const ts = Array.from({ length: n }, (_, i) => BigInt(i + 2)), ys = ts.map(detAt);
    let coef = Array(n).fill(null).map(() => [0n, 1n]);
    for (let i = 0; i < n; i++) {
      let basis = [[1n, 1n]], den = 1n;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const nb = Array(basis.length + 1).fill(null).map(() => [0n, 1n]);
        basis.forEach((c, k) => { nb[k + 1] = fadd(nb[k + 1], c); nb[k] = fadd(nb[k], fmul(c, [-ts[j], 1n])); });
        basis = nb; den *= ts[i] - ts[j];
      }
      basis.forEach((c, k) => { coef[k] = fadd(coef[k], fmul(c, frac(ys[i], den))); });
    }
    let c = coef.map((x) => (x[1] === 1n ? x[0] : null));
    if (c.some((x) => x === null)) return null;
    while (c.length && c[c.length - 1] === 0n) c.pop();
    while (c.length && c[0] === 0n) c.shift();
    if (!c.length) return [0];
    if (c[c.length - 1] < 0n) c = c.map((x) => -x);
    return c.map(Number);
  }
  function polyString(c) {
    if (!c) return '?';
    if (c.length === 1) return String(c[0]);
    const parts = [];
    for (let k = c.length - 1; k >= 0; k--) {
      const a = c[k]; if (!a) continue;
      const mag = Math.abs(a), sgn = a < 0 ? '-' : '+';
      const term = k === 0 ? String(mag) : `${mag === 1 ? '' : mag}t${k > 1 ? '^' + k : ''}`;
      parts.push(parts.length ? ` ${sgn} ${term}` : (a < 0 ? '-' : '') + term);
    }
    return parts.join('');
  }
  const isOne = (c) => c && c.length === 1 && c[0] === 1;

  // Smallest set of crossings whose switch makes the Alexander polynomial 1,
  // trying sets of 1, 2, 3 and 4 crossings.
  function unknottingSet(D, maxSize = 4, budget = 4000) {
    const n = D.X.length;
    if (isOne(alexander(D))) return [];
    let tried = 0;
    for (let k = 1; k <= Math.min(maxSize, n); k++) {
      const S = Array.from({ length: k }, (_, i) => i);
      for (;;) {
        if (isOne(alexander(D, new Set(S)))) return S.slice();
        if (++tried > budget) return null;
        let a = k - 1; while (a >= 0 && S[a] === n - k + a) a--;
        if (a < 0) break;
        S[a]++; for (let b = a + 1; b < k; b++) S[b] = S[b - 1] + 1;
      }
    }
    return null;
  }

  // ---------- moving a strand through w ----------
  // Push the over strand of crossing x down past the under strand along
  // the depth axis c, while lifting it in w by `lift`, at progress s in [0,1].
  // The bump is narrow enough to leave every other crossing alone.
  function bumpWidth(D, x, N) {
    let near = N / 8;
    for (const y of D.X) for (const l of [y.over, y.under]) {
      if (Math.abs(l - x.under) < 1e-9 || Math.abs(l - x.over) < 1e-9) continue;
      const dl = Math.min(Math.abs(l - x.over), N - Math.abs(l - x.over));
      near = Math.min(near, dl);
    }
    return Math.max(1.5, near * 0.8);
  }
  function passThrough(pts, x, c, s, lift, width, gap = 0.35) {
    const N = pts.length, depth = x.gap + gap, out = pts.map((p) => p.slice());
    for (let i = 0; i < N; i++) {
      let dl = Math.abs(i - x.over); dl = Math.min(dl, N - dl);
      if (dl >= width) continue;
      const b = 0.5 * (1 + Math.cos((Math.PI * dl) / width));
      for (let k = 0; k < 4; k++) out[i][k] -= c[k] * depth * s * b;
      out[i][3] += lift * Math.sin(Math.PI * s) * b;
    }
    return out;
  }

  // Shortest distance between segments ab and cd in 3D.
  function segDist(a, b, c, d) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - c[0], d[1] - c[1], d[2] - c[2]], w = [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
    const A = u[0] * u[0] + u[1] * u[1] + u[2] * u[2], B = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], C = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    const D = u[0] * w[0] + u[1] * w[1] + u[2] * w[2], E = v[0] * w[0] + v[1] * w[1] + v[2] * w[2], den = A * C - B * B;
    let sN, sD = den, tN, tD = den;
    if (den < 1e-12) { sN = 0; sD = 1; tN = E; tD = C; } else { sN = B * E - C * D; tN = A * E - B * D; if (sN < 0) { sN = 0; tN = E; tD = C; } else if (sN > sD) { sN = sD; tN = E + B; tD = C; } }
    if (tN < 0) { tN = 0; if (-D < 0) sN = 0; else if (-D > A) sN = sD; else { sN = -D; sD = A; } }
    else if (tN > tD) { tN = tD; if (-D + B < 0) sN = 0; else if (-D + B > A) sN = sD; else { sN = -D + B; sD = A; } }
    const sc = Math.abs(sN) < 1e-12 ? 0 : sN / sD, tc = Math.abs(tN) < 1e-12 ? 0 : tN / tD;
    const g0 = [w[0] + sc * u[0] - tc * v[0], w[1] + sc * u[1] - tc * v[1], w[2] + sc * u[2] - tc * v[2]];
    segDist.last = { s: sc, t: tc, g: g0 };
    return Math.hypot(g0[0], g0[1], g0[2]);
  }

  // ---------- relaxing ----------
  // Springs between neighbours, repulsion between the rest, and steps short
  // enough that no strand can jump through another. Unknots open into round
  // loops; knots cannot, because the rope never passes through itself.
  function relax(pts0, iters, every = 8) { const it = relaxGen(pts0, iters, every); let r; do { r = it.next(); } while (!r.done); return r.value; }
  function* relaxGen(pts0, iters, every = 8, frames = []) {
    const N = pts0.length;
    let P = pts0.map((p) => [p[0], p[1], p[2]]);
    let L0 = 0; for (let i = 0; i < N; i++) L0 += Math.hypot(...P[i].map((v, k) => v - P[(i + 1) % N][k]));
    L0 /= N;
    frames.push(P.map((p) => [...p, 0]));
    for (let it = 0; it < iters; it++) {
      if (it % 40 === 39) yield it / iters;
      const F = P.map(() => [0, 0, 0]);
      let dmin = Infinity;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, d = P[j].map((v, k) => v - P[i][k]), l = Math.hypot(...d), f = (l - L0) / l;
        for (let k = 0; k < 3; k++) { F[i][k] += 0.5 * f * d[k]; F[j][k] -= 0.5 * f * d[k]; }
        const a = P[(i - 1 + N) % N], b = P[j];
        for (let k = 0; k < 3; k++) F[i][k] += 0.05 * ((a[k] + b[k]) / 2 - P[i][k]);
      }
      let dseg = Infinity;
      for (let i = 0; i < N; i++) for (let j = i + 3; j < N; j++) {
        if (N - (j - i) < 3) continue;
        const d = [P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]], r2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], r = Math.sqrt(r2);
        dmin = Math.min(dmin, r);
        const f = (0.02 * L0 * L0) / (r2 * r + 1e-9);
        for (let k = 0; k < 3; k++) { F[i][k] += f * d[k]; F[j][k] -= f * d[k]; }
        // segments i and j can be closer than their end points: measure
        // them, and push their closest points apart
        if (r < 3 * L0) {
          const i2 = (i + 1) % N, j2 = (j + 1) % N, ds = segDist(P[i], P[i2], P[j], P[j2]), L = segDist.last;
          dseg = Math.min(dseg, ds);
          if (ds < L0 && ds > 1e-12) {
            const fs = (0.02 * L0 * L0) / (ds * ds * ds);
            for (let k = 0; k < 3; k++) {
              const fk = fs * L.g[k];
              F[i][k] += (1 - L.s) * fk; F[i2][k] += L.s * fk; F[j][k] -= (1 - L.t) * fk; F[j2][k] -= L.t * fk;
            }
          }
        }
      }
      // segments two apart share no point either: a tight kink can fold one
      // through the other, so they get the same treatment
      for (let i = 0; i < N; i++) {
        const i2 = (i + 1) % N, j = (i + 2) % N, j2 = (i + 3) % N, ds = segDist(P[i], P[i2], P[j], P[j2]), L = segDist.last;
        dseg = Math.min(dseg, ds);
        if (ds < L0 && ds > 1e-12) {
          const fs = (0.02 * L0 * L0) / (ds * ds * ds);
          for (let k = 0; k < 3; k++) { const fk = fs * L.g[k]; F[i][k] += (1 - L.s) * fk; F[i2][k] += L.s * fk; F[j][k] -= (1 - L.t) * fk; F[j2][k] -= L.t * fk; }
        }
      }
      let fmax = 0; for (const f of F) fmax = Math.max(fmax, Math.hypot(...f));
      // each point moves less than a third of the gap between any two
      // segments, so no two segments can pass through each other
      const scale = Math.min(1, (0.3 * Math.min(dseg, dmin, L0)) / (fmax + 1e-12));
      P = P.map((p, i) => p.map((v, k) => v + F[i][k] * scale));
      if ((it + 1) % every === 0) frames.push(P.map((p) => [...p, 0]));
    }
    return frames;
  }
  // How round a loop is: spread of distances from its centre, over their mean.
  function roundness(pts) {
    const N = pts.length, c = [0, 1, 2].map((k) => pts.reduce((a, p) => a + p[k], 0) / N);
    const r = pts.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])), m = r.reduce((a, b) => a + b, 0) / N;
    return Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / N) / m;
  }
  function closest(pts, dims, skipFrac = 1 / 24) {
    const N = pts.length, skip = Math.max(2, Math.ceil(N * skipFrac));
    let best = Infinity;
    for (let i = 0; i < N; i++) for (let j = i + skip; j < N; j++) {
      if (N - (j - i) < skip) continue;
      let d = 0; for (let k = 0; k < dims; k++) d += (pts[i][k] - pts[j][k]) ** 2;
      best = Math.min(best, d);
    }
    return Math.sqrt(best);
  }

  // A slightly turned copy of a projection: the same picture, but no two
  // strands line up exactly, which would hide a crossing.
  function generic(A, B, C, a = 0.137, b = 0.071) {
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const R = [[ca, sa * sb, sa * cb], [0, cb, -sb], [-sa, ca * sb, ca * cb]];
    const base = [A, B, C];
    return R.map((r) => [0, 1, 2, 3].map((k) => r[0] * base[0][k] + r[1] * base[1][k] + r[2] * base[2][k]));
  }
  // The knot's Alexander polynomial, read from a generic view.
  const invariant = (pts, A, B, C) => alexander(diagram(pts, ...generic(A, B, C)));
  g.Knots = { generic, invariant, KNOTS, make, gcd, diagram, alexander, polyString, isOne, unknottingSet, bumpWidth, passThrough, relax, relaxGen, roundness, closest };
})(typeof window !== 'undefined' ? window : globalThis);
