import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// El build "legacy" es el que funciona fuera del navegador (aquí, en Node).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { detectLanguage } from '../language';
import { bodyHeightOf, dropRunningHeads, itemsToLines, linesToBlocks, toRawItems, type Line } from './layout';
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
  return clean.flatMap((lines) => linesToBlocks(lines, bodyHeight));
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
});
