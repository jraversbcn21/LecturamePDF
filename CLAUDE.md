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
- **El PDF original se enseña con el visor del navegador, en un `<iframe>`**
  (`src/app/components/PdfPane.tsx`). Trae zoom, desplazamiento, búsqueda y miniaturas sin
  escribirlos. De los parámetros de apertura, **Chromium solo respeta `#page`**: `pagemode` y
  `view` se ignoran (comprobado), así que no hay forma de cerrar sus miniaturas ni de encajar la
  página, y por eso el panel se abre ancho. Cambiar `#page` recarga el visor y con él se van el
  zoom y la posición, de ahí que la página solo se mueva cuando se pulsa «ir a la pág. N».
- **Los campos nuevos de `LibraryEntry` se normalizan al leer** (`complete()` en
  `src/core/storage.ts`). Hay documentos guardados de versiones anteriores; añadir un campo sin
  darle valor por defecto ahí rompe los datos que el usuario ya tiene. Lo mismo con los almacenes:
  uno nuevo obliga a subir la versión de la base, y `onupgradeneeded` **crea solo lo que falte**,
  para que sirva igual a una base recién hecha que a una vieja. Hay una comprobación de navegador
  que siembra una base de la versión anterior y confirma que la biblioteca sobrevive.
- **De una tabla o una fórmula se da un aviso; no se recitan** (`layout.ts` y `extract.ts`). Al
  ajustar esas heurísticas, ten presente que **el riesgo no es simétrico**: dar por tabla o por
  fórmula algo que era prosa deja un párrafo mudo, y quien escucha no se entera de que ha perdido
  contenido; leer mal una fórmula solo suena raro un momento. Por eso `looksLikeFormula` exige tres
  señales a la vez y la tabla se reconoce por columnas alineadas y no por el tamaño del hueco, que
  también lo produce una sangría. Ante la duda, prosa.

## Extracción de PDF

`src/core/pdf/layout.ts` es lógica pura, sin pdf.js: agrupa items en líneas, líneas en bloques, y
distingue títulos, listas, tablas y fórmulas por posición, tamaño de fuente y alineación. Es la
parte con más heurísticas y la que más fácil se rompe.

Dos reglas de esas heurísticas que no se ven leyendo el código:

- **Los umbrales verticales se calibran con el propio documento, no con una constante.** Un bloque
  se cierra cuando el hueco crece respecto al de sus propias líneas, porque la separación entre
  bloques cambia con cada maqueta: con un umbral global fijo, una maqueta apretada no lo alcanza
  nunca y el texto se pega. Bajar la constante en vez de comparar contra el grupo separa mal en
  otras maquetas.
- **Un fragmento se compara con el mayor de los dos, no con el suyo.** Un número en volado es
  pequeño y va alto; medido contra su propio cuerpo nunca alcanza la línea a la que pertenece, y
  partía el párrafo en tres a su alrededor.

Al tocarla, comprueba contra los PDFs reales de `src/core/pdf/__fixtures__/`
(`layout.fixture.test.ts`), no solo contra fixtures sintéticos. Cada uno guarda un caso: `sample`
títulos y párrafos, `lists` listas sangradas, `lists-flush` listas al margen del cuerpo, y `tables`
tablas, fórmulas, llamadas y notas al pie. Para añadir o regenerar uno, se imprime un HTML con
Edge (usa siempre una carpeta de perfil nueva, si no falla en silencio):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu `
  "--user-data-dir=<carpeta temporal nueva>" --no-pdf-header-footer `
  "--print-to-pdf=<destino>.pdf" "file:///<ruta>/fixture.html"
```

## Comprobaciones en navegador

Playwright es **global**, no dependencia del proyecto (el resto de requisitos, en @README.md). Sin
el `NODE_PATH` no encuentra el módulo:

```powershell
$env:NODE_PATH = (npm root -g); npm run e2e
```

Al escribir comprobaciones, **no midas el estado tras una espera fija**: la voz avanza sola y la
frase resaltada cambia bajo los pies. Mira qué se pronuncia justo después de cada acción —el
primero **nuevo** de `window.__spoken`, no el último, que ya puede ser el siguiente— o pausa antes
de medir. Casi todos los rojos de esta suite han salido de la comprobación, no del código, y este
es el motivo en la mayoría.

Si una comprobación abre IndexedDB, **no le fijes el número de versión**: `indexedDB.open('lecturame')`
abre la que haya. Fijarla caduca en cuanto sube el esquema, y además cuelga la comprobación en vez
de fallar.

## Convenciones del repositorio

Commits en español, con un cuerpo que explique **por qué** se hizo el cambio, no solo qué se
tocó. Las decisiones de fondo acaban en este fichero; los atajos deliberados, en un comentario
`ponytail:` junto al código, nombrando el límite y por dónde se ampliaría.

## Antes de dar algo por terminado

`npm run verify` (lint, tests, typecheck y build) y `npm run e2e`, ambos en verde. La skill
`/verify` los encadena y levanta el servidor de desarrollo si hace falta.

## graphify

Hay un grafo de conocimiento del proyecto en `graphify-out/`: comunidades, nodos más conectados y
relaciones entre ficheros, cruzando el código con el porqué que está escrito aquí y en
@PENDIENTE.md. El mapa que sale de él se carga al empezar sesión, en @graphify-out/GRAPH_REPORT.md,
y con eso el contexto ya está completo sin abrir nada más. Si ese fichero falta es que el grafo no
se ha construido en esta copia —no se versiona, es regenerable—: se rehace con `/graphify`.

Del mapa al detalle: el binario `graphify` no está en el PATH de esta máquina, solo el módulo.

- `python -m graphify query "<pregunta>"` para preguntas sobre el código; para relaciones,
  `python -m graphify path "<A>" "<B>"`; para un concepto suelto,
  `python -m graphify explain "<concepto>"`. Devuelven un subgrafo acotado, bastante más pequeño
  que rebuscar a mano.
- Con 39 ficheros de código, para la mayoría de preguntas abrir el fichero sigue siendo más rápido.
  Donde el grafo gana es en lo que no está en el código: por qué se decidió algo, y qué pendiente
  cuelga de qué heurística.
- Al reconstruirlo, **deja fuera `.claude/skills/graphify/`**: su propia documentación son diez
  ficheros que no hablan de este proyecto y ensucian el grafo.
- **`python -m graphify update .` no vale para mantenerlo al día**: rehace solo el AST, pero al
  hacerlo renombra las comunidades con nombres de fichero y vuelve a tragarse la documentación de
  graphify. Deja un respaldo en `graphify-out/<fecha>/`; si se lanza por error, se restaura de ahí.
  Para actualizarlo de verdad, rehacerlo entero con `/graphify`, y solo cuando cambie la forma del
  proyecto, no cada vez que se toque una función.
