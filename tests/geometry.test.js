// Geometry checks for hyper.js and tile.js. Run with: node tests/geometry.test.js
// Exits non-zero on any failure.
require('../hyper.js');
require('../tile.js');
const H = globalThis.Hyper, T = globalThis.Tile;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

// 1. Every 3D diagonal frame with n >= 3 is a true orthogonal projection: rows orthonormal.
for (const n of [3, 4, 5, 6, 7, 8, 12, 16, 50, 300]) {
  const cols = H.frame3(n, 'diag');
  let worst = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const s = cols.reduce((acc, c) => acc + c[i] * c[j], 0);
    worst = Math.max(worst, Math.abs(s - (i === j ? 1 : 0)));
  }
  check(`3D frame for n=${n} is orthogonal`, worst < 1e-9, `max error ${worst.toExponential(1)}`);
}

// 2. Known shapes and roundness values.
const q2 = (D) => H.measure2(H.frame2(D, 'diag'), H.split(D).L).Q;
const q3 = (D) => H.measure3(H.frame3(D, 'diag'), H.split(D).L).Q;
check('square Q = pi/4', near(q2(2), Math.PI / 4), q2(2).toFixed(4));
check('hexagon Q = 0.9069', near(q2(3), 0.9069), q2(3).toFixed(4));
check('octagon Q = 0.9481', near(q2(4), 0.9481), q2(4).toFixed(4));
check('cube Q = pi/6', near(q3(3), Math.PI / 6), q3(3).toFixed(4));
check('rhombic dodecahedron Q = 0.7405', near(q3(4), 0.7405), q3(4).toFixed(4));
check('rhombic triacontahedron Q = 0.8872', near(q3(6), 0.8872), q3(6).toFixed(4));

// 3. Tesseract corner-first: 16 corners land on 15 points (two hit the centre).
{
  const D = 4, { L } = H.split(D), pos = H.project(H.frame3(D, 'diag'), L, 3).pos;
  const p = H.distinct(pos, 16, 3, 1);
  check('tesseract shadow has 15 distinct points', p === 15, String(p));
}

// 4. No jumps: dragging the slider by 0.001 moves every corner by a small amount.
{
  let worst = 0;
  for (let D = 0.001; D < 16; D += 0.001) {
    const a = H.frame3(D - 0.0005, 'diag'), b = H.frame3(D + 0.0005, 'diag');
    const pa = H.project(a, H.split(D - 0.0005).L, 3).pos, pb = H.project(b, H.split(D + 0.0005).L, 3).pos;
    const m = 1 << Math.min(a.length, b.length);
    for (let i = 0; i < m * 3; i++) worst = Math.max(worst, Math.abs(pa[i] - pb[i]));
  }
  check('3D shadow is continuous in D', worst < 0.01, `max step ${worst.toFixed(4)}`);
}

// 5. Tiling: sampled points are covered by exactly one tile, at whole and fractional D.
function insideZonotope(gens, p) {
  const dim = p.length, normals = [];
  if (dim === 2) for (const g of gens) { if (Math.hypot(...g) > 1e-9) normals.push([-g[1], g[0]]); }
  else for (let i = 0; i < gens.length; i++) for (let j = i + 1; j < gens.length; j++) {
    const a = gens[i], b = gens[j];
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    if (Math.hypot(...c) > 1e-9) normals.push(c);
  }
  const d = (u, v) => u.reduce((s, x, k) => s + x * v[k], 0);
  return normals.every((nn) => Math.abs(d(p, nn)) <= gens.reduce((s, g) => s + Math.abs(d(g, nn)), 0) / 2 - 1e-9);
}
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (const D of [2.5, 3, 3.25, 3.5, 3.75, 4]) {
  const S = T.setup(D), gens = T.generators(S), dim = S.n - 1;
  const shifts = [Array(dim).fill(0), ...T.translations(S, 3).map((t) => t.hq)];
  const counts = {};
  for (let k = 0; k < 5000; k++) {
    const p = Array.from({ length: dim }, () => (rand() * 2 - 1) * 0.6);
    let c = 0;
    for (const s of shifts) if (insideZonotope(gens, p.map((v, i) => v - s[i]))) c++;
    counts[c] = (counts[c] || 0) + 1;
  }
  check(`D=${D}: every sample lies in exactly one tile`, counts[1] === 5000, JSON.stringify(counts));
}
check('hexagon has 6 neighbours', T.translations(T.setup(3), 1).length === 6);
check('rhombic dodecahedron has 12 neighbours', T.translations(T.setup(4), 1).length === 12);

// 6. The tile from D just above a whole number matches the tile just below it.
for (const D of [2, 3]) {
  const key = (v) => v.pos.map((x) => (Math.abs(x) < 5e-5 ? 0 : x).toFixed(4)).join();
  const below = new Set(T.vertices(T.setup(D - 1e-7), 1, 1).map(key));
  const above = new Set(T.vertices(T.setup(D + 1e-7), 1, 1).map(key));
  const same = below.size === above.size && [...below].every((k) => above.has(k));
  check(`tile is continuous across D=${D}`, same, `${below.size} vs ${above.size} points`);
}

// 7. Slices of the higher honeycombs: sampled points of the slice lie in exactly one cell.
for (const D of [5, 5.5, 6, 8, 12]) {
  const S = T.sliceSetup(D), s = 0.3, cells = T.slice(S, s, 1.4);
  const o = S.v.map((v) => v * s);
  const inCell = (x, X) => {
    const z = o.map((v, k) => (v + X[0] * S.W[0][k] + X[1] * S.W[1][k] + X[2] * S.W[2][k]) / S.L[k] - x[k]);
    return Math.max(...z) - Math.min(...z) <= 1 + 1e-9;
  };
  const counts = {};
  for (let k = 0; k < 800; k++) {
    let X; do { X = [rand() - 0.5, rand() - 0.5, rand() - 0.5]; } while (Math.hypot(...X) > 0.4);
    const c = cells.filter((cl) => inCell(cl.x, X)).length;
    counts[c] = (counts[c] || 0) + 1;
  }
  check(`D=${D}: slice points lie in exactly one cell (${cells.length} cells)`, counts[1] === 800, JSON.stringify(counts));
}
check('A4 cell volume is sqrt(5)', near(T.sliceSetup(5).volume, Math.sqrt(5)));

// 8. Unbounded n: huge dimensions still give finite, sane numbers.
for (const D of [1000, 100000]) {
  const { L } = H.split(D), f3 = H.frame3(D, 'diag'), f2 = H.frame2(D, 'diag');
  const p = H.project(f3, L, 3), m3 = H.measure3(f3, L, 20000), m2 = H.measure2(f2, L, 20000);
  const ok = p.N > 0 && Number.isFinite(p.pos[0]) && m3.Q > 0.9 && m3.Q < 1.05 && m2.Q > 0.95 && m2.Q < 1.05;
  check(`D=${D} renders (${p.how}, Q3 ${m3.Q.toFixed(3)}, Q2 ${m2.Q.toFixed(3)})`, ok);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
