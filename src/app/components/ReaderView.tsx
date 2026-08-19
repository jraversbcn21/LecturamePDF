import { useEffect, useRef, type ReactNode } from 'react';
import type { Doc } from '../../core/types';
import type { SearchHit } from '../../core/search';
import type { WordRange } from '../usePlayer';

type Props = {
  doc: Doc;
  blockIndex: number;
  sentenceIndex: number;
  word: WordRange | null;
  /** Claves «bloque:frase» de las frases marcadas. */
  bookmarked: Set<string>;
  /** Coincidencias de la búsqueda, por clave «bloque:frase». */
  found: Map<string, SearchHit>;
  onJump: (blockIndex: number, sentenceIndex: number) => void;
};

type Mark = { start: number; end: number; className: string };

/**
 * Envuelve en `<mark>` los tramos señalados de la frase: el término buscado y la palabra que se
 * está pronunciando (esta última, solo si la voz emite límites de palabra).
 */
function withMarks(sentence: string, marks: Mark[]): ReactNode {
  const pieces: ReactNode[] = [];
  let at = 0;

  for (const mark of [...marks].sort((a, b) => a.start - b.start)) {
    const start = Math.max(mark.start, at);
    const end = Math.min(mark.end, sentence.length);
    // Tramo vacío o solapado con el anterior: gana el que empieza antes.
    if (end <= start) continue;
    pieces.push(
      sentence.slice(at, start),
      <mark key={start} className={mark.className}>
        {sentence.slice(start, end)}
      </mark>,
    );
    at = end;
  }

  if (pieces.length === 0) return sentence;
  pieces.push(sentence.slice(at));
  return <>{pieces}</>;
}

export function ReaderView({ doc, blockIndex, sentenceIndex, word, bookmarked, found, onJump }: Props) {
  const activeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = activeRef.current;
    const scroller = target?.closest('.reader');
    if (!target || !scroller) return;

    // Animar solo los saltos cortos. Al reabrir un documento largo o al saltar desde
    // el índice, deslizar decenas de páginas tarda segundos y marea.
    const distance = Math.abs(target.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
    const isNear = distance < scroller.clientHeight * 1.5;
    const prefersCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target.scrollIntoView({ block: 'center', behavior: isNear && !prefersCalm ? 'smooth' : 'auto' });
  }, [blockIndex, sentenceIndex]);

  return (
    <article className="reader">
      {doc.blocks.map((block, bIndex) => {
        const Tag = block.type === 'heading' ? 'h2' : 'p';
        return (
          <Tag key={bIndex} className={block.type}>
            {block.sentences.map((sentence, sIndex) => {
              const isActive = bIndex === blockIndex && sIndex === sentenceIndex;
              const isBookmarked = bookmarked.has(`${bIndex}:${sIndex}`);
              const hit = found.get(`${bIndex}:${sIndex}`);
              const marks: Mark[] = [];
              if (hit) marks.push({ start: hit.start, end: hit.end, className: 'hit' });
              if (isActive && word) marks.push({ start: word.start, end: word.end, className: 'word' });
              return (
                <span
                  key={sIndex}
                  ref={isActive ? activeRef : null}
                  className={`sentence${isActive ? ' active' : ''}${isBookmarked ? ' bookmarked' : ''}`}
                  onClick={() => onJump(bIndex, sIndex)}
                  title={isBookmarked ? 'Marcada para repasar' : 'Leer desde aquí'}
                >
                  {marks.length > 0 ? withMarks(sentence, marks) : sentence}{' '}
                </span>
              );
            })}
            {/* De tablas y fórmulas la voz solo da el aviso; el contenido se queda a la vista. */}
            {(block.type === 'table' || block.type === 'formula') && <span className="not-spoken">{block.text}</span>}
          </Tag>
        );
      })}
    </article>
  );
}
