import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// El build "legacy" es el que funciona fuera del navegador (aquí, en Node).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { detectLanguage } from '../language';
import { bodyHeightOf, dropFootnotes, dropRunningHeads, itemsToLines, linesToBlocks, toRawItems, type Line } from './layout';
import type { BlockText } from './layout';

/** Mismo recorrido que `extractDoc`, pero sobre un PDF real generado con un navegador. */
async function blocksOf(path: string): Promise<BlockText[]> {
  const data = new Uint8Array(readFileSync(fileURLToPath(new URL(path, import.meta.url))));
  const pdf = await getDocument({ data }).promise;
  const pages: Line[][] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    pages.push(itemsToLines(toRawItems(content.items), pageNumber));
  }
  const clean = dropRunningHeads(pages);
  const bodyHeight = bodyHeightOf(clean);
  return dropFootnotes(clean, bodyHeight).flatMap((lines) => linesToBlocks(lines, bodyHeight));
}

describe('extracción sobre un PDF real', () => {
  it('reconstruye títulos y párrafos en el orden de lectura', async () => {
    const blocks = await blocksOf('./__fixtures__/sample.pdf');
    const texts = blocks.map((block) => block.text);

    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Fundamentos de la memoria', page: 1 });
    expect(blocks.filter((block) => block.type === 'heading').map((block) => block.text)).toEqual([
      'Fundamentos de la memoria',
      'El papel de la repetición espaciada',
      'Atención y comprensión',
      'Conclusiones',
    ]);

    // Un párrafo de varias líneas llega entero y sin cortes a mitad de palabra.
    expect(texts).toContainEqual(expect.stringContaining('La memoria humana no funciona como un archivo'));
    expect(texts).toContainEqual(expect.stringContaining('recuerdos durante décadas si se consolidan adecuadamente'));

    // El salto de página no debe partir el discurso en trozos sueltos.
    expect(blocks.map((block) => block.page)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 3, 3]);
    const paragraphs = blocks.filter((block) => block.type === 'paragraph');
    expect(paragraphs).toHaveLength(6);
    expect(paragraphs.every((block) => block.text.length > 150)).toBe(true);
    expect(texts.join(' ')).not.toMatch(/[\p{L}]- /u);
  });

  it('detecta el idioma del documento', async () => {
    const blocks = await blocksOf('./__fixtures__/sample.pdf');
    expect(detectLanguage(blocks.map((block) => block.text).join('\n'))).toBe('es');
  });
});

describe('tablas, llamadas de nota y fórmulas en un PDF real', () => {
  it('un superíndice no parte el párrafo, y su número no se lee', async () => {
    const blocks = await blocksOf('./__fixtures__/tables.pdf');
    const paragraph = blocks.find((block) => block.text.startsWith('El programa se organiza'));

    // Antes salían tres bloques: «…cuántas horas lectivas», «1» y «exige.».
    expect(paragraph?.text).toMatch(/cuántas horas lectivas exige\.$/);
    expect(blocks.map((block) => block.text)).not.toContain('1');
  });

  it('la tabla es un bloque aparte, con sus renglones enteros', async () => {
    const blocks = await blocksOf('./__fixtures__/tables.pdf');
    const tables = blocks.filter((block) => block.type === 'table');

    expect(tables).toHaveLength(1);
    expect(tables[0]?.text.split('\n')).toEqual([
      'Nivel Duración Horas Coste',
      'Fundamentos 3 meses 40 250 €',
      'Avanzado 6 meses 90 480 €',
      'Experto 12 meses 160 900 €',
    ]);
    // Y no se lleva por delante los párrafos que la rodean.
    expect(blocks.some((block) => block.text.startsWith('La retención esperada'))).toBe(true);
  });

  it('las notas al pie no entran en el hilo de lectura', async () => {
    const blocks = await blocksOf('./__fixtures__/tables.pdf');
    expect(blocks.map((block) => block.text).join(' ')).not.toContain('Ebbinghaus');
  });

  // pdf.js entrega el espacio como un fragmento suelto y se descarta por vacío; lo que queda es
  // el hueco, que en una letra en cursiva se parece demasiado al de una palabra partida.
  it('no pega las palabras alrededor de una letra en cursiva', async () => {
    const blocks = await blocksOf('./__fixtures__/tables.pdf');
    const paragraph = blocks.find((block) => block.text.startsWith('La retención esperada'));

    expect(paragraph?.text).toContain('donde t es el tiempo');
    expect(paragraph?.text).toContain('y S la fuerza');
  });

  it('la fórmula es un bloque propio, entero y en orden', async () => {
    const blocks = await blocksOf('./__fixtures__/tables.pdf');
    const formulas = blocks.filter((block) => block.type === 'formula');

    // El exponente iba en un bloque suelto y, por ir más arriba, se leía antes que la fórmula.
    expect(blocks.map((block) => block.text)).not.toContain('−t / S');
    expect(formulas).toHaveLength(1);
    expect(formulas[0]?.text).toBe('R = e−t / S, con S = S₀ · (1 + α · n)');
  });

  it('los párrafos que rodean a la fórmula siguen siendo párrafos', async () => {
    const blocks = await blocksOf('./__fixtures__/tables.pdf');
    const around = blocks.filter((block) => block.text.startsWith('La retención') || block.text.startsWith('El resultado'));

    expect(around).toHaveLength(2);
    expect(around.every((block) => block.type === 'paragraph')).toBe(true);
  });
});

describe('listas en un PDF real', () => {
  it('separa cada punto y no los mezcla con el párrafo que los rodea', async () => {
    const blocks = await blocksOf('./__fixtures__/lists.pdf');

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'list-item',
      'list-item',
      'list-item',
      'list-item',
      'paragraph',
      'heading',
      'paragraph',
      'list-item',
      'list-item',
      'list-item',
      'paragraph',
    ]);

    const items = blocks.filter((block) => block.type === 'list-item').map((block) => block.text);
    expect(items.map((text) => text.slice(0, 2))).toEqual(['1.', '2.', '3.', '4.', 'A.', 'B.', 'C.']);

    // El ítem largo llega entero, con sus líneas de continuación.
    expect(items[0]).toContain('Member boards may adapt the syllabus');
    // Y el párrafo siguiente no se queda pegado al último punto.
    expect(items[3]).not.toContain('To the international');
    expect(blocks[6]?.text).toMatch(/^To the international/);
  });

  // Maqueta apretada: los bloques se separan menos de lo que pide `leading * 1.5`, así que
  // la sangría es la única señal... y la primera lista no la tiene.
  it('cierra la lista aunque no esté sangrada respecto al cuerpo', async () => {
    const blocks = await blocksOf('./__fixtures__/lists-flush.pdf');

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'list-item',
      'list-item',
      'list-item',
      'list-item',
      'paragraph',
      'heading',
      'paragraph',
      'list-item',
      'list-item',
      'list-item',
      'paragraph',
    ]);

    const items = blocks.filter((block) => block.type === 'list-item').map((block) => block.text);
    expect(items.map((text) => text.slice(0, 2))).toEqual(['1.', '2.', '3.', '4.', 'A.', 'B.', 'C.']);
    // Cada punto llega entero: cerrar la lista no puede costar sus líneas de continuación.
    expect(items[0]).toContain('respete el sentido de cada objetivo de aprendizaje');
    expect(items[3]).toContain('no baje del mínimo acordado');
    // Y el párrafo que sigue al último punto es un bloque aparte, no su cola.
    expect(items[3]).not.toContain('A la organización internacional');
    expect(blocks[6]?.text).toMatch(/^A la organización internacional/);
  });
});
