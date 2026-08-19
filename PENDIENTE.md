# Trabajo pendiente

El caso principal funciona de punta a punta —subir un PDF, detectar idioma, elegir voz (sola o a
mano), reproducir con resaltado sincronizado, saltar bloques, buscar, marcar con notas y retomar
donde ibas—. 61 tests unitarios y 60 comprobaciones de navegador en verde.

Lo de abajo está ordenado por lo que más aportaría, no por dificultad.

## Funcionalidad

- **OCR para PDFs escaneados.** Hoy se detectan y se avisa, pero no se leen: es la limitación que
  deja fuera documentos enteros. Con `tesseract.js` en el navegador. Es lo más caro de la lista:
  dependencia pesada, descarga de datos por idioma y proceso lento, así que conviene decidir
  antes si de verdad hay escaneos que estudiar.
- **Mostrar el PDF original junto al texto.** Se descartó al principio a favor de la vista de
  lectura limpia, que sigue siendo la correcta para escuchar. Tendría sentido como vista
  secundaria, para consultar figuras y tablas que hoy se pierden.

## Calidad de la extracción

- **Listas sin sangría de puntos cortos**: un bloque se cierra cuando el hueco crece respecto al
  de sus propias líneas, así que una lista sin sangrar ya se separa del párrafo que la sigue
  (`lists-flush.pdf`). Falta el caso en que los puntos son **de una sola línea**: sin dos líneas
  que comparar no hay hueco propio, y manda `leading`, que en maquetas apretadas no se alcanza.
  Haría falta el hueco típico entre puntos de la lista. Anotado en `src/core/pdf/layout.ts`.
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- **Tablas, notas al pie y fórmulas** se leen tal cual, y suenan mal en medio de un párrafo.

## Interfaz

- **`pause`/`resume` nativos**: si alguna voz local los ignora, habría que relanzar la frase.
  Anotado en `src/core/tts.ts`; no se ha visto ocurrir con las voces de Edge.

## Infraestructura

- **Plugins recomendados**, que instala el usuario, no Claude:
  `/plugin install playwright@claude-plugins-official` (encaja especialmente: ya se verifica en
  navegador a mano), `/plugin install frontend-design@claude-plugins-official` y
  `/plugin install skill-creator@claude-plugins-official`.
