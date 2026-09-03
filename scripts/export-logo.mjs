import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcSvg = fs.readFileSync('public/sprites/lans-logo.svg', 'utf-8');

// Full LansLogo emblem SVG (from component) - 48x48 viewBox
const emblemSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="512" height="512" shape-rendering="crispEdges">
  <rect width="48" height="48" fill="#FFE500"/>
  <rect x="0" y="0" width="48" height="48" fill="#FFE500"/>
  <!-- chamfer simulation: clip is not needed for PNG -->
  <g transform="translate(0,0)">
    <!-- L Monogram -->
    <path d="M 10 9 H 19 V 28 H 35 L 32 36 H 10 V 9 Z" fill="#121212"/>
    <line x1="12.5" y1="11" x2="12.5" y2="33" stroke="#FFE500" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>
    <!-- Nexus Star -->
    <path d="M 31 7 Q 31 16 40 16 Q 31 16 31 25 Q 31 16 22 16 Q 31 16 31 7 Z" fill="#121212"/>
    <path d="M 26 11 L 36 21 M 36 11 L 26 21" stroke="#121212" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="31" cy="16" r="2.5" fill="#00F59B" stroke="#121212" stroke-width="1"/>
    <circle cx="30.5" cy="15.5" r="0.8" fill="#FFFFFF"/>
  </g>
</svg>
`;

async function exportPng(svg, outPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`✓ ${outPath} (${size}x${size})`);
}

async function run() {
  // 1) Crest PNGs from existing lans-logo.svg (crown)
  for (const size of [512, 256, 192, 128, 64]) {
    await exportPng(srcSvg, `public/lans-crest-${size}.png`, size);
  }
  await exportPng(srcSvg, `public/lans-logo.png`, 512);
  await exportPng(srcSvg, `public/logo.png`, 512);

  // 2) Emblem PNG (L + star) - the LansLogo icon
  for (const size of [512, 256, 192]) {
    await exportPng(emblemSvg, `public/lans-emblem-${size}.png`, size);
  }
  await exportPng(emblemSvg, `public/lans-emblem.png`, 512);

  // 3) Full logo with text (icon + LANS wordmark) - composite SVG
  const fullLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="320" viewBox="0 0 1024 320">
  <rect width="1024" height="320" fill="#FAF7F0"/>
  <!-- Emblem box -->
  <g transform="translate(60, 60)">
    <rect width="140" height="140" fill="#FFE500" stroke="#121212" stroke-width="6"/>
    <g transform="scale(2.9)">
      <path d="M 10 9 H 19 V 28 H 35 L 32 36 H 10 V 9 Z" fill="#121212"/>
      <line x1="12.5" y1="11" x2="12.5" y2="33" stroke="#FFE500" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>
      <path d="M 31 7 Q 31 16 40 16 Q 31 16 31 25 Q 31 16 22 16 Q 31 16 31 7 Z" fill="#121212"/>
      <path d="M 26 11 L 36 21 M 36 11 L 26 21" stroke="#121212" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="31" cy="16" r="2.5" fill="#00F59B" stroke="#121212" stroke-width="1"/>
      <circle cx="30.5" cy="15.5" r="0.8" fill="#FFFFFF"/>
    </g>
  </g>
  <!-- Wordmark -->
  <text x="240" y="135" font-family="Space Grotesk, sans-serif" font-weight="900" font-size="110" fill="#121212" letter-spacing="-3">LANS</text>
  <circle cx="445" cy="95" r="14" fill="#00F59B" stroke="#121212" stroke-width="4"/>
  <rect x="240" y="150" width="220" height="32" fill="#FFE500" stroke="#121212" stroke-width="3"/>
  <text x="250" y="171" font-family="JetBrains Mono, monospace" font-weight="800" font-size="16" fill="#121212">BNB CHAIN</text>
  <text x="240" y="210" font-family="JetBrains Mono, monospace" font-weight="700" font-size="22" fill="#4A4A4A">AUTONOMOUS AGENT SANCTUARY</text>
  <text x="240" y="235" font-family="JetBrains Mono, monospace" font-size="14" fill="#8A8A8A">ERC-8004 • ERC-8183 • x402</text>
</svg>
  `;
  await sharp(Buffer.from(fullLogoSvg)).png().toFile('public/lans-full-1024.png');
  console.log('✓ public/lans-full-1024.png (1024x320)');
  await sharp(Buffer.from(fullLogoSvg)).resize(512, 160).png().toFile('public/lans-full-512.png');
  console.log('✓ public/lans-full-512.png (512x160)');

  console.log('\\nAll logos exported to public/');
}

run().catch(e => { console.error(e); process.exit(1); });
