'use strict';
// Phase 4.4 read-only adapter source audit. NEVER require/import candidate files.
// This is a conservative heuristic review, not proof of runtime isolation.
const fs = require('node:fs');
const path = require('node:path');

const MAX_FILES = 3000;
const MAX_BYTES = 1024 * 1024;
const suspicious = [
  ['HTTP_LISTENER', /\b(?:app|server|httpServer|httpsServer)\s*\.\s*listen\s*\(|\b(?:http|https|net)\s*\.\s*createServer\s*\(/g],
  ['CHILD_PROCESS', /\b(?:spawn|exec|execFile|fork)\s*\(|\brequire\s*\(\s*['"](?:node:)?child_process['"]\s*\)/g],
  ['ENV_FILE_ACCESS', /\b(?:dotenv\.config|process\.env|--env-file)\b/g],
  ['DB_CONNECT', /\b(?:createConnection|createPool|connect)\s*\(/g],
  ['IMPORT_SIDE_EFFECT_REVIEW', /\b(?:require\s*\(|import\s+|import\s*\()/g]
];
const ignore = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
const exts = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx']);
function audit(root) {
  const absolute = path.resolve(root);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) throw Error('Directory not found');
  let seen = 0;
  let findings = 0;
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ignore.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile() || !exts.has(path.extname(entry.name))) continue;
      if (++seen > MAX_FILES) throw Error('Too many source files; narrow the scan root');
      if (fs.statSync(full).size > MAX_BYTES) continue;
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        for (const [label, re] of suspicious) {
          re.lastIndex = 0;
          if (re.test(lines[i])) {
            findings++;
            // No source text, environment values, or credentials are printed.
            console.log(label + ': ' + path.relative(absolute, full) + ':' + (i + 1));
          }
        }
      }
    }
  };
  walk(absolute);
  console.log('AUDIT COMPLETE: ' + seen + ' source files, ' + findings + ' review markers');
  console.log('NOTICE: Static patterns may miss dynamic imports, aliases, and indirect side effects.');
  console.log('NOTICE: Findings are review markers, not verified vulnerabilities.');
}
if (require.main === module) {
  if (process.argv.length !== 3) {
    console.error('Usage: node tests/phase44-adapter-source-audit.js <candidate-source-directory>');
    process.exitCode = 2;
  } else {
    try { audit(process.argv[2]); } catch (e) { console.error('AUDIT FAILED: ' + e.message); process.exitCode = 1; }
  }
}
module.exports = { audit };
