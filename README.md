# Lecturame

Sube un PDF y escúchalo mientras ves resaltado lo que se está leyendo. Todo ocurre en el
navegador: no hay servidor, ni cuentas, ni claves de API.

## Uso

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests unitarios de la lógica pura
npm run lint    # ESLint
npm run verify  # lint + tests + typecheck + build, de una vez
npm run build   # bundle estático en dist/
npm run e2e     # verificación en navegador (ver e2e/verify.cjs)
```

`npm run e2e` necesita el servidor de desarrollo en marcha —si no lo está, el script lo dice y
para— y Playwright global (`npm i -g playwright && playwright install chromium`). Como Chromium
headless no trae voces, el script sustituye el motor de síntesis por uno falso: comprueba la
sincronización, los atajos y la persistencia, pero la calidad del audio solo se juzga de oído.

**Ábrelo en Microsoft Edge.** Es el navegador que trae las voces neurales de Microsoft
(las que se llaman «Natural»), que son las que suenan bien en sesiones largas. En Chrome
funciona igual pero con voces de menor calidad.

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Reproducir / pausar |
| `Tab` | Saltar al bloque siguiente |
| `Shift+Tab` | Bloque anterior |
| `←` / `→` | Frase anterior / siguiente |
| `↑` / `↓` | Subir / bajar la velocidad |
| `M` | Marcar / desmarcar la frase actual |
| `/` | Buscar en el documento |
| `Esc` | Volver a la biblioteca (o limpiar la búsqueda, si estás escribiendo en ella) |

También puedes hacer clic en cualquier frase para empezar a leer desde ahí, o en cualquier
título del índice lateral para saltar a esa sección. El índice se construye con los títulos
detectados, se sangra según la numeración (`2.` → `2.1.` → `2.1.3`) y marca la sección que
estás escuchando.

El buscador de la barra lateral ignora tildes y mayúsculas (`analisis` encuentra `análisis`),
muestra cada resultado con su sección y su página, y al pulsarlo empieza a leer desde esa
frase. Mientras buscas, los resultados ocupan el sitio del índice y las coincidencias quedan
resaltadas en azul dentro del texto, para localizarlas sin recorrer la lista.

La voz se elige sola por idioma, prefiriendo las neurales, pero puedes cambiarla en el selector
de los controles: la lista pone delante las del idioma del documento y detrás el resto, por si
quieres leer con otra. La elegida a mano se recuerda con el documento; si algún día no está en
el navegador, se vuelve a elegir automáticamente.

Cada documento recuerda su velocidad, así que no hay que volver a ajustarla en cada sesión.
En el índice, las secciones que ya has escuchado enteras aparecen con un `✓`; solo se marcan
cuando la voz llega hasta el final de la sección, de modo que saltártela no la da por oída.

Con la estrella de los controles (o la tecla `M`) marcas la frase que estás escuchando para
repasarla después. Los marcadores se listan en la barra lateral en orden de lectura, con su
sección y su página, y la frase queda subrayada en el texto. Se guardan con el documento, así
que siguen ahí la próxima vez que lo abras.

Cada marcador admite una **nota**: pulsa `✎` (o la propia nota, para reescribirla), escribe y
confirma con `Enter`; `Mayús+Enter` hace un salto de línea y `Esc` cancela sin guardar. Dejarla
vacía la borra. Mientras escribes, los atajos de teclado del reproductor quedan desactivados.

La barra lateral —índice, buscador y marcadores— se muestra y se recoge con el botón `☰` de la
cabecera. Arranca abierta si la ventana mide 1100 px o más, y recogida si no. Cuando no cabe al
lado del texto se superpone a él, así que saltar a una sección o a un resultado la recoge sola
para dejar ver lo que vas a escuchar. La tecla `/` la abre si estaba recogida.

## Cómo funciona

`PDF → bloques → frases → voz → resaltado`

- **Extracción** (`src/core/pdf/layout.ts`): pdf.js devuelve fragmentos sueltos con coordenadas,
  no párrafos. Se agrupan en líneas por posición vertical, las líneas en párrafos por
  interlineado, se detectan los títulos por tamaño de fuente y se descartan cabeceras, pies y
  números de página repetidos. Las listas (`1.` `2.`, `A.` `B.`, viñetas) se cortan en cada
  marcador y se muestran con sangría francesa, así que la numeración queda en columna como en
  el PDF; el marcador forma parte del texto, de modo que también se lee en voz alta.
- **Idioma** (`src/core/language.ts`): recuento de palabras vacías en español e inglés.
- **Voz** (`src/core/tts.ts`): **una frase = una utterance**. El fin de frase es un evento real
  del navegador, así que el resaltado nunca se desincroniza aunque cambies de velocidad o
  saltes de bloque. Los eventos de palabra (`onboundary`) se aprovechan si la voz los emite,
  pero la sincronización no depende de ellos.
- **Progreso** (`src/core/storage.ts`): el documento se identifica por el SHA-256 de sus bytes,
  así que reabrir el mismo PDF recupera la posición exacta desde IndexedDB.

## Limitaciones conocidas

- **PDFs escaneados**: se detectan y se avisa, pero no se leen. Falta OCR.
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- Si una lista **no está sangrada** respecto al cuerpo, el párrafo que va detrás del último
  punto se queda pegado a él.
- No se muestra el PDF original: se lee una vista de texto limpia.

El trabajo pendiente, y por qué se dejó fuera cada cosa, está en [PENDIENTE.md](PENDIENTE.md).
