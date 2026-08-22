import { useCallback, useEffect, useState } from 'react';
import type { Doc } from '../core/types';
import type { Bookmark } from '../core/bookmarks';
import { extractDoc } from '../core/pdf/extract';
import { deleteDoc, getDoc, getEntry, listLibrary, saveDoc, saveFile, type LibraryEntry } from '../core/storage';
import { autoSync, clearSyncCode, deletePdf, downloadPdf, getSyncCode, saveSyncCode, syncLibrary, uploadPdf } from '../core/sync';
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
  const [synced, setSynced] = useState(() => !!getSyncCode());

  // Los tombstones se quedan en la base para que el borrado viaje, pero no se enseñan.
  const refresh = useCallback(() => listLibrary().then((list) => setEntries(list.filter((entry) => !entry.deleted))), []);
  useEffect(() => void refresh(), [refresh]);

  useEffect(() => {
    if (!synced) return;
    autoSync((message) => setError(`Sin sincronizar: ${message}`));
    void syncLibrary()
      .then(refresh)
      .catch((cause: unknown) => setError(`Sin sincronizar: ${cause instanceof Error ? cause.message : 'fallo de red.'}`));
  }, [synced, refresh]);

  const openDoc = useCallback(async (id: string) => {
    let doc = await getDoc(id);
    const entry = await getEntry(id);
    // Subido desde otro dispositivo: aquí solo está la ficha. Se baja el PDF y se extrae en local.
    if (!doc && entry) {
      setBusy(true);
      try {
        const pdf = await downloadPdf(id);
        if (pdf) {
          const file = new File([pdf], entry.name, { type: 'application/pdf' });
          doc = await extractDoc(file);
          await saveDoc(doc);
          await saveFile(doc.id, file);
        }
      } catch {
        doc = undefined;
      } finally {
        setBusy(false);
      }
    }
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
        // A la nube sin esperar: la lectura no depende de la subida, y si falla se avisa y ya.
        uploadPdf(doc.id, file).catch(() => setError('El PDF está guardado aquí, pero no se ha podido subir a la nube.'));
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

  const removeDoc = useCallback(
    (id: string) => {
      void deleteDoc(id)
        .then(() => deletePdf(id).catch(() => undefined))
        .then(refresh);
    },
    [refresh],
  );

  const connectSync = useCallback((code: string) => {
    saveSyncCode(code);
    setError(null);
    setSynced(true); // el efecto de arriba hace la primera sincronización
  }, []);

  const disconnectSync = useCallback(() => {
    clearSyncCode();
    setSynced(false);
  }, []);

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
      synced={synced}
      onFile={(file) => void addFile(file)}
      onOpen={(id) => void openDoc(id)}
      onDelete={removeDoc}
      onConnectSync={connectSync}
      onDisconnectSync={disconnectSync}
    />
  );
}
