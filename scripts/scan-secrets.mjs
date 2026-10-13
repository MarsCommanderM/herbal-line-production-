import { execFileSync, spawnSync } from 'node:child_process';

const MAX_TEXT_BLOB_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 128 * 1024 * 1024;

const patterns = [
  {
    name: 'private-key material',
    expression: new RegExp(`${'-'.repeat(5)}BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY${'-'.repeat(5)}|${'-'.repeat(5)}BEGIN PGP PRIVATE KEY BLOCK${'-'.repeat(5)}`),
  },
  { name: 'AWS access-key identifier', expression: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub access token', expression: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { name: 'GitLab access token', expression: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Slack access token', expression: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Stripe secret key', expression: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'Google API key', expression: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'npm access token', expression: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: 'OpenAI project/service key', expression: /\bsk-(?:proj|svcacct)-[A-Za-z0-9_-]{20,}\b/ },
];

const objectLines = execFileSync('git', ['rev-list', '--objects', '--all'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
}).split('\n').filter(Boolean);
const pathByObject = new Map();
for (const line of objectLines) {
  const separator = line.indexOf(' ');
  if (separator > 0) pathByObject.set(line.slice(0, separator), line.slice(separator + 1));
}
const objectIds = [...new Set(objectLines.map((line) => line.split(' ', 1)[0]))];
const metadata = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], {
  input: objectIds.join('\n') + '\n',
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const blobs = metadata.split('\n').map((line) => {
  const [sha, type, sizeText] = line.split(' ');
  return { sha, type, size: Number(sizeText) };
}).filter((entry) => entry.type === 'blob' && Number.isSafeInteger(entry.size) && entry.size >= 0 && entry.size <= MAX_TEXT_BLOB_BYTES);

const result = spawnSync('git', ['cat-file', '--batch'], {
  input: blobs.map((entry) => entry.sha).join('\n') + '\n',
  encoding: null,
  maxBuffer: MAX_OUTPUT_BYTES,
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr?.toString('utf8') || 'git cat-file failed');

const findings = [];
let offset = 0;
let scannedTextBlobs = 0;
while (offset < result.stdout.length) {
  const headerEnd = result.stdout.indexOf(0x0a, offset);
  if (headerEnd < 0) throw new Error('Malformed git cat-file batch header.');
  const [sha, type, sizeText] = result.stdout.subarray(offset, headerEnd).toString('utf8').split(' ');
  offset = headerEnd + 1;
  const size = Number(sizeText);
  if (type === 'missing' || !Number.isSafeInteger(size) || size < 0) continue;
  const content = result.stdout.subarray(offset, offset + size);
  if (content.length !== size) throw new Error('Truncated git cat-file batch object.');
  offset += size;
  if (result.stdout[offset] === 0x0a) offset += 1;
  if (type !== 'blob' || content.includes(0)) continue;

  const source = content.toString('utf8');
  scannedTextBlobs += 1;
  for (const pattern of patterns) {
    if (pattern.expression.test(source)) {
      findings.push({ kind: pattern.name, path: pathByObject.get(sha) ?? '(path unavailable)', sha });
    }
  }
}

if (findings.length > 0) {
  console.error('SECRET SCAN: FAIL — high-confidence credential patterns found in reachable Git history.');
  for (const finding of findings) console.error(`- ${finding.kind}: ${finding.path} (blob ${finding.sha})`);
  process.exitCode = 1;
} else {
  console.log(`SECRET SCAN: PASS — ${scannedTextBlobs} text blobs scanned across reachable Git history; high-confidence patterns only.`);
}
