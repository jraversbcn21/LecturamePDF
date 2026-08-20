import { useCallback, useEffect, useState } from 'react';
import type { Doc } from '../core/types';
import type { Bookmark } from '../core/bookmarks';
import { extractDoc } from '../core/pdf/extract';
import { deleteDoc, getDoc, getEntry, listLibrary, saveDoc, saveFile, type LibraryEntry } from '../core/storage';
import { Library } from './components/Library';
import { Reader } from './components/Reader';
import type { PlayerStart } from './usePlayer';

type Open = {
  doc: Doc;
  start: PlayerStart;
  bookmarks: Bookmark[];
  heardSections: number[];
};

export function App() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [open, setOpen] = useState<Open | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => listLibrary().then(setEntries), []);
  useEffect(() => void refresh(), [refresh]);

  const openDoc = useCallback(async (id: string) => {
    const [doc, entry] = await Promise.all([getDoc(id), getEntry(id)]);
    if (!doc) {
      setError('No se ha podido abrir el documento.');
      return;
    }
    setOpen({
      doc,
      start: {
        blockIndex: entry?.blockIndex ?? 0,
        sentenceIndex: entry?.sentenceIndex ?? 0,
        rate: entry?.rate ?? 1,
        voiceName: entry?.voiceName ?? null,
        muted: entry?.muted ?? [],
      },
      bookmarks: entry?.bookmarks ?? [],
      heardSections: entry?.heardSections ?? [],
    });
  }, []);

  // Refrescar antes de salir: si no, la biblioteca aparece un instante con el progreso viejo.
  const closeDoc = useCallback(async () => {
    await refresh();
    setOpen(null);
  }, [refresh]);

  const addFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const doc = await extractDoc(file);
        await saveDoc(doc);
        // El original se guarda aparte, para poder consultar figuras y tablas que el texto pierde.
        await saveFile(doc.id, file);
        refresh();
        await openDoc(doc.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se ha podido leer el PDF.');
      } finally {
        setBusy(false);
      }
    },
    [openDoc, refresh],
  );

  if (open) {
    return (
      <Reader
        doc={open.doc}
        start={open.start}
        bookmarks={open.bookmarks}
        heardSections={open.heardSections}
        onClose={closeDoc}
      />
    );
  }

  return (
    <Library
      entries={entries}
      busy={busy}
      error={error}
      onFile={(file) => void addFile(file)}
      onOpen={(id) => void openDoc(id)}
      onDelete={(id) => void deleteDoc(id).then(refresh)}
    />
  );
}
