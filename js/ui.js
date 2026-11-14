// What every view shares: canvas sizing, the colour theme, and one animation
// loop. Loaded before any view.
(function (g) {
  const $ = (id) => document.getElementById(id);
  const dprOf = () => Math.min(window.devicePixelRatio || 1, 2);

  // Match a canvas's pixels to its size on screen. `changed` says the pixels
  // were reallocated, so anything cached for the old size should be redrawn.
  function fit(c) {
    const r = c.getBoundingClientRect(), dpr = dprOf();
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    const changed = c.width !== w || c.height !== h;
    if (changed) { c.width = w; c.height = h; }
    return { w, h, dpr, changed };
  }
  // A fitted, cleared 2D context for the canvas with this id.
  function canvas(id) {
    const el = typeof id === 'string' ? $(id) : id, s = fit(el), x = el.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, s.w, s.h);
    return { c: x, w: s.w, h: s.h, dpr: s.dpr, changed: s.changed };
  }

  // The theme, read from the CSS custom properties. Views register a callback
  // and get the new colours whenever the reader's theme changes.
  let theme = null;
  const themeFns = [];
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), v = (k) => cs.getPropertyValue(k).trim();
    theme = { fg: v('--fg'), muted: v('--muted'), line: v('--line'), accent: v('--accent'), panel: v('--panel'), bg: v('--bg'), el: parseFloat(v('--edge-l')) || 50, es: v('--edge-s') || '72%' };
    for (const f of themeFns) f(theme);
  }
  function onTheme(f) { if (!theme) readTheme(); themeFns.push(f); f(theme); }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });

  // One requestAnimationFrame for the whole page. Each view's step gets the
  // frame time; a step that throws is reported once and the others keep going.
  const steps = [];
  function loop(f) { steps.push(f); }
  function tick(now) {
    for (const f of steps) {
      try { f(now); } catch (e) { if (!f.failed) { f.failed = true; console.error(e); } }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Whether a tab's panel is the one on screen.
  const shown = (panel) => { const el = $(panel); return !!el && !el.hidden; };
  // Whether an element is laid out (its panel is shown and it is not hidden).
  const visible = (id) => { const el = typeof id === 'string' ? $(id) : id; return !!el && el.offsetParent !== null; };

  g.UI = { fit, canvas, onTheme, loop, shown, visible, get theme() { if (!theme) readTheme(); return theme; } };
})(window);
