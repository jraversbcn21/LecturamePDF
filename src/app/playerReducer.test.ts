import { describe, expect, it } from 'vitest';
import { flatIndex, initPlayer, playerReducer, type PlayerState } from './playerReducer';

const state = (over: Partial<PlayerState> = {}): PlayerState => ({ ...initPlayer([2, 1, 2]), status: 'playing', ...over });

const position = (s: PlayerState): [number, number] => [s.blockIndex, s.sentenceIndex];

describe('playerReducer', () => {
  it('avanza de frase y salta al bloque siguiente al terminar el actual', () => {
    const afterFirst = playerReducer(state(), { type: 'SENTENCE_ENDED' });
    expect(position(afterFirst)).toEqual([0, 1]);
    expect(position(playerReducer(afterFirst, { type: 'SENTENCE_ENDED' }))).toEqual([1, 0]);
  });

  it('se detiene al acabar el documento', () => {
    const end = playerReducer(state({ blockIndex: 2, sentenceIndex: 1 }), { type: 'SENTENCE_ENDED' });
    expect(end.status).toBe('idle');
  });

  it('TAB salta el bloque entero sin perder la posición', () => {
    expect(position(playerReducer(state(), { type: 'NEXT_BLOCK' }))).toEqual([1, 0]);
  });

  it('retrocede al final del bloque anterior', () => {
    expect(position(playerReducer(state({ blockIndex: 1, sentenceIndex: 0 }), { type: 'PREV_SENTENCE' }))).toEqual([0, 1]);
  });

  it('no se sale por el principio', () => {
    expect(position(playerReducer(state(), { type: 'PREV_BLOCK' }))).toEqual([0, 0]);
  });

  it('alterna play/pausa y cambia la velocidad', () => {
    expect(playerReducer(state(), { type: 'TOGGLE' }).status).toBe('paused');
    expect(playerReducer(state({ status: 'paused' }), { type: 'TOGGLE' }).status).toBe('playing');
    expect(playerReducer(state(), { type: 'SET_RATE', rate: 1.5 }).rate).toBe(1.5);
  });

  it('JUMP recorta posiciones fuera de rango', () => {
    expect(position(playerReducer(state(), { type: 'JUMP', blockIndex: 99, sentenceIndex: 99 }))).toEqual([2, 1]);
  });

  it('initPlayer restaura el progreso guardado', () => {
    expect(position(initPlayer([2, 1, 2], 1, 0))).toEqual([1, 0]);
  });

  it('flatIndex cuenta las frases anteriores', () => {
    expect(flatIndex([2, 1, 2], 2, 1)).toBe(4);
  });
});

describe('bloques silenciados', () => {
  const silenced = (over: Partial<PlayerState> = {}): PlayerState => ({
    ...initPlayer([2, 1, 2], 0, 0, 1, [1]),
    status: 'playing',
    ...over,
  });

  it('el avance automático se salta el bloque silenciado', () => {
    const end = playerReducer(silenced({ sentenceIndex: 1 }), { type: 'SENTENCE_ENDED' });
    expect(position(end)).toEqual([2, 0]);
  });

  it('Tab lo salta en las dos direcciones', () => {
    expect(position(playerReducer(silenced(), { type: 'NEXT_BLOCK' }))).toEqual([2, 0]);
    expect(position(playerReducer(silenced({ blockIndex: 2 }), { type: 'PREV_BLOCK' }))).toEqual([0, 0]);
  });

  it('retroceder frase a frase tampoco entra en él', () => {
    expect(position(playerReducer(silenced({ blockIndex: 2, sentenceIndex: 0 }), { type: 'PREV_SENTENCE' }))).toEqual([0, 1]);
  });

  it('si todo lo que queda está silenciado, se detiene', () => {
    const end = playerReducer(
      { ...initPlayer([2, 1], 0, 1, 1, [1]), status: 'playing' },
      { type: 'SENTENCE_ENDED' },
    );
    expect(end.status).toBe('idle');
  });

  it('un clic dentro del bloque silenciado sí lo lee: la elección explícita manda', () => {
    const jumped = playerReducer(silenced(), { type: 'JUMP', blockIndex: 1 });
    expect(position(jumped)).toEqual([1, 0]);
    expect(jumped.status).toBe('playing');
  });

  it('SET_MUTED cambia la lista en caliente', () => {
    const unmuted = playerReducer(silenced(), { type: 'SET_MUTED', muted: [] });
    expect(position(playerReducer(unmuted, { type: 'NEXT_BLOCK' }))).toEqual([1, 0]);
  });
});
