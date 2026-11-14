// Fractals as k shrunken copies of themselves, and their dimension two ways:
// from the rule (k copies at scale 1/s means s^D = k), and by counting
// boxes: if the shape touches N boxes of side e, N grows like (1/e)^D.
(function (g) {
  const rad = Math.PI / 180;
  // a map p -> s * turn(a) * p + t, in 2D; in 3D only scaling and moving
  const map2 = (s, a, tx, ty) => ({ s, f: (p) => { const c = Math.cos(a * rad), n = Math.sin(a * rad); return [s * (c * p[0] - n * p[1]) + tx, s * (n * p[0] + c * p[1]) + ty]; } });
  const map3 = (s, t) => ({ s, f: (p) => [s * p[0] + t[0], s * p[1] + t[1], s * p[2] + t[2]] });

  function ngonFlake(k, r) {
    // k copies at the corners of a k-gon, each r times the size
    return Array.from({ length: k }, (_, i) => { const a = (2 * Math.PI * i) / k + Math.PI / 2; return map2(r, 0, (1 - r) * Math.cos(a), (1 - r) * Math.sin(a)); });
  }
  const FRACTALS = {
    cantor: { name: 'Cantor set', dim: 1, maps: [map2(1 / 3, 0, 0, 0), map2(1 / 3, 0, 2 / 3, 0)], seed: [[0.5, 0]] },
    koch: { name: 'Koch curve', dim: 2, maps: [map2(1 / 3, 0, 0, 0), map2(1 / 3, 60, 1 / 3, 0), map2(1 / 3, -60, 0.5, Math.sqrt(3) / 6), map2(1 / 3, 0, 2 / 3, 0)], seed: [[0.5, 0.1]] },
    sierpinski: { name: 'Sierpinski triangle', dim: 2, maps: [map2(0.5, 0, 0, 0), map2(0.5, 0, 0.5, 0), map2(0.5, 0, 0.25, Math.sqrt(3) / 4)], seed: [[0.5, Math.sqrt(3) / 6]] },
    carpet: { name: 'Sierpinski carpet', dim: 2, maps: [], seed: [[0.5, 0.5]] },
    vicsek: { name: 'Vicsek fractal', dim: 2, maps: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]].map(([i, j]) => map2(1 / 3, 0, i / 3, j / 3)), seed: [[0.5, 0.5]] },
    dragon: { name: 'Heighway dragon', dim: 2, maps: [map2(Math.SQRT1_2, 45, 0, 0), map2(Math.SQRT1_2, 135, 1, 0)], seed: [[0, 0]] },
    menger: { name: 'Menger sponge', dim: 3, maps: [], seed: [[0.5, 0.5, 0.5]] },
    flake: { name: 'your own flake', dim: 2, maps: null, seed: [[0, 0]] },
  };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!(i === 1 && j === 1)) FRACTALS.carpet.maps.push(map2(1 / 3, 0, i / 3, j / 3));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) if ((i === 1) + (j === 1) + (k === 1) < 2) FRACTALS.menger.maps.push(map3(1 / 3, [i / 3, j / 3, k / 3]));

  function get(name, k = 5, r = 0.38) { const F = FRACTALS[name]; return name === 'flake' ? { ...F, maps: ngonFlake(k, r), k, r } : F; }
  // the dimension the rule gives: copies at one scale, sum of s_i^D = 1
  function similarityDim(F) {
    const s = F.maps.map((m) => m.s);
    if (s.every((x) => Math.abs(x - s[0]) < 1e-12)) return Math.log(s.length) / Math.log(1 / s[0]);
    let lo = 0, hi = 3; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (s.reduce((a, x) => a + x ** m, 0) > 1) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // every image of the seed points after `level` rounds of maps
  function points(F, level) {
    let P = F.seed.slice();
    for (let l = 0; l < level; l++) { const next = []; for (const m of F.maps) for (const p of P) next.push(m.f(p)); P = next; }
    return P;
  }
  // the deepest level with at most `budget` points
  function levelFor(F, budget = 250000) { const k = F.maps.length, s = F.seed.length; let L = 0; while (s * k ** (L + 1) <= budget) L++; return L; }
  // occupied boxes of side e
  function boxes(P, e) {
    const set = new Set(), d = P[0].length;
    for (const p of P) { let key = ''; for (let i = 0; i < d; i++) key += Math.floor(p[i] / e + 1e-9) + ','; set.add(key); }
    return set;
  }
  // box counts over a range of sizes, and the slope of log N against log(1/e)
  function boxDimension(P, eMax, eMin, steps = 9) {
    const rows = [];
    for (let i = 0; i < steps; i++) { const e = eMax * (eMin / eMax) ** (i / (steps - 1)); rows.push({ e, n: boxes(P, e).size }); }
    const xs = rows.map((r) => Math.log(1 / r.e)), ys = rows.map((r) => Math.log(r.n)), mx = xs.reduce((a, b) => a + b) / steps, my = ys.reduce((a, b) => a + b) / steps;
    let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    return { rows, slope: sxy / sxx, icept: my - (sxy / sxx) * mx };
  }

  // box sizes matched to the fractal: copies a few levels down, to just
  // above the finest copies drawn
  function rangeFor(F, L) { const s = F.maps[0].s; return [s ** Math.min(3, L - 2), s ** (L - 1)]; }
  // box sides equal to the copies' own sizes, s^1 ... s^(L-2): the grid then
  // lines up with the copies, and the finest two levels, where the drawn
  // points thin out, are left out
  function levelSizes(F, L, from) { if (from === undefined) from = Math.max(1, Math.min(3, L - 4)); const s = F.maps[0].s, out = []; for (let k = from; k <= Math.max(from + 2, L - 2); k++) out.push(s ** k); return out; }
  function fitSizes(P, sizes) {
    const rows = sizes.map((e) => ({ e, n: boxes(P, e).size })), m = rows.length;
    const xs = rows.map((r) => Math.log(1 / r.e)), ys = rows.map((r) => Math.log(r.n)), mx = xs.reduce((a, b) => a + b) / m, my = ys.reduce((a, b) => a + b) / m;
    let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    return { rows, slope: sxy / sxx, icept: my - (sxy / sxx) * mx };
  }
  g.Fractal = { rangeFor, levelSizes, fitSizes, FRACTALS, get, similarityDim, points, levelFor, boxes, boxDimension, ngonFlake };
})(typeof window !== 'undefined' ? window : globalThis);
