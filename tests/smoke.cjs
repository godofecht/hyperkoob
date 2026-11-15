// Opens every tab in a real browser, works its main controls, and fails on
// any page error. Run with: node tests/smoke.cjs http://localhost:8765/ [shots-dir]
const path = require('path');
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(require('os').homedir(), 'node_modules/playwright')); }
const URL = process.argv[2] || 'http://localhost:8765/', OUT = process.argv[3];
const TABS = ['shadows', 'tiling', 'never', '4d', 'high', 'fractal', 'curved', 'strings', 'infinity', 'links'];
(async () => {
  const b = await pw.chromium.launch(), errs = [];
  const watch = (p) => { p.on('pageerror', (e) => errs.push(`${p.url()} pageerror: ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') errs.push(`${p.url()} console: ${m.text()}`); }); };
  const p = await b.newPage({ viewport: { width: 1300, height: 1000 } }); watch(p);
  for (const t of TABS) {
    await p.goto(URL + '#' + t); await p.waitForTimeout(1200);
    const shown = await p.evaluate((t) => { const s = document.getElementById('s-' + t); return s && !s.hidden; }, t);
    if (!shown) { console.log(`${t}: no such tab`); continue; }
    // every select gets each option once, every button in the panel gets a click
    const n = await p.evaluate((t) => {
      const s = document.getElementById('s-' + t); let k = 0;
      for (const sel of s.querySelectorAll('select')) for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); k++; }
      for (const r of s.querySelectorAll('input[type=range]')) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); r.value = (+r.min + +r.max) / 2; r.dispatchEvent(new Event('input', { bubbles: true })); k++; }
      for (const btn of s.querySelectorAll('button')) { btn.click(); k++; }
      return k;
    }, t);
    await p.waitForTimeout(1500);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log(`${t}: ${n} controls worked, page width ${sw}`);
    if (OUT) await p.screenshot({ path: `${OUT}/${t}.png`, fullPage: false });
  }
  // every idea's link opens its tab, applies its settings and shows its element
  const lp = await b.newPage({ viewport: { width: 1300, height: 1000 } }); watch(lp);
  await lp.goto(URL + '#links'); await lp.waitForTimeout(800);
  const hrefs = await lp.evaluate(() => Links.nodes.map((n) => [n.id, Links.href(n.id), n.focus, n.set]));
  let okLinks = 0;
  for (const [id, href, focus, set] of hrefs) {
    await lp.evaluate((h) => { location.hash = h; }, href); await lp.waitForTimeout(900);
    const bad = await lp.evaluate(([focus, set]) => {
      const out = [], el = document.getElementById(focus);
      if (!el || el.offsetParent === null) out.push('focus hidden');
      else { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) out.push('focus off screen'); }
      for (const [k, v] of set) {
        if (k.startsWith('seg.')) { const b = [...document.getElementById(k.slice(4)).querySelectorAll('button')].find((b) => Object.values(b.dataset).includes(v)); if (!b || b.getAttribute('aria-pressed') !== 'true') out.push(k + ' not pressed'); }
        else if (String(document.getElementById(k).value) !== v && +document.getElementById(k).value !== +v) out.push(`${k}=${document.getElementById(k).value}, wanted ${v}`);
      }
      return out;
    }, [focus, set]);
    if (bad.length) errs.push(`link ${id}: ${bad.join(', ')}`); else okLinks++;
  }
  console.log(`links: ${okLinks} of ${hrefs.length} ideas open with their settings`);
  const ph = await b.newPage({ viewport: { width: 390, height: 844 } }); watch(ph);
  for (const t of TABS) { await ph.goto(URL + '#' + t); await ph.waitForTimeout(500); const sw = await ph.evaluate(() => document.documentElement.scrollWidth); if (sw > 390) errs.push(`phone ${t}: page is ${sw}px wide`); }
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no errors');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
