import { useCallback, useState } from 'react';
import type { Block } from '../core/types';
import { makeBookmark, removeBookmark, setNote, toggleBookmark, type Bookmark } from '../core/bookmarks';
import { saveBookmarks } from '../core/storage';

export type Spot = { blockIndex: number; sentenceIndex: number };

export function useBookmarks(docId: string, blocks: Block[], initial: Bookmark[]) {
  const [bookmarks, setBookmarks] = useState(initial);

  const persist = useCallback(
    (next: Bookmark[]) => {
      setBookmarks(next);
      void saveBookmarks(docId, next);
    },
    [docId],
  );

  const toggle = useCallback(
    (spot: Spot) => persist(toggleBookmark(bookmarks, makeBookmark(blocks, spot, Date.now()))),
    [bookmarks, blocks, persist],
  );

  const remove = useCallback((spot: Spot) => persist(removeBookmark(bookmarks, spot)), [bookmarks, persist]);

  const annotate = useCallback(
    (spot: Spot, note: string) => persist(setNote(bookmarks, spot, note)),
    [bookmarks, persist],
  );

  return { bookmarks, toggle, remove, annotate };
}
