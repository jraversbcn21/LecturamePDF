/*
 * Verificación en emulación móvil (Pixel 5, táctil) y del cliente de sincronización con la
 * API simulada. Igual que verify.cjs: servidor de desarrollo en marcha y Playwright global.
 *
 * Dos particularidades del entorno que estas comprobaciones esquivan:
 * - Chromium headless no trae visor de PDF: navegar una pestaña a un blob: de PDF se convierte
 *   en descarga. El evento de descarga ES la señal de que la pestaña recibió el documento.
 * - Las funciones de api/ no corren bajo `vite dev`, así que la API se responde desde
 *   Playwright (page.route): esto comprueba el cliente, no las funciones de Vercel.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium, devices } = require('playwright');

const URL = process.env.LECTURAME_URL || 'http://localhost:5173/';
const PDF = path.join(__dirname, '..', 'src', 'core', 'pdf', '__fixtures__', 'sample.pdf');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  → ${detail}` : ''}`);
};

/** Motor de voz falso mínimo: publica una voz local y apunta lo pronunciado en window.__spoken. */
const fakeSpeech = () => {
  window.__spoken = [];
  let current = null;
  let timer = null;
  let paused = false;
  let speaking = false;
  const finish = (utterance) => {
    if (current !== utterance || paused) return;
    current = null;
    speaking = false;
    utterance.onend && utterance.onend({});
  };
  const schedule = (utterance, ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => finish(utterance), ms);
  };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [{ name: 'Spanish Basic Local', lang: 'es-ES', localService: true, default: true, voiceURI: 'basic' }],
      addEventListener() {},
      removeEventListener() {},
      get paused() { return paused; },
      get speaking() { return speaking; },
      speak(utterance) {
        current = utterance;
        speaking = true;
        paused = false;
        window.__spoken.push(utterance.text);
        schedule(utterance, Math.max(150, (utterance.text.length * 6) / (utterance.rate || 1)));
      },
      cancel() { clearTimeout(timer); current = null; speaking = false; paused = false; },
      pause() { if (speaking) { paused = true; clearTimeout(timer); } },
      resume() { if (paused && current) { paused = false; schedule(current, 150); } },
    },
  });
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.rate = 1;
      this.voice = null;
      this.lang = '';
      this.onend = null;
      this.onerror = null;
      this.onboundary = null;
    }
  };
};

