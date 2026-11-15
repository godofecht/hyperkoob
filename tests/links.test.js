// Checks for links.js against the page: every idea points at a real element,
// every setting at a real control and value, every route runs along links,
// and the map is one connected piece. Also the zeta function behind the
// Hilbert cube card. Run with: node tests/links.test.js
const fs = require('fs'), path = require('path');
require('../js/links.js'); require('../js/infinity-dims.js');
const L = globalThis.Links, D = globalThis.InfDims;
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = fs.readdirSync(path.join(__dirname, '..', 'js')).map((f) => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
let failures = 0;
function check(name, ok, detail) { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failures++; }
const hasId = (id) => html.includes(`id="${id}"`);
const tabs = [...html.matchAll(/data-tab="s-([a-z0-9]+)"/g)].map((m) => m[1]);
// A setting is valid if its control exists and, for a select or a button
// group, the value is one of its options (or is filled in by the scripts).
function settingOk(k, v) {
  if (k.startsWith('seg.')) {
    const id = k.slice(4), i = html.indexOf(`id="${id}"`);
    if (i < 0) return false;
    const block = html.slice(i, html.indexOf('</div>', i));
    return new RegExp(`data-[a-z]+="${v}"`).test(block);
  }
  if (!hasId(k)) return false;
  const m = html.match(new RegExp(`<select id="${k}">([\\s\\S]*?)</select>`));
  if (m && m[1].trim()) return m[1].includes(`value="${v}"`);
  if (m) return js.includes(`${v}:`) || js.includes(`'${v}'`); // options filled by a script
  return true;
}
const bad = [];
for (const n of L.nodes) {
  if (!tabs.includes(n.tab)) bad.push(`${n.id}: no tab ${n.tab}`);
  if (!hasId(n.focus)) bad.push(`${n.id}: no element ${n.focus}`);
  for (const [k, v] of n.set) if (!settingOk(k, v)) bad.push(`${n.id}: ${k}=${v}`);
}
for (const e of L.edges) {
  if (!L.byId[e.a] || !L.byId[e.b]) bad.push(`edge ${e.a}-${e.b}`);
  for (const [k, v] of [...(e.sa || []), ...(e.sb || [])]) if (!settingOk(k, v)) bad.push(`edge ${e.a}-${e.b}: ${k}=${v}`);
}
check(`all ${L.nodes.length} ideas point at real elements and real settings`, bad.length === 0, bad.join('; '));
const seen = new Set(), key = (a, b) => [a, b].sort().join('|');
const dup = L.edges.filter((e) => { const k = key(e.a, e.b); if (seen.has(k)) return true; seen.add(k); return false; });
check(`all ${L.edges.length} links are between two different ideas, each pair once`, !dup.length && L.edges.every((e) => e.a !== e.b), dup.map((e) => key(e.a, e.b)).join(', '));
const lonely = L.nodes.filter((n) => L.neighbours(n.id).length < 2).map((n) => n.id);
check('every idea has at least two connections', !lonely.length, lonely.join(', '));
// connected
const reach = new Set([L.nodes[0].id]), queue = [L.nodes[0].id];
while (queue.length) for (const { other } of L.neighbours(queue.shift())) if (!reach.has(other)) { reach.add(other); queue.push(other); }
check('the map is one connected piece', reach.size === L.nodes.length, `${reach.size} of ${L.nodes.length}`);
const tabsSeen = new Set(L.nodes.map((n) => n.tab));
check('every tab has ideas on the map', tabs.filter((t) => t !== 'links').every((t) => tabsSeen.has(t)), [...tabsSeen].join(' '));
const crossTab = L.edges.filter((e) => L.byId[e.a].tab !== L.byId[e.b].tab).length;
check('most links cross from one tab to another', crossTab > L.edges.length / 2, `${crossTab} of ${L.edges.length}`);
for (const [k, T] of Object.entries(L.THREADS)) {
  const gaps = T.path.slice(1).map((b, i) => [T.path[i], b]).filter(([a, b]) => !seen.has(key(a, b)));
  check(`the route "${T.name}" runs along links`, !gaps.length && T.path.every((id) => L.byId[id]), gaps.map((g) => g.join('-')).join(', '));
}
check('a link names its tab and the element to show', /^#curved\?focus=hw-c&seg\.hw-m=3/.test(L.href('honey', [['seg.hw-m', '3']]).replace('seg.hw-m=5&', '')));
// copy rules apply to the sentences too
const all = L.edges.map((e) => e.why).join(' ') + L.nodes.map((n) => n.title).join(' ');
check('no dashes in the copy', !/[–—]/.test(all));
// zeta
check('ζ(2) = π²/6', Math.abs(D.zeta(2) - Math.PI ** 2 / 6) < 1e-10, D.zeta(2).toFixed(12));
check('ζ(4) = π⁴/90', Math.abs(D.zeta(4) - Math.PI ** 4 / 90) < 1e-10);
check('ζ(1.5) = 2.6123753...', Math.abs(D.zeta(1.5) - 2.612375348685488) < 1e-8);
const p = 0.75, n = 200000;
check('sides 1/k^0.75: the diagonal tends to √ζ(1.5)', Math.abs(D.diag(D.powerSides(n, p)) - Math.sqrt(D.zeta(1.5))) < 2e-3, D.diag(D.powerSides(n, p)).toFixed(5));
if (failures) { console.log(`${failures} failed`); process.exit(1); } else console.log('all passed');
