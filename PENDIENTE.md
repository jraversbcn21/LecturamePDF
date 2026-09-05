# Trabajo pendiente

El caso principal funciona de punta a punta —subir un PDF, detectar idioma, elegir voz (local o
de IA por OpenRouter), reproducir con resaltado sincronizado, saltar bloques, silenciar los que
no interesan, buscar, marcar con notas, consultar el original, retomar donde ibas y seguir en
otro dispositivo—, con `npm run verify` y `npm run e2e` en verde.

## La sincronización ya funciona de verdad

La sesión del 23-08-2026 la dejó **operativa y probada en dispositivos reales**: desktop y
móvil físico (iOS Safari) sincronizan sin el aviso de error. Antes de eso, verificación de
punta a punta contra producción por curl (`PUT` con ficha, fusión, `GET` de vuelta,
tombstone). Lo que se arregló, todo por el CLI de Vercel (`vercel` ya está vinculado al
proyecto):

- **`BLOB_READ_WRITE_TOKEN` faltaba** (la conexión original del store no la creó): se resolvió
  creando un store nuevo con `vercel blob create-store lecturame-blob --access public --yes`,
  que conecta el proyecto y crea la variable de una vez.
- **El store viejo era Private** y el código escribe con `access: 'public'`: el nuevo es
  público, así que el conflicto latente desapareció con él.
- **`SYNC_TOKEN` se rotó**: la original era *sensitive* (imposible de leer de vuelta, `vercel
  env pull` devuelve `[Encrypted]`) y no había forma de saber si el código que se pegaba en la
  aplicación era el bueno. El nuevo código lo tiene el usuario; si se pierde, rotar de nuevo
  (`vercel env rm SYNC_TOKEN production -y`, `printf '<nuevo>' | vercel env add SYNC_TOKEN
  production`, `vercel --prod`) y volver a pegarlo en cada dispositivo — un 401 tras rotarlo es
  justo eso, no una regresión: el dispositivo aún manda el código viejo hasta que se
  actualiza a mano («Dejar de sincronizar» y volver a pegar el nuevo).
- **`api/diag.ts` borrado** una vez cumplida su misión, y el borrado ya está desplegado.

Vercel quedó limpio el mismo día: el store viejo y vacío se borró junto con sus dos variables
huérfanas, y en el proyecto solo quedan las dos que se usan de verdad, `SYNC_TOKEN` y
`BLOB_READ_WRITE_TOKEN`. El orden importó y conviene repetirlo si algún día se rehace: las
huérfanas se llamaban `BLOB_READ_WRITE_TOKEN_*` —el store viejo se conectó con ese prefijo—,
así que se borraron **por nombre exacto antes** de eliminar el store, no fuera a llevarse por
delante el `BLOB_READ_WRITE_TOKEN` bueno.

La **voz de IA en el móvil** también está probada (05-09-2026, iPhone real, Safari): basta pegar
la clave de OpenRouter la primera vez que se elija una voz «(IA, con red)». La clave vive en el
`localStorage` de cada navegador, como el código de sincronización, así que se pega en cada
dispositivo; no viaja con la biblioteca.

## El móvil quedó pulido el 23-08-2026

Cinco arreglos de la misma tarde, todos **probados en el iPhone físico y desplegados**
(`e77202e..d1dab2a`): el recuadro de arrastrar no existe en táctil (prometía algo imposible y
empujaba la estantería fuera de pantalla), borrar confirma antes con el diálogo nativo (el aspa
estaba a un dedo de abrir y el borrado viaja a la nube sin deshacer), los botones apilados van
parejos a todo el ancho con el nombre largo en elipsis, el lector solo se mueve arriba y abajo
(el marco se descolocaba en iOS, detalle en `CLAUDE.md`), y volver del PDF original retoma la
lectura en vez de caer a la portada (la pestaña recuerda el documento en `sessionStorage`).
El e2e móvil pasó de 14 a 21 comprobaciones por el camino; nada de esto puede volver a romperse
en silencio. La carrera que quedaba en `verify.cjs` («documento sin original guardado» medía
antes de que el panel terminara de consultar la base) se cerró el 05-09-2026 esperando al texto
final antes de medir.

