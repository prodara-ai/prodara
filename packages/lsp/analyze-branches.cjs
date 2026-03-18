const fs = require('fs');
const data = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
for (const [file, info] of Object.entries(data)) {
  if (!file.includes('semantic')) continue;
  const bm = info.branchMap;
  const b = info.b;
  const src = fs.readFileSync(file, 'utf8').split('\n');
  for (const [id, branch] of Object.entries(bm)) {
    const counts = b[id];
    const uncov = counts.findIndex(c => c === 0);
    if (uncov >= 0) {
      console.log(`Branch ${id} L${branch.loc.start.line} type:${branch.type} counts:${JSON.stringify(counts)}`);
      console.log(`  src: ${src[branch.loc.start.line - 1].trim().substring(0, 120)}`);
    }
  }
}
