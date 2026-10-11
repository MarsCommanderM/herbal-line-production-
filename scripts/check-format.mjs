import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['contracts', 'src', 'scripts', '.github/workflows'];
const extensions = new Set(['.ts', '.mjs', '.css', '.html', '.yml', '.yaml', '.json']);
const files = [];

async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (entry.isFile() && extensions.has(path.extname(entry.name)) && entry.name !== 'package-lock.json') files.push(fullPath);
  }
}

for (const root of roots) await walk(root);
for (const file of ['index.html', 'package.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts']) {
  try { await readFile(file, 'utf8'); files.push(file); } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}
const failures = [];
for (const file of [...new Set(files)].sort()) {
  const content = await readFile(file, 'utf8');
  if (content.includes('\r')) failures.push(file + ': CRLF/CR line endings are forbidden');
  if (/[^\S\n]+\n/.test(content)) failures.push(file + ': trailing whitespace detected');
  if (content.length > 0 && !content.endsWith('\n')) failures.push(file + ': missing final newline');
}
if (failures.length) {
  console.error('FORMAT CHECK: FAIL');
  for (const failure of failures) console.error('- ' + failure);
  process.exitCode = 1;
} else {
  console.log('FORMAT CHECK: PASS (' + new Set(files).size + ' source/config files checked)');
}
