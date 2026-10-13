import fs from 'node:fs';

const sbomPath = process.argv[2];
if (!sbomPath) {
  throw new Error('Usage: node scripts/generate-dependency-license-inventory.mjs <cyclonedx-sbom.json>');
}
const bom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
if (bom.bomFormat !== 'CycloneDX' || !Array.isArray(bom.components) || bom.components.length === 0) {
  throw new Error('CycloneDX SBOM is missing or invalid.');
}
const components = bom.components.map((component) => {
  const licenses = (component.licenses ?? [])
    .map((entry) => entry.license?.id ?? entry.license?.name ?? entry.expression)
    .filter((value) => typeof value === 'string' && value.trim().length > 0);
  if (!component.name || !component.version || licenses.length === 0) {
    throw new Error(`Missing package name, version, or SPDX license metadata: ${component.name ?? '<unnamed>'}`);
  }
  return { name: component.name, version: component.version, licenses: [...new Set(licenses)].sort() };
}).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.version.localeCompare(b.version));

const markdown = [
  '# Dependency License Inventory',
  '',
  'Deterministic inventory generated from the locked-install CycloneDX SBOM. CI regenerates this table and compares it with the committed file.',
  '',
  `**Coverage:** ${components.length} dependency components in the Linux CI SBOM; all ${components.length} expose at least one SPDX license identifier.`,
  '',
  '**Limitations:** This is a metadata inventory, not legal clearance. It does not confirm license compatibility, redistribution/modification rights, attribution obligations, or inclusion of required license texts. Those remain release gates.',
  '',
  '| Package | Version | SPDX license identifier(s) |',
  '|---|---|---|',
  ...components.map(({ name, version, licenses }) => `| \`${name.replaceAll('|', '\\|')}\` | \`${version.replaceAll('|', '\\|')}\` | ${licenses.join(', ').replaceAll('|', '\\|')} |`),
].join('\n') + '\n';

process.stdout.write(markdown);
