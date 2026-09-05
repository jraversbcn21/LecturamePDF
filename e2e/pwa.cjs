/*
 * Verificación de la PWA: la aplicación arranca y extrae sin conexión.
 *
 * Corre contra `vite preview` sirviendo un `dist` recién construido (bajo `vite dev` no hay
 * service worker). Playwright global, como las otras dos suites:
 *   npx vite build; npx vite preview --port 4173   # en segundo plano
 *   $env:NODE_PATH = (npm root -g); node e2e/pwa.cjs
 *
 * `context.setOffline(true)` corta la red a nivel de navegador y deja al service worker
 * responder desde caché: eso es exactamente lo que se quiere medir.
 */
const path = require('path');
const { chromium } = require('playwright');

const URL = process.env.LECTURAME_PREVIEW_URL || 'http://localhost:4173/';
const PDF = path.join(__dirname, '..', 'src', 'core', 'pdf', '__fixtures__', 'sample.pdf');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  → ${detail}` : ''}`);
};

async function offline(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.log(`pageerror: ${error.message}`));
  await page.goto(URL);

  // El precache se llena en `install`, así que cuando `ready` resuelve ya está todo dentro.
  const state = await page
    .evaluate(() => navigator.serviceWorker.ready.then((r) => r.active?.state ?? 'sin worker activo'))
    .catch((error) => `error: ${error.message}`);
  check('el service worker se registra y queda activo', state === 'activated' || state === 'activating', state);

  // El precache se llena en `install`. Se pregunta a la Cache Storage directamente porque en
  // Chromium headless la petición del script del Worker se salta la emulación offline de
  // Playwright: extraer sin red no demuestra que el .mjs esté dentro; esto sí.
  const worker = await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const hit = (await (await caches.open(name)).keys()).find((r) => /pdf\.worker.*\.mjs/.test(r.url));
      if (hit) return hit.url;
    }
    return 'no está en ninguna caché';
  });
  check('el worker de pdf.js está en el precache', /\.mjs/.test(worker), worker);

  await context.setOffline(true);
  await page.reload();
  const portada = await page.waitForSelector('input[type=file]', { state: 'attached', timeout: 10000 }).then(() => true).catch(() => false);
  check('sin red, la portada carga desde el precache', portada);

  await page.setInputFiles('input[type=file]', PDF);
  const reader = await page.waitForSelector('article.reader', { timeout: 30000 }).then(() => true).catch(() => false);
  check('sin red, un PDF se extrae y entra al lector', reader);

  const api = await page.goto(`${URL}api/library`).then((r) => `respondió ${r?.status()} ${r?.headers()['content-type'] ?? ''}`, () => 'falló');
  check('sin red, navegar a /api/ falla en vez de recibir el index.html del fallback', api === 'falló', api);

  await context.close();
}

(async () => {
  let browser;
  try {
    await fetch(URL);
  } catch {
    console.error(`No responde nada en ${URL}.\nConstruye y sirve el dist: "npx vite build; npx vite preview --port 4173", y vuelve a lanzar esto.`);
    process.exit(2);
  }
  try {
    browser = await chromium.launch();
    await offline(browser);
  } finally {
    await browser?.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones sin conexión OK`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
