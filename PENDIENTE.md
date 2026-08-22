# Trabajo pendiente

El caso principal funciona de punta a punta —subir un PDF, detectar idioma, elegir voz (local o
de IA por OpenRouter), reproducir con resaltado sincronizado, saltar bloques, silenciar los que
no interesan, buscar, marcar con notas, consultar el original, retomar donde ibas y seguir en
otro dispositivo—, con `npm run verify` y `npm run e2e` en verde.

## ▶ Lo primero: poner en marcha el despliegue y la sincronización

El código está escrito y comprobado contra una API simulada; **lo que falta solo lo puede hacer
el usuario a mano**, porque son pasos en la web de Vercel. Una vez hecho, no hay que repetirlo:
cada `git push` publica solo.

~~**1. Subir el código.**~~ **Hecho**: `main` está publicado en `jraversbcn21/LecturamePDF`.

~~**2. Inventar el código de sincronización.**~~ **Hecho**: es un secreto compartido —el mismo
texto va en Vercel y en cada dispositivo—, generado con
`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. Guárdalo donde
tengas las contraseñas: hará falta otra vez en cada móvil, y en Vercel no se puede volver a leer.

~~**3. Importar el proyecto en Vercel.**~~ **Hecho**: la aplicación está en
**https://lecturamepdf.vercel.app**. Si algún día hay que rehacerlo, es
https://vercel.com/jorgeborn3-3085s-projects → **Add New → Project → Import Git Repository** →
`jraversbcn21/LecturamePDF`; detecta Vite solo, y no se cambia el *framework preset*, ni el
*build command*, ni el *output directory*. El primer despliegue sirve la aplicación pero **aún
no sincroniza**: es lo esperado, faltan los pasos siguientes.

Se sigue por el paso 4.

**4. Crear el almacén de los PDFs.** En el proyecto → pestaña **Storage** → **Create Database**
→ **Blob** → conéctalo a este proyecto. Vercel añade solo la variable `BLOB_READ_WRITE_TOKEN`;
no hay que tocarla.

**5. Poner el código de sincronización en Vercel.** En el proyecto → **Settings → Environment
Variables** → **Add**: nombre `SYNC_TOKEN`, valor el del paso 2, y **marca los tres entornos**
(Production, Preview, Development).

**6. Volver a desplegar, que es el paso que se olvida.** Las variables de entorno solo entran en
un despliegue nuevo: pestaña **Deployments** → el de arriba → menú `⋯` → **Redeploy**.

**7. Probarlo, en este orden.** En el ordenador, abre **https://lecturamepdf.vercel.app**, pega
el código de sincronización en la portada y sube un PDF.
Después, en el móvil: misma URL, mismo código, y el documento tiene que aparecer en la
estantería, bajarse al abrirlo y sonar. Luego al revés: avanza un rato en el móvil, vuelve al
ordenador y recarga; el progreso tiene que haber viajado (tarda hasta 10 segundos, o al salir
de la pestaña).

**8. La voz de IA en el móvil**, si la quieres allí: pega también tu clave de OpenRouter la
primera vez que elijas una voz «(IA, con red)». La cuota es de la cuenta, no del aparato.

Si algo no cuadra: el motivo de cada decisión de la sincronización está en `CLAUDE.md`, y el
qué hace de cara al usuario, en el `README.md`.

## Próxima sesión

Nada de lo que sigue bloquea el uso normal: son casos concretos en documentos que ya funcionan.
Cada uno dice **por qué** se dejó fuera, que es lo que hace falta para decidir si merece la pena
retomarlo. Los atajos deliberados que hay en el código llevan un comentario `ponytail:` y están
recogidos aquí.

- **Si en iPhone la voz de IA no arranca** (la local sí, que ya lleva su desbloqueo), la causa
  será que iOS bloquea el `play()` de un `Audio` nuevo fuera del gesto: el arreglo es reutilizar
  un único elemento de audio desbloqueado en el primer toque, cambiándole el `src` por frase. No
  se hizo de antemano porque rompe la forma actual de los tests («un Audio por frase») y en el
  WebKit moderno puede no hacer falta: primero verlo fallar en el dispositivo real.
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
