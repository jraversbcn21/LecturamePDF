import { describe, expect, it } from 'vitest';
import { mergeEntries, type Mergeable } from './merge';

const entry = (id: string, updatedAt: number, deleted?: boolean): Mergeable => ({ id, updatedAt, deleted });

describe('mergeEntries', () => {
  it('conserva las fichas que solo están en un lado', () => {
    const merged = mergeEntries([entry('a', 1)], [entry('b', 2)]);
    expect(merged.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  it('con la misma ficha en los dos lados gana la más reciente', () => {
    expect(mergeEntries([entry('a', 1)], [entry('a', 2)])[0]?.updatedAt).toBe(2);
    expect(mergeEntries([entry('a', 3)], [entry('a', 2)])[0]?.updatedAt).toBe(3);
  });

  // El borrado es un cambio más: si es lo último que pasó, se impone; si después se
  // volvió a subir el documento, la ficha nueva lo resucita.
  it('el tombstone gana o pierde por fecha, como cualquier cambio', () => {
    expect(mergeEntries([entry('a', 1)], [entry('a', 2, true)])[0]?.deleted).toBe(true);
    expect(mergeEntries([entry('a', 3)], [entry('a', 2, true)])[0]?.deleted).toBeUndefined();
  });

  it('a igual fecha se queda la primera: nada se duplica', () => {
    const merged = mergeEntries([entry('a', 2)], [entry('a', 2, true)]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.deleted).toBeUndefined();
  });
});
