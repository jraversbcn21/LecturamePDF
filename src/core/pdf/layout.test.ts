import { describe, expect, it } from 'vitest';
import { bodyHeightOf, dropRunningHeads, itemsToLines, linesToBlocks, type Line, type RawItem } from './layout';

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
});

describe('bodyHeightOf', () => {
  it('usa la altura dominante, no la del título', () => {
    expect(bodyHeightOf([[line('t', 100, 20), line('a', 80), line('b', 60), line('c', 40)]])).toBe(10);
  });
});
