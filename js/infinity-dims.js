// Where infinity meets dimension: a curve through a cube in any dimension,
// the patch of square a stretch of line lands on, and a box with infinitely
// many sides that still has a finite diagonal. Pure maths; runs in Node too.
(function (g) {
  // The d-dimensional Hilbert curve of order b: point number h, as integer
  // coordinates on a 2^b grid. John Skilling's method (2004): spread the
  // bits of h across the d axes, then undo a Gray code and the rotations.
  function hilbertD(d, b, h) {
    const X = new Array(d).fill(0);
    for (let j = 0; j < b; j++) for (let i = 0; i < d; i++) {
      const bit = Math.floor(h / 2 ** ((b - 1 - j) * d + (d - 1 - i))) % 2;
      X[i] |= bit << (b - 1 - j);
    }
    const N = 2 << (b - 1);
    let t = X[d - 1] >> 1;
    for (let i = d - 1; i > 0; i--) X[i] ^= X[i - 1];
    X[0] ^= t;
    for (let Q = 2; Q !== N; Q <<= 1) {
      const P = Q - 1;
      for (let i = d - 1; i >= 0; i--) {
        if (X[i] & Q) X[0] ^= P;
        else { t = (X[0] ^ X[i]) & P; X[0] ^= t; X[i] ^= t; }
      }
    }
    return X;
  }
  // every point in order, centred in the unit cube [-1/2, 1/2]^d
  function hilbertPath(d, b) {
    const side = 2 ** b, N = side ** d, out = new Array(N);
    for (let h = 0; h < N; h++) out[h] = hilbertD(d, b, h).map((x) => (x + 0.5) / side - 0.5);
    return out;
  }

  // The pieces of the line that land in a disk: given the cells of a curve in
  // order, which run of indices falls inside, as intervals of [0, 1].
  function preimage(path, cx, cy, r) {
    const N = path.length, out = [];
    let start = -1, inside = 0;
    for (let i = 0; i <= N; i++) {
      const p = path[i], hit = i < N && Math.hypot(p[0] - cx, p[1] - cy) <= r;
      if (hit) { inside++; if (start < 0) start = i; }
      else if (start >= 0) { out.push([start / N, i / N]); start = -1; }
    }
    return { pieces: out, fraction: inside / N };
  }

  // The box with sides 1, 1/2, 1/3, ...: its main diagonal squared is the sum
  // of 1/k^2, which Euler showed tends to π²/6.
  const diag = (sides) => Math.sqrt(sides.reduce((s, x) => s + x * x, 0));
  const hilbertSides = (n) => Array.from({ length: n }, (_, k) => 1 / (k + 1));
  const unitSides = (n) => new Array(n).fill(1);
  // sides 1, 1/2^p, 1/3^p, ...: the diagonal squared is the sum of 1/k^(2p)
  const powerSides = (n, p) => Array.from({ length: n }, (_, k) => (k + 1) ** -p);
  // Riemann's zeta for s > 1: a partial sum and the Euler-Maclaurin tail
  function zeta(s, N = 64) {
    let z = 0; for (let k = 1; k < N; k++) z += k ** -s;
    return z + N ** (1 - s) / (s - 1) + 0.5 * N ** -s + (s * N ** (-s - 1)) / 12 - (s * (s + 1) * (s + 2) * N ** (-s - 3)) / 720;
  }
  // The shadow of a box on a plane is a zonogon: the sum of its edge vectors'
  // shadows. Outline from generators gs (2D vectors), centred on 0.
  function zonogon(gs) {
    const G = gs.map(([x, y]) => (y < 0 || (y === 0 && x < 0) ? [-x, -y] : [x, y]))
      .sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    let x = 0, y = 0;
    for (const [a, b] of G) { x -= a / 2; y -= b / 2; }
    const out = [[x, y]];
    for (const [a, b] of G) { x += a; y += b; out.push([x, y]); }
    for (const [a, b] of G) { x -= a; y -= b; out.push([x, y]); }
    out.pop();
    return out;
  }
  // area of a polygon
  const area = (P) => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

  g.InfDims = { powerSides, zeta, hilbertD, hilbertPath, preimage, diag, hilbertSides, unitSides, zonogon, area, BASEL: Math.PI / Math.sqrt(6) };
})(typeof window !== 'undefined' ? window : globalThis);
