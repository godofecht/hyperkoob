// Opens every tab in a real browser, works its main controls, and fails on
// any page error. Run with: node tests/smoke.cjs http://localhost:8765/ [shots-dir]
const path = require('path');
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(require('os').homedir(), 'node_modules/playwright')); }
const URL = process.argv[2] || 'http://localhost:8765/', OUT = process.argv[3];
const TABS = ['shadows', 'tiling', 'never', '4d', 'high', 'fractal', 'curved', 'strings', 'infinity'];
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
  const ph = await b.newPage({ viewport: { width: 390, height: 844 } }); watch(ph);
  for (const t of TABS) { await ph.goto(URL + '#' + t); await ph.waitForTimeout(500); const sw = await ph.evaluate(() => document.documentElement.scrollWidth); if (sw > 390) errs.push(`phone ${t}: page is ${sw}px wide`); }
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no errors');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
