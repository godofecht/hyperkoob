// The "Shadows that never repeat" section: a 2D tiling cut from Z^m, its
// window in the hidden directions, and a 3D tiling cut from Z^m.
(function () {
  const Q = window.Quasi;
  const $ = (id) => document.getElementById(id);
  if (!$('cq')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const BUDGET2 = 9000, BUDGET3 = 2600;

  let theme = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    theme = { fg: g('--fg'), muted: g('--muted'), line: g('--line'), accent: g('--accent'), panel: g('--panel'), el: parseFloat(g('--edge-l')) || 50, es: g('--edge-s') || '72%' };
    q2.dirty = true;
  }
  const hue = (j) => (j * 137.508 + 200) % 360;
  const shapeColor = (j, a, dl = 0) => `hsla(${hue(j)}, ${theme.es}, ${clamp(theme.el + dl, 8, 92)}%, ${a})`;

  function sizeCanvas(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; return { w, h, dpr, changed: true }; }
    return { w, h, dpr, changed: false };
  }
  function syncNum(el, v) { if (document.activeElement !== el) el.value = String(v); }
  function bindNum(el, set) {
    const commit = () => { const v = parseFloat(el.value); if (Number.isFinite(v)) set(v); };
    el.addEventListener('change', commit);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); el.blur(); } });
  }
  function toggle(id, obj, key, after) {
    const b = $(id);
    const show = () => b.setAttribute('aria-pressed', obj[key]);
    b.onclick = () => { obj[key] = !obj[key]; show(); if (after) after(); };
    show();
  }

  // ---------- 2D tiling ----------
  const q2 = { m: 5, step: Q.STEPS, R: 12, seed: 1, grow: !reduceMotion, lines: false, rev: 0, hold: 0, P: null, tiles: [], V: null, job: null, progress: 1, dirty: true, hover: null, per: null };
  const q3 = { m: 6, R: 4.5, seed: 1, grow: !reduceMotion, spin: !reduceMotion, cut: false, rev: 0, hold: 0, P: null, tiles: [], job: null, progress: 1, yaw: 0.5, pitch: 0.35 };

  function start2() {
    const P = Q.setup(2, q2.m, q2.step, q2.seed);
    const Reff = Math.min(q2.R, Math.sqrt(BUDGET2 / (Math.PI * P.density)));
    q2.next = { P, Reff, tiles: [] };
    q2.job = Q.build(P, Reff, q2.next.tiles);
    q2.progress = 0;
    labels2(P);
  }
  function finish2() {
    const { P, Reff, tiles } = q2.next;
    tiles.sort((a, b) => a.r - b.r);
    q2.P = P; q2.Reff = Reff; q2.tiles = tiles; q2.job = null; q2.progress = 1;
    q2.V = Q.vertices(P, tiles).sort((a, b) => a.r - b.r);
    q2.W = Q.window2(P);
    q2.per = Q.period(P);
    // anchor the repeat cell on the corner nearest the middle
    q2.anchor = q2.V.length ? q2.V[0].x : [0, 0];
    const keys = new Set(q2.V.map((v) => v.y.map((x) => Math.round(x * 1e4)).join()));
    q2.distinct = keys.size;
    if (!q2.grow) q2.rev = Infinity; else q2.rev = Math.min(q2.rev, Reff * 0.15);
    q2.hover = null; q2.dirty = true;
    stats2();
  }
  function labels2(P) {
    const sl = P.slice, m = P.m;
    $('qtl').textContent = m === 5 ? (sl.ints ? `golden ratio ≈ ${sl.label}` : 'golden ratio, exact') : sl.label;
    $('qt').disabled = m === 3;
    $('qname').textContent = m === 5 && !sl.ints ? 'Penrose tiling' : `cut from the ${m}D cube grid`;
  }
  function stats2() {
    const P = q2.P, m = P.m, sl = P.slice, per = q2.per;
    $('q-sym').textContent = sl.ints && !sl.fixed ? `close to ${2 * m}-fold` : `${2 * m}-fold`;
    $('q-shapes').textContent = Math.floor(m / 2);
    $('q-n').textContent = fmt(q2.tiles.length);
    $('q-rep').textContent = per ? `every ${fmt(per.tiles)} tiles` : 'never';
    const byShape = new Array(Math.floor(m / 2) + 1).fill(0);
    for (const t of q2.tiles) byShape[t.shape]++;
    if (m === 5) { $('q-mixl').textContent = 'Thick to thin'; $('q-mix').textContent = (byShape[1] / Math.max(1, byShape[2])).toFixed(4); }
    else { $('q-mixl').textContent = 'Tiles of each shape'; $('q-mix').textContent = byShape.length <= 7 ? byShape.slice(1).map(fmt).join(' / ') : `${byShape.length - 1} shapes`; }
    $('qcap').textContent = per ? 'Repeats' : 'Never repeats';
    const big = per && Math.hypot(...per.vecs[0]) > q2.Reff * 0.9;
    $('qfoot').textContent = per ? (big ? `the repeat cell is wider than this patch` : `dashed: one repeat cell, ${fmt(per.tiles)} tiles`) : q2.Reff < q2.R - 1e-9 ? `patch trimmed to ${fmt(q2.tiles.length)} tiles` : 'hover a tile to see where it comes from';
    $('wfoot').textContent = `${fmt(q2.V.length)} corners on ${fmt(q2.distinct)} points`;
  }

  const cq = $('cq'), cw = $('cw'), ctxQ = cq.getContext('2d'), ctxW = cw.getContext('2d');
  function view2(w, h) { const sc = (0.47 * Math.min(w, h)) / q2.Reff; return { sc, cx: w / 2, cy: h / 2 }; }

  function draw2() {
    const { w, h, dpr, changed } = sizeCanvas(cq);
    if (!q2.P || (!q2.dirty && !changed)) return;
    q2.dirty = false;
    const c = ctxQ; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const { sc, cx, cy } = view2(w, h), X = (p) => cx + p[0] * sc, Y = (p) => cy - p[1] * sc;
    const nS = Math.floor(q2.P.m / 2) + 1, fills = Array.from({ length: nS }, () => new Path2D());
    let shown = 0;
    for (const t of q2.tiles) {
      if (t.r > q2.rev) break;
      shown++;
      const [a, b] = t.edges, o = t.base, p = fills[t.shape];
      p.moveTo(X(o), Y(o)); p.lineTo(X(o) + a[0] * sc, Y(o) - a[1] * sc); p.lineTo(X(o) + (a[0] + b[0]) * sc, Y(o) - (a[1] + b[1]) * sc); p.lineTo(X(o) + b[0] * sc, Y(o) - b[1] * sc); p.closePath();
    }
    fills.forEach((p, i) => { if (i) { c.fillStyle = shapeColor(i, 0.5); c.fill(p); } });
    c.strokeStyle = theme.fg; c.globalAlpha = 0.35; c.lineWidth = Math.max(0.6, dpr * 0.6);
    fills.forEach((p) => c.stroke(p)); c.globalAlpha = 1;

    if (q2.lines) {
      const P = q2.P, R = q2.Reff;
      c.lineWidth = dpr; c.globalAlpha = 0.5;
      P.cols.forEach((gv, i) => {
        const L = Math.hypot(...gv), u = [gv[0] / L, gv[1] / L], step = P.s / L;
        c.strokeStyle = shapeColor(i + nS, 1); c.beginPath();
        for (let n = Math.ceil(-R / step + P.gam[i]) - 1; (n - P.gam[i]) * step <= R; n++) {
          const d = (n - P.gam[i]) * step; if (Math.abs(d) > R) continue;
          const e = Math.sqrt(R * R - d * d);
          const p0 = [u[0] * d - u[1] * e, u[1] * d + u[0] * e], p1 = [u[0] * d + u[1] * e, u[1] * d - u[0] * e];
          c.moveTo(X(p0), Y(p0)); c.lineTo(X(p1), Y(p1));
        }
        c.stroke();
      });
      c.globalAlpha = 1;
    }

    const per = q2.per;
    if (per && q2.rev >= q2.Reff * 0.6) {
      const [p1, p2] = per.vecs, o = q2.anchor;
      if (Math.hypot(...p1) < q2.Reff * 0.9) {
        c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.setLineDash([6 * dpr, 4 * dpr]);
        c.beginPath();
        const pts = [o, [o[0] + p1[0], o[1] + p1[1]], [o[0] + p1[0] + p2[0], o[1] + p1[1] + p2[1]], [o[0] + p2[0], o[1] + p2[1]]];
        pts.forEach((p, i) => (i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)))); c.closePath(); c.stroke(); c.setLineDash([]);
        c.fillStyle = theme.accent;
        const k = Math.ceil(q2.Reff / Math.min(Math.hypot(...p1), Math.hypot(...p2))) + 1;
        for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {
          const p = [o[0] + i * p1[0] + j * p2[0], o[1] + i * p1[1] + j * p2[1]];
          if (Math.hypot(...p) > q2.Reff) continue;
          c.beginPath(); c.arc(X(p), Y(p), 3 * dpr, 0, 7); c.fill();
        }
      }
    }

    if (q2.hover) {
      const t = q2.hover, [a, b] = t.edges, o = t.base;
      c.fillStyle = theme.accent; c.globalAlpha = 0.35; c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr;
      c.beginPath(); c.moveTo(X(o), Y(o)); c.lineTo(X(o) + a[0] * sc, Y(o) - a[1] * sc); c.lineTo(X(o) + (a[0] + b[0]) * sc, Y(o) - (a[1] + b[1]) * sc); c.lineTo(X(o) + b[0] * sc, Y(o) - b[1] * sc); c.closePath();
      c.fill(); c.globalAlpha = 1; c.stroke();
    }
    drawWindow();
  }

  // Odd m: corners sit on m-1 layers, one per value of their coordinate sum.
  // Each layer gets its own small plot, so its window shape shows.
  function drawWindow() {
    const { w, h, dpr } = sizeCanvas(cw);
    const c = ctxW; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const W = q2.W; if (!W) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of W) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const span = Math.max(x1 - x0, y1 - y0, 1e-6), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const layers = [...new Set(q2.V.map((v) => v.layer))].sort((a, b) => a - b);
    const split = q2.P.m % 2 === 1 && layers.length > 1 && layers.length <= 16;
    const panes = split ? layers : [null];
    const cols = Math.ceil(Math.sqrt(panes.length * (w / h))), rows = Math.ceil(panes.length / cols);
    const top = 34 * dpr, bottom = 26 * dpr, pw = w / cols, ph = (h - top - bottom) / rows;
    const sc = (0.86 * Math.min(pw, ph)) / span, r = Math.max(1, (split ? 1.5 : 1.3) * dpr);
    const where = new Map();
    panes.forEach((L, i) => {
      const ox = pw * (i % cols) + pw / 2, oy = top + ph * Math.floor(i / cols) + ph / 2;
      where.set(L, [ox, oy]);
      const X = (p) => ox + (p[0] - mx) * sc, Y = (p) => oy - (p[1] - my) * sc;
      c.strokeStyle = theme.muted; c.globalAlpha = split ? 0.5 : 1; c.lineWidth = dpr; c.setLineDash([3 * dpr, 4 * dpr]);
      c.beginPath(); W.forEach((p, k) => (k ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)))); c.closePath(); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      if (split) {
        c.fillStyle = theme.muted; c.font = `${11 * dpr}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
        c.fillText(`sum ${L}`, ox - pw / 2 + 6 * dpr, oy - ph / 2 + 12 * dpr);
      }
    });
    for (const v of q2.V) {
      if (v.r > q2.rev + 1) break;
      const [ox, oy] = where.get(split ? v.layer : null);
      c.fillStyle = split ? shapeColor(layers.indexOf(v.layer) + 3, 0.95) : theme.accent;
      c.fillRect(ox + (v.y[0] - mx) * sc - r, oy - (v.y[1] - my) * sc - r, 2 * r, 2 * r);
    }
    if (q2.hover) {
      const K = Q.latticeOf(q2.P, q2.hover), y = q2.P.inner.map((row) => row.reduce((a, v, i) => a + v * K[i], 0));
      const L = K.reduce((a, b) => a + b, 0), pos = where.get(split ? L : null);
      if (pos) { c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(pos[0] + (y[0] - mx) * sc, pos[1] - (y[1] - my) * sc, 6 * dpr, 0, 7); c.stroke(); }
    }
  }

  cq.addEventListener('pointermove', (e) => {
    if (!q2.P) return;
    const r = cq.getBoundingClientRect(), dpr = cq.width / r.width;
    const { sc, cx, cy } = view2(cq.width, cq.height);
    const p = [((e.clientX - r.left) * dpr - cx) / sc, (cy - (e.clientY - r.top) * dpr) / sc];
    let hit = null;
    for (const t of q2.tiles) {
      if (t.r > q2.rev) break;
      if (Math.abs(t.center[0] - p[0]) < 1.2 && Math.abs(t.center[1] - p[1]) < 1.2 && Q.contains(t, p)) { hit = t; break; }
    }
    if (hit !== q2.hover) {
      q2.hover = hit; q2.dirty = true;
      if (hit) {
        const K = Q.latticeOf(q2.P, hit), m = q2.P.m;
        const ks = m <= 12 ? K.join(', ') : K.slice(0, 10).join(', ') + ', ...';
        $('qfoot').textContent = `square face at (${ks}) of the ${m}D grid, along axes ${hit.S[0] + 1} and ${hit.S[1] + 1}`;
      } else stats2();
    }
  });
  cq.addEventListener('pointerleave', () => { if (q2.hover) { q2.hover = null; q2.dirty = true; stats2(); } });

  // controls
  const qm = $('qm'), qmr = $('qmr'), qt = $('qt'), qr = $('qr');
  qt.max = Q.STEPS; qt.value = Q.STEPS;
  function setM2(v) { q2.m = Math.max(3, Math.round(v)); qmr.value = Math.min(q2.m, +qmr.max); syncNum(qm, q2.m); start2(); }
  qmr.addEventListener('input', () => setM2(+qmr.value));
  bindNum(qm, setM2);
  qt.addEventListener('input', () => { q2.step = +qt.value; start2(); });
  qr.addEventListener('input', () => { q2.R = +qr.value; $('qrv').textContent = q2.R; start2(); });
  toggle('qgrow', q2, 'grow', () => { if (!q2.grow) { q2.rev = Infinity; q2.dirty = true; } else { q2.rev = 0; q2.hold = 0; } });
  toggle('qlines', q2, 'lines', () => { q2.dirty = true; });
  $('qshift').onclick = () => { q2.seed++; start2(); };
  for (const b of document.querySelectorAll('#qpre button')) b.onclick = () => { q2.step = b.dataset.step === 'x' ? Q.STEPS : +b.dataset.step; qt.value = q2.step; if (b.dataset.r) { q2.R = +b.dataset.r; qr.value = q2.R; $('qrv').textContent = q2.R; } setM2(+b.dataset.m); };

  // ---------- 3D tiling ----------
  const c3 = $('cq3'), ctx3 = c3.getContext('2d');
  function start3() {
    const P = Q.setup(3, q3.m, Q.STEPS, q3.seed);
    const Reff = Math.min(q3.R, Math.cbrt(BUDGET3 / ((4 / 3) * Math.PI * P.density)));
    q3.next = { P, Reff, tiles: [] };
    q3.job = Q.build(P, Reff, q3.next.tiles);
    q3.progress = 0;
  }
  function finish3() {
    const { P, Reff, tiles } = q3.next;
    tiles.sort((a, b) => a.r - b.r);
    q3.P = P; q3.Reff = Reff; q3.tiles = tiles; q3.job = null; q3.progress = 1;
    // volume of each shape, biggest first
    const vols = [...P.shapes.entries()].map(([k, i]) => ({ i, v: +k * P.s ** 3, n: 0 }));
    for (const t of tiles) vols.find((o) => o.i === t.shape).n++;
    vols.sort((a, b) => b.v - a.v);
    q3.vols = vols;
    if (!q3.grow) q3.rev = Infinity; else q3.rev = Math.min(q3.rev, Reff * 0.2);
    const m = P.m;
    $('q3name').textContent = m === 6 ? 'Ammann rhombohedra' : `cut from the ${m}D cube grid`;
    $('q3-n').textContent = fmt(tiles.length);
    $('q3-s').textContent = vols.length;
    if (m === 6 && vols.length === 2) {
      $('q3-mixl').textContent = 'Prolate to oblate';
      $('q3-mix').textContent = `${fmt(vols[0].n)} : ${fmt(vols[1].n)} = ${(vols[0].n / Math.max(1, vols[1].n)).toFixed(3)}`;
    } else {
      $('q3-mixl').textContent = 'Cells of each shape';
      $('q3-mix').textContent = vols.length <= 6 ? vols.map((o) => fmt(o.n)).join(' / ') : `${vols.length} shapes`;
    }
    $('q3-rep').textContent = m <= 4 ? 'yes' : 'never';
    $('q3foot').textContent = Reff < q3.R - 1e-9 ? `ball trimmed to ${fmt(tiles.length)} cells` : `${fmt(tiles.length)} cells`;
  }

  let drag = null;
  c3.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c3.setPointerCapture(e.pointerId); });
  c3.addEventListener('pointermove', (e) => {
    if (!drag) return;
    q3.yaw += (e.clientX - drag.x) * 0.008; q3.pitch = clamp(q3.pitch + (e.clientY - drag.y) * 0.008, -1.55, 1.55);
    drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { drag = null; };
  c3.addEventListener('pointerup', end); c3.addEventListener('pointercancel', end);

  const FACES = [[0, 1, 2], [0, 2, 1], [1, 2, 0]];
  function draw3() {
    const { w, h, dpr } = sizeCanvas(c3);
    const c = ctx3; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    if (!q3.P) return;
    const ca = Math.cos(q3.yaw), sa = Math.sin(q3.yaw), cp = Math.cos(q3.pitch), sp = Math.sin(q3.pitch);
    const rot = (p) => { const x1 = ca * p[0] + sa * p[2], z1 = -sa * p[0] + ca * p[2]; return [x1, cp * p[1] - sp * z1, sp * p[1] + cp * z1]; };
    const R = q3.Reff, sc = (0.36 * Math.min(w, h)) / (R + 0.8), camD = 7 * R, cx = w / 2, cy = h / 2 + 6 * dpr;
    const proj = (p) => { const k = camD / (camD - p[2]); return [cx + p[0] * sc * k, cy - p[1] * sc * k]; };
    const eye = [0, 0, camD];
    const list = [];
    for (const t of q3.tiles) {
      if (t.r > q3.rev) break;
      if (q3.cut && t.center[2] > 0) continue;
      list.push({ t, c: rot(t.center) });
    }
    list.sort((a, b) => a.c[2] - b.c[2]);
    const light = [-0.4, 0.6, 0.7], ll = Math.hypot(...light);
    c.lineJoin = 'round'; c.lineWidth = Math.max(0.6, 0.7 * dpr);
    c.strokeStyle = theme.panel;
    for (const { t } of list) {
      const o = rot(t.base), E = t.edges.map(rot);
      for (const [i, j, k] of FACES) {
        const a = E[i], b = E[j], cc = E[k];
        let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        if (n[0] * cc[0] + n[1] * cc[1] + n[2] * cc[2] > 0) n = n.map((x) => -x); // outward for the face at o
        for (const side of [0, 1]) {
          const base = side ? o.map((x, q) => x + cc[q]) : o, nn = side ? n.map((x) => -x) : n;
          const mid = base.map((x, q) => x + (a[q] + b[q]) / 2);
          if ((eye[0] - mid[0]) * nn[0] + (eye[1] - mid[1]) * nn[1] + (eye[2] - mid[2]) * nn[2] <= 0) continue;
          const pts = [base, base.map((x, q) => x + a[q]), base.map((x, q) => x + a[q] + b[q]), base.map((x, q) => x + b[q])].map(proj);
          const lit = (nn[0] * light[0] + nn[1] * light[1] + nn[2] * light[2]) / (Math.hypot(...nn) * ll);
          c.fillStyle = shapeColor(t.shape, 1, lit * 16 - 4);
          c.beginPath(); pts.forEach((p, q) => (q ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill(); c.stroke();
        }
      }
    }
  }

  const q3m = $('q3m'), q3mr = $('q3mr'), q3r = $('q3r');
  function setM3(v) { q3.m = Math.max(3, Math.round(v)); q3mr.value = Math.min(q3.m, +q3mr.max); syncNum(q3m, q3.m); start3(); }
  q3mr.addEventListener('input', () => setM3(+q3mr.value));
  bindNum(q3m, setM3);
  q3r.addEventListener('input', () => { q3.R = +q3r.value; $('q3rv').textContent = q3.R; start3(); });
  toggle('q3grow', q3, 'grow', () => { if (!q3.grow) q3.rev = Infinity; else { q3.rev = 0; q3.hold = 0; } });
  toggle('q3spin', q3, 'spin');
  toggle('q3cut', q3, 'cut');

  // ---------- loop ----------
  // Building runs a few milliseconds per frame, so big m never freezes the page.
  function work(q, finish, label) {
    if (!q.job) return;
    const t0 = performance.now();
    let r;
    do { r = q.job.next(); } while (!r.done && performance.now() - t0 < 8);
    if (r.done) finish(); else { q.progress = r.value; $(label).textContent = `building, ${Math.round(100 * r.value)}%`; }
  }
  function advance(q, dt, speed) {
    if (!q.grow || !q.P) return false;
    if (q.rev < q.Reff) { q.rev = Math.min(q.Reff, q.rev + dt * speed * q.Reff); return true; }
    q.hold += dt;
    if (q.hold > 4) { q.hold = 0; q.rev = 0; }
    return false;
  }
  const visible = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
  io.observe(cq); io.observe(c3);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    work(q2, finish2, 'qfoot');
    work(q3, finish3, 'q3foot');
    if (visible.has(cq) && advance(q2, dt, 0.16)) q2.dirty = true;
    draw2(); // returns at once unless something changed
    if (visible.has(c3)) {
      advance(q3, dt, 0.18);
      if (q3.spin && !drag) q3.yaw += dt * 0.2;
      draw3();
    }
    requestAnimationFrame(frame);
  }
  readTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  window.addEventListener('resize', () => { q2.dirty = true; });
  start2(); start3();
  requestAnimationFrame(frame);
})();