async function mobile(browser) {
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  await page.addInitScript(fakeSpeech);
  await page.goto(URL);

  check('la emulación es táctil de verdad: (hover: none) aplica', await page.evaluate(() => matchMedia('(hover: none)').matches));
  check(
    'la portada enseña el campo del código de sincronización',
    await page.locator('input[aria-label="Código de sincronización entre dispositivos"]').isVisible(),
  );
  check('la portada no scrollea en horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  // Con el dedo no se arrastra un archivo: el recuadro prometía algo imposible y tapaba la
  // estantería. Se oculta, y con él el `<input>` no puede irse, que es el único camino que queda.
  check('el recuadro de arrastrar no aparece en táctil', !(await page.locator('.dropzone').isVisible()));
  check('y «Elegir PDF» sigue siendo el camino a mano', await page.locator('.hero-actions .primary').isVisible());

  await page.setInputFiles('input[type=file]', PDF);
  await page.waitForSelector('.screen.reading');

  check('el lector no scrollea en horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(
    'la pantalla de lectura no se sale del alto visible (dvh)',
    await page.evaluate(() => document.querySelector('.screen.reading').getBoundingClientRect().height <= innerHeight + 1),
  );
  // En iOS un gesto en diagonal descolocaba el marco: el texto se corría en horizontal (una URL
  // sin espacios lo ensanchaba) y el rebote elástico arrastraba la página con cabecera y todo.
  check(
    'el dedo solo puede panear el lector en vertical',
    await page.evaluate(() => getComputedStyle(document.querySelector('.screen.reading')).touchAction === 'pan-y'),
  );
  check(
    'la columna de texto ni esconde contenido ni se mueve en horizontal',
    await page.evaluate(() => {
      const reader = document.querySelector('.reader');
      // Un párrafo con un token imposible de partir: sin overflow-wrap ensancharía la columna.
      const probe = document.createElement('p');
      probe.textContent = 'x'.repeat(600);
      reader.appendChild(probe);
      const contained = reader.scrollWidth <= reader.clientWidth + 1;
      probe.remove();
      return contained && getComputedStyle(reader).overflowX === 'hidden';
    }),
  );

  const muteOpacity = await page.locator('.mute-toggle').first().evaluate((el) => getComputedStyle(el).opacity);
  check('el botón de silenciar se ve sin necesidad de hover', muteOpacity === '1', `opacity ${muteOpacity}`);

  const before = await page.evaluate(() => window.__spoken.length);
  await page.tap('.controls .primary');
  await page.waitForFunction((n) => window.__spoken.length > n, before);
  const spoken = await page.evaluate((n) => window.__spoken.slice(n), before);
  check('el primer toque dispara la locución vacía que desbloquea la voz en iOS', spoken[0] === '', JSON.stringify(spoken[0]));
  await page.waitForFunction(() => window.__spoken.some((text) => text !== ''));
  const real = await page.evaluate(() => window.__spoken.find((text) => text !== ''));
  check('y detrás llega la frase de verdad', !!real, real);

  // Lectura inmersiva: con la voz sonando y sin tocar, las barras se van solas.
  const immersive = await page
    .waitForSelector('.screen.immersive', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check('sin tocar la pantalla, cabecera y reproductor se esconden', immersive);
  await page.waitForTimeout(300); // que termine la transición antes de medir posiciones
  check(
    'y el reproductor queda fuera de la vista',
    await page.evaluate(() => document.querySelector('.controls').getBoundingClientRect().top >= innerHeight - 1),
  );

  // El primer toque solo trae las barras. Se toca una frase VISIBLE de otro bloque (por
  // coordenadas: si Playwright tuviera que hacer scroll para llegar, el scroll ya revelaría
  // las barras y el toque sí saltaría).
  const target = await page.evaluate(() => {
    const active = document.querySelector('.sentence.active');
    const own = active?.parentElement;
    for (const s of document.querySelectorAll('.sentence')) {
      if (s.parentElement === own) continue;
      const r = s.getBoundingClientRect();
      if (r.top > 40 && r.bottom < innerHeight - 40 && r.width > 0) {
        return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2, text: s.textContent };
      }
    }
    return null;
  });
  if (target) {
    await page.touchscreen.tap(target.x, target.y);
    await page.waitForSelector('.screen.reading:not(.immersive)', { timeout: 3000 }).catch(() => {});
    check('el primer toque trae las barras de vuelta', (await page.locator('.screen.immersive').count()) === 0);
    const activeText = await page.locator('.sentence.active').textContent();
    check('y no salta la lectura a la frase tocada', activeText !== target.text, `activa: ${activeText?.slice(0, 40)}`);
  } else {
    check('hay una frase visible de otro bloque para tocar', false, 'no se encontró');
  }

  // Con la barra lateral abierta no se esconden: ahí se está usando la pantalla. Se comprueba
  // una AUSENCIA estable tras el retardo, la única espera fija admisible.
  await page.tap('button[aria-controls="sidebar"]');
  await page.waitForTimeout(5000);
  check('con la barra lateral abierta las barras se quedan', (await page.locator('.screen.immersive').count()) === 0);
  await page.tap('button[aria-controls="sidebar"]');

  await page.tap('.controls .primary'); // pausa: que no siga avanzando bajo los pies

  const [tab] = await Promise.all([context.waitForEvent('page'), page.tap('button[title="Ver el PDF original"]')]);
  const download = await tab.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  check('el original va a una pestaña nueva, no al iframe que Chromium móvil no pinta', !!download && download.url().startsWith('blob:'), download ? download.url() : 'sin descarga');
  check('y el panel del iframe no se abre', (await page.locator('#pdf-pane').count()) === 0);

  // Al volver del PDF original, iOS puede rehacer la pestaña desde cero: antes eso caía a la
  // portada en mitad de la lectura. La pestaña recuerda el documento y vuelve al lector.
  await page.reload();
  const restored = await page
    .waitForSelector('article.reader', { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check('si la pestaña se rehace (p. ej. al volver del original), sigue en la lectura', restored);

  // Borrar pedía un solo toque en un aspa pegada al botón de abrir, y el borrado viaja a la
  // nube sin deshacer: ahora confirma. Sin listener Playwright descartaría el diálogo solo;
  // se escucha para leer la pregunta y elegir la respuesta en cada caso.
  await page.keyboard.press('Escape');
  await page.waitForSelector('.docs .ghost');
  let question = null;
  page.once('dialog', (dialog) => {
    question = dialog.message();
    return dialog.dismiss();
  });
  await page.tap('.docs .ghost');
  await page.waitForTimeout(300); // que un borrado en vuelo tuviera tiempo de notarse
  check('borrar pide confirmación, y cancelar no borra', question !== null && (await page.locator('.doc').count()) === 1, String(question));
  page.once('dialog', (dialog) => dialog.accept());
  await page.tap('.docs .ghost');
  const gone = await page
    .waitForFunction(() => document.querySelectorAll('.doc').length === 0, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check('y aceptar sí lo quita de la estantería', gone);

  await context.close();
}

async function sync(browser) {
  const bytes = fs.readFileSync(PDF);
  const remoteId = crypto.createHash('sha256').update(bytes).digest('hex');
  /** Ficha como la dejaría otro dispositivo: con progreso y sin el documento en local. */
  const remoteEntry = {
    id: remoteId,
    name: 'remoto.pdf',
    language: 'es',
    totalSentences: 40,
    addedAt: 1700000000000,
    blockIndex: 2,
    sentenceIndex: 0,
    position: 5,
    bookmarks: [],
    rate: 1,
    voiceName: null,
    heardSections: [],
    muted: [],
    updatedAt: 1700000000000,
  };

  let putAuth = null;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(fakeSpeech);

  await page.route('**/api/library', async (route) => {
    const request = route.request();
    putAuth = request.headers()['x-sync-token'] ?? null;
    const client = request.method() === 'PUT' ? JSON.parse(request.postData() ?? '[]') : [];
    await route.fulfill({ json: [...client.filter((entry) => entry.id !== remoteId), remoteEntry] });
  });
  await page.route(`**/api/file?id=${remoteId}`, (route) => route.fulfill({ json: { url: `${URL}fake-blob.pdf` } }));
  await page.route('**/fake-blob.pdf', (route) => route.fulfill({ body: bytes, contentType: 'application/pdf' }));

  await page.goto(URL);
  const input = page.locator('input[aria-label="Código de sincronización entre dispositivos"]');
  await input.fill('codigo-de-prueba');
  await input.press('Enter');

  await page.waitForSelector('.shelf', { timeout: 5000 }).catch(() => {});
  check('conectar el código empuja la biblioteca con su cabecera', putAuth === 'codigo-de-prueba', String(putAuth));
  check(
    'lo que baja del servidor aparece en la estantería',
    await page.locator('.doc-name', { hasText: 'remoto.pdf' }).isVisible().catch(() => false),
  );
  check(
    'la portada dice que está sincronizado',
    await page.locator('.fine', { hasText: 'Sincronizado' }).isVisible().catch(() => false),
  );

  await page.locator('.doc', { hasText: 'remoto.pdf' }).click();
  const opened = await page
    .waitForSelector('.screen.reading', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check('abrir el documento remoto baja el PDF, lo extrae y entra al lector', opened);

  await context.close();
}

(async () => {
  let browser;
  try {
    await fetch(URL);
  } catch {
    console.error(`No responde nada en ${URL}.\nLevanta el servidor con "npm run dev" y vuelve a lanzar esto.`);
    process.exit(2);
  }
  try {
    browser = await chromium.launch();
    await mobile(browser);
    await sync(browser);
  } finally {
    await browser?.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones móviles y de sincronización OK`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
