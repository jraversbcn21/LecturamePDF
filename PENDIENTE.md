# Trabajo pendiente

El caso principal funciona de punta a punta —subir un PDF, detectar idioma, elegir voz (sola o a
mano), reproducir con resaltado sincronizado, saltar bloques, buscar, marcar con notas y retomar
donde ibas—. 59 tests unitarios y 60 comprobaciones de navegador en verde.

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

- **Listas sin sangría**: si una lista no está sangrada respecto al cuerpo, el párrafo que va
  detrás del último punto se queda pegado a él. La sangría es la señal que marca dónde acaba la
  lista; habría que mirar también el interlineado. Anotado en `src/core/pdf/layout.ts`.
- **Maquetación a varias columnas** compleja puede desordenar el texto.
- **Tablas, notas al pie y fórmulas** se leen tal cual, y suenan mal en medio de un párrafo.

## Interfaz

- **`pause`/`resume` nativos**: si alguna voz local los ignora, habría que relanzar la frase.
  Anotado en `src/core/tts.ts`; no se ha visto ocurrir con las voces de Edge.

## Infraestructura

- **Publicar el repositorio.** Hay git en local, pero todo vive solo en esta máquina. Con `gh` ya instalado, un `gh repo create` daría copia de seguridad. Es una decisión
  del usuario: publicar código es un paso hacia fuera.
- **Plugins recomendados**, que instala el usuario, no Claude:
  `/plugin install playwright@claude-plugins-official` (encaja especialmente: ya se verifica en
  navegador a mano), `/plugin install frontend-design@claude-plugins-official` y
  `/plugin install skill-creator@claude-plugins-official`.
