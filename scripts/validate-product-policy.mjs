#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const title = 'Dr. Green Dump / DopeFarm';
const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'PROJECT_MANIFEST.json',
  'docs/PRODUCTION_POLICY.md',
  'docs/00_MASTER_PRODUCTION_DOCUMENT.md',
  'docs/01_GAME_VISION_AND_GDD.md',
  'docs/02_FEATURE_SCOPE_AND_RELEASE_CONTENT.md',
  'docs/03_CORE_LOOP_AND_USER_FLOWS.md',
  'docs/09_VISUAL_ART_AUDIO_UX.md',
  'index.html',
  'src/domain/plant-care.ts',
  'masterpack/canonical/contracts/domain.ts',
  'masterpack/canonical/contracts/commands.ts',
  'masterpack/canonical/contracts/events.ts',
  'masterpack/canonical/contracts/persistence.ts',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push('Missing required product-policy file: ' + file);
}

function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    failures.push('Could not read required product-policy file: ' + file);
    return '';
  }
}

const manifestText = read('PROJECT_MANIFEST.json');
let manifest;
try {
  manifest = JSON.parse(manifestText);
} catch {
  failures.push('PROJECT_MANIFEST.json is not valid JSON.');
  manifest = {};
}
if (manifest.title !== title) failures.push('Manifest title must equal "' + title + '".');
if (typeof manifest.productDescription !== 'string'
  || !manifest.productDescription.includes('medizinischen Cannabis-Pflanzenproduktion')
  || !manifest.productDescription.includes('Apotheken')) {
  failures.push('Manifest productDescription must name medical-cannabis production and pharmacy delivery.');
}

const packageText = read('package.json');
let packageData;
try {
  packageData = JSON.parse(packageText);
} catch {
  failures.push('package.json is not valid JSON.');
  packageData = {};
}
if (packageData.name !== 'dr-green-dump-dopefarm') failures.push('Package name is inconsistent with the active product identity.');

const requiredPhrases = new Map([
  ['README.md', ['Dr. Green Dump / DopeFarm', 'medizinischen Cannabis-Pflanzenproduktion', 'Stecklingen']],
  ['AGENTS.md', ['Dr. Green Dump / DopeFarm', 'generische Kräuter', 'direkt sichtbare Pflege']],
  ['docs/PRODUCTION_POLICY.md', ['Dr. Green Dump / DopeFarm', 'Direkte Pflanzenpflege', 'Apotheken']],
  ['docs/00_MASTER_PRODUCTION_DOCUMENT.md', ['Dr. Green Dump / DopeFarm', 'direkt an erkennbaren Cannabis-Pflanzen']],
  ['docs/01_GAME_VISION_AND_GDD.md', ['Dr. Green Dump / DopeFarm', 'Cannabis-Pflanzen']],
  ['docs/02_FEATURE_SCOPE_AND_RELEASE_CONTENT.md', ['Dr. Green Dump / DopeFarm', 'Cannabis-Pflege']],
  ['docs/03_CORE_LOOP_AND_USER_FLOWS.md', ['Dr. Green Dump / DopeFarm', 'Pflanzenpflege']],
  ['docs/09_VISUAL_ART_AUDIO_UX.md', ['erkennbarer Cannabis-Pflanzen', 'Bewässerung']],
  ['index.html', ['Dr. Green Dump / DopeFarm', 'Sichtbare Pflanzenpflege', 'medizinischen Cannabis']],
  ['src/domain/vertical-slice.ts', ['PLANT/CARE_ACTION', 'plant.care_applied', 'set_cutting']],
  ['src/ui/management.ts', ['Bewässerung', 'Steckling setzen']],
  ['src/main.ts', ['createCannabisPlant', 'applyPlantCareVisual', 'onWorldPointerDown']],
  ['tests/e2e/campaign.spec.ts', ['Dr. Green Dump / DopeFarm', 'visible plant-care controls']],
]);

for (const [file, phrases] of requiredPhrases) {
  const contents = read(file);
  for (const phrase of phrases) {
    if (!contents.toLowerCase().includes(phrase.toLowerCase())) {
      failures.push(file + ' is missing required product-contract text: "' + phrase + '".');
    }
  }
}

const uiFiles = [
  'index.html',
  'src/ui/management.ts',
  'src/ui/tutorial.ts',
  'src/ui/campaign-guidance.ts',
  'tests/e2e/campaign.spec.ts',
];
const forbiddenVisibleLabels = [
  /Botanical Operations/i,
  /Botanischer Betrieb/i,
  /botanische Betriebsanlage/i,
  /fiktive botanische Anlage/i,
];
for (const file of uiFiles) {
  const contents = read(file);
  for (const pattern of forbiddenVisibleLabels) {
    if (pattern.test(contents)) failures.push(file + ' contains a forbidden generic botanical product label: ' + pattern);
  }
}

const actionContracts = read('contracts/commands.ts') + read('contracts/domain.ts');
for (const action of ['water', 'light', 'temperature', 'humidity', 'nutrients', 'prune', 'take_cutting', 'set_cutting']) {
  if (!actionContracts.includes(action)) failures.push('Runtime contracts are missing the fictional plant-care action "' + action + '".');
}

if (failures.length) {
  console.error('PRODUCT POLICY VALIDATION: FAIL');
  for (const failure of failures) console.error('- ' + failure);
  process.exitCode = 1;
} else {
  console.log('PRODUCT POLICY VALIDATION: PASS');
  console.log('Checks: active game identity, required scope docs, visible-care implementation hooks, source contract preservation, forbidden generic UI labels.');
}
