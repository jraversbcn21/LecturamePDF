import { useMemo, type RefObject } from 'react';
import type { Block } from '../../core/types';
import { searchDoc, type SearchHit } from '../../core/search';

type Props = {
  blocks: Block[];
  query: string;
  onQueryChange: (query: string) => void;
  onJump: (blockIndex: number, sentenceIndex: number) => void;
  inputRef: RefObject<HTMLInputElement>;
};

const BEFORE = 35;
const AFTER = 70;

/** Recorta la frase alrededor del término y lo resalta. */
function snippetOf(hit: SearchHit) {
  if (hit.end === 0) return { before: '', match: '', after: hit.text.slice(0, 110) };
  const from = Math.max(0, hit.start - BEFORE);
  return {
    before: (from > 0 ? '…' : '') + hit.text.slice(from, hit.start),
    match: hit.text.slice(hit.start, hit.end),
    after: hit.text.slice(hit.end, hit.end + AFTER) + (hit.text.length > hit.end + AFTER ? '…' : ''),
  };
}

function summaryOf(total: number, shown: number): string {
  if (total === 0) return 'Sin resultados';
  if (total > shown) return `${total} resultados (se muestran ${shown})`;
  return total === 1 ? '1 resultado' : `${total} resultados`;
}

export function Search({ blocks, query, onQueryChange, onJump, inputRef }: Props) {
  const { hits, total } = useMemo(() => searchDoc(blocks, query), [blocks, query]);
  const searching = query.trim() !== '';

  return (
    <>
      <div className="search">
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          value={query}
          placeholder="Buscar en el documento"
          aria-label="Buscar en el documento"
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            onQueryChange('');
            event.currentTarget.blur();
          }}
        />
        {searching && <p className="search-count">{summaryOf(total, hits.length)}</p>}
      </div>

      {searching && (
        <ul className="search-results">
          {hits.map((hit) => {
            const snippet = snippetOf(hit);
            return (
              <li key={`${hit.blockIndex}-${hit.sentenceIndex}`}>
                <button
                  className="result"
                  onClick={(event) => {
                    event.currentTarget.blur();
                    onJump(hit.blockIndex, hit.sentenceIndex);
                  }}
                >
                  <span className="result-text">
                    {snippet.before}
                    <mark>{snippet.match}</mark>
                    {snippet.after}
                  </span>
                  <span className="result-meta">
                    {hit.section || 'Sin sección'} · pág. {hit.page}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
