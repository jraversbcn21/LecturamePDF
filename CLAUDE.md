# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Aplicación web 100% cliente que convierte un PDF en una experiencia de lectura auditiva. El uso,
los atajos, cómo funciona por dentro y las limitaciones conocidas están en @README.md; aquí solo
va lo que no se deduce leyendo el código. El trabajo pendiente, en @PENDIENTE.md, y el mapa
del grafo del proyecto, en @graphify-out/GRAPH_REPORT.md.

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
- **Los tres resaltados se eligen juntos, no por separado** (`src/styles.css`). La coincidencia de
  búsqueda cae **dentro** de la frase que suena, que ya va resaltada; si comparte familia de color
  con ella o con la palabra actual, deja de distinguirse. Por eso hay dos juegos completos, uno por
  modo: el ámbar de la voz no se lee sobre fondo oscuro, así que en «Tinta» la voz pasa al azul y
  la búsqueda al violeta. Tocar uno solo de los tres rompe la lectura de los otros dos.
- **La portada crece con el ancho de la ventana (`clamp()`), no con el zoom**
  (`src/styles.css`). Subir el zoom era la salida obvia en un monitor grande, pero agranda también
  la cabecera y la estantería, que no lo necesitan; con `clamp()` crece solo la presentación. Por
  lo mismo, la ficha de la estantería tiene un mínimo generoso (`minmax(min(26rem, 100%), 1fr)`):
  con más columnas, el nombre del PDF —que es largo— acaba en puntos suspensivos.
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
  que siembra una base de la versión anterior y confirma que la biblioteca sobrevive. El
  nombre de la base sigue siendo `lecturame` aunque el proyecto se llame LecturamePDF: no es
  un descuido, es que renombrarla dejaría huérfano lo que el usuario ya tiene guardado.
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

Un grafo del proyecto en `graphify-out/`, que cruza el código con el porqué escrito aquí y en el
pendiente. Su mapa se carga al empezar sesión y es lo único de esa carpeta que se versiona;
`graph.json` y `graph.html` no, que son regenerables y abultan. Para bajar del mapa al detalle,
`python -m graphify query "<pregunta>"`, y también `path "<A>" "<B>"` y `explain "<concepto>"`.

El motor (`graphifyy`, en Python) es **global**, no dependencia del proyecto, igual que Playwright:
la skill viaja en el repositorio, pero una copia recién clonada necesita `pip install graphifyy`
antes de que `/graphify` haga nada. El binario no está en el PATH de esta máquina, solo el módulo,
de ahí el `python -m`.

Con un proyecto de este tamaño, para casi cualquier pregunta abrir el fichero sigue siendo más
rápido; el grafo gana en lo que no está en el código —por qué se decidió algo, qué pendiente cuelga
de qué heurística—. Así que se rehace **entero**, con `/graphify`, cuando cambia la forma del
proyecto y no por costumbre. Dos trampas al rehacerlo: **deja fuera `.claude/skills/graphify/`**,
que son diez ficheros de documentación que no hablan de este proyecto, y **`update .` no sirve**
—rehace el AST, pero renombra las comunidades con nombres de fichero y vuelve a tragarse esa
documentación; deja un respaldo en `graphify-out/<fecha>/` del que se restaura—.