## La PWA, probada en el iPhone el 05-09-2026

Instalada desde Safari (Compartir → Añadir a pantalla de inicio) y abierta en modo avión: carga
la estantería y lee con la voz local; «Ver el PDF original» salta a Safari y, al volver, la
lectura sigue donde estaba. No hizo falta `viewport-fit=cover`: iOS inseta la vista en standalone
y la cabecera no queda bajo la barra de estado. Lo que la sostiene está en `CLAUDE.md` (decisión
de la PWA) y lo vigila `e2e/pwa.cjs`.

## La lectura inmersiva, probada en el iPhone el 05-09-2026

En táctil, con la voz sonando y la barra lateral cerrada, cuatro segundos sin tocar la pantalla
esconden la cabecera y el reproductor: el texto queda a pantalla completa. Vuelven con un toque
—que **no** salta la lectura—, con el dedo desplazando el texto o con cualquier tecla. El porqué
de cada pieza está en `CLAUDE.md`; el e2e móvil pasó de 21 a 28 comprobaciones y lo vigila.

De ahí salió un fallo que solo se veía en el dispositivo: el tope de altura que animaba la
desaparición recortaba la última fila de los controles —«Velocidad» y «Voz»— justo donde Safari
pone su barra, así que parecía cosa del navegador y era nuestra. Arreglado (`066ec15`) y
vigilado: ahora se comprueba que los controles no recortan contenido y que su borde inferior
cabe en la pantalla, al abrir el lector y al volver del modo inmersivo. **La lección, para la
próxima animación de altura: en un iPhone los controles ocupan tres filas (~200 px), no dos.**

## Próxima sesión

Nada de lo que sigue bloquea el uso normal: son casos concretos en documentos que ya funcionan.
Cada uno dice **por qué** se dejó fuera, que es lo que hace falta para decidir si merece la pena
retomarlo. Los atajos deliberados que hay en el código llevan un comentario `ponytail:` y están
recogidos aquí.

- **Vigilar el gasto de Blob** las primeras semanas (Vercel lo enseña en la pestaña Storage). El
  plan gratuito da 1 GB y ~10 GB de transferencia al mes, y pasarse **corta el acceso 30 días**
  en vez de cobrar. Con PDFs de apuntes no debería acercarse; si se acerca, lo barato es borrar
  de la estantería lo ya escuchado, que borra también el PDF de la nube.
- **Decidir la cuota de la voz de IA con datos de uso real.** El usuario la está probando con la
  cuenta free de OpenRouter: ~50 peticiones/día (una por frase) y 20/min. Si se queda corta, la
  recarga única de ~$10 sube el límite free a 1.000/día para siempre y de paso da saldo para
  Kokoro de pago ($0.62 por millón de caracteres). Cuando la lectura se pause con «La voz de IA
  no responde (429)», es esta cuota, no un fallo.
- **Resubir los PDFs antiguos que arrastren cabeceras.** La limpieza de cabeceras de dos líneas
  solo aplica al extraer; un documento ya guardado se re-extrae al volver a subir el mismo PDF
  (conserva progreso y marcadores, aunque los índices de bloque pueden desplazarse un poco).
- **Páginas de índice con puntos de guía** («Preguntas ..... 7»): se leen enteras, renglón a
  renglón. Una heurística de líneas `texto···número` podría anunciarlas como se hace con las
  tablas. Se dejó fuera porque el silenciado manual ya lo resuelve y equivocarse dejaría muda una
  línea de contenido; retomar solo si silenciar índices a mano se hace pesado.
- **Caché de audio de la voz de IA**, si el coste o la espera empiezan a molestar (detalle abajo,
  en «Interfaz»).
- **El grafo se rehizo el 05-09-2026, pero antes de la lectura inmersiva**, así que
  `graphify-out/GRAPH_REPORT.md` (445 nodos) no la conoce. No se rehizo otra vez a propósito:
  cuesta ~200.000 tokens y la forma del proyecto apenas cambió con ella —un hook, un bloque de
  CSS y dos documentos, sin ficheros ni dependencias nuevas—. Rehacerlo con la siguiente tanda
  de cambios, no por esto solo.

## Descartado

