/**
 * Fusión de bibliotecas entre dispositivos: por cada ficha gana la de `updatedAt` más reciente.
 * Un borrado viaja como tombstone (`deleted: true`) en la propia ficha, así que compite por
 * fecha igual que cualquier otro cambio y se propaga sin un canal aparte.
 *
 * Es lógica pura y sin dependencias a propósito: la usan el navegador (src/core/sync.ts) y la
 * función serverless (api/library.ts), que no puede importar nada que toque IndexedDB.
 */
export type Mergeable = { id: string; updatedAt: number; deleted?: boolean };

export function mergeEntries<T extends Mergeable>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const entry of [...a, ...b]) {
    const previous = byId.get(entry.id);
    if (!previous || entry.updatedAt > previous.updatedAt) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}
