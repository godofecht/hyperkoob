// The Hopf fibration: the 3-sphere is a family of circles, one for each point
// of the ordinary sphere, and every two of them link once. Pure maths.
(function (g) {
  // A point of the 3-sphere as (z1, z2) in C², stored as [Re z1, Im z1, Re z2, Im z2].
  // The Hopf map sends it to (2 z1 conj(z2), |z1|² - |z2|²) on the unit sphere.
  function hopf(p) {
    const [a, b, c, d] = p;
    return [2 * (a * c + b * d), 2 * (b * c - a * d), a * a + b * b - c * c - d * d];
  }
  // The circle over the sphere point s, at angle th round it:
  // z1 = sqrt((1 + z)/2) e^(i th), z2 = sqrt((1 - z)/2) e^(i(th - phi)).
  function fiber(s, th) {
    const z = Math.max(-1, Math.min(1, s[2])), phi = Math.atan2(s[1], s[0]);
    const u = Math.sqrt((1 + z) / 2), v = Math.sqrt((1 - z) / 2);
    return [u * Math.cos(th), u * Math.sin(th), v * Math.cos(th - phi), v * Math.sin(th - phi)];
  }
  // Turn the 3-sphere in the plane of its first and last coordinates before
  // looking at it; a rigid motion of the 3-sphere, so circles stay circles.
  // plane 'mix' turns (Re z1, Im z2), which moves circles to other circles;
  // 'fibre' multiplies z1 and z2 by e^(ia), sliding every point along its own
  // circle, so the picture does not change; 'base' turns z2 alone, which
  // turns the sphere below about its axis.
  function spin(p, a, plane = 'mix') {
    const c = Math.cos(a), s = Math.sin(a);
    if (plane === 'fibre') return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2] * c - p[3] * s, p[2] * s + p[3] * c];
    if (plane === 'base') return [p[0], p[1], p[2] * c - p[3] * s, p[2] * s + p[3] * c];
    return [p[0] * c - p[3] * s, p[1], p[2], p[0] * s + p[3] * c];
  }
  // Stereographic projection from (0, 0, 0, 1) into ordinary space.
  function stereo(p) { const k = 1 / Math.max(1e-6, 1 - p[3]); return [p[0] * k, p[1] * k, p[2] * k]; }
  // The fibre as a closed loop in space, n points.
  function loop(s, n, a = 0, plane = 'mix') { const out = []; for (let i = 0; i < n; i++) out.push(stereo(spin(fiber(s, (2 * Math.PI * i) / n), a, plane))); return out; }
  // Points on the sphere for each pattern.
  function base(kind, n, lat, t = 0) {
    const out = [], at = (th, ph) => [Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), Math.sin(th)];
    if (kind === 'ring') for (let i = 0; i < n; i++) out.push(at(lat, (2 * Math.PI * i) / n + t));
    else if (kind === 'rings') for (const k of [-1, 0, 1]) for (let i = 0; i < Math.ceil(n / 3); i++) out.push(at(lat + k * 0.55 * Math.cos(lat), (2 * Math.PI * i) / Math.ceil(n / 3) + t + k * 0.3));
    else if (kind === 'meridian') for (let i = 0; i < n; i++) out.push(at(-Math.PI / 2 + 0.08 + ((Math.PI - 0.16) * i) / Math.max(1, n - 1), t));
    else if (kind === 'spiral') for (let i = 0; i < n; i++) { const z = -0.95 + (1.9 * (i + 0.5)) / n; out.push(at(Math.asin(z), i * 2.39996 + t)); }
    return out;
  }
  // Gauss's linking integral for two closed loops, by the midpoint rule.
  function linking(A, B) {
    let s = 0;
    for (let i = 0; i < A.length; i++) {
      const a0 = A[i], a1 = A[(i + 1) % A.length], da = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]], am = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, (a0[2] + a1[2]) / 2];
      for (let j = 0; j < B.length; j++) {
        const b0 = B[j], b1 = B[(j + 1) % B.length], db = [b1[0] - b0[0], b1[1] - b0[1], b1[2] - b0[2]];
        const r = [am[0] - (b0[0] + b1[0]) / 2, am[1] - (b0[1] + b1[1]) / 2, am[2] - (b0[2] + b1[2]) / 2], l = Math.hypot(r[0], r[1], r[2]);
        const cr = [da[1] * db[2] - da[2] * db[1], da[2] * db[0] - da[0] * db[2], da[0] * db[1] - da[1] * db[0]];
        s += (r[0] * cr[0] + r[1] * cr[1] + r[2] * cr[2]) / (l * l * l);
      }
    }
    return s / (4 * Math.PI);
  }
  g.Hopf = { hopf, fiber, spin, stereo, loop, base, linking };
})(typeof window !== 'undefined' ? window : globalThis);
