// Checks for quasi.js. Run with: node tests/quasi.test.js
require('../hyper.js');
require('../quasi.js');
const Q = globalThis.Quasi;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
let seed = 4242;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

// 1. Tilings cover the middle of the patch exactly once.
function coverage(P, R, samples) {
  const tiles = Q.buildAll(P, R), counts = {};
  for (let k = 0; k < samples; k++) {
    let p; do { p = Array.from({ length: P.d }, () => (rand() * 2 - 1) * R * 0.5); } while (Math.hypot(...p) > R * 0.5);
    let c = 0;
    for (const t of tiles) if (p.every((v, a) => Math.abs(t.center[a] - v) < 3) && Q.contains(t, p)) c++;
    counts[c] = (counts[c] || 0) + 1;
  }
  return { tiles, counts };
}
for (const [m, step] of [[3, 8], [4, 8], [5, 8], [5, 3], [5, 0], [7, 8], [7, 4], [8, 8], [12, 8]]) {
  const P = Q.setup(2, m, step), { tiles, counts } = coverage(P, 9, 1500);
  check(`2D m=${m} step=${step}: every point in exactly one rhombus (${tiles.length} tiles)`, counts[1] === 1500, JSON.stringify(counts));
}
for (const m of [3, 4, 6, 7]) {
  const P = Q.setup(3, m), { tiles, counts } = coverage(P, 3.2, 600);
  check(`3D m=${m}: every point in exactly one rhombohedron (${tiles.length} tiles)`, counts[1] === 600, JSON.stringify(counts));
}

// 1b. The 1D Fibonacci chain, and slices of 4D-and-up tilings.
{
  const P = Q.setup(1, 2, Q.STEPS), t = Q.buildAll(P, 40);
  const L = t.filter((x) => x.shape === 1).length, S = t.filter((x) => x.shape === 2).length;
  const lens = [...new Set(t.map((x) => Math.abs(x.edges[0][0]).toFixed(6)))].map(Number).sort((a, b) => b - a);
  check('Fibonacci chain: long/short lengths in the golden ratio', lens.length === 2 && Math.abs(lens[0] / lens[1] - Q.PHI) < 1e-5, lens.join(' / '));
  check('Fibonacci chain: long to short count near the golden ratio', Math.abs(Math.max(L, S) / Math.min(L, S) - Q.PHI) < 0.06, `${L}:${S}`);
  const per = Q.period(Q.setup(1, 2, 3));
  check('Fibonacci 5/3 repeats every 8 tiles', per.tiles === 8, String(per.tiles));
  const { counts } = coverage(P, 30, 500);
  check('Fibonacci chain covers the line once', counts[1] === 500, JSON.stringify(counts));
}
for (const [d, m] of [[4, 5], [4, 7], [4, 8], [5, 11], [6, 13]]) {
  const P = Q.setup(d, m), off = Array.from({ length: d - 3 }, (_, i) => 0.3 + 0.17 * i), R = 2.2;
  const tiles = Q.buildAll(P, R + 1.5, off);
  const counts = {};
  for (let k = 0; k < 300; k++) {
    let y; do { y = [0, 1, 2].map(() => (rand() * 2 - 1) * R); } while (Math.hypot(...y) > R);
    const p = [...y, ...off];
    const c = tiles.filter((t) => Q.contains(t, p)).length;
    counts[c] = (counts[c] || 0) + 1;
  }
  const sols = tiles.map((t) => Q.solid(t, off)).filter(Boolean);
  check(`${d}D from ${m}D: slice points lie in exactly one cell (${sols.length} cut cells)`, counts[1] === 300, JSON.stringify(counts));
}
// Slice cells: their 3D volumes add up to the ball they fill.
{
  const P = Q.setup(4, 7), off = [0.21], tiles = Q.buildAll(P, 4, off);
  const sols = tiles.map((t) => Q.solid(t, off)).filter(Boolean);
  const inner = sols.filter((s) => Math.hypot(...s.center) < 1.6);
  let hit = 0; const N = 4000;
  for (let k = 0; k < N; k++) { const y = [0, 1, 2].map(() => (rand() * 2 - 1) * 4); if (tiles.some((t) => Math.hypot(...t.center.slice(0, 3)) < 6 && Q.contains(t, [...y, ...off]))) hit++; }
  const vsum = sols.reduce((a, s) => a + Q.volume(s), 0);
  check('4D slice cells have positive volume', inner.every((s) => Q.volume(s) > 0), `${inner.length} cells`);
  check('4D slice: cell volumes match the space they cover', Math.abs(vsum / ((hit / N) * 512) - 1) < 0.05, `${vsum.toFixed(1)} vs ${((hit / N) * 512).toFixed(1)}`);
}
check('5D slice of the 5D grid would be cubes; 4D from 5D repeats', Q.setup(4, 5).repeats && !Q.setup(4, 7).repeats && Q.setup(4, 6).repeats && !Q.setup(4, 8).repeats);

