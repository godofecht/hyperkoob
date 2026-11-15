// "Through a 4D eye", on the fourth dimension tab. Rays are traced through a
// small 4D scene onto a solid 3D retina. Left: the whole retina, as a 4D
// creature would take it in at once. Right: one slice of it, which is as
// much as our flat retina could hold.
(function () {
  const E = window.Eye4;
  const $ = (id) => document.getElementById(id);
  if (!$('e4-c')) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let theme = UI.theme;
  UI.onTheme((t) => { theme = t; });
  const mono = (dpr, px = 11) => `${px * dpr}px "IBM Plex Mono", monospace`;
  const st = { kind: 'box', plane: 'xw', a: 0.61, play: !reduceMotion, slice: 0, res: 22, yaw: 0.7, pitch: 0.42, drag: null, fov: 0.42 };
  // hue and lightness to rgb
  function rgb(h, l) {
    const s = 0.7, a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  const shade = (hit) => rgb(hit.hue, 0.18 + 0.55 * hit.lit);
  let img = null, off = null;
  function draw() {
    const { c, w, h, dpr } = UI.canvas('e4-c');
    const sc = E.scene(st.kind, st.plane, st.a, true), narrow = w < 560 * dpr;
    const half = narrow ? w : w / 2, boxH = narrow ? h / 2 : h;
    c.fillStyle = '#080a12'; c.fillRect(0, 0, w, h);
    // left: the solid retina, voxel by voxel, seen from outside
    const G = st.res, cx = half / 2, cy = boxH / 2 + 8 * dpr, S = Math.min(half, boxH) * 0.26;
    const cyw = Math.cos(st.yaw), syw = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const view = (u, v, s) => { const x1 = cyw * u + syw * s, z1 = -syw * u + cyw * s; return [cp * v - sp * z1, sp * v + cp * z1, x1]; };
    const P = (u, v, s) => { const [y, z, x] = view(u, v, s), k = 6 / (6 - z); return [cx + x * S * k, cy - y * S * k, z]; };
    const vox = [];
    let lit = 0;
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) for (let k = 0; k < G; k++) {
      const u = -1 + (2 * i + 1) / G, v = -1 + (2 * j + 1) / G, s = -1 + (2 * k + 1) / G;
      const hit = E.trace(sc, E.ray(u, v, s, st.fov));
      if (!hit) continue;
      lit++;
      const p = P(u, v, s); vox.push([p[0], p[1], p[2], hit, Math.abs(s - st.slice) < 1 / G]);
    }
    vox.sort((a, b) => a[2] - b[2]);
    const sz = Math.max(1.5, (S * 2) / G) * 0.62;
    for (const [x, y, z, hit, onSlice] of vox) {
      const [r, g, b] = shade(hit), f = clamp(0.55 + z * 0.35, 0.3, 1);
      c.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${onSlice ? 1 : 0.55 * f})`;
      const q = sz * (6 / (6 - z)) * (onSlice ? 1.25 : 1);
      c.fillRect(x - q / 2, y - q / 2, q, q);
    }
    // the retina's edges and the slice plane
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = dpr;
    const cor = [];
    for (let i = 0; i < 8; i++) cor.push(P(i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1));
    c.beginPath();
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) { c.moveTo(cor[i][0], cor[i][1]); c.lineTo(cor[i | bit][0], cor[i | bit][1]); }
    c.stroke();
    const sl = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => P(u, v, st.slice));
    c.strokeStyle = 'rgba(255,200,90,0.9)'; c.lineWidth = 1.4 * dpr; c.beginPath(); sl.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = mono(dpr, 10); c.textAlign = 'left';
    c.fillText('its retina: a solid cube, all of it seen at once', 10 * dpr, 16 * dpr);
    // right: one slice, at full resolution
    const ox = narrow ? 0 : half, oy = narrow ? boxH : 0, side = Math.floor(Math.min(half, boxH) - 40 * dpr), R = Math.max(48, Math.min(200, Math.floor(side / (2 * dpr))));
    if (!img || img.width !== R) img = c.createImageData(R, R);
    const d = img.data;
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const u = -1 + (2 * i + 1) / R, v = 1 - (2 * j + 1) / R, hit = E.trace(sc, E.ray(u, v, st.slice, st.fov)), o = 4 * (j * R + i);
      if (hit) { const [r, g, b] = shade(hit); d[o] = r; d[o + 1] = g; d[o + 2] = b; } else { d[o] = 16; d[o + 1] = 19; d[o + 2] = 30; }
      d[o + 3] = 255;
    }
    off = off || document.createElement('canvas');
    off.width = R; off.height = R; off.getContext('2d').putImageData(img, 0, 0);
    const sx = ox + (half - side) / 2, sy = oy + (boxH - side) / 2 + 8 * dpr;
    c.imageSmoothingEnabled = false; c.drawImage(off, sx, sy, side, side); c.imageSmoothingEnabled = true;
    c.strokeStyle = 'rgba(255,200,90,0.9)'; c.strokeRect(sx, sy, side, side);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText(`one slice of it, depth ${st.slice.toFixed(2)}: what a flat retina could hold`, ox + 10 * dpr, oy + 16 * dpr);
    $('e4-v1').textContent = `${(G ** 3).toLocaleString()} rays, ${lit.toLocaleString()} lit`;
    const mid = E.trace(sc, E.ray(0, 0, st.slice, st.fov));
    $('e4-v2').textContent = mid ? (mid.cell !== undefined ? `cell facing ${['-x', '+x', '-y', '+y', '-z', '+z', '-w', '+w'][mid.cell]}` : 'the 4D ball') : 'nothing';
    $('e4-v3').textContent = [...new Set(vox.map((v) => v[3].cell).filter((x) => x !== undefined))].length + ' of 8';
  }
  const cv = $('e4-c');
  cv.addEventListener('pointerdown', (e) => { st.drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!st.drag) return; st.yaw += (e.clientX - st.drag[0]) * 0.01; st.pitch = clamp(st.pitch + (e.clientY - st.drag[1]) * 0.01, -1.4, 1.4); st.drag = [e.clientX, e.clientY]; });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { st.drag = null; });
  $('e4-kind').onchange = () => { st.kind = $('e4-kind').value; };
  $('e4-plane').onchange = () => { st.plane = $('e4-plane').value; };
  const sl = (id, out, fmt, set) => { const el = $(id), f = () => { set(+el.value); $(out).textContent = fmt(+el.value); }; el.oninput = f; f(); };
  sl('e4-slice', 'e4-slicev', (v) => v.toFixed(2), (v) => { st.slice = v; });
  sl('e4-res', 'e4-resv', (v) => `${v}³`, (v) => { st.res = v; });
  sl('e4-a', 'e4-av', (v) => `${Math.round(v)}°`, (v) => { st.a = (v * Math.PI) / 180; });
  const pb = $('e4-play'), show = () => { pb.textContent = st.play ? 'Pause' : 'Turn'; pb.setAttribute('aria-pressed', st.play); };
  pb.onclick = () => { st.play = !st.play; show(); }; show();
  let last = performance.now();
  UI.loop((now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (!UI.shown('s-4d') || !UI.visible('e4-c')) return;
    if (st.play) { st.a = (st.a + dt * 0.5) % (2 * Math.PI); $('e4-a').value = (st.a * 180) / Math.PI; $('e4-av').textContent = `${Math.round((st.a * 180) / Math.PI)}°`; if (!st.drag) st.yaw += dt * 0.2; }
    draw();
  });
})();
