import type { Block } from './types';
import { sectionOf } from './outline';

export type Bookmark = {
  blockIndex: number;
  sentenceIndex: number;
  /** Frase marcada, para reconocerla en la lista sin abrir el documento. */
  text: string;
  section: string;
  page: number;
  /** Anotación libre: por qué querías volver aquí. */
  note: string;
  createdAt: number;
};

type Spot = { blockIndex: number; sentenceIndex: number };

const sameSpot = (a: Spot, b: Spot): boolean =>
  a.blockIndex === b.blockIndex && a.sentenceIndex === b.sentenceIndex;

const byPosition = (a: Bookmark, b: Bookmark): number =>
  a.blockIndex - b.blockIndex || a.sentenceIndex - b.sentenceIndex;

export const isBookmarked = (bookmarks: Bookmark[], spot: Spot): boolean =>
  bookmarks.some((bookmark) => sameSpot(bookmark, spot));

/** Marca la frase, o la desmarca si ya lo estaba. En orden de lectura, que es el del repaso. */
export function toggleBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
  if (isBookmarked(bookmarks, bookmark)) return bookmarks.filter((existing) => !sameSpot(existing, bookmark));
  return [...bookmarks, bookmark].sort(byPosition);
}

export const removeBookmark = (bookmarks: Bookmark[], spot: Spot): Bookmark[] =>
  bookmarks.filter((bookmark) => !sameSpot(bookmark, spot));

/** Escribe (o borra, si se deja vacía) la nota de un marcador. */
export const setNote = (bookmarks: Bookmark[], spot: Spot, note: string): Bookmark[] =>
  bookmarks.map((bookmark) => (sameSpot(bookmark, spot) ? { ...bookmark, note: note.trim() } : bookmark));

/** Construye el marcador de una frase con su contexto: sección y página. */
export function makeBookmark(blocks: Block[], spot: Spot, createdAt: number): Bookmark {
  const block = blocks[spot.blockIndex];
  return {
    ...spot,
    text: block?.sentences[spot.sentenceIndex] ?? '',
    section: sectionOf(blocks, spot.blockIndex),
    page: block?.page ?? 1,
    note: '',
    createdAt,
  };
}
