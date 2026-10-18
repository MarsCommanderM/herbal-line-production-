#!/usr/bin/env node
/**
 * Basic relative luminance contrast check for key UI color pairs.
 * Not a full WCAG audit. All values are for the fictional game UI.
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLuminance([r, g, b]) {
  const s = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function contrast(fg, bg) {
  const L1 = relLuminance(hexToRgb(fg));
  const L2 = relLuminance(hexToRgb(bg));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const pairs = [
  { name: 'body text on app bg', fg: '#e8eef8', bg: '#080d18' },
  { name: 'subtitle on panel', fg: '#c5d4e8', bg: '#0b1423' },
  { name: 'metric value', fg: '#f4f7fc', bg: '#142031' },
  { name: 'feedback success', fg: '#c8f2df', bg: '#102820' },
  { name: 'feedback error', fg: '#ffd7db', bg: '#31171e' },
  { name: 'action button text', fg: '#f4fff9', bg: '#1a4b40' },
  { name: 'disclaimer', fg: '#a8b8cc', bg: '#0b1423' },
];

console.log('Contrast ratios (target AA small text >= 4.5):');
let fail = 0;
for (const p of pairs) {
  const ratio = contrast(p.fg, p.bg);
  const ok = ratio >= 4.5;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${ratio.toFixed(2)}:1  ${p.name}`);
}
console.log(fail === 0 ? 'All checked pairs meet AA' : `${fail} pair(s) below AA`);
process.exit(fail === 0 ? 0 : 1);
