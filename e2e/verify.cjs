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
const TABLES_PDF = path.join(__dirname, '..', 'src', 'core', 'pdf', '__fixtures__', 'tables.pdf');
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

/**
 * Red falsa para la voz de IA: responde a OpenRouter con un WAV de silencio que el
 * <Audio> real reproduce hasta su `ended`. Apunta cada frase pedida en window.__tts,
 * y con window.__ttsFail responde 500 para provocar el camino de error.
 */
const fakeOpenRouter = () => {
  window.__tts = [];
  window.__ttsFail = false;
  const wav = (() => {
    const samples = 2000; // 0,25 s de silencio a 8 kHz
    const buffer = new Uint8Array(44 + samples);
    const view = new DataView(buffer.buffer);
    const ascii = (offset, text) => {
      for (let i = 0; i < text.length; i++) buffer[offset + i] = text.charCodeAt(i);
    };
    ascii(0, 'RIFF');
    view.setUint32(4, 36 + samples, true);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 8000, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    ascii(36, 'data');
    view.setUint32(40, samples, true);
    buffer.fill(128, 44); // el silencio de PCM en 8 bits es 128, no 0
    return buffer;
  })();
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('openrouter.ai/api/v1/audio/speech')) return realFetch(input, init);
    window.__tts.push(JSON.parse(init.body).input);
    if (window.__ttsFail) return Promise.resolve(new Response('', { status: 500 }));
    return Promise.resolve(new Response(wav, { status: 200, headers: { 'Content-Type': 'audio/wav' } }));
  };
};

/** Base tal y como la dejaba la versión anterior: sin almacén de originales y con fichas incompletas. */
const seedVersion1 = () =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('lecturame', 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('docs');
      open.result.createObjectStore('library');
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const id = 'documento-de-antes';
      const text = 'Una frase guardada por una versión anterior de la aplicación.';
      const transaction = open.result.transaction(['docs', 'library'], 'readwrite');
      transaction.objectStore('docs').put(
        { id, name: 'viejo.pdf', language: 'es', addedAt: 1, blocks: [{ type: 'paragraph', text, page: 1, sentences: [text] }] },
        id,
      );
      // Sin `bookmarks`, `rate`, `heardSections` ni `voiceName`: los rellena `complete()`.
      transaction.objectStore('library').put(
        { id, name: 'viejo.pdf', language: 'es', totalSentences: 1, addedAt: 1, blockIndex: 0, sentenceIndex: 0, position: 0, updatedAt: 1 },
        id,
      );
      transaction.oncomplete = () => {
        open.result.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });

const storedPosition = () =>
  new Promise((resolve, reject) => {
    // Sin número de versión: abre la que haya. Fijarlo caduca cada vez que sube el esquema.
    const open = indexedDB.open('lecturame');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const get = open.result.transaction('library', 'readonly').objectStore('library').getAll();
      get.onsuccess = () => resolve(get.result[0] && get.result[0].position);
      get.onerror = () => reject(get.error);
    };
  });

