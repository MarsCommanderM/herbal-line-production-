import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['contracts', 'src/domain'];
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (entry.isFile() && fullPath.endsWith('.ts')) files.push(fullPath);
  }
}

for (const root of roots) await walk(root);
files.sort();
const failures = [];
const rules = [
  [/any/, 'avoid explicit any in domain contracts and domain logic'],
  [/Math.randoms*(/, 'domain outcomes must not depend on Math.random'],
  [/Date.nows*(/, 'domain outcomes must use simulation time, not wall-clock time'],
  [/catchs*([^)]*)s*{s*}/, 'empty catch blocks are forbidden'],
];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const [pattern, message] of rules) {
    if (pattern.test(source)) failures.push(`${file}: ${message}`);
  }
}

if (failures.length) {
  console.error('DOMAIN SOURCE LINT: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`DOMAIN SOURCE LINT: PASS (${files.length} TypeScript files checked)`);
}
