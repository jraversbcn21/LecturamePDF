/*
 * Verificación end-to-end contra el navegador. Requiere el servidor de desarrollo
 * en marcha (`npm run dev`) y Playwright instalado de forma global:
 *
 *   npm i -g playwright && playwright install chromium
 *   npm run e2e
 *
 * Chromium headless no trae voces de síntesis, así que se sustituye el motor por
 * uno falso que respeta la API real: publica voces, emite límites de palabra y
 * avisa del fin de cada frase. Eso permite comprobar la sincronización, los
 * atajos y la persistencia; la calidad del audio solo se puede juzgar de oído.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const URL = process.env.LECTURAME_URL || 'http://localhost:5173/';
const PDF = path.join(__dirname, '..', 'src', 'core', 'pdf', '__fixtures__', 'sample.pdf');
const SHOTS = path.join(__dirname, 'screenshots');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  → ${detail}` : ''}`);
};

/** Motor de voz falso, instalado antes de que cargue la aplicación. */
const fakeSpeech = () => {
  const voices = [
    { name: 'Spanish Basic Local', lang: 'es-ES', localService: true, default: false, voiceURI: 'basic' },
    { name: 'Microsoft Alvaro Online (Natural) - Spanish (Spain)', lang: 'es-ES', localService: false, default: true, voiceURI: 'alvaro' },
    { name: 'Microsoft Ana Online (Natural) - English (US)', lang: 'en-US', localService: false, default: false, voiceURI: 'ana' },
  ];
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
      getVoices: () => voices,
      addEventListener() {},
      removeEventListener() {},
      get paused() {
        return paused;
      },
      get speaking() {
        return speaking;
      },
      speak(utterance) {
        current = utterance;
        speaking = true;
        paused = false;
        window.__spoken.push({ text: utterance.text, rate: utterance.rate, voice: utterance.voice && utterance.voice.name });
        setTimeout(() => {
          if (current === utterance && !paused && utterance.onboundary) {
            const first = utterance.text.split(' ')[0] || '';
            utterance.onboundary({ name: 'word', charIndex: 0, charLength: first.length });
          }
        }, 30);
        schedule(utterance, Math.max(150, (utterance.text.length * 6) / (utterance.rate || 1)));
      },
      cancel() {
        clearTimeout(timer);
        current = null;
        speaking = false;
        paused = false;
      },
      pause() {
        if (speaking) {
          paused = true;
          clearTimeout(timer);
        }
      },
      resume() {
        if (paused && current) {
          paused = false;
          schedule(current, 150);
        }
      },
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

const storedPosition = () =>
  new Promise((resolve) => {
    const open = indexedDB.open('lecturame', 1);
    open.onsuccess = () => {
      const get = open.result.transaction('library', 'readonly').objectStore('library').getAll();
      get.onsuccess = () => resolve(get.result[0] && get.result[0].position);
    };
  });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(fakeSpeech);
  const page = await context.newPage();

  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`console.${message.type()}: ${message.text()}`);
  });

  const activeText = () => page.locator('.sentence.active').first().innerText();
  const spoken = () => page.evaluate(() => window.__spoken);
  const blockOfActive = () =>
    page.evaluate(() => {
      const active = document.querySelector('.sentence.active');
      return [...document.querySelectorAll('.reader > *')].findIndex((block) => block.contains(active));
    });

  fs.mkdirSync(SHOTS, { recursive: true });

  const reachable = await page.goto(URL).then(() => true, () => false);
  if (!reachable) {
    console.error(`\nNo responde nada en ${URL}.\nLevanta el servidor con "npm run dev" y vuelve a lanzar esto.`);
    await browser.close();
    process.exit(2);
  }

  // --- Carga y extracción --------------------------------------------------
  await page.setInputFiles('input[type=file]', PDF);
  await page.waitForSelector('article.reader', { timeout: 30000 });

  const headings = await page.locator('.reader .heading').allInnerTexts();
  check('extrae los 4 títulos del PDF', headings.length === 4, headings.join(' | '));
  check('detecta el idioma español', (await page.locator('.bar .tag').innerText()) === 'Español');
  const chosenVoice = await page.locator('.controls select.voice').inputValue();
  check('elige la voz neural sobre la local básica', /Natural/.test(chosenVoice) && /Spanish/.test(chosenVoice), chosenVoice);
  await page.screenshot({ path: path.join(SHOTS, '01-reader.png') });

  // --- Reproducción y sincronización del resaltado -------------------------
  const firstSentence = await activeText();
  const spokenAtPlay = (await spoken()).length;
  await page.click('button[aria-label^="Reproducir"]');
  await page.waitForFunction(
    (previous) => document.querySelector('.sentence.active')?.textContent?.trim() !== previous,
    firstSentence.trim(),
    { timeout: 5000 },
  );
  const secondSentence = await activeText();
  check('el resaltado avanza solo al terminar la frase', secondSentence !== firstSentence);

  const spokenSoFar = (await spoken()).slice(spokenAtPlay);
  check(
    'la voz lee exactamente la frase resaltada',
    spokenSoFar[0].text.trim() === firstSentence.trim() && spokenSoFar[1].text.trim() === secondSentence.trim(),
  );
  check(
    'resalta la palabra en curso',
    await page.waitForSelector('.sentence.active mark.word', { timeout: 3000 }).then(() => true, () => false),
  );

  // --- Pausa ---------------------------------------------------------------
  await page.click('button[aria-label^="Pausar"]');
  const pausedAt = await activeText();
  await page.waitForTimeout(1200);
  check('en pausa no sigue avanzando', (await activeText()) === pausedAt);

  // --- Atajos: el foco quedó en un botón tras el clic ----------------------
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  check('Espacio reanuda aunque se hubiera pulsado un botón con el ratón', await page.evaluate(() => window.speechSynthesis.speaking));
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);

  const blockBefore = await blockOfActive();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  check('Tab salta al bloque siguiente', (await blockOfActive()) === blockBefore + 1);
  check(
    'tras saltar, el resaltado está en la primera frase del bloque',
    await page.evaluate(() => {
      const active = document.querySelector('.sentence.active');
      return active?.parentElement?.querySelector('.sentence') === active;
    }),
  );
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(150);
  check('Shift+Tab vuelve al bloque anterior', (await blockOfActive()) === blockBefore);

  const beforeArrow = await activeText();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  check('flecha derecha avanza una frase', (await activeText()) !== beforeArrow);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  check('flecha izquierda vuelve a la frase anterior', (await activeText()) === beforeArrow);

  // --- Velocidad en marcha: relanza la misma frase -------------------------
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const atRateChange = await activeText();
  const spokenBefore = (await spoken()).length;
  await page.selectOption('.controls select.rate', '2');
  await page.waitForTimeout(150);
  const afterRate = (await spoken()).slice(spokenBefore);
  check('cambiar la velocidad no pierde la posición', (await activeText()) === atRateChange);
  check(
    'la frase se relanza a la nueva velocidad',
    afterRate.length > 0 && afterRate[afterRate.length - 1].rate === 2 && afterRate[afterRate.length - 1].text.trim() === atRateChange.trim(),
  );

  // --- Voz elegida a mano --------------------------------------------------
  // En pausa: con la voz en marcha la frase activa cambia bajo los pies.
  await page.click('button[aria-label^="Pausar"]');
  await page.waitForTimeout(150);
  const voiceSentence = await activeText();
  const spokenBeforeVoice = (await spoken()).length;
  await page.selectOption('.controls select.voice', 'Spanish Basic Local');
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const afterVoice = (await spoken())[spokenBeforeVoice];
  check(
    'elegir otra voz relanza la frase con ella',
    afterVoice !== undefined && afterVoice.voice === 'Spanish Basic Local' && afterVoice.text.trim() === voiceSentence.trim(),
    afterVoice ? `${afterVoice.voice} · ${afterVoice.text.slice(0, 30)}` : 'no leyó nada',
  );

  // --- Clic directo sobre una frase ---------------------------------------
  await page.click('button[aria-label^="Pausar"]');
  await page.waitForTimeout(100);
  const clicked = page.locator('.reader > *').nth(3).locator('.sentence').first();
  const clickedText = await clicked.innerText();
  const spokenBeforeClick = (await spoken()).length;
  await clicked.click();
  await page.waitForTimeout(150);
  const firstAfterClick = (await spoken())[spokenBeforeClick];
  check(
    'al hacer clic en una frase, se lee desde ahí',
    firstAfterClick !== undefined && firstAfterClick.text.trim() === clickedText.trim(),
    firstAfterClick ? firstAfterClick.text.slice(0, 40) : 'no leyó nada',
  );
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);

  // --- Regresión: el progreso guardado no puede quedarse atrás -------------
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  const shown = Number(/frase (\d+)\//.exec(await page.locator('.status').innerText())[1]) - 1;
  await page.waitForTimeout(400);
  const stored = await page.evaluate(storedPosition);
  check('el progreso guardado sigue a los saltos rápidos', stored === shown, `guardado=${stored} mostrado=${shown}`);

  const positionBefore = await activeText();
  await page.screenshot({ path: path.join(SHOTS, '02-playing.png') });

  // --- Persistencia --------------------------------------------------------
  await page.keyboard.press('Escape');
  await page.waitForSelector('.dropzone', { timeout: 5000 });
  const entry = await page.locator('.doc').first().innerText();
  check('la biblioteca muestra el progreso real', /% escuchado/.test(entry) && !/ 0% escuchado/.test(entry), entry.replace(/\n/g, ' · '));
  await page.screenshot({ path: path.join(SHOTS, '03-library.png') });

  await page.reload();
  await page.waitForSelector('.doc', { timeout: 10000 });
  await page.locator('.doc').first().click();
  await page.waitForSelector('article.reader', { timeout: 10000 });
  await page.waitForTimeout(300);
  check('tras recargar, retoma en la misma frase', (await activeText()) === positionBefore);
  check('y recuerda la velocidad elegida', (await page.locator('.controls select.rate').inputValue()) === '2', `${await page.locator('.controls select.rate').inputValue()}x`);
  check(
    'y la voz elegida a mano, en vez de volver a la automática',
    (await page.locator('.controls select.voice').inputValue()) === 'Spanish Basic Local',
    await page.locator('.controls select.voice').inputValue(),
  );
  check('al reabrir no arranca solo la reproducción', await page.evaluate(() => window.__spoken.length === 0));
  check(
    'al reabrir se ve la frase donde ibas, sin esperar al desplazamiento',
    await page.evaluate(() => {
      const active = document.querySelector('.sentence.active');
      const reader = document.querySelector('.reader');
      if (!active || !reader) return false;
      const a = active.getBoundingClientRect();
      const r = reader.getBoundingClientRect();
      return a.top >= r.top && a.bottom <= r.bottom;
    }),
  );

  // --- Índice de secciones -------------------------------------------------
  const sections = await page.locator('.outline-item .outline-text').allInnerTexts();
  check('el índice lista los títulos del documento', sections.length === 4, sections.join(' | '));
  check('marca la sección que se está escuchando', (await page.locator('.outline-item.current').count()) === 1);

  // Lo que se pronuncia justo después del salto delata dónde ha caído, sin depender
  // de cuánto tarde la voz en pasar a la frase siguiente.
  await page.locator('.outline-item').nth(2).click();
  await page.waitForTimeout(200);
  const firstAfterJump = (await spoken())[0];
  check(
    'saltar desde el índice empieza a leer esa sección',
    firstAfterJump !== undefined && firstAfterJump.text.trim() === sections[2].trim(),
    firstAfterJump ? firstAfterJump.text.slice(0, 40) : 'no leyó nada',
  );
  check(
    'el índice sigue a la lectura',
    (await page.locator('.outline-item.current .outline-text').innerText()).trim() === sections[2].trim(),
  );

  // --- Búsqueda ------------------------------------------------------------
  await page.keyboard.press('/');
  check('la tecla / lleva el foco al buscador', await page.evaluate(() => document.activeElement?.className.includes('search-input')));

  // «atencion» sin tilde tiene que encontrar «Atención y comprensión».
  await page.keyboard.type('atencion');
  await page.waitForSelector('.search-results .result', { timeout: 5000 });
  check('encuentra ignorando tildes y mayúsculas', (await page.locator('.result').count()) > 0, await page.locator('.search-count').innerText());
  check('resalta el término tal y como está escrito', (await page.locator('.result mark').first().innerText()) === 'Atención');
  check('el índice deja sitio a los resultados', !(await page.locator('.outline').isVisible()));

  // En pausa: con la voz en marcha, la frase que avanza sola se cuela antes del salto.
  if (await page.locator('button[aria-label^="Pausar"]').count()) await page.click('button[aria-label^="Pausar"]');
  await page.waitForTimeout(150);
  const spokenBeforeResult = (await spoken()).length;
  await page.locator('.result').first().click();
  await page.waitForTimeout(200);
  const afterResult = (await spoken())[spokenBeforeResult];
  check(
    'saltar a un resultado empieza a leer esa frase',
    afterResult !== undefined && afterResult.text.includes('Atención'),
    afterResult ? afterResult.text.slice(0, 40) : 'no leyó nada',
  );

  await page.locator('.search-input').focus();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Escape limpia la búsqueda sin salir del documento', (await page.locator('article.reader').count()) === 1);
  check('al limpiar vuelve el índice', await page.locator('.outline').isVisible());

  // --- Marcadores ----------------------------------------------------------
  check('sin marcadores no aparece la sección', (await page.locator('.bookmarks').count()) === 0);
  // En pausa: si la voz sigue, la frase avanza y la estrella pasa a reflejar la siguiente.
  if (await page.locator('button[aria-label^="Pausar"]').count()) await page.click('button[aria-label^="Pausar"]');
  await page.waitForTimeout(150);
  const marked = await activeText();
  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  check('la tecla M marca la frase en curso', (await page.locator('.bookmark').count()) === 1);
  check('la estrella refleja que está marcada', (await page.locator('.bookmark-toggle').innerText()) === '★');
  check('la frase queda señalada en el texto', (await page.locator('.sentence.bookmarked').count()) === 1);

  await page.reload();
  await page.waitForSelector('.doc');
  await page.locator('.doc').first().click();
  await page.waitForSelector('article.reader');
  await page.waitForTimeout(200);
  check('el marcador sobrevive a cerrar y volver', (await page.locator('.bookmark').count()) === 1);
  check(
    'y conserva la frase marcada',
    (await page.locator('.bookmark-text').first().innerText()).trim() === marked.trim(),
    (await page.locator('.bookmark-text').first().innerText()).slice(0, 40),
  );

  await page.locator('.bookmark').first().click();
  await page.waitForTimeout(200);
  check('pulsar el marcador vuelve a esa frase', (await activeText()).trim() === marked.trim());

  // --- Notas ---------------------------------------------------------------
  // En pausa, para que «salir de pausa» delate un atajo colado al escribir.
  if (await page.locator('button[aria-label^="Pausar"]').count()) await page.click('button[aria-label^="Pausar"]');
  await page.waitForTimeout(150);
  await page.locator('button[aria-label="Añadir una nota"]').first().click();
  await page.waitForTimeout(150);
  check('el editor de nota recibe el foco', await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'));

  // El texto lleva «m» y espacios: los atajos no deben colarse mientras se escribe.
  await page.keyboard.type('repasar mapa mental antes del examen');
  check('escribir la nota no dispara los atajos', (await page.locator('.bookmark').count()) === 1 && (await page.locator('button[aria-label^="Reproducir"]').count()) === 1);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check('Enter guarda la nota', (await page.locator('.bookmark-note').innerText()) === 'repasar mapa mental antes del examen');

  await page.reload();
  await page.waitForSelector('.doc');
  await page.locator('.doc').first().click();
  await page.waitForSelector('article.reader');
  await page.waitForTimeout(200);
  check('la nota sobrevive a cerrar y volver', (await page.locator('.bookmark-note').count()) === 1);

  await page.locator('.bookmark-note').click();
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('esto no debe guardarse');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Escape cancela sin guardar y sin salir del documento', (await page.locator('.bookmark-note').innerText()) === 'repasar mapa mental antes del examen' && (await page.locator('article.reader').count()) === 1);

  await page.locator('button[aria-label^="Quitar marcador"]').first().click();
  await page.waitForTimeout(200);
  check('quitarlo lo borra de la lista y del texto', (await page.locator('.bookmark').count()) === 0 && (await page.locator('.sentence.bookmarked').count()) === 0);

  // --- Secciones ya escuchadas --------------------------------------------
  check('saltar de sección en sección no las da por escuchadas', (await page.locator('.outline-item.heard').count()) === 0);

  // Escuchar entera la última sección, que es corta.
  await page.locator('.outline-item').last().click();
  const heardAppeared = await page
    .waitForSelector('.outline-item.heard', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check('escuchar una sección hasta el final la marca', heardAppeared);
  if (heardAppeared) {
    const heardTexts = await page.locator('.outline-item.heard .outline-text').allInnerTexts();
    check(
      'la marcada es la que se ha escuchado',
      heardTexts.length === 1 && heardTexts[0].trim() === sections[sections.length - 1].trim(),
      heardTexts.join(' | '),
    );
  }

  check('sin errores de consola ni excepciones', problems.length === 0, problems.slice(0, 5).join(' || '));

  await browser.close();

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error('ERROR EN EL SCRIPT:', error);
  process.exit(2);
});
