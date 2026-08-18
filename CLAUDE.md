# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Aplicación web 100% cliente que convierte un PDF en una experiencia de lectura auditiva. El uso,
los atajos, cómo funciona por dentro y las limitaciones conocidas están en @README.md; aquí solo
va lo que no se deduce leyendo el código. El trabajo pendiente, en @PENDIENTE.md.

## Restricción de versiones

El Node de esta máquina es la 18. Las dependencias están fijadas a **Vite 5, pdfjs-dist 4 y
Vitest 2 porque son las últimas que lo soportan**. No subas a Vite 6+, pdfjs 5+ o Vitest 3+ sin
comprobar antes la versión de Node: dejan de arrancar.

## Decisiones que no conviene deshacer

- **Una frase = una `SpeechSynthesisUtterance`** (`src/core/tts.ts`). Mantiene el resaltado
  sincronizado sin depender de los eventos `onboundary`, que no son fiables en todas las voces, y
  esquiva el corte a los ~15 s de Chromium. Agrupar frases en una locución larga rompe la
  sincronización al cambiar de velocidad o saltar de bloque.
- **Las escrituras a IndexedDB van por una cola y las lecturas esperan a lo pendiente**
  (`src/core/storage.ts`), y el `get`+`put` de una ficha ocurre en la misma transacción. Volver a
  abrir una conexión por operación reintroduce la carrera que hacía que un guardado antiguo se
  confirmara el último y borrara el progreso.
- **El desplazamiento solo se anima en saltos cortos** (`src/app/components/ReaderView.tsx`). Con
  `behavior: 'smooth'` siempre, reabrir un documento largo tarda segundos recorriendo decenas de
  miles de píxeles.
- **Los campos nuevos de `LibraryEntry` se normalizan al leer** (`complete()` en
  `src/core/storage.ts`). Hay documentos guardados de versiones anteriores; añadir un campo sin
  darle valor por defecto ahí rompe los datos que el usuario ya tiene.

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

`npm run e2e` necesita el servidor de desarrollo levantado y Playwright **global**, no como
dependencia del proyecto. Si falta el `NODE_PATH`, no encuentra el módulo:

```powershell
$env:NODE_PATH = (npm root -g); npm run e2e
```

Al escribir comprobaciones, **no midas el estado tras una espera fija**: la voz avanza sola y la
frase resaltada cambia bajo los pies. Comprueba qué se pronuncia después de cada acción
(`window.__spoken`), que no depende de los tiempos, o pausa la reproducción antes de medir. Casi
todos los rojos de esta suite han salido de la comprobación, no del código.

## Convenciones del repositorio

Commits en español, con un cuerpo que explique **por qué** se hizo el cambio, no solo qué se
tocó. Las decisiones de fondo acaban en este fichero; los atajos deliberados, en un comentario
`ponytail:` junto al código, nombrando el límite y por dónde se ampliaría.

## Antes de dar algo por terminado

`npm run verify` (lint, tests, typecheck y build) y `npm run e2e`, ambos en verde. La skill
`/verify` los encadena y levanta el servidor de desarrollo si hace falta.
