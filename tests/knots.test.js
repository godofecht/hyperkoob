// Checks for knots.js. Run with: node tests/knots.test.js
require('../js/knots.js');
const K = globalThis.Knots;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const A = [1, 0, 0, 0], B = [0, 1, 0, 0], C = [0, 0, 1, 0];
const same = (c, want) => JSON.stringify(c) === JSON.stringify(want);

// 1. Known Alexander polynomials, from the diagram seen from above.
const known = { unknot: [1], trefoil: [1, -1, 1], figure8: [1, -3, 1], cinquefoil: [1, -1, 1, -1, 1], t34: [1, -1, 0, 1, 0, -1, 1] };
for (const [k, want] of Object.entries(known)) {
  const D = K.diagram(K.make(k, 180), A, B, C), a = K.alexander(D);
  check(`${k}: Alexander polynomial ${K.polyString(want)}`, same(a, want), `${D.X.length} crossings, got ${K.polyString(a)}`);
}
// the same knot seen from another side gives the same polynomial
{
  const D = K.diagram(K.make('trefoil', 180), A, C, B), a = K.alexander(D);
  check('trefoil from the front: same polynomial', same(a, [1, -1, 1]), `${D.X.length} crossings, ${K.polyString(a)}`);
}

// 2. Unknotting sets, and the strand moves that carry them out.
for (const [k, size] of [['trefoil', 1], ['figure8', 1], ['cinquefoil', 2]]) {
  let pts = K.make(k, 180);
  const D = K.diagram(pts, A, B, C), S = K.unknottingSet(D);
  check(`${k}: switching ${size} crossing${size > 1 ? 's' : ''} gives polynomial 1`, S && S.length === size, S ? `crossings ${S.join(', ')}` : 'none found');
  // carry the switches out in space and read the new diagram
  let min3 = Infinity, min4 = Infinity;
  for (const idx of S) {
    const x = D.X[idx], wdt = K.bumpWidth(D, x, pts.length);
    for (let s = 0; s <= 1.0001; s += 0.05) { const Q = K.passThrough(pts, x, C, s, 1.2, wdt); min3 = Math.min(min3, K.closest(Q, 3)); min4 = Math.min(min4, K.closest(Q, 4)); }
    pts = K.passThrough(pts, x, C, 1, 1.2, wdt);
  }
  const after = K.alexander(K.diagram(pts, A, B, C));
  check(`${k}: after the moves the diagram has polynomial 1`, K.isOne(after), K.polyString(after));
  check(`${k}: the moves pass strands through each other in 3D but not in 4D`, min3 < 0.08 && min4 > 0.15, `closest ${min3.toFixed(3)} in 3D, ${min4.toFixed(3)} in 4D`);
  check(`${k}: the rope is back in 3D afterwards`, pts.every((p) => Math.abs(p[3]) < 1e-9));
}
// without a lift the same move collides in 4D too
{
  const pts = K.make('trefoil', 180), D = K.diagram(pts, A, B, C), x = D.X[K.unknottingSet(D)[0]], wdt = K.bumpWidth(D, x, 180);
  let m = Infinity; for (let s = 0; s <= 1.0001; s += 0.02) m = Math.min(m, K.closest(K.passThrough(pts, x, C, s, 0, wdt), 4));
  check('with no lift in w the strands collide', m < 0.08, m.toFixed(3));
}

// 3. Relaxing: the unknotted rope opens into a round loop; the knot cannot.
{
  let pts = K.make('trefoil', 120);
  const D = K.diagram(pts, A, B, C), S = K.unknottingSet(D);
  for (const idx of S) pts = K.passThrough(pts, D.X[idx], C, 1, 1.2, K.bumpWidth(D, D.X[idx], 120));
  const open = K.relax(pts, 12000, 100), knot = K.relax(K.make('trefoil', 120), 12000, 100);
  const ro = K.roundness(open[open.length - 1]), rk = K.roundness(knot[knot.length - 1]);
  const ak = K.alexander(K.diagram(knot[knot.length - 1], A, B, C));
  check('unknotted rope relaxes into a round loop; the knot cannot', ro < 0.05 && rk > 0.2, `spread ${ro.toFixed(3)} against ${rk.toFixed(3)}`);
  check('the relaxed knot is still a trefoil', same(ak, [1, -1, 1]), K.polyString(ak));
  check('relaxing never passes the rope through itself', open.every((f) => K.closest(f, 3, 1 / 40) > 0.01) && knot.every((f) => K.closest(f, 3, 1 / 40) > 0.01));
}
// 4. Relaxing keeps every knot's type, read from a generic view every 100 steps.
for (const k of ['trefoil', 'figure8', 'cinquefoil', 't34', 't35']) {
  const fr = K.relax(K.make(k, 120), 12000, 100), want = K.polyString(K.invariant(fr[0], A, B, C));
  const bad = fr.findIndex((f) => K.polyString(K.invariant(f, A, B, C)) !== want);
  check(`${k} stays a ${k} for 12,000 relaxing steps`, bad < 0, bad < 0 ? want : `changed at step ${bad * 100}`);
}
check('(2, 4) is a link, not a knot', K.make('torus', 100, 2, 4) === null);

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
