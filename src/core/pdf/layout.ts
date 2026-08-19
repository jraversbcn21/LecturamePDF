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

export type Line = {
  text: string;
  x: number;
  y: number;
  height: number;
  page: number;
  /** Dónde empieza cada fragmento de la línea: es lo que delata las columnas de una tabla. */
  columns?: number[];
};

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
    // La tolerancia sale del mayor de los dos: un superíndice es pequeño y va en volado, así que
    // medida contra su propia altura nunca alcanzaría a la línea a la que pertenece, y el párrafo
    // se partiría en tres a su alrededor.
    if (ref && Math.abs(ref.y - item.y) <= Math.max(1, Math.max(ref.height, item.height) * 0.5)) last.push(item);
    else groups.push([item]);
  }

  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.x - b.x);
    const lineHeight = Math.max(...ordered.map((i) => i.height));
    // Llamada a nota al pie: un número en volado, más pequeño que la línea. Leerlo
    // («…lectivas exige. Uno.») estorba más de lo que aporta.
    const kept = ordered.filter((i) => !(i.height < lineHeight * 0.8 && /^\d{1,3}$/.test(i.text.trim())));
    const parts = kept.length > 0 ? kept : ordered;

    let text = '';
    let cursor = -Infinity;
    // Solo cuentan como columna los fragmentos tras un hueco de celda. Un hueco de palabra, aunque
    // el texto vaya justificado, se queda muy por debajo: si no, la prosa parecería una tabla.
    const columns: number[] = [];
    for (const item of parts) {
      const distance = item.x - cursor;
      // El umbral va por debajo del ancho de un espacio: pdf.js lo entrega como fragmento vacío,
      // que se descarta, y entonces el único rastro que queda de él es este hueco.
      const needsSpace = text !== '' && !/\s$/.test(text) && !/^\s/.test(item.text) && distance > item.height * 0.15;
      if (text === '' || distance > lineHeight * 0.8) columns.push(item.x);
      text += (needsSpace ? ' ' : '') + item.text;
      cursor = item.x + item.width;
    }
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      x: parts[0]?.x ?? 0,
      y: parts[0]?.y ?? 0,
      height: median(parts.map((i) => i.height)),
      page,
      columns,
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

/** Llamada de nota: «1.» «2)» «(3)». Sin número no hay forma de distinguirla de un pie de figura. */
const FOOTNOTE_MARKER = /^\(?\d{1,3}[.)]?\s+\S/;

/**
 * Quita las notas al pie: el bloque de cuerpo menor con el que termina la página, abierto por su
 * llamada numerada. Se leían enteras al acabar cada página, con sus citas y sus referencias, en
 * mitad del hilo. Siguen estando en el PDF original, a un clic.
 */
export function dropFootnotes(pages: Line[][], bodyHeight: number): Line[][] {
  return pages.map((lines) => {
    let start = lines.length;
    while (start > 0 && (lines[start - 1]?.height ?? 0) < bodyHeight * 0.85) start--;
    // Ni una página entera en cuerpo menor, ni un cierre que no empiece por una llamada.
    if (start === lines.length || start === 0 || !FOOTNOTE_MARKER.test(lines[start]?.text ?? '')) return lines;
    return lines.slice(0, start);
  });
}

const MAX_HEADING_WORDS = 15;

/** Marcadores de lista: «1.» «2)» «(3)» «A.» «iv)» «•» «-». */
const LIST_MARKER =
  /^(?:[•·▪◦‣∙*]|[-–—]|\(?(?:\d{1,3}|[A-Za-z]|[ivxlcdm]{2,6}|[IVXLCDM]{2,6})[.)])\s+\S/;

export const startsList = (text: string): boolean => LIST_MARKER.test(text);

/** Menos de tres columnas no distingue una tabla de un texto con sangrías o de un pie de figura. */
const MIN_COLUMNS = 3;

const sharedColumns = (a: Line, b: Line, tolerance: number): number =>
  (a.columns ?? []).filter((x) => (b.columns ?? []).some((other) => Math.abs(other - x) <= tolerance)).length;

/**
 * Marca las líneas que son renglones de una tabla: las que comparten columnas con la de al lado.
 * La alineación es la señal, no el tamaño del hueco, que también lo produce una sangría.
 */
function tableRows(lines: Line[], tolerance: number): boolean[] {
  const rows = lines.map(() => false);
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1];
    const b = lines[i];
    if (a && b && sharedColumns(a, b, tolerance) >= MIN_COLUMNS) rows[i - 1] = rows[i] = true;
  }
  return rows;
}

/** Une líneas en párrafos y marca los títulos. */
export function linesToBlocks(lines: Line[], bodyHeight: number): BlockText[] {
  if (lines.length === 0) return [];

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) gaps.push((lines[i - 1]?.y ?? 0) - (lines[i]?.y ?? 0));
  // El interlineado normal es de los huecos más pequeños; la mediana se contamina
  // en páginas con pocas líneas y muchos saltos de párrafo.
  const leading = Math.max(percentile(gaps.filter((gap) => gap > 0), 0.25), bodyHeight);

  const groups: Line[][] = [];
  /** Paralelo a `groups`: si el bloque es una tabla. */
  const isTable: boolean[] = [];
  const indentTolerance = bodyHeight * 0.5;
  const rows = tableRows(lines, indentTolerance);
  let anchor: Line | undefined;
  let anchorIsListItem = false;
  /** Hueco con el que se pegó la última línea al grupo en curso; 0 si el grupo es de una sola. */
  let groupGap = 0;

  for (const [index, line] of lines.entries()) {
    const previous = lines[index - 1];
    const gap = previous ? previous.y - line.y : 0;
    const isListItem = startsList(line.text);
    // Un ítem de lista termina cuando el texto vuelve al margen: sus líneas de
    // continuación van sangradas por debajo del marcador, nunca a su izquierda.
    const returnsToMargin = anchorIsListItem && anchor !== undefined && line.x < anchor.x - indentTolerance;
    // Las líneas de un mismo bloque van a distancia constante, así que un hueco mayor que el
    // del propio grupo delata uno nuevo aunque el margen izquierdo no cambie. Es lo único que
    // separa una lista sin sangrar del párrafo que la sigue, cuando la maqueta va apretada y
    // `leading * 1.5` no se alcanza nunca.
    // ponytail: no ayuda si el bloque en curso es de una sola línea (no hay hueco con el que
    // comparar); ahí sigue mandando `leading`. Haría falta el hueco típico entre puntos.
    const opensGap = groupGap > 0 && gap > groupGap * 1.15;
    // La tabla es un bloque aparte, entero: ni se parte por dentro ni se pega a lo que la rodea.
    const inTable = rows[index] ?? false;
    const startsBlock =
      !previous ||
      inTable !== (rows[index - 1] ?? false) ||
      (!inTable &&
        (gap > leading * 1.5 ||
          Math.abs(line.height - previous.height) > Math.max(previous.height, 1) * 0.15 ||
          isListItem ||
          returnsToMargin ||
          opensGap));

    if (startsBlock) {
      groups.push([line]);
      isTable.push(inTable);
      anchor = line;
      anchorIsListItem = isListItem;
      groupGap = 0;
    } else {
      groups[groups.length - 1]?.push(line);
      groupGap = gap;
    }
  }

  return groups.map((group, index) => {
    // Una tabla conserva sus renglones: pegarlos en un párrafo es justo lo que suena a sopa.
    if (isTable[index]) {
      return { type: 'table' as const, text: group.map((line) => line.text).join('\n'), page: group[0]?.page ?? 1 };
    }

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
