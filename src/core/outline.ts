import type { Block } from './types';

export type OutlineEntry = {
  /** Posición del título dentro de `doc.blocks`. */
  index: number;
  text: string;
  page: number;
  level: number;
};

const NUMBERING = /^(\d+(?:\.\d+)*)[.)]?\s/;
const MAX_LEVEL = 3;

/** Nivel según la numeración: «2.» es nivel 1 y «2.1.» nivel 2. Sin numerar, nivel 1. */
export function headingLevel(text: string): number {
  const numbering = NUMBERING.exec(text)?.[1];
  return numbering ? Math.min(numbering.split('.').length, MAX_LEVEL) : 1;
}

/** Títulos del documento, para saltar de sección en sección. */
export function outlineOf(blocks: Block[]): OutlineEntry[] {
  return blocks.flatMap((block, index) =>
    block.type === 'heading' ? [{ index, text: block.text, page: block.page, level: headingLevel(block.text) }] : [],
  );
}

/** Título de la sección a la que pertenece un bloque; vacío si va antes del primer título. */
export function sectionOf(blocks: Block[], blockIndex: number): string {
  for (let index = Math.min(blockIndex, blocks.length - 1); index >= 0; index--) {
    const block = blocks[index];
    if (block?.type === 'heading') return block.text;
  }
  return '';
}

/**
 * Si este bloque es el último de una sección, devuelve el índice de su título; si no, -1.
 * Sirve para dar una sección por escuchada solo cuando la voz llega hasta su final.
 */
export function sectionEndingAt(outline: OutlineEntry[], blockIndex: number, totalBlocks: number): number {
  for (const [position, entry] of outline.entries()) {
    const last = (outline[position + 1]?.index ?? totalBlocks) - 1;
    if (blockIndex === last && blockIndex >= entry.index) return entry.index;
  }
  return -1;
}

/** Posición en el índice de la sección que se está escuchando; -1 si aún no ha empezado ninguna. */
export function activeEntry(outline: OutlineEntry[], blockIndex: number): number {
  let active = -1;
  outline.forEach((entry, position) => {
    if (entry.index <= blockIndex) active = position;
  });
  return active;
}
