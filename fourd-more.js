// More fourth-dimension demos: unknotting any knot through w, a 4D maze,
// and the Hopf fibration. They plug into fourd-view.js.
(function () {
  const V = window.FourDView, K = window.Knots, F = window.FourD;
  if (!V) return;
  const $ = (id) => document.getElementById(id);
  const { st, clamp, smooth } = V;
  const AX = ['x', 'y', 'z', 'w'];
  const unit = (k) => [0, 1, 2, 3].map((i) => (i === k ? 1 : 0));

  // ---------- untie any knot ----------
  // The page finds crossings to switch with the Alexander polynomial, moves
  // each over strand down past its under strand while lifting it in w, then
  // lets the rope relax. It never passes through itself in 4D.
  const kn = { kind: 'trefoil', p: 2, q: 3, lift: 1.2, axes: [0, 1, 2], tilt: 0, diag: 2, noW: false, N: 120, built: null };
  const DIAG = { 2: [0, 1, 2], 1: [0, 2, 1], 0: [1, 2, 0] }; // seen along z, y or x: screen a, b and depth c
  function knotBuild() {
    const pts0 = K.make(kn.kind, kn.N, kn.p, kn.q);
    if (!pts0) { kn.built = { error: `(${kn.p}, ${kn.q}) is a link: p and q share a factor` }; return; }
    const [ia, ib, ic] = DIAG[kn.diag], A = unit(ia), B = unit(ib), C = unit(ic);
    const D0 = K.diagram(pts0, A, B, C), poly0 = K.invariant(pts0, A, B, C);
    const S = kn.noW ? [] : K.unknottingSet(D0, 4, 3000);
    const states = [pts0], moves = [], polys = [poly0];
    for (const idx of S || []) {
      const x = D0.X[idx], width = K.bumpWidth(D0, x, kn.N);
      moves.push({ x, width });
      const next = K.passThrough(states[states.length - 1], x, C, 1, kn.lift, width);
      states.push(next); polys.push(K.invariant(next, A, B, C));
    }
    const frames = [], gen = K.relaxGen(states[states.length - 1], 12000, 40, frames);
    const T = { intro: 2, move: 3.5, gap: 0.6, relax: 10 };
    const total = T.intro + moves.length * (T.move + T.gap) + T.relax;
    kn.built = { pts0, A, B, C, D0, S, states, moves, polys, frames, gen, genDone: false, T, total, lastD: null, lastPoly: null, polyAt: -1 };
    V.st.t = 0;
    DEMO_KNOT.secs = total;
  }
  function knotAt(u) {
    const b = kn.built, T = b.T; let t = u * b.total;
    if (t < T.intro) return { phase: 'intro', pts: b.states[0], k: 0 };
    t -= T.intro;
    for (let k = 0; k < b.moves.length; k++) {
      if (t < T.move) { const s = smooth(t / T.move); return { phase: 'move', k, s, pts: K.passThrough(b.states[k], b.moves[k].x, b.C, s, kn.lift, b.moves[k].width) }; }
      t -= T.move;
      if (t < T.gap) return { phase: 'moved', k: k + 1, pts: b.states[k + 1] };
      t -= T.gap;
    }
    const f = clamp(t / T.relax, 0, 1), have = b.frames.length - 1, i = Math.min(have, Math.round(f * (b.genDone ? have : Math.max(have, 300))));
    return { phase: 'relax', k: b.moves.length, f, pts: b.frames[Math.max(0, i)], waiting: !b.genDone && f * 300 > have };
  }
  function viewBasis() {
    const [a, b2, c] = kn.axes, h = [0, 1, 2, 3].find((i) => !kn.axes.includes(i)), t = (kn.tilt * Math.PI) / 180;
    const v3 = [0, 0, 0, 0], hid = [0, 0, 0, 0];
    v3[c] = Math.cos(t); v3[h] = Math.sin(t); hid[c] = -Math.sin(t); hid[h] = Math.cos(t);
    return { e: [unit(a), unit(b2), v3], hid, h };
  }
  const dot4 = (p, v) => p[0] * v[0] + p[1] * v[1] + p[2] * v[2] + p[3] * v[3];
  function drawKnot(c, w, h, dpr) {
    const b = kn.built;
    if (!b) { knotBuild(); return; }
    if (b.error) { V.setStats([['Alexander polynomial', ''], ['Crossings switched through w', ''], ['Closest strands, 3D and 4D', '']]); $('fd-foot').textContent = b.error; c.fillStyle = V.theme().muted; c.font = `${14 * dpr}px "IBM Plex Sans", sans-serif`; c.textAlign = 'center'; c.fillText(b.error, w / 2, h / 2); return; }
    // keep relaxing in the background while the earlier phases play
    if (!b.genDone) { const t0 = performance.now(); let r; do { r = b.gen.next(); } while (!r.done && performance.now() - t0 < 10); if (r.done) b.genDone = true; }
    const S = knotAt(st.t), pts = S.pts, vb = viewBasis();
    // fit the rope to the view: it grows as it relaxes
    const Q3 = pts.map((p) => vb.e.map((e) => dot4(p, e))), ctr = [0, 1, 2].map((k) => Q3.reduce((a, q) => a + q[k], 0) / Q3.length);
    const ext = Math.max(...Q3.map((q) => Math.hypot(q[0] - ctr[0], q[1] - ctr[1], q[2] - ctr[2])));
    kn.fit = kn.fit ? kn.fit + (ext - kn.fit) * 0.15 : ext;
    const cam = V.camera(w, h, 0.42 / kn.fit, -0.02), P = Q3.map((q) => cam.rot([q[0] - ctr[0], q[1] - ctr[1], q[2] - ctr[2]])), SP = P.map(cam.proj), N = pts.length;
    const segs = [];
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; segs.push({ i, j, z: (P[i][2] + P[j][2]) / 2 }); }
    segs.sort((x, y) => x.z - y.z);
    c.lineCap = 'round';
    for (const sg of segs) {
      const a = SP[sg.i], q = SP[sg.j], hv = (dot4(pts[sg.i], vb.hid) + dot4(pts[sg.j], vb.hid)) / 2;
      c.strokeStyle = V.theme().panel; c.lineWidth = 11 * dpr; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); c.stroke();
      c.strokeStyle = V.wColor(hv / Math.max(0.6, kn.lift), 1); c.lineWidth = 7 * dpr; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); c.stroke();
    }
    // the knot diagram: the shadow on a plane, gaps where a strand passes under
    const D = K.diagram(pts, b.A, b.B, b.C);
    drawDiagram(c, w, h, dpr, D, S.phase === 'move' ? b.moves[S.k].x : null);
    // Alexander polynomial of what is on screen (throttled while relaxing)
    let poly;
    if (S.phase !== 'relax') poly = S.phase === 'move' ? null : b.polys[S.k];
    else { const key = Math.round(S.f * 60); if (key !== b.polyAt && D.X.length <= 18) { b.polyAt = key; b.lastPoly = K.invariant(pts, b.A, b.B, b.C); } poly = b.lastPoly; }
    const c3 = K.closest(pts, 3), c4 = K.closest(pts, 4);
    const name = kn.kind === 'torus' ? `(${kn.p}, ${kn.q}) torus knot` : K.KNOTS[kn.kind].name;
    const nS = b.moves.length;
    $('fd-foot').textContent = S.phase === 'intro' ? `a ${name}${kn.noW ? '. No moves through w: watch it try to relax.' : ''}`
      : S.phase === 'move' ? `crossing ${S.k + 1} of ${nS}: the strand goes round the other through w`
        : S.phase === 'moved' ? `crossing ${S.k} switched`
          : S.waiting ? 'relaxing (still computing)' : kn.noW ? 'relaxing in 3D alone: the knot stays knotted' : 'relaxing in 3D: nothing holds it any more';
    V.setStats([
      ['Alexander polynomial', poly ? K.polyString(poly) + (K.isOne(poly) ? ', as for no knot' : '') : 'changing'],
      ['Crossings switched through w', `${S.k} of ${nS}${b.S === null ? ' (no small set found)' : ''}`],
      ['Closest strands, 3D and 4D', `${c3.toFixed(2)} and ${c4.toFixed(2)}`],
    ]);
  }
  function drawDiagram(c, w, h, dpr, D, hot) {
    const T = V.theme(), iw = Math.min(w * 0.3, 240 * dpr), ih = iw, ix = 10 * dpr, iy = h - ih - 30 * dpr;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of D.P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const sc = (0.84 * iw) / Math.max(x1 - x0, y1 - y0, 1e-6), X = (p) => ix + iw / 2 + (p[0] - (x0 + x1) / 2) * sc, Y = (p) => iy + ih / 2 - (p[1] - (y0 + y1) / 2) * sc;
    c.fillStyle = T.panel; c.strokeStyle = T.line; c.lineWidth = dpr; c.fillRect(ix, iy, iw, ih); c.strokeRect(ix, iy, iw, ih);
    c.strokeStyle = T.fg; c.lineWidth = 2 * dpr; c.lineCap = 'butt'; c.beginPath();
    D.P.forEach((p, i) => (i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)))); c.closePath(); c.stroke();
    const g = 5 * dpr;
    for (const x of D.X) {
      const at = [X(x.at), Y(x.at)], du = x.dUnder, lu = Math.hypot(...du), u = [du[0] / lu, -du[1] / lu], dov = x.dOver, lo = Math.hypot(...dov), o = [dov[0] / lo, -dov[1] / lo];
      c.strokeStyle = T.panel; c.lineWidth = 6 * dpr; c.beginPath(); c.moveTo(at[0] - u[0] * g, at[1] - u[1] * g); c.lineTo(at[0] + u[0] * g, at[1] + u[1] * g); c.stroke();
      c.strokeStyle = T.fg; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(at[0] - o[0] * g * 1.4, at[1] - o[1] * g * 1.4); c.lineTo(at[0] + o[0] * g * 1.4, at[1] + o[1] * g * 1.4); c.stroke();
    }
    if (hot) { c.strokeStyle = T.accent; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(X(hot.at), Y(hot.at), 10 * dpr, 0, 7); c.stroke(); }
    c.fillStyle = T.muted; c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
    c.fillText(`diagram, seen along ${AX[DIAG[kn.diag][2]]}: ${D.X.length} crossings`, ix + 6 * dpr, iy + 14 * dpr);
  }
  const DEMO_KNOT = {
    secs: 20, name: 'Untie any knot', sub: 'colour shows the hidden axis',
    text: 'Pick a knot. The page finds which crossings to switch, then moves each top strand down through the one below it, lifting it in w on the way so the two never touch. The knot diagram in the corner shows each switch, and the Alexander polynomial tracks the knot until it reads 1, as for no knot. Then the rope relaxes into a loop. Turn off w and it cannot.',
    draw: drawKnot, onShow: () => { if (!kn.built) knotBuild(); st.pitch = 1.05; },
  };
  V.register('knot', DEMO_KNOT);
  const rebuild = () => { kn.built = null; knotBuild(); };
  $('kn-kind').addEventListener('change', (e) => { kn.kind = e.target.value; $('kn-pq').hidden = kn.kind !== 'torus'; kn.p = Math.max(1, Math.round(+$('kn-p').value)); kn.q = Math.max(1, Math.round(+$('kn-q').value)); rebuild(); });
  for (const id of ['kn-p', 'kn-q']) $(id).addEventListener('change', () => { kn.p = Math.max(1, Math.round(+$('kn-p').value)); kn.q = Math.max(1, Math.round(+$('kn-q').value)); rebuild(); });
  $('kn-lift').addEventListener('change', () => { kn.lift = +$('kn-lift').value; rebuild(); });
  $('kn-lift').addEventListener('input', () => { $('kn-liftv').textContent = (+$('kn-lift').value).toFixed(1); });
  $('kn-tilt').addEventListener('input', () => { kn.tilt = +$('kn-tilt').value; $('kn-tiltv').textContent = `${kn.tilt}°`; });
  for (const b of document.querySelectorAll('#kn-axes button')) b.onclick = () => {
    kn.axes = b.dataset.axes.split('').map(Number);
    for (const o of document.querySelectorAll('#kn-axes button')) o.setAttribute('aria-pressed', o === b);
    $('kn-tiltl').textContent = `Tilt ${AX[kn.axes[2]]} toward ${AX[[0, 1, 2, 3].find((i) => !kn.axes.includes(i))]}`;
  };
  for (const b of document.querySelectorAll('#kn-diag button')) b.onclick = () => {
    kn.diag = +b.dataset.c; for (const o of document.querySelectorAll('#kn-diag button')) o.setAttribute('aria-pressed', o === b); rebuild();
  };
  $('kn-now').onclick = () => { kn.noW = !kn.noW; $('kn-now').setAttribute('aria-pressed', kn.noW); rebuild(); };

  // ---------- a 4D maze ----------
  const mz = { size: [4, 4, 4, 4], seed: 3, M: null, cur: 0, hide: 3, steps: 0, hsteps: 0, auto: null, msg: '' };
  function mazeNew() { mz.M = F.maze(mz.size, mz.seed); mz.cur = 0; mz.goal = mz.M.cells - 1; mz.steps = 0; mz.hsteps = 0; mz.auto = null; mz.msg = ''; }
  const shown = () => [0, 1, 2, 3].filter((i) => i !== mz.hide);
  function move(axis, dir) {
    const p = mz.M.pos(mz.cur), q = p.slice(); q[axis] += dir;
    if (q[axis] < 0 || q[axis] >= mz.size[axis]) { mz.msg = 'the edge of the maze'; return false; }
    const n = mz.M.id(q);
    if (!mz.M.passable(mz.cur, n)) { mz.msg = `a wall along ${AX[axis]}`; return false; }
    mz.cur = n; mz.steps++; if (axis === mz.hide) mz.hsteps++; mz.msg = axis === mz.hide ? `stepped along ${AX[axis]}: a new slice` : '';
    return true;
  }
  function drawMaze(c, w, h, dpr) {
    if (!mz.M) mazeNew();
    const T = V.theme(), M = mz.M, ax = shown(), p = M.pos(mz.cur), layer = p[mz.hide];
    if (mz.auto) {
      mz.auto.t += 1 / 20;
      if (mz.auto.t >= 1) { mz.auto.t = 0; const next = mz.auto.path[mz.auto.i + 1]; if (next === undefined) mz.auto = null; else { const a = M.pos(mz.cur), b = M.pos(next), k = [0, 1, 2, 3].find((i) => a[i] !== b[i]); move(k, b[k] - a[k]); mz.auto.i++; } }
    }
    const cam = V.camera(w, h, 0.085, -0.02), n3 = ax.map((a) => mz.size[a]);
    const at = (cell3) => cell3.map((v, i) => (v - (n3[i] - 1) / 2) * 1.0);
    const items = [];
    const cellOf = (i3) => { const q = [0, 0, 0, 0]; q[ax[0]] = i3[0]; q[ax[1]] = i3[1]; q[ax[2]] = i3[2]; q[mz.hide] = layer; return M.id(q); };
    // walls between neighbouring cells of this slice
    for (let i = 0; i < n3[0]; i++) for (let j = 0; j < n3[1]; j++) for (let k = 0; k < n3[2]; k++) {
      const here = [i, j, k], id = cellOf(here);
      for (let a = 0; a < 3; a++) {
        const nb = here.slice(); nb[a]++; if (nb[a] >= n3[a]) continue;
        if (M.passable(id, cellOf(nb))) continue;
        const ctr = at(here).map((v, q) => v + (q === a ? 0.5 : 0)), u = [0, 0, 0], v = [0, 0, 0];
        u[(a + 1) % 3] = 0.5; v[(a + 2) % 3] = 0.5;
        const Q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => cam.rot(ctr.map((x, q) => x + s * u[q] + t * v[q])));
        items.push({ z: Q.reduce((s0, q) => s0 + q[2], 0) / 4, draw: () => { V.poly(c, Q.map(cam.proj)); c.fillStyle = V.hsl(220, 0.13, 6); c.fill(); c.strokeStyle = V.hsl(220, 0.5, -10); c.lineWidth = dpr; c.stroke(); } });
      }
      // doors along the hidden axis
      for (const dir of [-1, 1]) {
        const q = M.pos(id).slice(); q[mz.hide] += dir;
        if (q[mz.hide] < 0 || q[mz.hide] >= mz.size[mz.hide] || !M.passable(id, M.id(q))) continue;
        const ctr = cam.rot(at(here).map((v2, qq) => v2 + (qq === 1 ? dir * 0.18 : 0)));
        items.push({ z: ctr[2], draw: () => { const sp = cam.proj(ctr); c.strokeStyle = dir > 0 ? 'hsl(25, 85%, 52%)' : 'hsl(215, 80%, 55%)'; c.lineWidth = 2.5 * dpr; c.beginPath(); c.arc(sp[0], sp[1], 6 * dpr, 0, 7); c.stroke(); } });
      }
    }
    const ball = (cell, col, r) => { const q = M.pos(cell); if (q[mz.hide] !== layer) return; const P = cam.rot(at(ax.map((a) => q[a]))); items.push({ z: P[2], draw: () => { const sp = cam.proj(P); c.fillStyle = col; c.beginPath(); c.arc(sp[0], sp[1], r * dpr, 0, 7); c.fill(); } }); };
    ball(mz.goal, 'hsl(44, 90%, 52%)', 11); ball(mz.cur, T.accent, 9);
    items.sort((a, b) => a.z - b.z).forEach((it) => it.draw());
    // the layers along the hidden axis, with you and the way out
    const nL = mz.size[mz.hide], bw = 26 * dpr, bx = w - nL * (bw + 6 * dpr) - 10 * dpr, by = h - bw - 34 * dpr, gp = M.pos(mz.goal);
    c.font = `${10 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left'; c.fillStyle = T.muted;
    c.fillText(`slices along ${AX[mz.hide]}`, bx, by - 6 * dpr);
    for (let L = 0; L < nL; L++) {
      const x = bx + L * (bw + 6 * dpr);
      c.strokeStyle = L === layer ? T.accent : T.line; c.lineWidth = (L === layer ? 2 : 1) * dpr; c.strokeRect(x, by, bw, bw);
      if (gp[mz.hide] === L) { c.fillStyle = 'hsl(44, 90%, 52%)'; c.beginPath(); c.arc(x + bw * 0.7, by + bw * 0.5, 4 * dpr, 0, 7); c.fill(); }
      if (L === layer) { c.fillStyle = T.accent; c.beginPath(); c.arc(x + bw * 0.3, by + bw * 0.5, 4 * dpr, 0, 7); c.fill(); }
    }
    const best = M.path(mz.cur, mz.goal);
    $('fd-foot').textContent = mz.cur === mz.goal ? `out, in ${mz.steps} steps, ${mz.hsteps} of them along ${AX[mz.hide]}` : mz.msg || `you see the slice ${AX[mz.hide]} = ${layer}. Rings are doors along ${AX[mz.hide]}: orange forward, blue back.`;
    const inSlice = best ? best.every((cc) => M.pos(cc)[mz.hide] === layer) : false;
    V.setStats([
      ['Steps taken', `${mz.steps}, ${mz.hsteps} along ${AX[mz.hide]}`],
      ['Shortest way out from here', best ? `${best.length - 1} steps` : 'none'],
      ['Possible without leaving this slice', inSlice ? 'yes' : 'no'],
    ]);
  }
  V.register('maze', {
    timed: false, name: '4D maze', sub: 'gold is the way out; rings are doors along the hidden axis',
    text: 'You see one 3D slice of a 4D maze. Walls block you in every direction you can see. The rings are doors along the fourth axis: step through and the whole slice changes round you. Choose which axis is hidden and the same maze shows a different face.',
    draw: drawMaze, onShow: () => { if (!mz.M) mazeNew(); },
  });
  const mzMove = (k, d) => { if (mz.M) { mz.auto = null; move(k, d); } };
  for (const b of document.querySelectorAll('#mz-moves button')) b.onclick = () => { const i = +b.dataset.i, d = +b.dataset.d, axis = i < 3 ? shown()[i] : mz.hide; mzMove(axis, d); };
  for (const b of document.querySelectorAll('#mz-hide button')) b.onclick = () => {
    mz.hide = +b.dataset.h; for (const o of document.querySelectorAll('#mz-hide button')) o.setAttribute('aria-pressed', o === b); labelMoves();
  };
  function labelMoves() {
    const ax = shown();
    for (const b of document.querySelectorAll('#mz-moves button')) { const i = +b.dataset.i, a = i < 3 ? ax[i] : mz.hide; b.textContent = `${+b.dataset.d > 0 ? '+' : '-'}${AX[a]}`; }
  }
  labelMoves();
  $('mz-solve').onclick = () => { if (!mz.M) return; const p = mz.M.path(mz.cur, mz.goal); mz.auto = p && p.length > 1 ? { path: p, i: 0, t: 0 } : null; };
  $('mz-new').onclick = () => { mz.seed++; mazeNew(); };
  $('c4').addEventListener('keydown', (e) => {
    if (st.demo !== 'maze') return;
    const ax = shown(), map = { ArrowRight: [ax[0], 1], ArrowLeft: [ax[0], -1], ArrowUp: [ax[1], 1], ArrowDown: [ax[1], -1], PageUp: [ax[2], 1], PageDown: [ax[2], -1], e: [mz.hide, 1], q: [mz.hide, -1] };
    const m = map[e.key]; if (m) { mzMove(m[0], m[1]); e.preventDefault(); }
  });

  // ---------- the Hopf fibration ----------
  const hp = { n: 24, pat: 'rings', turn: 0, cache: null };
  function basePoints() {
    const out = [];
    if (hp.pat === 'ring') for (let i = 0; i < hp.n; i++) out.push([Math.PI / 3, (2 * Math.PI * i) / hp.n]);
    else if (hp.pat === 'rings') { const rows = 3, per = Math.max(1, Math.round(hp.n / rows)); for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) out.push([((r + 1) * Math.PI) / (rows + 1), (2 * Math.PI * i) / per + r * 0.4]); }
    else for (let i = 0; i < hp.n; i++) out.push([0.15 + (2.85 * i) / Math.max(1, hp.n - 1), i * 2.39996]);
    return out;
  }
  function drawHopf(c, w, h, dpr) {
    const turn = st.play ? st.t * 2 * Math.PI : (hp.turn * Math.PI) / 180;
    const base = basePoints(), cam = V.camera(w, h, 0.09, 0), segs = [];
    base.forEach(([th, ph], f) => {
      const pts = F.hopfFiber(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th), turn, 90);
      const hue = (ph * 180) / Math.PI, dl = (th / Math.PI - 0.5) * 30;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if (!a || !b || Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 3 || Math.hypot(a[0], a[1], a[2]) > 9) continue;
        const A = cam.rot(a), B = cam.rot(b);
        segs.push({ A, B, z: (A[2] + B[2]) / 2, hue, dl });
      }
    });
    segs.sort((x, y) => x.z - y.z);
    c.lineCap = 'round';
    for (const s of segs) {
      const a = cam.proj(s.A), b = cam.proj(s.B);
      c.strokeStyle = `hsl(${s.hue}, 70%, ${clamp(50 + s.dl, 25, 75)}%)`; c.lineWidth = 3.2 * dpr;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    if (!hp.cache || hp.cache.turn !== turn) {
      const fib = (th, ph) => F.hopfFiber(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th), turn, 120).filter(Boolean).map((p) => p.slice(0, 3));
      hp.cache = { turn, link: Math.abs(F.linking(fib(...base[0]), fib(...base[base.length > 1 ? base.length - 1 : 0]))) };
    }
    $('fd-foot').textContent = 'every circle passes through the hole of every other';
    V.setStats([
      ['Circles drawn', String(base.length)],
      ['Linking number of two of them', base.length > 1 ? hp.cache.link.toFixed(3) : 'needs two'],
      ['Turn in the x-w plane, before projecting', `${Math.round(((turn * 180) / Math.PI) % 360)} degrees`],
    ]);
  }
  V.register('hopf', {
    secs: 24, name: 'Hopf fibration', sub: 'circles of the 3-sphere, projected into 3D',
    text: 'The 3-sphere, the round sphere in 4D, is filled by circles, one over each point of an ordinary sphere, and no two of them meet. Projected into 3D they become circles that link: every one passes once through every other. Turning the 3-sphere in 4D before projecting reshapes all of them at once.',
    draw: drawHopf,
  });
  $('hp-n').addEventListener('input', () => { hp.n = +$('hp-n').value; $('hp-nv').textContent = hp.n; hp.cache = null; });
  $('hp-turn').addEventListener('input', () => { hp.turn = +$('hp-turn').value; st.play = false; $('fd-play').setAttribute('aria-pressed', false); $('fd-play').textContent = 'Play'; });
  for (const b of document.querySelectorAll('#hp-pat button')) b.onclick = () => { hp.pat = b.dataset.p; hp.cache = null; for (const o of document.querySelectorAll('#hp-pat button')) o.setAttribute('aria-pressed', o === b); };
})();
