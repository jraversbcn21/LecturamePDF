export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type PlayerState = {
  status: 'idle' | 'playing' | 'paused';
  blockIndex: number;
  sentenceIndex: number;
  rate: number;
  /** Número de frases de cada bloque. */
  counts: number[];
};

export type PlayerAction =
  | { type: 'TOGGLE' }
  | { type: 'PAUSE' }
  | { type: 'SENTENCE_ENDED' }
  | { type: 'NEXT_SENTENCE' }
  | { type: 'PREV_SENTENCE' }
  | { type: 'NEXT_BLOCK' }
  | { type: 'PREV_BLOCK' }
  | { type: 'SET_RATE'; rate: number }
  | { type: 'JUMP'; blockIndex: number; sentenceIndex?: number };

export function initPlayer(counts: number[], blockIndex = 0, sentenceIndex = 0, rate = 1): PlayerState {
  return { status: 'idle', counts, rate, ...clamp(counts, blockIndex, sentenceIndex) };
}

function clamp(counts: number[], blockIndex: number, sentenceIndex: number): { blockIndex: number; sentenceIndex: number } {
  const block = Math.min(Math.max(blockIndex, 0), Math.max(counts.length - 1, 0));
  const sentence = Math.min(Math.max(sentenceIndex, 0), Math.max((counts[block] ?? 1) - 1, 0));
  return { blockIndex: block, sentenceIndex: sentence };
}

/** Posición como número de frase absoluto, para la barra de progreso. */
export function flatIndex(counts: number[], blockIndex: number, sentenceIndex: number): number {
  return counts.slice(0, blockIndex).reduce((total, count) => total + count, 0) + sentenceIndex;
}

export const totalSentences = (counts: number[]): number => counts.reduce((total, count) => total + count, 0);

function step(state: PlayerState, delta: 1 | -1): PlayerState {
  const { counts, blockIndex, sentenceIndex } = state;
  const next = sentenceIndex + delta;
  if (next >= 0 && next < (counts[blockIndex] ?? 0)) return { ...state, sentenceIndex: next };

  const block = blockIndex + delta;
  if (block < 0) return { ...state, sentenceIndex: 0 };
  if (block >= counts.length) return { ...state, status: 'idle' };
  return { ...state, blockIndex: block, sentenceIndex: delta === 1 ? 0 : Math.max((counts[block] ?? 1) - 1, 0) };
}

function toBlock(state: PlayerState, delta: 1 | -1): PlayerState {
  const block = state.blockIndex + delta;
  if (block < 0) return { ...state, sentenceIndex: 0 };
  if (block >= state.counts.length) return { ...state, status: 'idle' };
  return { ...state, blockIndex: block, sentenceIndex: 0 };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, status: state.status === 'playing' ? 'paused' : 'playing' };
    case 'PAUSE':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'SENTENCE_ENDED':
    case 'NEXT_SENTENCE':
      return step(state, 1);
    case 'PREV_SENTENCE':
      return step(state, -1);
    case 'NEXT_BLOCK':
      return toBlock(state, 1);
    case 'PREV_BLOCK':
      return toBlock(state, -1);
    case 'SET_RATE':
      return { ...state, rate: action.rate };
    case 'JUMP':
      return { ...state, status: 'playing', ...clamp(state.counts, action.blockIndex, action.sentenceIndex ?? 0) };
  }
}
