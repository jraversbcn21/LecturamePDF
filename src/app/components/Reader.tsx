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
import { PdfPane } from './PdfPane';

type Props = {
  doc: Doc;
  start: PlayerStart;
  bookmarks: Bookmark[];
  heardSections: number[];
  onClose: () => void;
};

const IGNORED_TAGS = /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/;

/** Ancho a partir del cual la barra lateral cabe al lado del texto. Va con el media query de styles.css. */
const WIDE = '(min-width: 1100px)';

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
  const [sidebar, setSidebar] = useState(() => window.matchMedia(WIDE).matches);
  const [pdf, setPdf] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Los dos paneles se reparten el mismo hueco a los lados del texto, así que no caben a la vez.
  const showSidebar = useCallback((open: boolean) => {
    setSidebar(open);
    if (open) setPdf(false);
  }, []);

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

  const focusSearch = useCallback(() => {
    if (sidebar) {
      searchRef.current?.focus();
      return;
    }
    // Recogida, el buscador está oculto y no admite el foco hasta que React vuelve a pintarlo.
    showSidebar(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [sidebar, showSidebar]);

  // Cuando se superpone al texto, saltar desde ella y dejarla abierta tapa lo que vas a leer.
  const jump = useCallback((blockIndex: number, sentenceIndex?: number) => {
    dispatch({ type: 'JUMP', blockIndex, sentenceIndex });
    if (!window.matchMedia(WIDE).matches) setSidebar(false);
  }, [dispatch]);

  const toggleCurrent = useCallback(
    () => toggle({ blockIndex: state.blockIndex, sentenceIndex: state.sentenceIndex }),
    [toggle, state.blockIndex, state.sentenceIndex],
  );
  useKeyboard(dispatch, state.rate, onClose, focusSearch, toggleCurrent);

  return (
    <div className="screen reading">
      <header className="bar">
        <button onClick={onClose}>← Biblioteca</button>
        <button
          className="ghost"
          aria-expanded={sidebar}
          aria-controls="sidebar"
          aria-label={sidebar ? 'Ocultar el índice, la búsqueda y los marcadores' : 'Mostrar el índice, la búsqueda y los marcadores'}
          title={sidebar ? 'Ocultar la barra lateral' : 'Mostrar la barra lateral'}
          // Sin soltar el foco, la barra espaciadora volvería a pulsar este botón en vez de reproducir.
          onClick={(event) => {
            event.currentTarget.blur();
            showSidebar(!sidebar);
          }}
        >
          ☰
        </button>
        <button
          className="ghost"
          aria-expanded={pdf}
          aria-controls="pdf-pane"
          aria-label={pdf ? 'Cerrar el PDF original' : 'Ver el PDF original, para figuras y tablas'}
          title={pdf ? 'Cerrar el PDF original' : 'Ver el PDF original'}
          onClick={(event) => {
            event.currentTarget.blur();
            setPdf((open) => !open);
            if (!pdf) setSidebar(false);
          }}
        >
          📄
        </button>
        <h1>{doc.name}</h1>
        <span className="tag">{doc.language === 'es' ? 'Español' : 'Inglés'}</span>
      </header>

      <div className="body">
        <aside id="sidebar" className={sidebar ? 'sidebar open' : 'sidebar'}>
          <Search
            results={results}
            query={query}
            onQueryChange={setQuery}
            onJump={jump}
            inputRef={searchRef}
          />
          {query.trim() === '' && (
            <div className="sidebar-scroll">
              <Bookmarks bookmarks={bookmarks} onJump={jump} onRemove={remove} onAnnotate={annotate} />
              <Outline blocks={doc.blocks} blockIndex={state.blockIndex} heard={heard} onJump={jump} />
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
        {pdf && (
          <PdfPane
            docId={doc.id}
            name={doc.name}
            readingPage={doc.blocks[state.blockIndex]?.page ?? 1}
            onClose={() => setPdf(false)}
          />
        )}
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
