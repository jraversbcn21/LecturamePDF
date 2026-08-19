import type { Doc, Language } from './types';
import type { Bookmark } from './bookmarks';

/** Ficha ligera para la biblioteca: evita cargar los bloques de todos los documentos. */
export type LibraryEntry = {
  id: string;
  name: string;
  language: Language;
  totalSentences: number;
  addedAt: number;
  blockIndex: number;
  sentenceIndex: number;
  /** Frase absoluta dentro del documento: sirve para el % sin cargar los bloques. */
  position: number;
  bookmarks: Bookmark[];
  /** Velocidad elegida para este documento. */
  rate: number;
  /** Voz elegida a mano, si la hay; si no, se escoge por idioma. */
  voiceName: string | null;
  /** Índices de los títulos cuyas secciones se han escuchado enteras. */
  heardSections: number[];
  updatedAt: number;
};

const DB_NAME = 'lecturame';
const DOCS = 'docs';
const LIBRARY = 'library';

let connection: Promise<IDBDatabase> | null = null;

/** Una sola conexión para toda la sesión: abrir y cerrar en cada operación era una fuente de carreras. */
function connect(): Promise<IDBDatabase> {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const store of [DOCS, LIBRARY]) {
        if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return connection;
}

/**
 * El progreso se guarda en cada frase, así que hay escrituras solapadas.
 * Encolarlas garantiza que la última posición pedida es la última almacenada.
 */
let queue: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>): Promise<void> {
  queue = queue.catch(() => undefined).then(task);
  return queue;
}

async function request<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await connect();
  return new Promise<T>((resolve, reject) => {
    const result = action(db.transaction(store, mode).objectStore(store));
    result.onsuccess = () => resolve(result.result as T);
    result.onerror = () => reject(result.error);
  });
}

/** Lee y escribe la ficha en la MISMA transacción: nadie puede colarse en medio. */
async function updateEntry(id: string, patch: (entry: LibraryEntry | undefined) => LibraryEntry | null): Promise<void> {
  const db = await connect();
  return new Promise<void>((resolve, reject) => {
    const store = db.transaction(LIBRARY, 'readwrite').objectStore(LIBRARY);
    const read = store.get(id);
    read.onerror = () => reject(read.error);
    read.onsuccess = () => {
      const next = patch(read.result as LibraryEntry | undefined);
      if (!next) return resolve();
      const write = store.put(next, id);
      write.onsuccess = () => resolve();
      write.onerror = () => reject(write.error);
    };
  });
}

const countSentences = (doc: Doc): number => doc.blocks.reduce((total, block) => total + block.sentences.length, 0);

/** Guarda el documento conservando el progreso si ya se había abierto antes. */
export function saveDoc(doc: Doc): Promise<void> {
  return enqueue(async () => {
    await request(DOCS, 'readwrite', (s) => s.put(doc, doc.id));
    await updateEntry(doc.id, (previous) => ({
      id: doc.id,
      name: doc.name,
      language: doc.language,
      totalSentences: countSentences(doc),
      addedAt: previous?.addedAt ?? doc.addedAt,
      blockIndex: previous?.blockIndex ?? 0,
      sentenceIndex: previous?.sentenceIndex ?? 0,
      position: previous?.position ?? 0,
      bookmarks: previous?.bookmarks ?? [],
      rate: previous?.rate ?? 1,
      voiceName: previous?.voiceName ?? null,
      heardSections: previous?.heardSections ?? [],
      updatedAt: Date.now(),
    }));
  });
}

export function saveBookmarks(id: string, bookmarks: Bookmark[]): Promise<void> {
  return enqueue(() => updateEntry(id, (entry) => (entry ? { ...entry, bookmarks } : null)));
}

export function saveRate(id: string, rate: number): Promise<void> {
  return enqueue(() => updateEntry(id, (entry) => (entry ? { ...entry, rate } : null)));
}

export function saveVoice(id: string, voiceName: string): Promise<void> {
  return enqueue(() => updateEntry(id, (entry) => (entry ? { ...entry, voiceName } : null)));
}

export function saveHeardSections(id: string, heardSections: number[]): Promise<void> {
  return enqueue(() => updateEntry(id, (entry) => (entry ? { ...entry, heardSections } : null)));
}

export function saveProgress(id: string, blockIndex: number, sentenceIndex: number, position: number): Promise<void> {
  return enqueue(() =>
    updateEntry(id, (entry) => (entry ? { ...entry, blockIndex, sentenceIndex, position, updatedAt: Date.now() } : null)),
  );
}

export function deleteDoc(id: string): Promise<void> {
  return enqueue(async () => {
    await request(DOCS, 'readwrite', (s) => s.delete(id));
    await request(LIBRARY, 'readwrite', (s) => s.delete(id));
  });
}

export const getDoc = (id: string): Promise<Doc | undefined> => request(DOCS, 'readonly', (s) => s.get(id));

/** Espera a que se apliquen los guardados pendientes: si no, se lee un progreso viejo. */
const settled = (): Promise<void> => queue.catch(() => undefined);

/** Las fichas guardadas por versiones anteriores no traen todos los campos. */
const complete = (entry: LibraryEntry): LibraryEntry => ({
  ...entry,
  bookmarks: (entry.bookmarks ?? []).map((bookmark) => ({ ...bookmark, note: bookmark.note ?? '' })),
  rate: entry.rate ?? 1,
  voiceName: entry.voiceName ?? null,
  heardSections: entry.heardSections ?? [],
});

export async function getEntry(id: string): Promise<LibraryEntry | undefined> {
  await settled();
  const entry = await request<LibraryEntry | undefined>(LIBRARY, 'readonly', (s) => s.get(id));
  return entry && complete(entry);
}

export async function listLibrary(): Promise<LibraryEntry[]> {
  await settled();
  const entries = await request<LibraryEntry[]>(LIBRARY, 'readonly', (s) => s.getAll());
  return entries.map(complete).sort((a, b) => b.updatedAt - a.updatedAt);
}
