import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import type { Doc } from '../../core/types';
import { isBookmarked, type Bookmark } from '../../core/bookmarks';
import { useBookmarks } from '../useBookmarks';
import { RATES, type PlayerAction } from '../playerReducer';
import { usePlayer, type PlayerStart } from '../usePlayer';
import { outlineOf, sectionEndingAt } from '../../core/outline';
import { searchDoc } from '../../core/search';
import { saveHeardSections } from '../../core/storage';
import { ReaderView } from './ReaderView';
import { PlayerControls } from './PlayerControls';
import { Outline } from './Outline';
import { Search } from './Search';
import { Bookmarks } from './Bookmarks';

type Props = {
  doc: Doc;
  start: PlayerStart;
  bookmarks: Bookmark[];
  heardSections: number[];
  onClose: () => void;
};

const IGNORED_TAGS = /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/;

function useKeyboard(
  dispatch: Dispatch<PlayerAction>,
  rate: number,
  onClose: () => void,
  onSearch: () => void,
  onBookmark: () => void,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (IGNORED_TAGS.test((event.target as HTMLElement | null)?.tagName ?? '')) return;
      const rateStep = (delta: number) => {
        const next = RATES.findIndex((value) => value === rate) + delta;
        dispatch({ type: 'SET_RATE', rate: RATES[Math.min(Math.max(next, 0), RATES.length - 1)] ?? rate });
      };

      switch (event.key) {
        case ' ':
          dispatch({ type: 'TOGGLE' });
          break;
        case 'Tab':
          dispatch({ type: event.shiftKey ? 'PREV_BLOCK' : 'NEXT_BLOCK' });
          break;
        case 'ArrowRight':
          dispatch({ type: 'NEXT_SENTENCE' });
          break;
        case 'ArrowLeft':
          dispatch({ type: 'PREV_SENTENCE' });
          break;
        case 'ArrowUp':
          rateStep(1);
          break;
        case 'ArrowDown':
          rateStep(-1);
          break;
        // Tab lee el documento, así que la salida por teclado es Escape.
        case 'Escape':
          onClose();
          break;
        case '/':
          onSearch();
          break;
        case 'm':
        case 'M':
          onBookmark();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, rate, onClose, onSearch, onBookmark]);
}

export function Reader({ doc, start, bookmarks: initialBookmarks, heardSections, onClose }: Props) {
  const [heard, setHeard] = useState(() => new Set(heardSections));
  const outline = useMemo(() => outlineOf(doc.blocks), [doc.blocks]);

  // Una sección cuenta como escuchada cuando la voz termina su último bloque.
  const onBlockFinished = useCallback(
    (blockIndex: number) => {
      const heading = sectionEndingAt(outline, blockIndex, doc.blocks.length);
      if (heading === -1) return;
      setHeard((current) => {
        if (current.has(heading)) return current;
        const next = new Set(current).add(heading);
        void saveHeardSections(doc.id, [...next]);
        return next;
      });
    },
    [outline, doc.blocks.length, doc.id],
  );

  const { state, dispatch, voice, voices, setVoiceName, word } = usePlayer(doc, start, onBlockFinished);
  const { bookmarks, toggle, remove, annotate } = useBookmarks(doc.id, doc.blocks, initialBookmarks);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const spot = { blockIndex: state.blockIndex, sentenceIndex: state.sentenceIndex };
  const marked = useMemo(
    () => new Set(bookmarks.map((bookmark) => `${bookmark.blockIndex}:${bookmark.sentenceIndex}`)),
    [bookmarks],
  );

  // Una sola búsqueda para los dos sitios que la enseñan: la lista lateral y el texto.
  const results = useMemo(() => searchDoc(doc.blocks, query), [doc.blocks, query]);
  const found = useMemo(
    () => new Map(results.hits.map((hit) => [`${hit.blockIndex}:${hit.sentenceIndex}`, hit])),
    [results],
  );

  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  const toggleCurrent = useCallback(
    () => toggle({ blockIndex: state.blockIndex, sentenceIndex: state.sentenceIndex }),
    [toggle, state.blockIndex, state.sentenceIndex],
  );
  useKeyboard(dispatch, state.rate, onClose, focusSearch, toggleCurrent);

  return (
    <div className="screen reading">
      <header className="bar">
        <button onClick={onClose}>← Biblioteca</button>
        <h1>{doc.name}</h1>
        <span className="tag">{doc.language === 'es' ? 'Español' : 'Inglés'}</span>
      </header>

      <div className="body">
        <aside className="sidebar">
          <Search
            results={results}
            query={query}
            onQueryChange={setQuery}
            onJump={(blockIndex, sentenceIndex) => dispatch({ type: 'JUMP', blockIndex, sentenceIndex })}
            inputRef={searchRef}
          />
          {query.trim() === '' && (
            <div className="sidebar-scroll">
              <Bookmarks
                bookmarks={bookmarks}
                onJump={(blockIndex, sentenceIndex) => dispatch({ type: 'JUMP', blockIndex, sentenceIndex })}
                onRemove={remove}
                onAnnotate={annotate}
              />
              <Outline
                blocks={doc.blocks}
                blockIndex={state.blockIndex}
                heard={heard}
                onJump={(blockIndex) => dispatch({ type: 'JUMP', blockIndex })}
              />
            </div>
          )}
        </aside>
        <ReaderView
          doc={doc}
          blockIndex={state.blockIndex}
          sentenceIndex={state.sentenceIndex}
          word={word}
          bookmarked={marked}
          found={found}
          onJump={(blockIndex, sentenceIndex) => dispatch({ type: 'JUMP', blockIndex, sentenceIndex })}
        />
      </div>

      <PlayerControls
        state={state}
        dispatch={dispatch}
        voice={voice}
        voices={voices}
        onVoiceChange={setVoiceName}
        page={doc.blocks[state.blockIndex]?.page ?? 1}
        isBookmarked={isBookmarked(bookmarks, spot)}
        onToggleBookmark={toggleCurrent}
      />
    </div>
  );
}
