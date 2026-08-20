import { describe, expect, it } from 'vitest';
import { bodyHeightOf, dropRunningHeads, itemsToLines, linesToBlocks, looksLikeFormula, type Line, type RawItem } from './layout';

const item = (text: string, x: number, y: number, width = text.length * 5, height = 10): RawItem => ({
  text,
  x,
  y,
  width,
  height,
});

const line = (text: string, y: number, height = 10, page = 1, x = 30): Line => ({ text, x, y, height, page });

describe('itemsToLines', () => {
  it('agrupa por línea y ordena de izquierda a derecha', () => {
    const lines = itemsToLines([item('mundo', 60, 100), item('Hola', 10, 100.2), item('Segunda', 10, 86)], 1);
    expect(lines.map((l) => l.text)).toEqual(['Hola mundo', 'Segunda']);
  });

  it('no inserta espacios entre fragmentos pegados de la misma palabra', () => {
    expect(itemsToLines([item('Lectu', 10, 100, 25), item('rame', 35, 100, 20)], 1)[0]?.text).toBe('Lecturame');
  });
});

describe('linesToBlocks', () => {
  const bodyHeight = 10;

  it('une líneas seguidas en un párrafo y corta cuando hay un hueco', () => {
    const blocks = linesToBlocks(
      [line('primera línea', 100), line('segunda línea', 86), line('otro párrafo', 40)],
      bodyHeight,
    );
    expect(blocks.map((b) => b.text)).toEqual(['primera línea segunda línea', 'otro párrafo']);
  });

  it('recompone palabras partidas por guion', () => {
    const blocks = linesToBlocks([line('un ejem-', 100), line('plo claro', 86)], bodyHeight);
    expect(blocks[0]?.text).toBe('un ejemplo claro');
  });

  it('marca como título el texto corto con fuente mayor', () => {
    const blocks = linesToBlocks([line('Capítulo 1', 100, 15), line('cuerpo del texto', 80)], bodyHeight);
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph']);
  });

  // Fija el 1.5 de `gap > leading * 1.5`. Los huecos del segundo párrafo (15) caen en la franja
  // que ningún fixture cubría: por encima de 1.2 · leading y por debajo de 1.5 · leading. Bajar
  // el factor lo partiría línea a línea, y hasta ahora el cambio pasaba con los tests en verde.
  it('mantiene junto un párrafo algo más aireado que el interlineado dominante', () => {
    const blocks = linesToBlocks(
      [
        line('Primera línea del párrafo inicial', 300),
        line('que continúa con el interlineado', 288),
        line('más apretado de toda la página', 276),
        line('y cierra aquí su tercera idea.', 264),
        line('Segundo párrafo, algo más aireado', 242),
        line('que el anterior pero sin llegar', 227),
        line('al hueco que separa un bloque', 212),
        line('de otro en esta misma página.', 197),
      ],
      bodyHeight,
    );

    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
    expect(blocks[1]?.text).toBe(
      'Segundo párrafo, algo más aireado que el anterior pero sin llegar al hueco que separa un bloque de otro en esta misma página.',
    );
  });
});

describe('looksLikeFormula', () => {
  it('reconoce una fórmula suelta', () => {
    expect(looksLikeFormula('R = e−t / S, con S = S₀ · (1 + α · n)')).toBe(true);
    expect(looksLikeFormula('σ² = Σ (x − μ)² / n')).toBe(true);
    expect(looksLikeFormula('a ≤ b ≤ c')).toBe(true);
  });

  // Un falso positivo deja mudo un párrafo entero, que es peor que leer mal una fórmula:
  // por eso hacen falta las tres señales, y basta que falte una para descartarlo.
  it('no se traga prosa con números ni símbolos sueltos', () => {
    expect(looksLikeFormula('El coste es 250 € = 300 $ al cambio')).toBe(false);
    expect(looksLikeFormula('La cobertura es del 80 % y el margen de error ± 2 puntos')).toBe(false);
    expect(looksLikeFormula('PDF → bloques → frases → voz')).toBe(false);
    expect(looksLikeFormula('El nivel 2 dura 6 meses y cuesta 480 euros')).toBe(false);
    expect(looksLikeFormula('x = 1')).toBe(false);
  });
});

