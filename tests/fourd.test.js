// Checks for fourd.js. Run with: node tests/fourd.test.js
require('../fourd.js');
const F = globalThis.FourD;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}

// 1. The slice basis is orthonormal and square to the long diagonal.
{
  const B = F.SLICE_BASIS, d = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  let worst = 0;
  for (let i = 0; i < 3; i++) { worst = Math.max(worst, Math.abs(d(B[i], [1, 1, 1, 1]))); for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(d(B[i], B[j]) - (i === j ? 1 : 0))); }
  check('slice basis is orthonormal and square to the diagonal', worst < 1e-12);
}

// 2. Corner-first slices of the tesseract: tetrahedron, then octahedron in the middle.
{
  const L = 2;
  const at = (t) => F.tesseractSlice(L, t, F.SLICE_BASIS);
  check('slice near a corner is a tetrahedron', at(-L + 0.4).V.length === 4, String(at(-L + 0.4).V.length));
  check('slice past the first corners is a truncated tetrahedron', at(-0.5).V.length === 12, String(at(-0.5).V.length));
  check('middle slice is an octahedron', at(0).V.length === 6 && at(0).faces.length === 8, `${at(0).V.length} corners, ${at(0).faces.length} faces`);
  // the slice volumes integrate to the tesseract's 4-volume, L^4
  let v = 0; const N = 400;
  for (let i = 0; i < N; i++) { const t = -L + ((i + 0.5) / N) * 2 * L, H = at(t); if (H.V.length >= 4) v += F.hullVolume(H) * ((2 * L) / N); }
  check('slice volumes add up to the 4-volume', Math.abs(v - L ** 4) / L ** 4 < 0.005, `${v.toFixed(4)} vs ${L ** 4}`);
  check('no slice beyond the corners', at(L + 0.01).V.length === 0);
}

// 3. Turning through x-w by a half turn mirrors the hand.
{
  check('hand is right-handed at the start', F.handedness(0) === 1);
  check('hand is left-handed after a half turn', F.handedness(Math.PI) === -1);
  const p = [0.7, 0.2, -0.3], q = F.turnXW(p, Math.PI);
  check('a half turn in x-w sends x to -x and returns to w = 0', Math.abs(q[0] + 0.7) < 1e-12 && Math.abs(q[3]) < 1e-12);
  // lengths are kept in 4D throughout
  let worst = 0;
  for (let th = 0; th <= Math.PI; th += 0.05) { const a = F.turnXW([0.3, 0.1, 0.2, 0], th), b = F.turnXW([-0.6, 0.4, 0.1, 0], th); worst = Math.max(worst, Math.abs(Math.hypot(...a.map((x, i) => x - b[i])) - Math.hypot(0.9, 0.3, 0.1))); }
  check('the turn is rigid in 4D', worst < 1e-12);
}

// 4. The knot: in 3D the straight blend passes the rope through itself; in
//    4D the strands never touch.
{
  let min3 = Infinity, min4 = Infinity;
  for (let s = 0; s <= 1.0001; s += 0.01) { const R = F.rope(s, 240); min3 = Math.min(min3, F.closest(R, 3).d); min4 = Math.min(min4, F.closest(R, 4).d); }
  check('in 3D the blend makes the rope cross itself', min3 < 0.05, min3.toFixed(4));
  check('in 4D the strands stay apart', min4 > 0.1, min4.toFixed(4));
}

// 5. Flatland: the outside creature sees only the wall.
{
  const r = F.retina(200);
  check('every ray from outside stops at the wall', r.every((x) => x.what === 'wall'), `${r.filter((x) => x.what === 'wall').length}/200`);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
