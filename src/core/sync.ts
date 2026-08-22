import { upload } from '@vercel/blob/client';
import { applyMerged, listLibrary, setOnWrite, type LibraryEntry } from './storage';

/**
 * Sincronización entre dispositivos, opcional: sin código guardado todo sigue siendo local.
 * El código es un secreto compartido que el usuario pega una vez en cada dispositivo (mismo
 * patrón que la clave de OpenRouter); el servidor lo compara con su SYNC_TOKEN.
 */
const CODE_KEY = 'lecturame:sync-code';
export const getSyncCode = (): string | null => localStorage.getItem(CODE_KEY);
export const saveSyncCode = (code: string): void => localStorage.setItem(CODE_KEY, code);
export const clearSyncCode = (): void => localStorage.removeItem(CODE_KEY);

// Cabecera propia y no `Authorization`: Vercel no reenvía esa última a la función.
const auth = (): Record<string, string> => ({ 'x-sync-token': getSyncCode() ?? '' });

/** Evita que aplicar lo que baja del servidor dispare a su vez otro empuje (bucle de 10 s en 10 s). */
let applying = false;

/**
 * Un viaje hace las dos direcciones: se empuja la biblioteca local, el servidor fusiona por
 * `updatedAt` con lo que tenga y devuelve el resultado, que se aplica en local.
 */
export async function syncLibrary(): Promise<void> {
  if (!getSyncCode()) return;
  const local = await listLibrary();
  const response = await fetch('/api/library', {
    method: 'PUT',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(local),
  });
  if (!response.ok) throw new Error(`La sincronización no responde (${response.status}).`);
  const merged = (await response.json()) as LibraryEntry[];
  applying = true;
  try {
    await applyMerged(merged);
  } finally {
    applying = false;
  }
}

/** Sube el PDF directo a Vercel Blob (con token que da /api/file): las funciones capan el cuerpo a ~4,5 MB. */
export async function uploadPdf(id: string, file: Blob): Promise<void> {
  const code = getSyncCode();
  if (!code) return;
  await upload(`files/${id}.pdf`, file, {
    access: 'public',
    handleUploadUrl: '/api/file',
    clientPayload: code,
    contentType: 'application/pdf',
  });
}

/** El PDF de otro dispositivo, o `null` si no está en la nube (o no hay sincronización). */
export async function downloadPdf(id: string): Promise<Blob | null> {
  if (!getSyncCode()) return null;
  const response = await fetch(`/api/file?id=${id}`, { headers: auth() });
  if (!response.ok) return null;
  const { url } = (await response.json()) as { url: string };
  const pdf = await fetch(url);
  if (!pdf.ok) return null;
  return pdf.blob();
}

export async function deletePdf(id: string): Promise<void> {
  if (!getSyncCode()) return;
  await fetch(`/api/file?id=${id}`, { method: 'DELETE', headers: auth() });
}

/**
 * Empuje automático: cada escritura local programa una sincronización. Throttle con disparo
 * al final (no debounce: el progreso se guarda en cada frase y un debounce no dispararía
 * nunca mientras suena la voz), más un último intento al esconderse la página.
 */
export function autoSync(onError: (message: string) => void): void {
  if (!getSyncCode()) return;
  let timer: number | null = null;
  const failed = (cause: unknown) => onError(cause instanceof Error ? cause.message : 'Fallo de red.');
  setOnWrite(() => {
    if (applying || timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      syncLibrary().catch(failed);
    }, 10_000);
  });
  window.addEventListener('pagehide', () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    // ponytail: empuje de despedida sin leer la respuesta; el keepalive capa el cuerpo a 64 KB,
    // si alguna biblioteca lo supera se pierde este último empuje y lo recoge el siguiente arranque.
    void listLibrary().then((local) =>
      fetch('/api/library', {
        method: 'PUT',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
        keepalive: true,
      }).catch(() => undefined),
    );
  });
}
