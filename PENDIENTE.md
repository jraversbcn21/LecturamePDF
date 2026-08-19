# Trabajo pendiente

El caso principal funciona de punta a punta —subir un PDF, detectar idioma, elegir voz (sola o a
mano), reproducir con resaltado sincronizado, saltar bloques, buscar, marcar con notas y retomar
donde ibas—. 66 tests unitarios y 72 comprobaciones de navegador en verde.

Lo de abajo está ordenado por lo que más aportaría, no por dificultad.

## Funcionalidad

- **OCR para PDFs escaneados.** Hoy se detectan y se avisa, pero no se leen: es la limitación que
  deja fuera documentos enteros. Con `tesseract.js` en el navegador. Es lo más caro de la lista:
  dependencia pesada, descarga de datos por idioma y proceso lento, así que conviene decidir
  antes si de verdad hay escaneos que estudiar.

## Calidad de la extracción

- **Listas sin sangría de puntos cortos**: un bloque se cierra cuando el hueco crece respecto al
  de sus propias líneas, así que una lista sin sangrar ya se separa del párrafo que la sigue
  (`lists-flush.pdf`). Falta el caso en que los puntos son **de una sola línea**: sin dos líneas
  que comparar no hay hueco propio, y manda `leading`, que en maquetas apretadas no se alcanza.
  Haría falta el hueco típico entre puntos de la lista. Anotado en `src/core/pdf/layout.ts`.
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- **Fórmulas**: se leen símbolo a símbolo, que no es lo que significan. Verbalizar matemáticas
  bien es un problema en sí mismo; lo que se arregló fue el orden, que era lo que las volvía
  ininteligibles. Anunciarlas y saltarlas, como se hace con las tablas, sería el paso siguiente.
- **Notas al pie sin numerar** no se distinguen de un pie de figura y siguen leyéndose. La llamada
  numerada es hoy la única señal fiable; haría falta mirar también el filete de separación.

## Interfaz

- **`pause`/`resume` nativos**: si alguna voz local los ignora, habría que relanzar la frase.
  Anotado en `src/core/tts.ts`; no se ha visto ocurrir con las voces de Edge.

## Infraestructura

- **Plugins recomendados**, que instala el usuario, no Claude:
  `/plugin install playwright@claude-plugins-official` (encaja especialmente: ya se verifica en
  navegador a mano), `/plugin install frontend-design@claude-plugins-official` y
  `/plugin install skill-creator@claude-plugins-official`.
