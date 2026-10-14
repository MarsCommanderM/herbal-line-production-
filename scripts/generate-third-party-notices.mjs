import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, 'node_modules', '.package-lock.json');
const outputPath = path.join(root, 'public', 'THIRD_PARTY_NOTICES.txt');

function fail(message) {
  console.error('THIRD-PARTY NOTICE GENERATION: FAIL — ' + message);
  process.exitCode = 1;
}

function licenseDeclaration(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((item) => typeof item === 'string' ? item : item?.type).filter(Boolean).join(' OR ');
  }
  return '';
}

function candidateLicenseFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^(?:licen[cs]e|copying|notice)(?:[._ -].*)?$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const packages = [];
const licenseTexts = new Map();
const failures = [];

for (const [packagePath, lockEntry] of Object.entries(lock.packages ?? {})) {
  if (!packagePath.startsWith('node_modules/') || lockEntry.link) continue;
  const directory = path.join(root, packagePath);
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  } catch {
    failures.push(packagePath + ': installed package.json is missing or unreadable');
    continue;
  }

  const declaration = licenseDeclaration(pkg);
  if (!declaration) {
    failures.push(packagePath + ': package metadata has no license declaration');
    continue;
  }

  const licenseFiles = candidateLicenseFiles(directory);
  if (licenseFiles.length === 0) {
    failures.push(packagePath + ': no bundled LICENSE/LICENCE/COPYING/NOTICE text found (declared ' + declaration + ')');
    continue;
  }

  const texts = [];
  for (const licenseFile of licenseFiles) {
    const content = readFileSync(licenseFile, 'utf8').trim();
    if (!content) {
      failures.push(packagePath + ': empty license file ' + path.basename(licenseFile));
      continue;
    }
    const digest = createHash('sha256').update(content).digest('hex');
    if (!licenseTexts.has(digest)) licenseTexts.set(digest, { content, packages: new Set(), filenames: new Set() });
    const record = licenseTexts.get(digest);
    record.packages.add(pkg.name + '@' + pkg.version);
    record.filenames.add(path.basename(licenseFile));
    texts.push({ filename: path.basename(licenseFile), digest });
  }

  packages.push({
    name: pkg.name ?? packagePath,
    version: pkg.version ?? lockEntry.version ?? 'unknown',
    license: declaration,
    licenseFiles: texts,
  });
}

if (failures.length) {
  for (const failure of failures) console.error('- ' + failure);
  fail(failures.length + ' package(s) lack complete license metadata or bundled license texts; do not ship an incomplete notice file.');
}

if (process.exitCode) process.exit(process.exitCode);

packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const sections = [
  'THIRD-PARTY LICENSE NOTICES',
  'Generated from the npm-installed dependency tree and its bundled license files.',
  'This file is part of the distributable build. Package declarations and bundled license texts are reproduced below.',
  'Dependency metadata is not a substitute for a legal compatibility review of the exact product, distribution model, and jurisdictions.',
  '',
  'PACKAGE INVENTORY',
  ...packages.map((pkg) => '- ' + pkg.name + '@' + pkg.version + ' — declared license: ' + pkg.license + ' — bundled license file(s): ' + pkg.licenseFiles.map((file) => file.filename).join(', ')),
  '',
  'BUNDLED LICENSE TEXTS',
];

const orderedTexts = [...licenseTexts.entries()].sort((a, b) => {
  const aNames = [...a[1].packages].sort().join(',');
  const bNames = [...b[1].packages].sort().join(',');
  return aNames.localeCompare(bNames);
});
for (const [digest, record] of orderedTexts) {
  sections.push(
    '',
    '='.repeat(78),
    'Packages: ' + [...record.packages].sort().join(', '),
    'Original file name(s): ' + [...record.filenames].sort().join(', '),
    'SHA-256 of license text: ' + digest,
    '-'.repeat(78),
    record.content,
  );
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, sections.join('\n') + '\n', 'utf8');
console.log('THIRD-PARTY NOTICE GENERATION: PASS — ' + packages.length + ' packages; ' + orderedTexts.length + ' unique bundled license-text variants; wrote public/THIRD_PARTY_NOTICES.txt');
