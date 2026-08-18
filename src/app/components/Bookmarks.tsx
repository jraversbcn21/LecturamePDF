import { useRef, useState } from 'react';
import type { Bookmark } from '../../core/bookmarks';
import type { Spot } from '../useBookmarks';

type Props = {
  bookmarks: Bookmark[];
  onJump: (blockIndex: number, sentenceIndex: number) => void;
  onRemove: (spot: Spot) => void;
  onAnnotate: (spot: Spot, note: string) => void;
};

const keyOf = (spot: Spot): string => `${spot.blockIndex}-${spot.sentenceIndex}`;

export function Bookmarks({ bookmarks, onJump, onRemove, onAnnotate }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Escape cierra el editor y dispara el blur: sin esto, cancelar guardaría igualmente.
  const cancelled = useRef(false);

  if (bookmarks.length === 0) return null;

  const startEditing = (bookmark: Bookmark) => {
    cancelled.current = false;
    setDraft(bookmark.note);
    setEditing(keyOf(bookmark));
  };

  const commit = (bookmark: Bookmark) => {
    setEditing(null);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (draft.trim() !== bookmark.note) onAnnotate(bookmark, draft);
  };

  return (
    <section className="bookmarks" aria-label="Marcadores">
      <h2 className="sidebar-title">Marcadores ({bookmarks.length})</h2>
      <ul>
        {bookmarks.map((bookmark) => {
          const key = keyOf(bookmark);
          const isEditing = editing === key;
          return (
            <li key={key}>
              <div className="bookmark-row">
                <button className="bookmark" onClick={() => onJump(bookmark.blockIndex, bookmark.sentenceIndex)}>
                  <span className="bookmark-text">{bookmark.text}</span>
                  <span className="bookmark-meta">
                    {/* Al marcar un título, su sección es él mismo: no hace falta repetirlo. */}
                    {bookmark.section && bookmark.section !== bookmark.text ? `${bookmark.section} · ` : ''}
                    pág. {bookmark.page}
                  </span>
                </button>
                <button
                  className="ghost bookmark-action"
                  onClick={() => startEditing(bookmark)}
                  aria-label={bookmark.note ? 'Editar la nota' : 'Añadir una nota'}
                  title={bookmark.note ? 'Editar la nota' : 'Añadir una nota'}
                >
                  ✎
                </button>
                <button
                  className="ghost bookmark-action"
                  onClick={() => onRemove(bookmark)}
                  aria-label={`Quitar marcador: ${bookmark.text.slice(0, 40)}`}
                  title="Quitar marcador"
                >
                  ✕
                </button>
              </div>

              {isEditing ? (
                <textarea
                  className="bookmark-note-edit"
                  value={draft}
                  autoFocus
                  rows={2}
                  placeholder="Por qué vuelves aquí…"
                  aria-label={`Nota para: ${bookmark.text.slice(0, 40)}`}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => commit(bookmark)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      cancelled.current = true;
                      setEditing(null);
                    }
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                bookmark.note !== '' && (
                  <p className="bookmark-note" onClick={() => startEditing(bookmark)}>
                    {bookmark.note}
                  </p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
