# Trabajo pendiente

El caso principal funciona de punta a punta —subir un PDF, detectar idioma, elegir voz (sola o a
mano), reproducir con resaltado sincronizado, saltar bloques, buscar, marcar con notas, consultar
el original y retomar donde ibas—, con `npm run verify` y `npm run e2e` en verde.

Nada de lo de abajo bloquea el uso normal: son casos concretos en documentos que ya funcionan.
Cada uno dice **por qué** se dejó fuera, que es lo que hace falta para decidir si merece la pena
retomarlo. Los atajos deliberados que hay en el código llevan un comentario `ponytail:` y están
recogidos aquí.

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

- **Listas sin sangría de puntos cortos**: un bloque se cierra cuando el hueco crece respecto al
  de sus propias líneas, así que una lista sin sangrar ya se separa del párrafo que la sigue
  (`lists-flush.pdf`). Falta el caso en que los puntos son **de una sola línea**: sin dos líneas
  que comparar no hay hueco propio, y manda `leading`, que en maquetas apretadas no se alcanza.
  Haría falta el hueco típico entre puntos de la lista. Anotado en `src/core/pdf/layout.ts`.
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- **Fórmulas dentro de un párrafo**: las que ocupan su propio renglón ya se anuncian, pero una
  expresión en mitad de una frase se sigue leyendo símbolo a símbolo. Aislarla exigiría partir el
  párrafo por dentro, y equivocarse ahí deja muda la frase que la rodea: el listón para dar algo
  por fórmula es alto a propósito (`looksLikeFormula` en `src/core/pdf/layout.ts`).
- **Notas al pie sin numerar** no se distinguen de un pie de figura y siguen leyéndose. La llamada
  numerada es hoy la única señal fiable; haría falta mirar también el filete de separación.

## Interfaz

- **`pause`/`resume` nativos**: si alguna voz local los ignora, habría que relanzar la frase.
  Anotado en `src/core/tts.ts`; no se ha visto ocurrir con las voces de Edge.
- **La estrella del marcador sigue en oro** (`#d99000`, escrito a mano en `src/styles.css`), y con
  ella el subrayado punteado de la frase marcada. Es el único color que no sale de la paleta: se
  dejó porque ahí el oro es la señal de «marcado», no parte del tema, y se lee en los dos modos.
  Si algún día molesta, pasa al acento; lo que no puede es competir con los tres resaltados.
- **No se resalta en el PDF la frase que suena**, ni se le pueden cerrar las miniaturas al visor:
  Chromium ignora todo parámetro de apertura que no sea la página. Salir de ahí obligaría a dibujar
  las páginas nosotros con pdf.js, y con ello a escribir zoom, desplazamiento y paginación a mano.
  El detalle de lo comprobado, en `CLAUDE.md`.
