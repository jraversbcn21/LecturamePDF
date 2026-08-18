import type { Language } from './types';

/** Utterances más largas se cortan solas en Chromium (~15 s), así que troceamos. */
const MAX_CHARS = 280;

/** Parte un trozo demasiado largo por comas/espacios, sin pasar de MAX_CHARS. */
function chunk(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const parts: string[] = [];
  let current = '';
  for (const piece of text.split(/(?<=[,;:])\s+|\s+/)) {
    if (current && current.length + piece.length + 1 > MAX_CHARS) {
      parts.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * «1.», «A.» o «0.2.»: el segmentador toma por frase completa tanto el marcador de
 * un ítem de lista como la numeración de un título.
 */
const ORPHAN_MARKER = /^\(?(?:\d+(?:\.\d+)*|[A-Za-z]|[IVXLCDMivxlcdm]{2,6})[.)]$/;

/** Pega los marcadores sueltos a su frase: si no, la voz diría «uno» y se detendría. */
function joinMarkers(segments: string[]): string[] {
  return segments.reduce<string[]>((joined, segment) => {
    const previous = joined[joined.length - 1];
    if (previous !== undefined && ORPHAN_MARKER.test(previous)) joined[joined.length - 1] = `${previous} ${segment}`;
    else joined.push(segment);
    return joined;
  }, []);
}

/** Divide un bloque en frases pronunciables, en el orden original. */
export function splitSentences(text: string, language: Language): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' });
  const segments = [...segmenter.segment(clean)].map((s) => s.segment.trim()).filter(Boolean);
  return joinMarkers(segments).flatMap(chunk);
}