describe('listas', () => {
  const bodyHeight = 10;

  it('separa cada punto numerado, aunque el interlineado sea el del párrafo', () => {
    const blocks = linesToBlocks(
      [
        line('Este documento sirve para lo siguiente:', 200),
        line('1. Primer punto, que sigue', 186, 10, 1, 60),
        line('en una segunda línea.', 172, 10, 1, 75),
        line('2. Segundo punto.', 158, 10, 1, 60),
        line('Texto de cierre en el margen.', 144),
      ],
      bodyHeight,
    );

    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list-item', 'list-item', 'paragraph']);
    expect(blocks[1]?.text).toBe('1. Primer punto, que sigue en una segunda línea.');
    expect(blocks[3]?.text).toBe('Texto de cierre en el margen.');
  });

  it('cierra el último punto aunque la lista vaya al margen del cuerpo', () => {
    // Todo en x=30: la sangría no puede decir dónde acaba la lista. El hueco sí, porque
    // las líneas de un mismo punto van más juntas (14) que los bloques entre sí (18).
    const blocks = linesToBlocks(
      [
        line('1. Primer punto, que sigue', 200),
        line('en una segunda línea.', 186),
        line('2. Segundo punto, también', 168),
        line('en dos líneas.', 154),
        line('Texto de cierre, que no es parte', 136),
        line('del punto anterior.', 122),
      ],
      bodyHeight,
    );

    expect(blocks.map((b) => b.type)).toEqual(['list-item', 'list-item', 'paragraph']);
    expect(blocks[1]?.text).toBe('2. Segundo punto, también en dos líneas.');
    expect(blocks[2]?.text).toBe('Texto de cierre, que no es parte del punto anterior.');
  });

  it('cierra una lista de puntos de una sola línea, al margen y en maqueta apretada', () => {
    // Todo en x=30 y cada punto en un solo renglón: no hay sangría ni hueco propio del bloque
    // con el que comparar. La única señal es el hueco entre los propios puntos (14): el cierre
    // llega a 18, por debajo de leading * 1.5 (21), así que sin esa referencia se pegaría.
    const blocks = linesToBlocks(
      [
        line('1. Primer punto.', 200),
        line('2. Segundo punto.', 186),
        line('Texto de cierre, que no es parte', 168),
        line('del punto anterior.', 154),
      ],
      bodyHeight,
    );

    expect(blocks.map((b) => b.type)).toEqual(['list-item', 'list-item', 'paragraph']);
    expect(blocks[1]?.text).toBe('2. Segundo punto.');
    expect(blocks[2]?.text).toBe('Texto de cierre, que no es parte del punto anterior.');
  });

  // Fija el 0.5 de `indentTolerance = bodyHeight * 0.5`, que es lo único que separa aquí el
  // cierre del punto: el hueco es constante y la altura no cambia. El texto vuelve 8 puntos a
  // la izquierda del marcador, entre media línea y una entera; con la tolerancia en una línea
  // completa se leería como cola del punto anterior.
  it('cierra el punto cuando el texto vuelve al margen, aunque sea por poco', () => {
    const blocks = linesToBlocks(
      [
        line('1. Primer punto, que sigue', 200, 10, 1, 60),
        line('en una segunda línea.', 186, 10, 1, 68),
        line('Texto de cierre en el margen.', 172, 10, 1, 52),
      ],
      bodyHeight,
    );

    expect(blocks.map((b) => b.type)).toEqual(['list-item', 'paragraph']);
    expect(blocks[0]?.text).toBe('1. Primer punto, que sigue en una segunda línea.');
  });

  it('reconoce letras y viñetas como marcadores', () => {
    const blocks = linesToBlocks(
      [line('A. Opción uno.', 200, 10, 1, 60), line('B. Opción dos.', 186, 10, 1, 60), line('• Opción tres.', 172, 10, 1, 60)],
      bodyHeight,
    );
    expect(blocks.map((b) => b.type)).toEqual(['list-item', 'list-item', 'list-item']);
  });

  it('un título numerado sigue siendo título, no un punto de lista', () => {
    const blocks = linesToBlocks([line('1. Introducción', 200, 16), line('cuerpo del texto', 180)], bodyHeight);
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph']);
  });

  it('no confunde una fecha o un decimal al principio de línea', () => {
    const blocks = linesToBlocks([line('1.2. Este apartado continúa', 200), line('en la línea siguiente.', 186)], bodyHeight);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('paragraph');
  });
});

