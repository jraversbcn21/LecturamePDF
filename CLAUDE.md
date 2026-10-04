# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Aplicación web que convierte un PDF en una experiencia de lectura auditiva. La lectura entera
—extracción, voz, resaltado, progreso— ocurre **en el navegador**; lo único que hay de servidor
son las dos funciones de `api/`, que guardan la biblioteca en Vercel Blob para quien active la
sincronización entre dispositivos, y que la aplicación no necesita para funcionar. El uso, los
atajos, cómo funciona por dentro y las limitaciones conocidas están en @README.md; aquí solo va
lo que no se deduce leyendo el código. El trabajo pendiente, en @PENDIENTE.md, y el mapa del
grafo del proyecto, en @graphify-out/GRAPH_REPORT.md.

En `docs/superpowers/` hay diseños (`specs/`) y planes (`plans/`) de lo que ya se construyó.
Son **registro, no instrucciones**: describen trabajo terminado, así que no se ejecutan de
nuevo. Valen por lo que ni el código ni este fichero guardan —las alternativas que se
descartaron y por qué—, y llevan anotado lo que la implementación desmintió del plan.

## Restricción de versiones

La máquina tiene varios Node con nvm (18, 22.13, 22.23) y el activo hoy es el 22.13, pero el proyecto
se fijó contra la 18 y no se ha probado a subir nada. Las dependencias están fijadas a **Vite 5, pdfjs-dist 4,
Vitest 2 y vite-plugin-pwa 0.21 porque son las últimas que lo soportan** (la 1.x del plugin
arrastra `workbox-build` 7.4, que pide Node 20). No subas a Vite 6+, pdfjs 5+, Vitest 3+ o
vite-plugin-pwa 1+ sin comprobar antes la versión de Node: dejan de arrancar.

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
- **La voz de IA sigue la misma regla de oro: una frase = una petición TTS = un `Audio`**
  (`src/core/tts.ts`). El fin de frase es el `ended` del audio, un evento real, y el resaltado no
  se desincroniza. Tres decisiones dentro: `pickVoice` **jamás** elige la remota por sí sola
  (gasta red y saldo; solo suena elegida a mano); en error de red **se pausa y se avisa, no se
  avanza** —el mismo riesgo asimétrico de las tablas: saltarse una frase en silencio pierde
  contenido sin que el oyente se entere, mientras que en la rama local el `onerror` sí avanza
  porque ahí el riesgo es quedarse atascado—; antes de llegar a pausar, `fetchAudio` **reintenta 3
  veces** los fallos pasajeros (red, 429, 5xx; los 4xx de clave o saldo no), porque un solo hipo de
  OpenRouter pausaba la lectura a cada rato; y la cancelación va por un contador `generation`
  que también sube `pause()` cuando el fetch está en vuelo, para que un blob tardío no suene
  sobre lo que el usuario ya dejó atrás.
- **La sincronización fusiona por `updatedAt` y borra con tombstones** (`src/core/merge.ts`,
  `src/core/sync.ts`, `api/`). Un solo viaje hace las dos direcciones: el cliente empuja su
  biblioteca, el servidor fusiona ficha a ficha y devuelve el resultado. Cuatro decisiones dentro:
  el **texto extraído no se sube** —cada dispositivo re-extrae el PDF, que la extracción es
  determinista—; `deleteDoc` **no borra la ficha, la marca** (`deleted: true`), porque un borrado
  que desaparece no puede viajar y el documento resucitaría en la siguiente fusión; el
  `library.json` de Blob se escribe **con sufijo aleatorio nuevo cada vez** (y se borran los
  viejos), porque sobrescribir la misma URL sirve copias caducadas desde la caché del CDN y la
  fusión leería datos viejos; y los PDFs suben **directos del navegador a Blob** con token firmado
  por `api/file.ts`, porque el cuerpo de una función de Vercel capa en ~4,5 MB. Al aplicar lo que
  baja se compara `updatedAt` otra vez dentro de la transacción: entre el empuje y la respuesta el
  progreso local ya ha avanzado. Y una quinta, aprendida del despliegue real: el código de
  sincronización viaja en la cabecera **`x-sync-token`**, no en `Authorization`, porque Vercel
  consume esa última y la función la recibe vacía —el token correcto también daba 401; se
  demostró con un endpoint de diagnóstico contra producción—. Hacia OpenRouter sí se usa
  `Authorization`, que ese viaje no pasa por Vercel.
