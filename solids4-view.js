// "Rotate in 4D": the regular 4D solids and three 4D surfaces, turned in
// any of the six planes of 4D, seen in perspective, flat, or as a 3D slice.
(function () {
  const V = window.FourDView, S = window.Solids4, F = window.FourD;
  if (!V || !S) return;
  const $ = (id) => document.getElementById(id);
  const { st, clamp } = V;
  const s4 = { obj: 'tesseract', speeds: [0, 0, 20, 0, 0, 0], angles: [0, 0, 0, 0, 0, 0], view: 'persp', pos: 0, fold: 90, folding: false, foldDir: -1, cache: {} };

  function model() {
    const O = S.OBJECTS[s4.obj];
    if (O.folding) return O.make((s4.fold * Math.PI) / 180);
    if (!s4.cache[s4.obj]) s4.cache[s4.obj] = O.make();
    return s4.cache[s4.obj];
  }
  function draw(c, w, h, dpr) {
    const O = S.OBJECTS[s4.obj], M = model(), R = S.rotation(s4.angles);
    // the net sits off centre: centre it in 4D first
    let ctr = [0, 0, 0, 0];
    if (O.folding) ctr = [0, 1, 2, 3].map((k) => M.V.reduce((a, p) => a + p[k], 0) / M.V.length);
    const rad = Math.max(...M.V.map((p) => Math.hypot(...p.map((x, k) => x - ctr[k])))) || 1;
    const P = M.V.map((p) => S.apply(R, p.map((x, k) => (x - ctr[k]) / rad)));
    const cam = V.camera(w, h, 0.25, 0);
    const T = V.theme();
    if (s4.view === 'slice' && !O.surface && !O.folding) {
      // cut the solid with the hyperplane w = pos: edges crossing it give the corners of the slice
      const pts = [];
      for (const [a, b] of M.E) {
        const fa = P[a][3] - s4.pos, fb = P[b][3] - s4.pos;
        if ((fa > 0) === (fb > 0)) continue;
        const t = fa / (fa - fb), q = [0, 1, 2].map((k) => P[a][k] + t * (P[b][k] - P[a][k]));
        if (!pts.some((o) => Math.abs(o[0] - q[0]) + Math.abs(o[1] - q[1]) + Math.abs(o[2] - q[2]) < 1e-7)) pts.push(q);
      }
      const Hl = pts.length >= 4 && pts.length <= 220 ? F.hull3(pts) : { V: pts, faces: [] };
      const Vr = Hl.V.map(cam.rot), items = [];
      for (const f of Hl.faces) {
        const n = cam.rot(f.n), Q = f.idx.map((i) => Vr[i]);
        if (V.dot3(n, V.sub3(cam.eye, Q[0])) <= 0) continue;
        items.push({ z: Q.reduce((a, q) => a + q[2], 0) / Q.length, Q, lit: V.dot3(n, V.LIGHT) });
      }
      items.sort((a, b) => a.z - b.z);
      for (const it of items) { V.poly(c, it.Q.map(cam.proj)); c.fillStyle = V.hsl(285, 0.92, it.lit * 18 - 6); c.fill(); c.strokeStyle = T.panel; c.lineWidth = dpr; c.stroke(); }
      if (!Hl.faces.length) { c.fillStyle = T.accent; for (const q of Vr) { const sp = cam.proj(q); c.beginPath(); c.arc(sp[0], sp[1], 3 * dpr, 0, 7); c.fill(); } }
      $('fd-foot').textContent = pts.length ? `the slice w = ${s4.pos.toFixed(2)}: ${pts.length} corners, ${Hl.faces.length} faces` : 'the slice misses it';
    } else {
      const d = 2.6;
      const to3 = (p) => (s4.view === 'persp' ? p.slice(0, 3).map((x) => (x * d) / (d - p[3])) : p.slice(0, 3));
      const Q = P.map((p) => cam.rot(to3(p)));
      const segs = M.E.map(([a, b]) => ({ a, b, z: (Q[a][2] + Q[b][2]) / 2 })).sort((x, y) => x.z - y.z);
      c.lineCap = 'round';
      const lw = (O.surface ? 1.2 : M.E.length > 800 ? 1.1 : 2.2) * dpr;
      for (const sg of segs) {
        const A = cam.proj(Q[sg.a]), B = cam.proj(Q[sg.b]), wv = (P[sg.a][3] + P[sg.b][3]) / 2;
        // near the slice, mark the edge
        const hot = s4.view === 'slice' && (P[sg.a][3] - s4.pos) * (P[sg.b][3] - s4.pos) <= 0;
        c.strokeStyle = hot ? T.accent : V.wColor(wv, O.surface ? 0.55 : 0.85); c.lineWidth = hot ? lw * 2 : lw;
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
      }
      $('fd-foot').textContent = s4.view === 'persp' ? 'perspective from a point on the w axis: the far side of w looks smaller' : s4.view === 'flat' ? 'w dropped: a straight shadow' : 'edges that cross the slice are marked';
    }
    const fixed = S.fixedDim(S.rotation(s4.speeds.map((x) => (x * Math.PI) / 180)));
    const moving = s4.speeds.some((x) => x);
    V.setStats([
      [O.surface ? 'A surface' : O.folding ? 'Fold' : 'Corners, edges, cells', O.surface ? (s4.obj === 'klein' ? 'one-sided, closed, no self-crossing in 4D' : 'flat, inside the 3-sphere') : O.folding ? `${s4.fold.toFixed(0)} degrees` : `${M.V.length}, ${M.E.length}, ${O.cells}`],
      ['Left still by this rotation', !moving ? 'everything' : ['only the centre', 'a line', 'a plane', 'a 3D space', 'everything'][fixed]],
      ['Planes turning', moving ? S.PLANE_NAMES.filter((_, k) => s4.speeds[k]).join(', ') : 'none'],
    ]);
  }
  let last = performance.now();
  function drawDemo(c, w, h, dpr) {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    s4.angles = s4.angles.map((a, k) => a + (dt * s4.speeds[k] * Math.PI) / 180);
    if (s4.folding) { s4.fold = clamp(s4.fold + s4.foldDir * dt * 30, 0, 90); if (s4.fold === 0 || s4.fold === 90) s4.foldDir *= -1; $('s4-fold').value = s4.fold; }
    draw(c, w, h, dpr);
  }
  V.register('solids', {
    timed: false, name: 'Rotate in 4D', sub: 'colour shows w: blue below, orange above',
    text: 'In 3D every turn has an axis. In 4D there are six planes to turn in, a turn in one plane leaves a whole plane still, and a double rotation in two planes at once leaves nothing still but the centre. Pick a solid or surface, set the speed in each plane, and choose how to see it. The 24-cell has no counterpart in 3D at all.',
    draw: drawDemo,
  });

  // controls
  const sliders = [...document.querySelectorAll('#s4-planes input')];
  const syncSliders = () => sliders.forEach((el, k) => { el.value = s4.speeds[k]; $('s4-pv' + k).textContent = s4.speeds[k]; });
  sliders.forEach((el, k) => el.addEventListener('input', () => { s4.speeds[k] = +el.value; $('s4-pv' + k).textContent = s4.speeds[k]; }));
  const PRESETS = { simple: [0, 0, 20, 0, 0, 0], double: [20, 0, 0, 0, 0, 20], isoclinic: [25, 0, 0, 0, 0, 25], three: [12, 7, 0, 9, 0, 0], all: [6, 9, 14, 5, 11, 8], still: [0, 0, 0, 0, 0, 0] };
  for (const b of document.querySelectorAll('#s4-pre button')) b.onclick = () => { s4.speeds = PRESETS[b.dataset.p].slice(); if (b.dataset.p === 'double') s4.speeds = [20, 0, 0, 0, 0, 35]; syncSliders(); };
  $('s4-obj').addEventListener('change', (e) => { s4.obj = e.target.value; $('s4-foldrow').hidden = s4.obj !== 'net'; if (s4.obj === 'net') { s4.fold = 0; s4.folding = true; s4.foldDir = 1; $('s4-foldbtn').setAttribute('aria-pressed', true); } });
  for (const b of document.querySelectorAll('#s4-view button')) b.onclick = () => { s4.view = b.dataset.v; for (const o of document.querySelectorAll('#s4-view button')) o.setAttribute('aria-pressed', o === b); $('s4-posrow').hidden = s4.view !== 'slice'; };
  $('s4-pos').addEventListener('input', () => { s4.pos = +$('s4-pos').value; });
  $('s4-fold').addEventListener('input', () => { s4.fold = +$('s4-fold').value; s4.folding = false; $('s4-foldbtn').setAttribute('aria-pressed', false); });
  $('s4-foldbtn').onclick = () => { s4.folding = !s4.folding; $('s4-foldbtn').setAttribute('aria-pressed', s4.folding); };
  syncSliders();
})();