describe('dropRunningHeads', () => {
  it('elimina cabeceras repetidas y números de página', () => {
    const pages = [1, 2, 3].map((page) => [
      line('Manual de usuario', 200, 10, page),
      line(`contenido de la página ${page}`, 150, 10, page),
      line(String(page), 20, 10, page),
    ]);
    expect(dropRunningHeads(pages).flat().map((l) => l.text)).toEqual([
      'contenido de la página 1',
      'contenido de la página 2',
      'contenido de la página 3',
    ]);
  });

  // El caso del ISTQB: la cabecera ocupa dos líneas y el pie lleva el número dentro del texto.
  it('elimina cabeceras y pies repetidos de dos líneas', () => {
    const pages = [1, 2, 3].map((page) => [
      line('Ejemplo de Examen Modelo A Qualifications Board', 200, 10, page),
      line('Ejemplo de Examen - Preguntas', 186, 10, page),
      line(`contenido distinto en la página ${page}`, 150, 10, page),
      line(`Versión ES - V01.00 Página ${page} de 40`, 20, 10, page),
    ]);
    expect(dropRunningHeads(pages).flat().map((l) => l.text)).toEqual([
      'contenido distinto en la página 1',
      'contenido distinto en la página 2',
      'contenido distinto en la página 3',
    ]);
  });

  // Solo contiguas desde el borde: una frase repetida (un estribillo, una advertencia legal)
  // en segunda línea, con contenido real por encima, es texto del cuerpo y se queda.
  it('no toca una línea repetida si la del borde es contenido real', () => {
    const openings = ['Abre la primera página con su texto.', 'La segunda arranca distinto.', 'Y la tercera, a su manera.'];
    const closings = ['Cierra hablando de memoria.', 'Termina con otro asunto.', 'Acaba con una idea nueva.'];
    const pages = [1, 2, 3].map((page) => [
      line(openings[page - 1] ?? '', 200, 10, page),
      line('Advertencia: no distribuir.', 186, 10, page),
      line(closings[page - 1] ?? '', 150, 10, page),
    ]);
    expect(dropRunningHeads(pages).flat().map((l) => l.text)).toContain('Advertencia: no distribuir.');
  });

  // La segunda línea solo cae si se repite literalmente: «Pregunta: 01» y «Pregunta: 02» se
  // parecen normalizados los dígitos, pero son contenido. La cabecera de dos líneas es idéntica.
  it('no confunde títulos numerados consecutivos con una cabecera de dos líneas', () => {
    const pages = [1, 2, 3].map((page) => [
      line('Ejemplo de Examen - Preguntas', 200, 10, page),
      line(`Pregunta: 0${page}`, 186, 10, page),
      line(`enunciado de la pregunta ${page}`, 150, 10, page),
    ]);
    const kept = dropRunningHeads(pages).flat().map((l) => l.text);
    expect(kept).toContain('Pregunta: 01');
    expect(kept).not.toContain('Ejemplo de Examen - Preguntas');
  });
});

describe('bodyHeightOf', () => {
  it('usa la altura dominante, no la del título', () => {
    expect(bodyHeightOf([[line('t', 100, 20), line('a', 80), line('b', 60), line('c', 40)]])).toBe(10);
  });
});
