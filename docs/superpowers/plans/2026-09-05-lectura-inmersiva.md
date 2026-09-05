# Lectura inmersiva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En táctil, mientras la lectura suena y nadie toca la pantalla, la cabecera y el reproductor se esconden y el texto ocupa toda la pantalla.

**Architecture:** Un hook `useImmersive` en `Reader.tsx` decide `hidden` con un temporizador de 4 s que cualquier interacción rearma; una clase `immersive` en `.screen.reading` y ~15 líneas de CSS deslizan las barras fuera. Con las barras ocultas, el primer toque las revela y se traga (no salta la lectura). Una comprobación en `e2e/mobile.cjs` lo vigila.

**Tech Stack:** React 18, CSS, Playwright (global) para el e2e.

Spec: `docs/superpowers/specs/2026-09-05-lectura-inmersiva-design.md`.

## Global Constraints

- Solo en táctil: `window.matchMedia('(hover: none)').matches`. Escritorio no cambia.
- Solo con `state.status === 'playing'` y la barra lateral cerrada (`sidebar === false`).
- Retardo: **4000 ms** sin interacción.
- El primer toque con las barras ocultas **solo revela**: no debe disparar `onJump`, ni ningún otro `onClick` bajo el dedo.
- No tocar el reducer (`playerReducer.ts`) ni el almacenamiento.
- Regla e2e de `CLAUDE.md`: esperar al estado con `waitForSelector`/`waitForFunction`, nunca medir tras una espera fija —con una excepción explícita en el caso negativo, donde se comprueba una ausencia estable—.
- Playwright global: `export NODE_PATH="$(npm root -g)"`. Servidor de desarrollo en `http://localhost:5201/` (`LECTURAME_URL`); preview en `http://localhost:4201/` (`LECTURAME_PREVIEW_URL`).
- Commits en español con cuerpo que explique el porqué, terminados en:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013qorTXvwMbWAu116ZfsGR3
  ```
- Antes de dar por terminado: `npm run verify` y `npm run e2e` en verde.

---

## File Structure

| Fichero | Responsabilidad |
|---|---|
| `src/app/components/Reader.tsx` (modificar) | Hook `useImmersive`; clase `immersive` y manejadores en `div.screen.reading`. |
| `src/styles.css` (modificar) | Transición y estado oculto de `.bar` y `.controls` dentro de `.screen.reading`. |
| `e2e/mobile.cjs` (modificar) | Tres comprobaciones nuevas en `mobile()`. |
| `CLAUDE.md`, `README.md` (modificar) | Decisión y una frase de uso. |

---

### Task 1: Hook, clase y CSS

**Files:**
- Modify: `src/app/components/Reader.tsx` (imports línea 1; nuevo hook tras `useKeyboard`, ~línea 84; estado y JSX en `Reader`, líneas 119-165)
- Modify: `src/styles.css` (`.bar` línea 86; `.controls` línea 842; nuevo bloque tras `.screen.reading`, línea 395)

**Interfaces:**
- Produces: la clase `immersive` en `div.screen.reading` cuando las barras están ocultas. Task 2 la usa como señal.

- [ ] **Step 1: El hook**

En `Reader.tsx`, justo después de la función `useKeyboard` (antes de `export function Reader`):

```ts
/** Sin tocar la pantalla durante este tiempo, con la voz sonando, las barras se esconden. */
const IMMERSIVE_DELAY = 4000;

/**
 * Lectura inmersiva, solo en táctil: mientras suena y nadie toca, cabecera y reproductor se
 * esconden. Devuelve si están ocultas y `wake`, que las muestra y rearma el temporizador.
 */