- **OCR para PDFs escaneados.** Era la única limitación que dejaba fuera documentos enteros, pero
  el usuario ha confirmado que los suyos llevan texto dentro, así que nunca llegaría a usarse.
  Habría costado una dependencia pesada, megas de datos por idioma —o descargados en el primer
  uso, y entonces la aplicación deja de funcionar sin conexión, o incluidos, y entonces pesa más
  para todos—, minutos de espera por documento y un texto con erratas que, escuchando, no se
  distinguen de lo que escribió el autor. Además, el índice, las listas y las tablas se detectan
  a partir de posiciones exactas, que un reconocimiento de imagen no da. **No reabrir esto sin un
  caso real**: un escaneo concreto que haya que estudiar.

## Calidad de la extracción

- **Lista de un solo punto, de una sola línea**: un bloque se cierra cuando el hueco crece
  respecto al de sus propias líneas, y si el punto es de una sola línea, respecto al hueco entre
  los puntos de la lista. Con un único punto no hay ni lo uno ni lo otro, y manda `leading`, que
  en maquetas apretadas no se alcanza. Anotado en `src/core/pdf/layout.ts`.
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- **Fórmulas dentro de un párrafo**: las que ocupan su propio renglón ya se anuncian, pero una
  expresión en mitad de una frase se sigue leyendo símbolo a símbolo. Aislarla exigiría partir el
  párrafo por dentro, y equivocarse ahí deja muda la frase que la rodea: el listón para dar algo
  por fórmula es alto a propósito (`looksLikeFormula` en `src/core/pdf/layout.ts`).
- **Notas al pie sin numerar** no se distinguen de un pie de figura y siguen leyéndose. La llamada
  numerada es hoy la única señal fiable; haría falta mirar también el filete de separación.

## Sincronización

- **El empuje de despedida cabe en 64 KB** (`pagehide` con `keepalive`, anotado con `ponytail:`
  en `src/core/sync.ts`): una biblioteca con muchísimas notas podría pasarse y perder ese último
  empuje, que recogería el siguiente arranque. Ni cerca del límite con una biblioteca normal.
- **La fusión del servidor es leer-fusionar-escribir sin lock** (`api/library.ts`, `ponytail:`):
  dos dispositivos empujando en el mismo instante podrían pisarse una ficha. Con un usuario no se
  da; si algún día se diera, un lock optimista (reintentar si la lista cambió entre medias).
- **Escuchar el mismo documento en dos dispositivos a la vez** pisa el progreso del otro (gana el
  último `updatedAt`). Es la resolución elegida a propósito; caso que no se da con un usuario.

## Interfaz

- **`pause`/`resume` nativos**: si alguna voz local los ignora, habría que relanzar la frase.
  Anotado en `src/core/tts.ts`; no se ha visto ocurrir con las voces de Edge.
- **La estrella del marcador sigue en oro** (`#d99000`, escrito a mano en `src/styles.css`), y con
  ella el subrayado punteado de la frase marcada. Es el único color que no sale de la paleta: se
  dejó porque ahí el oro es la señal de «marcado», no parte del tema, y se lee en los dos modos.
  Si algún día molesta, pasa al acento; lo que no puede es competir con los tres resaltados.
- **La voz de IA no cachea el audio**: re-escuchar una frase (o releer un documento) vuelve a
  pagar la petición y a esperar la red; solo la frase siguiente se pide por adelantado (caché de
  una entrada en `src/core/tts.ts`, anotada con `ponytail:`). Una caché en IndexedDB exigiría un
  almacén nuevo (versión 3 de la base) y crecería sin límite; esperar a que el coste o la espera
  molesten de verdad.
- **La voz de IA no resalta la palabra en curso**, solo la frase: la API de OpenRouter devuelve
  el audio sin timestamps por palabra. ElevenLabs sí los da, si algún día compensa su cuota.
- **No se resalta en el PDF la frase que suena**, ni se le pueden cerrar las miniaturas al visor:
  Chromium ignora todo parámetro de apertura que no sea la página. Salir de ahí obligaría a dibujar
  las páginas nosotros con pdf.js, y con ello a escribir zoom, desplazamiento y paginación a mano.
  El detalle de lo comprobado, en `CLAUDE.md`.
