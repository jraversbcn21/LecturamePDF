import { describe, expect, it } from 'vitest';
import { isBookmarked, makeBookmark, removeBookmark, setNote, toggleBookmark, type Bookmark } from './bookmarks';
import type { Block } from './types';

const block = (type: Block['type'], sentences: string[], page = 1): Block => ({
  type,
  text: sentences.join(' '),
  page,
  sentences,
});

const blocks: Block[] = [
  block('heading', ['2. Diseño de pruebas'], 5),
  block('paragraph', ['Primera frase.', 'Segunda frase.'], 5),
  block('paragraph', ['Otra sección más adelante.'], 6),
];

const at = (blockIndex: number, sentenceIndex: number): Bookmark =>
  makeBookmark(blocks, { blockIndex, sentenceIndex }, 1000);

describe('makeBookmark', () => {
  it('guarda la frase con su sección y su página', () => {
    expect(at(1, 1)).toEqual({
      blockIndex: 1,
      sentenceIndex: 1,
      text: 'Segunda frase.',
      section: '2. Diseño de pruebas',
      page: 5,
      note: '',
      createdAt: 1000,
    });
  });

  it('aguanta una posición que ya no existe', () => {
    expect(makeBookmark(blocks, { blockIndex: 99, sentenceIndex: 0 }, 1000)).toMatchObject({ text: '', page: 1 });
  });
});

describe('toggleBookmark', () => {
  it('añade en orden de lectura, no de creación', () => {
    const list = toggleBookmark(toggleBookmark([], at(2, 0)), at(1, 0));
    expect(list.map((bookmark) => bookmark.text)).toEqual(['Primera frase.', 'Otra sección más adelante.']);
  });

  it('vuelve a pulsarlo y se quita', () => {
    const list = toggleBookmark([], at(1, 0));
    expect(toggleBookmark(list, at(1, 0))).toEqual([]);
  });

  it('distingue frases distintas del mismo bloque', () => {
    const list = toggleBookmark(toggleBookmark([], at(1, 0)), at(1, 1));
    expect(list).toHaveLength(2);
    expect(isBookmarked(list, { blockIndex: 1, sentenceIndex: 1 })).toBe(true);
    expect(isBookmarked(list, { blockIndex: 1, sentenceIndex: 0 })).toBe(true);
    expect(isBookmarked(list, { blockIndex: 2, sentenceIndex: 0 })).toBe(false);
  });
});

describe('setNote', () => {
  const list = toggleBookmark(toggleBookmark([], at(1, 0)), at(2, 0));

  it('anota solo el marcador indicado', () => {
    const noted = setNote(list, { blockIndex: 1, sentenceIndex: 0 }, 'Repasar esto antes del examen');
    expect(noted[0]?.note).toBe('Repasar esto antes del examen');
    expect(noted[1]?.note).toBe('');
  });

  it('recorta los espacios y permite borrar la nota', () => {
    const noted = setNote(list, { blockIndex: 1, sentenceIndex: 0 }, '  con espacios  ');
    expect(noted[0]?.note).toBe('con espacios');
    expect(setNote(noted, { blockIndex: 1, sentenceIndex: 0 }, '   ')[0]?.note).toBe('');
  });

  it('no toca el resto del marcador', () => {
    const noted = setNote(list, { blockIndex: 1, sentenceIndex: 0 }, 'nota');
    expect(noted[0]).toMatchObject({ text: 'Primera frase.', section: '2. Diseño de pruebas', page: 5 });
  });
});

describe('removeBookmark', () => {
  it('quita solo el indicado', () => {
    const list = toggleBookmark(toggleBookmark([], at(1, 0)), at(2, 0));
    expect(removeBookmark(list, { blockIndex: 1, sentenceIndex: 0 }).map((b) => b.text)).toEqual([
      'Otra sección más adelante.',
    ]);
  });
});
