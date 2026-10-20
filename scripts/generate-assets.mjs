// Renders the app icons and iOS launch images with headless Chromium.
// Usage: npm run icons   (requires the `playwright` package to be resolvable)
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let playwright;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
  try {
    playwright = require(p);
    break;
  } catch {}
}
if (!playwright) throw new Error('Install playwright to generate assets: npm i -D playwright');

// Inline the fonts: pages rendered from setContent cannot load file:// URLs.
const font = (file) =>
  `data:font/woff2;base64,${readFileSync(resolve(root, 'node_modules/@fontsource/cormorant-garamond/files', file)).toString('base64')}`;
const fontCss = `
@font-face { font-family: C; font-style: italic; font-weight: 500; src: url(${font('cormorant-garamond-latin-500-italic.woff2')}); }
@font-face { font-family: C; font-style: normal; font-weight: 500; src: url(${font('cormorant-garamond-latin-500-normal.woff2')}); }
@font-face { font-family: C; font-style: italic; font-weight: 400; src: url(${font('cormorant-garamond-latin-400-italic.woff2')}); }
* { margin: 0; box-sizing: border-box; }
`;

const iconHtml = (size, pad) => `<!doctype html><style>${fontCss}
body { width:${size}px; height:${size}px; background: radial-gradient(120% 90% at 30% 15%, #FBF7EF 0%, #F3EBDD 55%, #EADFCB 100%); display:grid; place-items:center; overflow:hidden; }
.wrap { position:relative; width:${size * pad}px; height:${size * pad}px; display:grid; place-items:center; }
.ring { position:absolute; inset:${size * pad * 0.06}px; border-radius:50%; border:${Math.max(1, size * 0.006)}px solid rgba(178,150,106,.55); }
.m { font-family:C; font-style:italic; font-weight:500; font-size:${size * pad * 0.62}px; line-height:1; color:#2B2724; transform: translate(-1.5%, -4%); }
.dot { position:absolute; width:${size * pad * 0.055}px; height:${size * pad * 0.055}px; border-radius:50%; background:#B2966A; top:${size * pad * 0.21}px; right:${size * pad * 0.27}px; }
</style><body><div class="wrap"><div class="ring"></div><div class="m">m</div><div class="dot"></div></div></body>`;

const splashHtml = (w, h, dark) => `<!doctype html><style>${fontCss}
body { width:${w}px; height:${h}px; background:${dark ? '#0D0C0B' : '#F6F1E8'}; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.word { font-family:C; font-weight:500; font-size:${w * 0.04}px; letter-spacing:.5em; padding-left:.5em; text-transform:uppercase; color:${dark ? '#A39A8E' : '#70675E'}; }
.tag { margin-top:${w * 0.03}px; font-family:C; font-style:italic; font-size:${w * 0.045}px; color:${dark ? '#6E675E' : '#A89E92'}; }
</style><body><div class="word">Moments</div><div class="tag">A little piece of every day.</div></body>`;

// Portrait iPhone launch images: [width, height, device-width, device-height, ratio]
const SPLASH = [
  [1320, 2868, 440, 956, 3],
  [1206, 2622, 402, 874, 3],
  [1290, 2796, 430, 932, 3],
  [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3],
  [1125, 2436, 375, 812, 3],
  [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2],
  [1242, 2208, 414, 736, 3],
  [750, 1334, 375, 667, 2],
];

const browser = await playwright.chromium.launch();
const page = await browser.newPage();

async function shot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: 'png' });
}

const pub = (p) => resolve(root, 'public', p);
await shot(iconHtml(512, 1), 512, 512, pub('icons/icon-512.png'));
await shot(iconHtml(192, 1), 192, 192, pub('icons/icon-192.png'));
await shot(iconHtml(512, 0.78), 512, 512, pub('icons/icon-maskable-512.png'));
await shot(iconHtml(180, 1), 180, 180, pub('apple-touch-icon.png'));

const links = [];
for (const [w, h, dw, dh, r] of SPLASH) {
  for (const dark of [false, true]) {
    const name = `splash/launch-${w}x${h}${dark ? '-dark' : ''}.png`;
    await shot(splashHtml(w, h, dark), w, h, pub(name));
    links.push(
      `    <link rel="apple-touch-startup-image" media="(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${dark ? 'dark' : 'light'})" href="%BASE_URL%${name}" />`,
    );
  }
}
await browser.close();

// Write the launch-image links into index.html between the markers.
const indexPath = resolve(root, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const block = `<!--splash-->\n${links.join('\n')}\n    <!--/splash-->`;
const next = html.includes('<!--/splash-->')
  ? html.replace(/<!--splash-->[\s\S]*?<!--\/splash-->/, block)
  : html.replace('<!--splash-->', block);
writeFileSync(indexPath, next);
console.log(`Generated icons and ${links.length} launch images.`);