(async () => {
  // Sin el primer flag, headless bloquea audio.play() sin gesto del usuario (la voz de IA).
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
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

  const inText = await page.locator('.reader mark.hit').allInnerTexts();
  check(
    'resalta las coincidencias también en el texto principal',
    inText.length === (await page.locator('.result').count()) && inText.every((text) => /^atenci[óo]n$/i.test(text)),
    `${inText.length} en el texto · ${inText.join(' | ')}`,
  );

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
  check('y el texto se queda sin resaltados de búsqueda', (await page.locator('.reader mark.hit').count()) === 0);

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

  // --- PDF original --------------------------------------------------------
  await page.setViewportSize({ width: 1280, height: 900 });
  const readingPage = Number(/pág\. (\d+)/.exec(await page.locator('.status').innerText())[1]);
  await page.click('button[aria-label*="PDF original"]');
  await page.waitForSelector('.pdf-pane', { timeout: 5000 });
  const frameSrc = await page.locator('.pdf-frame').getAttribute('src');
  check(
    'el panel abre el original por la página que se está leyendo',
    frameSrc !== null && frameSrc.startsWith('blob:') && frameSrc.endsWith(`#page=${readingPage}`),
    `${frameSrc} (se lee la pág. ${readingPage})`,
  );
  check('abrir el PDF recoge la barra lateral, que se reparten el hueco', !(await page.locator('.sidebar').isVisible()));

  // Cambiar de página ofrece llevar el visor allí, en vez de recargarlo por su cuenta.
  // Con el panel abierto el índice está recogido, así que se retrocede por bloques con el teclado.
  const shownPage = () => page.locator('.status').innerText().then((text) => Number(/pág\. (\d+)/.exec(text)[1]));
  let firstPage = readingPage;
  for (let i = 0; i < 25 && firstPage === readingPage; i++) {
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(80);
    firstPage = await shownPage();
  }
  const syncButton = page.locator('.pdf-bar button', { hasText: 'ir a la pág.' });
  check(
    'al cambiar de página ofrece llevar el visor a la que se lee',
    firstPage !== readingPage && (await syncButton.count()) === 1,
    await page.locator('.pdf-bar').innerText().then((text) => text.replace(/\n/g, ' · ')),
  );
  await syncButton.click();
  await page.waitForTimeout(150);
  check(
    'y al pulsarlo el visor cambia de página',
    (await page.locator('.pdf-frame').getAttribute('src')).endsWith(`#page=${firstPage}`) && (await syncButton.count()) === 0,
  );

  await page.click('button[aria-label="Cerrar el PDF original"]');
  await page.waitForTimeout(150);
  check('se cierra y suelta el visor', (await page.locator('.pdf-pane').count()) === 0);

  // --- Barra lateral en pantalla estrecha ----------------------------------
  // Con el lector ya montado a 900 px: es al abrirlo cuando se decide si cabe.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.reload();
  await page.waitForSelector('.doc');
  await page.locator('.doc').first().click();
  await page.waitForSelector('article.reader');
  await page.waitForTimeout(200);
  check('en pantalla estrecha la barra lateral empieza recogida', !(await page.locator('.sidebar').isVisible()));

  const readerWidth = () => page.locator('article.reader').evaluate((el) => el.getBoundingClientRect().width);
  const widthAlone = await readerWidth();
  await page.click('button[aria-label*="marcadores"]');
  await page.waitForTimeout(200);
  check('el botón la trae de vuelta', await page.locator('.sidebar').isVisible());
  check('y se superpone en vez de estrujar el texto', (await readerWidth()) === widthAlone, `${widthAlone} → ${await readerWidth()}`);

  await page.click('button[aria-label*="marcadores"]');
  await page.waitForTimeout(150);
  check('el mismo botón la recoge', !(await page.locator('.sidebar').isVisible()));

  await page.keyboard.press('/');
  await page.waitForTimeout(200);
  check(
    'la tecla / la abre y enfoca el buscador aunque estuviera recogida',
    await page.evaluate(() => document.activeElement?.className.includes('search-input')),
  );

  await page.locator('.search-input').blur();
  await page.locator('.outline-item').first().click();
  await page.waitForTimeout(200);
  check('saltar a una sección la recoge para dejar ver el texto', !(await page.locator('.sidebar').isVisible()));

  // --- Tablas: se ven, pero no se recitan ----------------------------------
  const tablesContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await tablesContext.addInitScript(fakeSpeech);
  const tablesPage = await tablesContext.newPage();
  tablesPage.on('pageerror', (error) => problems.push(`pageerror (tablas): ${error.message}`));
  await tablesPage.goto(URL);
  await tablesPage.setInputFiles('input[type=file]', TABLES_PDF);
  await tablesPage.waitForSelector('article.reader', { timeout: 30000 });

  const tableBlock = tablesPage.locator('.reader .table');
  check('la tabla se reconoce como tal', (await tableBlock.count()) === 1);
  check(
    'y sus renglones siguen a la vista, para poder leerlos',
    (await tableBlock.locator('.not-spoken').innerText()).split('\n').length === 4,
    (await tableBlock.locator('.not-spoken').innerText()).replace(/\n/g, ' | '),
  );
  check(
    'la fórmula también se reconoce, y se queda a la vista',
    (await tablesPage.locator('.reader .formula').count()) === 1 &&
      (await tablesPage.locator('.reader .formula .not-spoken').innerText()).startsWith('R = e'),
    await tablesPage.locator('.reader .formula .not-spoken').innerText(),
  );

  // Lo que suena al llegar a la tabla: el anuncio, no las celdas.
  await tablesPage.locator('.reader .table .sentence').first().click();
  await tablesPage.waitForTimeout(250);
  const spokenTable = await tablesPage.evaluate(() => window.__spoken.map((utterance) => utterance.text));
  check(
    'la voz la anuncia en vez de recitar las celdas',
    /^Tabla de 4 filas, en la página \d+ del original\.$/.test(spokenTable[0] ?? ''),
    spokenTable[0] ?? 'no leyó nada',
  );
  check(
    'y no pronuncia ninguna celda',
    !spokenTable.some((text) => text.includes('Fundamentos') || text.includes('250')),
    spokenTable.join(' | ').slice(0, 80),
  );
  check(
    'la llamada de nota al pie no se lee como un número suelto',
    !(await tablesPage.locator('.reader').innerText()).includes('lectivas exige. 1'),
  );

  // En pausa y midiendo el primero nuevo: la voz venía leyendo desde la tabla, y tanto la frase
  // que avanza sola como la que sigue al aviso —que es corto— se colarían en la medición.
  if (await tablesPage.locator('button[aria-label^="Pausar"]').count()) {
    await tablesPage.click('button[aria-label^="Pausar"]');
  }
  await tablesPage.waitForTimeout(150);
  const spokenBeforeFormula = (await tablesPage.evaluate(() => window.__spoken)).length;
  await tablesPage.locator('.reader .formula .sentence').first().click();
  await tablesPage.waitForTimeout(250);
  const afterFormula = (await tablesPage.evaluate(() => window.__spoken))[spokenBeforeFormula];
  check(
    'la fórmula se anuncia en vez de deletrear los símbolos',
    afterFormula !== undefined && /^Fórmula, en la página \d+ del original\.$/.test(afterFormula.text),
    afterFormula ? afterFormula.text : 'no leyó nada',
  );
  await tablesContext.close();

  // --- Subida de la base de datos ------------------------------------------
  // Una biblioteca guardada por la versión anterior (sin el almacén de originales) no puede
  // perderse al abrirla con esta. Se siembra en una pestaña aparte, con la aplicación sin cargar.
  const oldContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const oldPage = await oldContext.newPage();
  oldPage.on('pageerror', (error) => problems.push(`pageerror (base vieja): ${error.message}`));
  await oldPage.route('**/__sin_aplicacion', (route) => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await oldPage.goto(`${URL}__sin_aplicacion`);
  await oldPage.evaluate(seedVersion1);
  await oldPage.goto(URL);

  await oldPage.waitForSelector('.doc', { timeout: 10000 });
  check(
    'una biblioteca de la versión anterior sigue ahí tras subir la base',
    (await oldPage.locator('.doc').innerText()).includes('viejo.pdf'),
    (await oldPage.locator('.doc').innerText()).replace(/\n/g, ' · '),
  );

  await oldPage.locator('.doc').first().click();
  await oldPage.waitForSelector('article.reader');
  await oldPage.click('button[aria-label*="PDF original"]');
  await oldPage.waitForSelector('.pdf-pane');
  check(
    'y de un documento sin original guardado lo explica, en vez de romperse',
    (await oldPage.locator('.pdf-note').innerText()).includes('Vuelve a subirlo') &&
      (await oldPage.locator('.pdf-frame').count()) === 0,
  );
  await oldContext.close();

  // --- Voz de IA remota (Kokoro vía OpenRouter, con la red falseada) --------
  const aiContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await aiContext.addInitScript(fakeSpeech);
  await aiContext.addInitScript(fakeOpenRouter);
  const aiPage = await aiContext.newPage();
  aiPage.on('pageerror', (error) => problems.push(`pageerror (voz IA): ${error.message}`));
  await aiPage.goto(URL);
  await aiPage.evaluate(() => localStorage.setItem('lecturame:openrouter-key', 'clave-de-prueba'));
  await aiPage.setInputFiles('input[type=file]', PDF);
  await aiPage.waitForSelector('article.reader', { timeout: 30000 });
  await aiPage.selectOption('select.voice', 'openrouter:ef_dora');

  // La frase se apunta ANTES de pulsar ▶: el audio dura 0,25 s y el resaltado no espera.
  const aiFirst = (await aiPage.locator('.sentence.active').first().innerText()).trim();
  await aiPage.click('button[aria-label^="Reproducir"]');
  await aiPage.waitForFunction(() => window.__tts.length >= 2, null, { timeout: 10000 });
  const aiSpoken = await aiPage.evaluate(() => window.__tts);
  check('la voz de IA pide a OpenRouter exactamente la frase resaltada', (aiSpoken[0] ?? '').trim() === aiFirst, aiSpoken[0]);
  const aiAdvanced = await aiPage
    .waitForFunction((first) => document.querySelector('.sentence.active')?.textContent?.trim() !== first, aiFirst, { timeout: 10000 })
    .then(() => true, () => false);
  check('el resaltado avanza cuando termina el audio', aiAdvanced);

  // La red falla: pausa y aviso. Avanzar en silencio sería perder contenido sin que se note.
  await aiPage.evaluate(() => {
    window.__ttsFail = true;
  });
  await aiPage.waitForSelector('.status.notice', { timeout: 10000 });
  const aiStuck = (await aiPage.locator('.sentence.active').first().innerText()).trim();
  await aiPage.waitForTimeout(600);
  check(
    'si la red falla, pausa y avisa en vez de saltarse la frase',
    (await aiPage.locator('.sentence.active').first().innerText()).trim() === aiStuck &&
      (await aiPage.locator('button[aria-label^="Reproducir"]').count()) === 1,
    await aiPage.locator('.status.notice').innerText(),
  );
  await aiContext.close();

  check('sin errores de consola ni excepciones', problems.length === 0, problems.slice(0, 5).join(' || '));

  await browser.close();

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error('ERROR EN EL SCRIPT:', error);
  process.exit(2);
});