- **El recuadro de arrastrar no existe en táctil** (`src/styles.css`, `Library.tsx`). Con el dedo
  no se arrastra un archivo, así que allí solo prometía algo imposible y, peor, empujaba la
  estantería fuera de la pantalla —lo que un usuario que vuelve quiere ver primero—. Se oculta con
  `@media (hover: none)`, **por puntero y no por ancho**: una ventana estrecha de escritorio sí
  acepta el arrastre. Dos consecuencias que hay que respetar al tocarlo: el `<input type="file">`
  vive **fuera** del recuadro, porque es el único camino que queda y no puede irse con él; y el
  botón «Elegir PDF» **también lleva el estado «Extrayendo…»**, porque sin el recuadro sería el
  único aviso de que algo está pasando y la espera parecería un cuelgue.
- **El lector solo se mueve arriba y abajo, y son tres propiedades que van juntas**
  (`src/styles.css`). En el iPhone real un gesto en diagonal descolocaba el marco entero y la
  emulación no lo veía (mide el ancho de la página, no si un contenedor interno se puede panear).
  Las tres patas: `overflow-x: hidden` + `overflow-wrap` en `.reader` (una URL sin espacios del
  PDF lo volvía panneable), `position: fixed` en `.screen.reading` (a iOS el `overflow: hidden`
  no le impide arrastrar la página con el rebote elástico) y `touch-action: pan-y` (mata también
  el doble toque con zoom). Quitar cualquiera reabre un fallo que solo se ve en el dispositivo.
- **El desbloqueo de audio de iOS solo se registra en táctil** (`src/core/tts.ts`). iOS exige que
  la primera locución nazca de un gesto, y `speak()` llega siempre tras el `setTimeout` de
  Chromium; una locución vacía en el primer `pointerdown` lo resuelve. Se condiciona a
  `(hover: none)` porque en escritorio esa locución vacía se cuela en lo pronunciado y las
  comprobaciones e2e la ven, sin arreglar nada allí.
- **De una tabla o una fórmula se da un aviso; no se recitan** (`layout.ts` y `extract.ts`). Al
  ajustar esas heurísticas, ten presente que **el riesgo no es simétrico**: dar por tabla o por
  fórmula algo que era prosa deja un párrafo mudo, y quien escucha no se entera de que ha perdido
  contenido; leer mal una fórmula solo suena raro un momento. Por eso `looksLikeFormula` exige tres
  señales a la vez y la tabla se reconoce por columnas alineadas y no por el tamaño del hueco, que
  también lo produce una sangría. Ante la duda, prosa.
- **La PWA se actualiza en el siguiente arranque, y el precache lleva tres líneas que no son
  opcionales** (`vite.config.ts`). `registerType: 'prompt'` sin manejar `onNeedRefresh` hace que
  el worker nuevo espere a que se cierren todas las pestañas: se eligió a propósito frente a la
  recarga automática, que cortaría la voz a mitad de frase, y frente a un aviso, que es interfaz
  y estado de más. `mjs` va en `globPatterns` porque el worker de pdf.js sale con esa extensión
  y el patrón por defecto no lo incluye: sin él la app arranca sin red pero no extrae nada.
  `/api/` va en `navigateFallbackDenylist` para que una navegación a la API sin red falle en vez
  de recibir el `index.html`. Y `devOptions` queda apagado: bajo `vite dev` no hay service
  worker, así que las dos suites e2e de siempre no lo ven; lo comprueba la tercera, `pwa.cjs`,
  contra `vite preview`.
