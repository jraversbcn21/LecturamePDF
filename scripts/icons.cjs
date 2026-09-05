/*
 * Rasteriza public/icon.svg a los PNG que piden el manifest y iOS. Playwright es global:
 *   $env:NODE_PATH = (npm root -g); node scripts/icons.cjs
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PUBLIC = path.join(__dirname, '..', 'public');
const svg = fs.readFileSync(path.join(PUBLIC, 'icon.svg'), 'utf8');
const SIZES = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]];

(async () => {
  const browser = await chromium.launch();
  for (const [file, size] of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await page.screenshot({ path: path.join(PUBLIC, file) });
    await page.close();
    console.log(`${file}  ${size}×${size}`);
  }
  await browser.close();
})();
