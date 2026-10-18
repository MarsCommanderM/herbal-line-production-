#!/usr/bin/env node
/**
 * Captures current release evidence for the herbal-line branch.
 * Not a signed artifact. All values remain fictional game balance.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    return 'ERROR: ' + (err.message || String(err));
  }
}

const evidence = {
  capturedAt: new Date().toISOString(),
  branch: run('git rev-parse --abbrev-ref HEAD'),
  commit: run('git rev-parse HEAD'),
  version: JSON.parse(run('node -p "JSON.stringify(require(\'./package.json\').version)"') || '"unknown"'),
  typecheck: run('npm run typecheck --silent') === '' ? 'PASS' : 'FAIL',
  unitTests: run('npm test --silent 2>&1 | tail -5'),
  notes: 'Evidence capture only. Not a release artifact. ASSET_LICENSE_GATE remains PENDING.',
};

writeFileSync('docs/RELEASE_EVIDENCE.json', JSON.stringify(evidence, null, 2));
console.log('Wrote docs/RELEASE_EVIDENCE.json');
console.log(JSON.stringify(evidence, null, 2));
