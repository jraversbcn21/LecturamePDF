import type { Block } from '../types';

/** Un fragmento de texto tal y como lo devuelve pdf.js, con su caja. */
export type RawItem = {
  text: string;
  x: number;
  /** Coordenada PDF: crece hacia arriba. */
  y: number;
  width: number;
  height: number;
};

export type Line = { text: string; x: number; y: number; height: number; page: number };

/**
 * Convierte los items de `getTextContent()` en cajas. Los items sin `str` son
 * marcas de estructura, no texto.
 */
export function toRawItems(items: readonly unknown[]): RawItem[] {
  return items.flatMap((raw) => {
    const item = raw as { str?: unknown; width?: number; height?: number; transform?: number[] };
    if (typeof item.str !== 'string') return [];
    const [, , , scaleY, x, y] = item.transform ?? [];
    return [
      {
        text: item.str,
        x: x ?? 0,
        y: y ?? 0,
        width: item.width ?? 0,
        height: Math.abs(scaleY ?? 0) || item.height || 0,
      },
    ];
  });
}

export type BlockText = Omit<Block, 'sentences'>;

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * ratio), sorted.length - 1)] ?? 0;
}

const median = (values: number[]): number => percentile(values, 0.5);

/** Agrupa items en líneas por coordenada vertical y los ordena por lectura. */
export function itemsToLines(items: RawItem[], page: number): Line[] {
  const visible = items.filter((i) => i.text.trim() !== '');
  if (visible.length === 0) return [];

  const groups: RawItem[][] = [];
  for (const item of [...visible].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const last = groups[groups.length - 1];
    const ref = last?.[0];
    if (ref && Math.abs(ref.y - item.y) <= Math.max(1, ref.height * 0.5)) last.push(item);
    else groups.push([item]);
  }

  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.x - b.x);
    let text = '';
    let cursor = -Infinity;
    for (const item of ordered) {
      const needsSpace = text !== '' && !/\s$/.test(text) && !/^\s/.test(item.text) && item.x - cursor > item.height * 0.25;
      text += (needsSpace ? ' ' : '') + item.text;
      cursor = item.x + item.width;
    }
    const heights = ordered.map((i) => i.height);
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      x: ordered[0]?.x ?? 0,
      y: ordered[0]?.y ?? 0,
      height: median(heights),
      page,
    };
  });
}

const isPageNumber = (text: string): boolean => /^[\divxlcIVXLC.\-—\s]{1,8}$/.test(text);
const MAX_RUNNING_HEAD_CHARS = 80;
const normalize = (text: string): string => text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Quita cabeceras, pies y números de página: escucharlos en cada página es insufrible.
 * Solo mira la primera y la última línea de cada página, y solo si son cortas,
 * para no tragarse texto real del cuerpo.
 */
export function dropRunningHeads(pages: Line[][]): Line[][] {
  const edgesOf = (lines: Line[]): Line[] =>
    [lines[0], lines[lines.length - 1]].filter((line): line is Line => line !== undefined && line.text.length <= MAX_RUNNING_HEAD_CHARS);
  const counts = new Map<string, number>();
  for (const lines of pages) {
    for (const key of new Set(edgesOf(lines).map((l) => normalize(l.text)))) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const repeated = (key: string): boolean => pages.length >= 3 && (counts.get(key) ?? 0) > pages.length * 0.5;

  return pages.map((lines) => {
    const edges = new Set(edgesOf(lines));
    return lines.filter((line) => !(edges.has(line) && (isPageNumber(line.text) || repeated(normalize(line.text)))));
  });
}

const MAX_HEADING_WORDS = 15;

/** Marcadores de lista: «1.» «2)» «(3)» «A.» «iv)» «•» «-». */
const LIST_MARKER =
  /^(?:[•·▪◦‣∙*]|[-–—]|\(?(?:\d{1,3}|[A-Za-z]|[ivxlcdm]{2,6}|[IVXLCDM]{2,6})[.)])\s+\S/;

export const startsList = (text: string): boolean => LIST_MARKER.test(text);

/** Une líneas en párrafos y marca los títulos. */
export function linesToBlocks(lines: Line[], bodyHeight: number): BlockText[] {
  if (lines.length === 0) return [];

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) gaps.push((lines[i - 1]?.y ?? 0) - (lines[i]?.y ?? 0));
  // El interlineado normal es de los huecos más pequeños; la mediana se contamina
  // en páginas con pocas líneas y muchos saltos de párrafo.
  const leading = Math.max(percentile(gaps.filter((gap) => gap > 0), 0.25), bodyHeight);

  const groups: Line[][] = [];
  const indentTolerance = bodyHeight * 0.5;
  let anchor: Line | undefined;
  let anchorIsListItem = false;

  for (const [index, line] of lines.entries()) {
    const previous = lines[index - 1];
    const isListItem = startsList(line.text);
    // Un ítem de lista termina cuando el texto vuelve al margen: sus líneas de
    // continuación van sangradas por debajo del marcador, nunca a su izquierda.
    // ponytail: si la lista no está sangrada respecto al cuerpo, el párrafo que
    // la sigue se queda pegado al último punto. Haría falta mirar el interlineado.
    const returnsToMargin = anchorIsListItem && anchor !== undefined && line.x < anchor.x - indentTolerance;
    const startsBlock =
      !previous ||
      previous.y - line.y > leading * 1.5 ||
      Math.abs(line.height - previous.height) > Math.max(previous.height, 1) * 0.15 ||
      isListItem ||
      returnsToMargin;

    if (startsBlock) {
      groups.push([line]);
      anchor = line;
      anchorIsListItem = isListItem;
    } else {
      groups[groups.length - 1]?.push(line);
    }
  }

  return groups.map((group) => {
    const text = group
      .reduce((acc, line) => {
        if (acc === '') return line.text;
        // Palabra partida por guion al final de línea: se recompone sin guion.
        return /[\p{L}]-$/u.test(acc) ? acc.slice(0, -1) + line.text : `${acc} ${line.text}`;
      }, '')
      .trim();
    const height = median(group.map((l) => l.height));
    const isHeading = height > bodyHeight * 1.15 && text.split(/\s+/).length <= MAX_HEADING_WORDS;
    // Un título numerado («1. Introducción») es un título, no un ítem de lista.
    const type = isHeading ? 'heading' : startsList(text) ? 'list-item' : 'paragraph';
    return { type, text, page: group[0]?.page ?? 1 };
  });
}

/** Altura de fuente dominante del documento: la referencia para detectar títulos. */
export function bodyHeightOf(pages: Line[][]): number {
  return median(pages.flat().map((l) => l.height));
}
