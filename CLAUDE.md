# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Lecturame convierte un PDF en una experiencia de lectura auditiva. Todo ocurre en el navegador:
no hay backend, ni cuentas, ni claves de API. Para el uso y los atajos, ver @README.md.

## Comandos

- `npm test` — tests unitarios (Vitest). Uno suelto: `npx vitest run src/core/search.test.ts`.
- `npm run e2e` — comprobaciones en navegador. **Necesita el servidor de desarrollo levantado**
  (`npm run dev`) y Playwright instalado de forma **global**, no como dependencia del proyecto:

  ```powershell
  $env:NODE_PATH = (npm root -g); npm run e2e
  ```

## Restricción de versiones

El Node de esta máquina es la 18. Las dependencias están fijadas a **Vite 5, pdfjs-dist 4 y
Vitest 2 porque son las últimas que soportan Node 18**. No subas a Vite 6+, pdfjs 5+ o Vitest 3+
sin comprobar antes la versión de Node: dejan de arrancar.

## Decisiones que no conviene deshacer

- **Una frase = una `SpeechSynthesisUtterance`** (`src/core/tts.ts`). Es lo que mantiene el
  resaltado sincronizado sin depender de los eventos `onboundary`, que no son fiables en todas
  las voces, y lo que esquiva el corte a los ~15 s de Chromium. Agrupar frases en una locución
  larga rompe la sincronización al cambiar de velocidad o saltar de bloque.
- **Las escrituras a IndexedDB van por una cola y las lecturas esperan a lo pendiente**
  (`src/core/storage.ts`), y el `get`+`put` de una ficha ocurre en la misma transacción. Volver a
  abrir una conexión por operación reintroduce la carrera que hacía que un guardado antiguo se
  confirmara el último y borrara el progreso.
- **El desplazamiento solo se anima en saltos cortos**
  (`src/app/components/ReaderView.tsx`). Con `behavior: 'smooth'` siempre, reabrir un documento
  largo tarda segundos recorriendo decenas de miles de píxeles.

## Extracción de PDF

`src/core/pdf/layout.ts` es lógica pura, sin pdf.js: agrupa items en líneas, líneas en párrafos,
y detecta títulos y listas por posición y tamaño de fuente. Es la parte con más heurísticas y la
que más fácil se rompe.

Al tocarla, comprueba contra los PDFs reales de `src/core/pdf/__fixtures__/`
(`layout.fixture.test.ts`), no solo contra fixtures sintéticos. Para añadir o regenerar uno, se
imprime un HTML con Edge (usa siempre una carpeta de perfil nueva, si no falla en silencio):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu `
  "--user-data-dir=<carpeta temporal nueva>" --no-pdf-header-footer `
  "--print-to-pdf=<destino>.pdf" "file:///<ruta>/fixture.html"
```

## Comprobaciones en navegador

Chromium headless no trae voces de síntesis, así que `e2e/verify.cjs` sustituye
`speechSynthesis` por un motor falso que respeta la API real. La calidad del audio no se puede
verificar automáticamente; la sincronización, los atajos y la persistencia sí.

Al escribir comprobaciones, **no midas el estado tras una espera fija**: la voz avanza sola y la
frase resaltada cambia bajo los pies. Comprueba qué se pronuncia después de cada acción
(`window.__spoken`), que no depende de los tiempos, o pausa la reproducción antes de medir.

## Antes de dar algo por terminado

`npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run e2e` en verde. La skill `/verify` los
encadena.
