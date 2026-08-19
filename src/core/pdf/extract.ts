import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Block, Doc, Language } from '../types';
import { detectLanguage } from '../language';
import { splitSentences } from '../sentences';
import {
  bodyHeightOf,
  dropFootnotes,
  dropRunningHeads,
  itemsToLines,
  linesToBlocks,
  toRawItems,
  type BlockText,
  type Line,
} from './layout';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Por debajo de esto el PDF es casi seguro un escaneo sin capa de texto. */
const MIN_CHARS_PER_PAGE = 40;

export class ScannedPdfError extends Error {
  constructor() {
    super('Este PDF no contiene texto extraíble (probablemente es un escaneo). El OCR llegará más adelante.');
    this.name = 'ScannedPdfError';
  }
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function linesPerPage(bytes: ArrayBuffer): Promise<Line[][]> {
  const pdf = await getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
  try {
    const pages: Line[][] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToLines(toRawItems(content.items), pageNumber));
      page.cleanup();
    }
    return pages;
  } finally {
    await pdf.destroy();
  }
}

/**
 * Lo que se dice de una tabla: recitarla celda a celda no se entiende, y el original está a un
 * clic. El número de página es la referencia para buscarla allí.
 */
function tableSummary(block: BlockText, language: Language): string {
  const rows = block.text.split('\n').length;
  return language === 'es'
    ? `Tabla de ${rows} ${rows === 1 ? 'fila' : 'filas'}, en la página ${block.page} del original.`
    : `Table of ${rows} ${rows === 1 ? 'row' : 'rows'}, on page ${block.page} of the original.`;
}

/** PDF -> documento listo para escuchar: bloques ordenados, idioma e id estable. */
export async function extractDoc(file: File): Promise<Doc> {
  const bytes = await file.arrayBuffer();
  const pages = dropRunningHeads(await linesPerPage(bytes));
  const bodyHeight = bodyHeightOf(pages);
  const blockTexts = dropFootnotes(pages, bodyHeight).flatMap((lines) => linesToBlocks(lines, bodyHeight));

  const fullText = blockTexts.map((b) => b.text).join('\n');
  if (fullText.length < MIN_CHARS_PER_PAGE * Math.max(pages.length, 1)) throw new ScannedPdfError();

  const language = detectLanguage(fullText);
  const blocks: Block[] = blockTexts
    .map((block) => ({
      ...block,
      sentences: block.type === 'table' ? [tableSummary(block, language)] : splitSentences(block.text, language),
    }))
    .filter((block) => block.sentences.length > 0);

  return { id: await sha256(bytes), name: file.name, language, blocks, addedAt: Date.now() };
}
