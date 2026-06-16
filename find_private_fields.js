const fs = require('fs');
const path = require('path');

const nodeModules = path.join(__dirname, 'node_modules');
const SKIP = new Set(['@types', 'typescript', '.cache', '.bin']);

function searchDir(dir, depth = 0) {
  if (depth > 3) return;
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return; }
  
  for (const entry of entries) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      searchDir(full, depth + 1);
    } else if (/\.(js|cjs|mjs)$/.test(entry) && stat.size < 300000) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('this.#') || /= #[a-zA-Z]/.test(content)) {
          // Get package name relative to node_modules
          const rel = path.relative(nodeModules, full);
          const parts = rel.split(path.sep);
          const pkgName = parts[0].startsWith('@') ? parts[0] + '/' + parts[1] : parts[0];
          console.log(`PRIVATE FIELD: ${pkgName}  ->  ${rel}`);
        }
      } catch {}
    }
  }
}

console.log('Scanning node_modules for private class fields...\n');
searchDir(nodeModules);
console.log('\nDone.');
