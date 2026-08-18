import type { Block } from './types';

export type SearchHit = {
  blockIndex: number;
  sentenceIndex: number;
  text: string;
  page: number;
  /** Título de la sección en la que aparece, para situar el resultado. */
  section: string;
  /** Tramo coincidente dentro de `text`; 0,0 si no se pudo alinear. */
  start: number;
  end: number;
};

export type SearchResult = { hits: SearchHit[]; total: number };

const MIN_QUERY = 2;
const MAX_HITS = 60;

/** Sin acentos ni mayúsculas: «analisis» tiene que encontrar «análisis». */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Frases que contienen el término, con su sección y su posición en el documento. */
export function searchDoc(blocks: Block[], query: string): SearchResult {
  const needle = fold(query.trim());
  if (needle.length < MIN_QUERY) return { hits: [], total: 0 };

  const hits: SearchHit[] = [];
  let total = 0;
  let section = '';

  blocks.forEach((block, blockIndex) => {
    if (block.type === 'heading') section = block.text;
    block.sentences.forEach((text, sentenceIndex) => {
      const folded = fold(text);
      const start = folded.indexOf(needle);
      if (start === -1) return;

      total += 1;
      if (hits.length >= MAX_HITS) return;
      // Quitar tildes conserva la longitud en español; si no fuera así, no se resalta.
      const aligned = folded.length === text.length;
      hits.push({
        blockIndex,
        sentenceIndex,
        text,
        page: block.page,
        section,
        start: aligned ? start : 0,
        end: aligned ? start + needle.length : 0,
      });
    });
  });

  return { hits, total };
}
