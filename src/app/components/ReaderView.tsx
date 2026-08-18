import { useEffect, useRef, type ReactNode } from 'react';
import type { Doc } from '../../core/types';
import type { WordRange } from '../usePlayer';

type Props = {
  doc: Doc;
  blockIndex: number;
  sentenceIndex: number;
  word: WordRange | null;
  /** Claves «bloque:frase» de las frases marcadas. */
  bookmarked: Set<string>;
  onJump: (blockIndex: number, sentenceIndex: number) => void;
};

/** Resalta la palabra en curso dentro de la frase activa (si la voz emite límites de palabra). */
function withWord(sentence: string, word: WordRange | null): ReactNode {
  if (!word || word.start >= sentence.length) return sentence;
  return (
    <>
      {sentence.slice(0, word.start)}
      <mark className="word">{sentence.slice(word.start, word.end)}</mark>
      {sentence.slice(word.end)}
    </>
  );
}

export function ReaderView({ doc, blockIndex, sentenceIndex, word, bookmarked, onJump }: Props) {
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
              return (
                <span
                  key={sIndex}
                  ref={isActive ? activeRef : null}
                  className={`sentence${isActive ? ' active' : ''}${isBookmarked ? ' bookmarked' : ''}`}
                  onClick={() => onJump(bIndex, sIndex)}
                  title={isBookmarked ? 'Marcada para repasar' : 'Leer desde aquí'}
                >
                  {isActive ? withWord(sentence, word) : sentence}{' '}
                </span>
              );
            })}
          </Tag>
        );
      })}
    </article>
  );
}
