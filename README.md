# LecturamePDF

Sube un PDF y escúchalo mientras ves resaltado lo que se está leyendo. Ocurre todo en el
navegador: sin cuentas, sin instalar nada y sin configurar nada para empezar.

- Reconstruye párrafos, títulos y listas a partir de las coordenadas del PDF, y **anuncia** las
  tablas y las fórmulas en vez de recitarlas símbolo a símbolo.
- Recuerda dónde ibas, a qué velocidad y con qué voz, documento a documento.
- Índice de secciones, buscador que ignora tildes, y marcadores con notas.
- El PDF original a un clic, abierto por la página que estás escuchando.
- **Sincronización opcional** entre dispositivos: sube en el ordenador, sigue en el móvil.

Hecho con React y pdf.js sobre la síntesis de voz del navegador. Los documentos se guardan en
IndexedDB, en tu propio equipo, y no salen de él —salvo que actives la sincronización, que los
copia a tu propio almacén privado de Vercel Blob.

## Uso

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests unitarios de la lógica pura
npm run lint    # ESLint
npm run verify  # lint + tests + typecheck + build, de una vez
npm run build   # bundle estático en dist/
npm run e2e     # verificación en navegador (e2e/verify.cjs y e2e/mobile.cjs)
```

`npm run e2e` necesita el servidor de desarrollo en marcha —si no lo está, el script lo dice y
para— y Playwright global (`npm i -g playwright && playwright install chromium`). Como Chromium
headless no trae voces, el script sustituye el motor de síntesis por uno falso: comprueba qué se
pronuncia en cada momento, los atajos, la persistencia, la extracción de tablas y fórmulas, y que
una biblioteca guardada por una versión anterior sobreviva a la subida de esquema. La calidad del
audio, en cambio, solo se juzga de oído. La segunda mitad (`e2e/mobile.cjs`) repite lo esencial
en emulación táctil de móvil y comprueba el cliente de sincronización contra una API simulada;
las funciones de `api/` no corren bajo `vite dev`, así que su prueba real es el despliegue.

**En el ordenador, ábrelo en Microsoft Edge.** Es el navegador que trae las voces neurales de
Microsoft (las que se llaman «Natural»), que son las que suenan bien en sesiones largas. En
Chrome funciona igual pero con voces de menor calidad. En el móvil suenan las voces del sistema
(Android e iPhone traen las suyas), y si no convencen, ahí está la voz de IA, que es la misma en
todas partes.

## La portada

Al abrir la aplicación no hay más que una pregunta: qué PDF quieres escuchar. Arrástralo sobre la
zona de la derecha o pulsa «Elegir PDF»; se procesa en tu equipo, así que el archivo no sale de
él. Si ya habías empezado algo, sale además un botón para **seguir con el último documento**, que
es lo que se quiere hacer casi siempre al volver.

Debajo, la estantería: una ficha por documento, con un anillo que enseña cuánto llevas escuchado
sin tener que leer el porcentaje, el idioma detectado y un aspa para quitarlo. Están ordenadas por
el último rato que les dedicaste, no por cuándo las subiste.

La presentación crece con el ancho de la ventana, no con el zoom del navegador: en un monitor
grande se lee sin tocar nada, y la cabecera y la estantería se quedan a su tamaño en vez de
inflarse con lo demás.

## Claro y oscuro

Sigue el tema del sistema, sin interruptor: **«Papel»** de día —hueso y azul tinta, con la serif
del lector— y **«Tinta»** de noche, que es el mismo papel apagado en gris cálido, no un negro
azulado de otra aplicación.

Lo que cambia de verdad entre los dos son los resaltados, y van juntos porque se pisan: la frase
que suena, la palabra dentro de ella y la coincidencia de búsqueda, que cae dentro de la frase ya
resaltada. De día, ámbar para la voz y azul para la búsqueda; de noche el ámbar no se lee, así que
la voz pasa al azul y la búsqueda al violeta.

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

También puedes hacer clic en cualquier frase para empezar a leer desde ahí. Mientras escribes una
nota, los atajos quedan desactivados para no colarse en el texto.

## Mientras escuchas

La voz se elige sola por idioma, prefiriendo las neurales, pero puedes cambiarla en el selector
de los controles: la lista pone delante las del idioma del documento y detrás el resto, por si
quieres leer con otra. La elegida a mano se recuerda con el documento; si algún día no está en
el navegador, se vuelve a elegir automáticamente. Cada documento recuerda también su velocidad,
así que no hay que volver a ajustarla en cada sesión.

### Voz de IA (opcional)

El selector incluye voces «(IA, con red)»: síntesis neuronal Kokoro a través de la API de
[OpenRouter](https://openrouter.ai/), mucho más natural que las voces del navegador. Al elegir
una por primera vez, los controles piden tu clave de API de OpenRouter, que se guarda en el
`localStorage` del navegador y solo viaja a OpenRouter. Cuesta $0.62 por millón de caracteres
(unos céntimos por hora de escucha) y requiere saldo en la cuenta.

Tres cosas cambian con ella: hace falta **conexión** mientras esté elegida (el resto de la
aplicación sigue funcionando sin red), no hay resaltado de **palabra** en curso (el de frase sí),
y si la red o la cuota fallan la lectura **se pausa y avisa** en vez de saltarse la frase: al
pulsar ▶ se reintenta desde la misma frase. Estas voces nunca se eligen solas: solo suenan si
las eliges tú.

Cada bloque tiene un botón de altavoz para **silenciarlo** (asoma al pasar el ratón por encima;
en una pantalla táctil, donde no hay ratón que pasar, está siempre a la vista): la voz lo salta
al avanzar y al moverse con `Tab`, pero el texto sigue a la vista, atenuado — útil para cabeceras
o avisos legales que la limpieza automática no cazó. El icono es el estado,
como en un reproductor: `🔊` suena, `🔇` silenciado. Un clic dentro del bloque silenciado sí lo
lee: la elección explícita manda. Se guarda con el documento, y el mismo botón lo devuelve a la
lectura.

Con la estrella de los controles (o la tecla `M`) marcas la frase que estás escuchando para
repasarla después. Los marcadores se listan en la barra lateral en orden de lectura, con su
sección y su página, y la frase queda subrayada en el texto. Se guardan con el documento, así
que siguen ahí la próxima vez que lo abras.

Cada marcador admite una **nota**: pulsa `✎` (o la propia nota, para reescribirla), escribe y
confirma con `Enter`; `Mayús+Enter` hace un salto de línea y `Esc` cancela sin guardar. Dejarla
vacía la borra.

## Barra lateral: índice, buscador y marcadores

Se muestra y se recoge con el botón `☰` de la cabecera. Arranca abierta si la ventana mide
1100 px o más, y recogida si no. Cuando no cabe al lado del texto se superpone a él, así que
saltar a una sección o a un resultado la recoge sola para dejar ver lo que vas a escuchar.

El **índice** se construye con los títulos detectados, se sangra según la numeración
(`2.` → `2.1.` → `2.1.3`) y marca la sección que estás escuchando. Las que ya has oído enteras
aparecen con un `✓`, y solo se marcan cuando la voz llega hasta el final, de modo que saltártela
no la da por oída. Pulsa cualquier título para ir allí.

El **buscador** (tecla `/`, que abre la barra si estaba recogida) ignora tildes y mayúsculas
—`analisis` encuentra `análisis`—, muestra cada resultado con su sección y su página, y al
pulsarlo empieza a leer desde esa frase. Mientras buscas, los resultados ocupan el sitio del
índice y las coincidencias quedan resaltadas en azul dentro del texto, para localizarlas sin
recorrer la lista.

## El PDF original

El botón `📄` lo abre en un panel, por la página que se está escuchando, para consultar las
figuras, las tablas y las fórmulas que la vista de texto no puede dar bien compuestas. Es el
visor del propio navegador, así que trae zoom, búsqueda y miniaturas.

No persigue la lectura: cuando la voz cambia de página aparece un `ir a la pág. N` y decides tú,
porque mover la página recarga el visor y perderías el zoom. Solo está disponible en los
documentos añadidos desde que se guarda el original; para uno anterior, vuelve a subir el PDF
—se reconoce por su contenido y conserva progreso, marcadores y notas—.

En una pantalla **táctil** el mismo botón abre el original en una pestaña nueva en vez de en el
panel: Chromium móvil no pinta PDFs dentro de un iframe, y en pestaña completa el visor del
navegador funciona en Android y en iPhone (sin salto a la página que suena, eso sí).

## Sincronización entre dispositivos (opcional)

Sin tocar nada, cada navegador guarda lo suyo. Si quieres subir un PDF en el ordenador y seguirlo
en el móvil, la portada admite un **código de sincronización**: pégalo una vez en cada dispositivo
y a partir de ahí los PDFs y el progreso —posición, marcadores, notas, silenciados, velocidad—
viajan solos. Cuando el mismo documento se toca en dos sitios, gana el último cambio. Borrar un
documento lo borra en todos. «Dejar de sincronizar» vuelve al modo local sin perder nada.

Por detrás no hay cuentas: la aplicación desplegada en Vercel guarda los datos en un almacén
privado de Vercel Blob y las peticiones se autorizan comparando el código con la variable
`SYNC_TOKEN` del proyecto. El plan gratuito (1 GB, ~10 GB de transferencia al mes) sobra para una
biblioteca personal. El texto extraído no se sube: cada dispositivo re-extrae el PDF al abrirlo
por primera vez, que para eso la extracción es determinista.

Desplegarlo pide tres cosas en el proyecto de Vercel: importar el repositorio (detecta Vite solo),
crear un **Blob store** en la pestaña Storage y definir la variable de entorno `SYNC_TOKEN` con
un código largo inventado —ese mismo código es el que se pega en cada dispositivo—. Después, cada
push a `main` publica. El paso a paso con sus trampas está en [PENDIENTE.md](PENDIENTE.md).

La **voz de IA funciona igual en el móvil**: la clave de OpenRouter se pega una vez en cada
dispositivo (viaja del navegador a OpenRouter, nunca al servidor) y la cuota es por cuenta, no
por aparato.

## Cómo funciona

`PDF → bloques → frases → voz → resaltado`

- **Extracción** (`src/core/pdf/layout.ts`): pdf.js devuelve fragmentos sueltos con coordenadas,
  no párrafos. Se agrupan en líneas por posición vertical, y las líneas en bloques cuando el hueco
  crece respecto al de sus propias líneas —cada maqueta separa distinto, así que el umbral se
  calibra con el documento y no con una constante—. Los títulos salen del tamaño de fuente, y las
  cabeceras, los pies y los números de página repetidos se descartan. Las listas (`1.` `2.`,
  `A.` `B.`, viñetas) se cortan en cada marcador y se muestran con sangría francesa, así que la
  numeración queda en columna como en el PDF; el marcador forma parte del texto y también se lee.
- **Tablas y fórmulas** (`src/core/pdf/layout.ts`): una tabla se reconoce porque sus renglones
  comparten columnas, y una fórmula porque casi ningún token suyo es una palabra. Las dos se
  anuncian —«Tabla de 4 filas, en la página 2 del original»— en vez de recitarse, y su contenido
  sigue a la vista para leerlo con los ojos, o bien compuesto en el original a un clic. El listón
  para darlas por tales es alto: confundirse dejaría mudo un párrafo, que es peor que leer una
  fórmula mal.
- **Llamadas y notas al pie** (`src/core/pdf/layout.ts`): el número en volado de una llamada se
  une a su línea —antes partía el párrafo en tres— y no se pronuncia. Las notas al pie, el cierre
  en cuerpo menor de la página, se dejan fuera del hilo de lectura.
- **Idioma** (`src/core/language.ts`): recuento de palabras vacías en español e inglés.
- **Voz** (`src/core/tts.ts`): **una frase = una locución** — una utterance con las voces del
  navegador, una petición TTS con su `Audio` con la voz de IA. El fin de frase es un evento real
  en los dos casos, así que el resaltado nunca se desincroniza aunque cambies de velocidad o
  saltes de bloque. Los eventos de palabra (`onboundary`) se aprovechan si la voz los emite,
  pero la sincronización no depende de ellos. Con la voz de IA, la frase siguiente se pide por
  adelantado mientras suena la actual, para que no haya silencio entre frases.
- **Progreso** (`src/core/storage.ts`): el documento se identifica por el SHA-256 de sus bytes,
  así que reabrir el mismo PDF recupera la posición exacta desde IndexedDB.

## Limitaciones conocidas

- **PDFs escaneados**: se detectan y se avisa, pero no se leen, y no está previsto que se lean
  (el porqué, en [PENDIENTE.md](PENDIENTE.md)).
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- **Las fórmulas dentro de un párrafo** se leen tal cual: solo se anuncian las que ocupan su
  propio renglón. Detectarlas en mitad de una frase costaría dejar mudo lo que las rodea.
- Las notas al pie **sin número** no se distinguen de un pie de figura, así que se leen.
- Una lista de **un solo punto y una sola línea**, sin sangrar y en maqueta apretada, puede
  quedarse pegada al párrafo que la sigue: sin un segundo punto ni una segunda línea no hay
  ningún hueco con el que comparar.
- El panel del PDF **no resalta la frase que suena**: dentro del visor del navegador no se puede.
  Tampoco se le pueden cerrar las miniaturas, porque Chromium ignora todo parámetro que no sea la
  página.

El trabajo pendiente, y por qué se dejó fuera cada cosa, está en [PENDIENTE.md](PENDIENTE.md).
