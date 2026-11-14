// Runs every unit suite. With a URL, also runs the browser smoke test:
//   node tests/run.js [http://localhost:8000/]
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort()) {
  try { execFileSync('node', [path.join(__dirname, f)], { stdio: 'pipe' }); console.log('ok   ' + f); }
  catch (e) { failed++; console.log('FAIL ' + f + '\n' + e.stdout); }
}
if (process.argv[2]) {
  try { console.log(execFileSync('node', [path.join(__dirname, 'smoke.cjs'), process.argv[2]], { encoding: 'utf8' })); }
  catch (e) { failed++; console.log('FAIL smoke\n' + e.stdout); }
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
