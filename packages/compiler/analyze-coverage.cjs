const fs = require('fs');
const cov = require('./coverage/coverage-final.json');

// Show uncovered branches with source code
console.log('=== UNCOVERED BRANCHES WITH SOURCE ===\n');
for (const [file, data] of Object.entries(cov)) {
  const fname = file.split('/').pop();
  const b = data.b;
  const bMap = data.branchMap;
  const uncovLines = new Set();
  for (const [k, v] of Object.entries(b)) {
    v.forEach((count, idx) => {
      if (count === 0) {
        const branch = bMap[k];
        uncovLines.add(branch.loc.start.line);
      }
    });
  }
  if (uncovLines.size === 0) continue;
  // Read source file
  let lines = [];
  try { lines = fs.readFileSync(file, 'utf-8').split('\n'); } catch {}
  if (lines.length === 0) continue;
  console.log(`--- ${fname} (${uncovLines.size} uncov branch lines) ---`);
  for (const ln of [...uncovLines].sort((a,b) => a - b)) {
    const src = lines[ln - 1];
    if (src !== undefined) console.log(`  L${ln}: ${src.trimStart()}`);
  }
  console.log('');
}

// Show uncovered statements
console.log('=== UNCOVERED STATEMENTS ===\n');
for (const [file, data] of Object.entries(cov)) {
  const fname = file.split('/').pop();
  const s = data.s;
  const sMap = data.statementMap;
  const uncov = [];
  for (const [k, v] of Object.entries(s)) {
    if (v === 0) {
      const loc = sMap[k];
      uncov.push(loc.start.line);
    }
  }
  if (uncov.length === 0) continue;
  let lines = [];
  try { lines = fs.readFileSync(file, 'utf-8').split('\n'); } catch {}
  console.log(`--- ${fname} (${uncov.length} uncov stmts) ---`);
  for (const ln of uncov.sort((a,b)=>a-b)) {
    const src = lines[ln - 1];
    if (src !== undefined) console.log(`  L${ln}: ${src.trimStart()}`);
  }
  console.log('');
}

// Summary for all problematic files
const targets = ['format-helpers', 'mermaid-renderers', 'string-resolver', 'link-resolver', 'section-renderers', 'surface-ascii', 'doc-renderer', 'notify', 'config', 'drift', 'semantic-diff', 'loader', 'proposal', 'adversarial', 'prompt-loader', 'party', 'agent-setup', 'analyze', 'checklist', 'dashboard', 'explain', 'main.ts'];
console.log('\n--- SUMMARY ---');
for (const [file, data] of Object.entries(cov)) {
  const isMatch = targets.some(t => file.includes(t));
  if (!isMatch) continue;
  const fname = file.split('/').pop();
  const b = data.b;
  const bMap = data.branchMap;
  let uncovBranches = 0;
  let totalBranches = 0;
  const uncovLines = new Set();
  for (const [k, v] of Object.entries(b)) {
    const branch = bMap[k];
    v.forEach((count, idx) => {
      totalBranches++;
      if (count === 0) {
        uncovBranches++;
        uncovLines.add(branch.loc.start.line);
      }
    });
  }
  const s = data.s;
  let uncovStmts = 0;
  let totalStmts = 0;
  for (const [k, v] of Object.entries(s)) {
    totalStmts++;
    if (v === 0) uncovStmts++;
  }
  if (uncovBranches > 0 || uncovStmts > 0) {
    console.log(fname + ': stmts=' + uncovStmts + '/' + totalStmts + ' branches=' + uncovBranches + '/' + totalBranches + ' lines=' + [...uncovLines].sort((a,b)=>a-b).join(','));
  }
}