// 2. Penrose: corners sit on exactly 4 layers, and thick:thin tends to the golden ratio.
{
  const P = Q.setup(2, 5, Q.STEPS), tiles = Q.buildAll(P, 30), V = Q.vertices(P, tiles);
  const layers = new Set(V.map((v) => v.layer));
  check('Penrose corners use 4 layers', layers.size === 4, [...layers].sort().join(','));
  const thick = tiles.filter((t) => t.shape === 1).length, thin = tiles.filter((t) => t.shape === 2).length;
  check('Penrose thick:thin near the golden ratio', Math.abs(thick / thin - Q.PHI) < 0.03, (thick / thin).toFixed(4));
}

// 3. Rational slices repeat: a whole number of tiles per period, and the
//    period maps corners onto corners.
for (const [m, step] of [[3, 8], [5, 1], [5, 2], [5, 3], [5, 4], [7, 2], [8, 3]]) {
  const P = Q.setup(2, m, step), per = Q.period(P);
  const whole = per && Math.abs(per.area * P.density - per.tiles) < 1e-6;
  const R = Math.max(14, Math.hypot(...per.vecs[0]) * 2.5);
  const V = Q.vertices(P, Q.buildAll(P, R));
  const key = (x) => Math.round(x[0] * 1e4) + ',' + Math.round(x[1] * 1e4);
  const set = new Set(V.map((v) => key(v.x)));
  let hit = 0, tried = 0;
  for (const v of V) {
    if (v.r > R * 0.5 - Math.hypot(...per.vecs[0])) continue;
    tried++;
    if (set.has(key([v.x[0] + per.vecs[0][0], v.x[1] + per.vecs[0][1]]))) hit++;
  }
  check(`m=${m} step=${step} (${P.slice.label}) repeats every ${per.tiles} tiles`, whole && tried > 0 && hit === tried, `area*density ${(per.area * P.density).toFixed(6)}, ${hit}/${tried} corners map`);
}
// Fibonacci approximants repeat less and less often.
{
  const counts = [1, 2, 3, 4, 5, 6].map((s) => Q.period(Q.setup(2, 5, s)).tiles);
  check('Penrose approximants grow', counts.every((c, i) => !i || c > counts[i - 1]), counts.join(' < '));
}
// The exact Penrose slice has no period.
check('exact Penrose slice has no period', Q.period(Q.setup(2, 5, Q.STEPS)) === null);

// 4. Periodic tilings put their corners on finitely many window points; the
//    exact one spreads them out.
{
  const distinct = (P) => new Set(Q.vertices(P, Q.buildAll(P, 20)).map((v) => v.y.map((x) => Math.round(x * 1e4)).join())).size;
  const a = distinct(Q.setup(2, 5, 3)), b = distinct(Q.setup(2, 5, Q.STEPS));
  const per = Q.period(Q.setup(2, 5, 3)).tiles;
  check('5/3 slice: corners land on as many window points as tiles per period', a === per, `${a} points, ${per} tiles per period`);
  check('golden slice: every corner lands on its own window point', b > 1000, `${b} points`);
}

// 5. Corners land inside the window outline.
{
  const P = Q.setup(2, 5, Q.STEPS), W = Q.window2(P), V = Q.vertices(P, Q.buildAll(P, 15));
  const inside = (p) => W.every((a, i) => { const b = W[(i + 1) % W.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-9; });
  check('every Penrose corner lies in the window', V.every((v) => inside(v.y)), `${V.length} corners`);
}

// 6. Large m still builds.
{
  const P = Q.setup(2, 200, Q.STEPS), t = Q.buildAll(P, 2.5);
  check('m=200 builds', t.length > 0, `${t.length} tiles`);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