- **Con las barras escondidas, el primer toque solo las trae; no salta la lectura**
  (`useImmersive` en `Reader.tsx`). En táctil, con la voz sonando y 4 s sin tocar, cabecera y
  reproductor se esconden. Un toque sobre una frase salta a ella, y ese mismo gesto es el que
  uno hace para pausar o ver por dónde va: si además saltara, cada pausa movería la lectura.
  Por eso el `onClickCapture` del marco corta la propagación cuando están ocultas. Y no puede
  ser `pointerdown` quien revele —llega antes que `click`, y el `click` ya vería las barras
  visibles y saltaría—: `pointerdown` solo rearma el temporizador cuando ya se ven. El dedo
  desplazando el texto también las trae, pero se escucha **`touchmove`, no `scroll`**:
  `ReaderView` centra cada frase que suena con `scrollIntoView`, y ese scroll programático
  rearmaba el temporizador sin que nadie tocara nada; con `scroll` no se escondían nunca.
  Solo en táctil (`hover: none`), que en escritorio sobra sitio; y no mientras la barra
  lateral esté abierta, que ahí se está usando la pantalla.

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
el `NODE_PATH` no encuentra el módulo. Es global **por versión de Node** (con nvm cada una tiene su
`node_modules`): en el 22.13 está fijado a la **1.61.1**, porque la última pide un Chromium que
la red de esta máquina no deja descargar y la 1.61.1 usa los que ya hay en disco:

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

`npm run e2e` encadena tres ficheros: `verify.cjs`, la suite de escritorio; `mobile.cjs`,
emulación táctil más el cliente de sincronización; y `pwa.cjs`, que corta la red y necesita
**`vite preview` en el 4173** (o `LECTURAME_PREVIEW_URL`) sirviendo un `dist` recién construido,
porque bajo `vite dev` no hay service worker. Igual que el 5173, el 4173 puede estar ocupado por
otro proyecto del usuario: comprueba que el título servido es `LecturamePDF` antes de fiarte.

Dos cosas de `pwa.cjs` que engañan: el `<input type="file">` está oculto por diseño, así que se
espera con `state: 'attached'`, no a verlo; y en Chromium headless la petición del script del
Worker **se salta la emulación offline** de Playwright, así que «extraer sin red» pasa aunque el
`.mjs` no esté precacheado —por eso el precache se comprueba mirando las claves de la Cache
Storage, no por la extracción—.

Dos cosas del entorno que engañan al escribir en `mobile.cjs`: **Chromium headless no trae visor
de PDF**, así que navegar una pestaña a un `blob:` de PDF no la navega, la convierte en descarga
—el evento `download` es la señal de que la pestaña recibió el documento—; y **las funciones de
`api/` no corren bajo `vite dev`**, así que la API se responde desde Playwright con `page.route`:
eso comprueba el cliente, nunca las funciones, cuya única prueba real es el despliegue.

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

Tres más, aprendidas al rehacerlo el 05-09-2026: el intérprete de esta máquina vive en
`C:\Program Files\...`, y la sustitución `$(cat graphify-out/.graphify_python)` de la skill se
parte en el espacio —llama a `python` a secas, que es el mismo—; los PNG del icono son el mismo
dibujo que `public/icon.svg`, así que se quitan de la detección para no pagar visión tres veces;
y cuando se le dan a los subagentes anclajes del AST para que no creen nodos fantasma, hay que
mirarlos antes en `.graphify_ast.json`: `vite.config.ts` es `vite_config` y `main.tsx` es
`src_main` (una llamada suelta a nivel de módulo no genera nodo propio). Las entradas que salen
de la caché de una pasada anterior pueden apuntar a nombres de nodo que la pasada nueva ya no
usa; el chequeo de salud las cuenta como aristas colgantes y se pierden en silencio —si el
número molesta, se borran esas entradas de `graphify-out/cache` y se reextraen—.