function useImmersive(active: boolean): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const wake = useCallback(() => {
    setHidden(false);
    window.clearTimeout(timer.current);
    if (active) timer.current = window.setTimeout(() => setHidden(true), IMMERSIVE_DELAY);
  }, [active]);

  useEffect(() => {
    wake();
    // Cualquier tecla cuenta como interacción; al volver a la pestaña, las barras están.
    window.addEventListener('keydown', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener('keydown', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [wake]);

  return [hidden, wake];
}
```

`useCallback`, `useEffect`, `useRef` y `useState` ya están importados en la línea 1.

- [ ] **Step 2: Usarlo en `Reader`**

Tras la línea `const [pdf, setPdf] = useState(false);` (línea 120):

```ts
  // Solo en táctil: en escritorio hay sitio de sobra y las barras no molestan.
  const touch = useMemo(() => window.matchMedia('(hover: none)').matches, []);
  const [immersive, wake] = useImmersive(touch && state.status === 'playing' && !sidebar);
```

Y el `div` raíz (línea 165) pasa a:

```tsx
    <div
      className={immersive ? 'screen reading immersive' : 'screen reading'}
      // Con las barras ocultas, el primer toque solo las trae: se corta en captura para que no
      // llegue al onJump de la frase (si no, cada intento de pausar movería la lectura).
      // pointerdown llega ANTES que click: si revelara ya aquí, el click vería las barras
      // visibles y saltaría. Por eso pointerdown solo rearma cuando ya están a la vista.
      onClickCapture={(event) => {
        if (!immersive) return;
        event.stopPropagation();
        wake();
      }}
      onPointerDown={() => {
        if (!immersive) wake();
      }}
      onScrollCapture={wake}
    >
```

`onScrollCapture` en el contenedor recoge el scroll de `.reader` (el evento no burbujea, pero sí captura), sin tocar `ReaderView`.

- [ ] **Step 3: CSS**

En `styles.css`, tras el bloque `.screen.reading { … }` (línea 395):

```css
/* Lectura inmersiva (táctil): con la voz sonando y sin tocar, cabecera y reproductor se van.
   Es un reflow (el texto gana su sitio), suavizado con la transición de max-height. */
.screen.reading .bar,
.screen.reading .controls {
  max-height: 8rem;
  overflow: hidden;
  transition: max-height 0.25s ease, transform 0.25s ease, padding 0.25s ease;
}

.screen.reading.immersive .bar,
.screen.reading.immersive .controls {
  max-height: 0;
  padding-block: 0;
  border-width: 0;
}

.screen.reading.immersive .bar {
  transform: translateY(-100%);
}

.screen.reading.immersive .controls {
  transform: translateY(100%);
}
```

Si `.controls` no lleva `padding` propio (lo lleva `.controls-row`), `padding-block: 0` no hace daño; el `max-height: 0` + `overflow: hidden` es lo que la pliega.

- [ ] **Step 4: Comprobar a mano en el navegador**

Run: `npm run verify` → verde (lint, tests, typecheck, build).
Run (Bash): abrir con Playwright en emulación táctil una sesión rápida contra `http://localhost:5201/`:

```js
// scratchpad/immersive-smoke.cjs — solo para mirar; no se versiona
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  await page.addInitScript(() => { window.__spoken = []; Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [{ name: 'x', lang: 'es-ES', localService: true, default: true, voiceURI: 'x' }], addEventListener() {}, removeEventListener() {}, paused: false, speaking: false, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend({}), 400); }, cancel() {}, pause() {}, resume() {} } }); window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } }; });
  await page.goto(process.env.LECTURAME_URL || 'http://localhost:5201/');
  await page.setInputFiles('input[type=file]', 'src/core/pdf/__fixtures__/sample.pdf');
  await page.waitForSelector('.screen.reading');
  await page.tap('.controls .primary');
  await page.screenshot({ path: 'e2e/screenshots/immersive-before.png' });
  await page.waitForSelector('.screen.immersive', { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/screenshots/immersive-after.png' });
  await browser.close();
})();
```

Run: `export NODE_PATH="$(npm root -g)"; node <scratchpad>/immersive-smoke.cjs` y abrir las dos capturas con la herramienta Read.
Expected: en `before` se ven cabecera y controles; en `after` solo texto, de borde a borde, sin restos de barra ni huecos.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/Reader.tsx src/styles.css
git commit -F - <<'EOF'
Lectura inmersiva en móvil: sin tocar la pantalla, las barras se esconden

En el iPhone la cabecera y el reproductor se llevaban un tercio de la
pantalla, y quien escucha sin tocar no los necesita. Tras 4 s sin
interacción, con la voz sonando y la barra lateral cerrada, se van;
solo en táctil, que en escritorio sobra sitio.

El primer toque con las barras ocultas solo las trae y se corta en
captura: un toque sobre una frase salta a ella, y si el mismo gesto
con que uno va a pausar saltara, cada pausa movería la lectura.
pointerdown llega antes que click, así que no puede ser él quien
revele: revelaría, y el click ya vería las barras visibles y saltaría.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013qorTXvwMbWAu116ZfsGR3
EOF
```

---

### Task 2: Comprobación e2e

**Files:**
- Modify: `e2e/mobile.cjs` (entre la línea 131 `check('y detrás llega la frase de verdad', …)` y la 132 `await page.tap('.controls .primary'); // pausa`)

**Interfaces:**
- Consumes: la clase `immersive` de Task 1; el fake `speechSynthesis` de `mobile.cjs` (la voz avanza sola, así que el estado sigue `playing`).

- [ ] **Step 1: Insertar las comprobaciones**

Justo antes de `await page.tap('.controls .primary'); // pausa: que no siga avanzando bajo los pies`:

```js
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
```

- [ ] **Step 2: Verla fallar donde debe, y luego pasar**

Primero con Task 1 en su sitio:
Run (Bash): `export NODE_PATH="$(npm root -g)" LECTURAME_URL="http://localhost:5201/"; node e2e/mobile.cjs 2>&1 | grep -E 'inmersiv|esconden|trae|salta|quedan|comprobaciones'`
Expected: los cinco PASS nuevos y `26/26 comprobaciones móviles y de sincronización OK` (eran 21).

Después, para confirmar que la comprobación del toque mide de verdad el «se traga»: en `Reader.tsx` comenta **temporalmente** la línea `event.stopPropagation();`, relanza.
Expected: FAIL en «y no salta la lectura a la frase tocada», PASS en el resto. Restaura la línea (`git diff --exit-code src/app/components/Reader.tsx` silencioso) y relanza: 26/26.

- [ ] **Step 3: Suite completa y commit**

Run (Bash): `export NODE_PATH="$(npm root -g)" LECTURAME_URL="http://localhost:5201/" LECTURAME_PREVIEW_URL="http://localhost:4201/"; npm run e2e; echo "exit: $?"`
Expected: `82/82`, `26/26`, `6/6`, exit 0.

```bash
git add e2e/mobile.cjs
git commit -F - <<'EOF'
La lectura inmersiva se vigila en el e2e móvil: se esconde, el toque no salta, la lateral la frena

Tres cosas que podrían romperse en silencio: que las barras se vayan
solas con la voz sonando, que el primer toque las traiga sin mover la
lectura (se vio fallar quitando el stopPropagation), y que con la barra
lateral abierta se queden. El toque va por coordenadas a una frase ya
visible: si Playwright tuviera que hacer scroll, el scroll revelaría
las barras y el toque sí saltaría.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013qorTXvwMbWAu116ZfsGR3
EOF
```

---

### Task 3: Documentación y despliegue

**Files:**
- Modify: `CLAUDE.md` (final de «Decisiones que no conviene deshacer», antes de `## Extracción de PDF`)
- Modify: `README.md` (sección `## Mientras escuchas`, línea 95, al final de su primer párrafo)

- [ ] **Step 1: CLAUDE.md**

Añadir al final de la lista de decisiones:

```markdown
- **Con las barras escondidas, el primer toque solo las trae; no salta la lectura**
  (`useImmersive` en `Reader.tsx`). En táctil, con la voz sonando y 4 s sin tocar, cabecera y
  reproductor se esconden. Un toque sobre una frase salta a ella, y ese mismo gesto es el que
  uno hace para pausar o ver por dónde va: si además saltara, cada pausa movería la lectura.
  Por eso el `onClickCapture` del marco corta la propagación cuando están ocultas. Y no puede
  ser `pointerdown` quien revele —llega antes que `click`, y el `click` ya vería las barras
  visibles y saltaría—: `pointerdown` solo rearma el temporizador cuando ya se ven. Solo en
  táctil (`hover: none`), que en escritorio sobra sitio; y no mientras la barra lateral esté
  abierta, que ahí se está usando la pantalla.
```

- [ ] **Step 2: README.md**

Al final del primer párrafo de «Mientras escuchas» (tras «…no hay que volver a ajustarla en cada sesión.»):

```markdown
En el móvil, si pasan unos segundos sin tocar la pantalla mientras suena, la cabecera y los
controles se esconden y el texto ocupa toda la pantalla; un toque en cualquier sitio los trae de
vuelta sin mover la lectura.
```

- [ ] **Step 3: Verificación, commit y despliegue**

Run: `npm run verify` → verde. `npm run e2e` (con los dos servidores) → `82/82`, `26/26`, `6/6`.

```bash
git add CLAUDE.md README.md
git commit -F - <<'EOF'
Documentar la lectura inmersiva: por qué el primer toque no salta

La decisión —revelar en captura y no en pointerdown— no se deduce
leyendo el código sin saber que un toque sobre una frase salta a ella;
queda en CLAUDE.md. El README lo cuenta en una frase donde el usuario
lo busca: «Mientras escuchas».

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013qorTXvwMbWAu116ZfsGR3
EOF
vercel --prod --yes
```

Expected: `status Ready` en `vercel inspect <url>`; probar en el iPhone: dar al play, esperar 4 s sin tocar, comprobar que las barras se van; tocar el texto: vuelven y la lectura no salta.
