import type { Dispatch, MouseEvent } from 'react';
import { flatIndex, RATES, totalSentences, type PlayerAction, type PlayerState } from '../playerReducer';

type Props = {
  state: PlayerState;
  dispatch: Dispatch<PlayerAction>;
  voiceName: string | null;
  page: number;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
};

export function PlayerControls({ state, dispatch, voiceName, page, isBookmarked, onToggleBookmark }: Props) {
  const total = totalSentences(state.counts);
  const position = flatIndex(state.counts, state.blockIndex, state.sentenceIndex);
  const percent = total === 0 ? 0 : Math.round(((position + 1) / total) * 100);
  const isPlaying = state.status === 'playing';

  // Sin esto el foco se queda en el botón pulsado y los atajos de teclado dejan de responder.
  const blurButton = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON') target.blur();
  };

  return (
    <footer className="controls" onClick={blurButton}>
      <progress value={position + 1} max={total} aria-label="Progreso de lectura" />

      <div className="controls-row">
        <div className="group">
          <button onClick={() => dispatch({ type: 'PREV_BLOCK' })} aria-label="Bloque anterior (Shift+Tab)">
            ⏮
          </button>
          <button onClick={() => dispatch({ type: 'PREV_SENTENCE' })} aria-label="Frase anterior (flecha izquierda)">
            ◀
          </button>
          <button className="primary" onClick={() => dispatch({ type: 'TOGGLE' })} aria-label={isPlaying ? 'Pausar (espacio)' : 'Reproducir (espacio)'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={() => dispatch({ type: 'NEXT_SENTENCE' })} aria-label="Frase siguiente (flecha derecha)">
            ▶
          </button>
          <button onClick={() => dispatch({ type: 'NEXT_BLOCK' })} aria-label="Saltar bloque (Tab)">
            ⏭
          </button>
        </div>

        <button
          className={isBookmarked ? 'bookmark-toggle marked' : 'bookmark-toggle'}
          onClick={onToggleBookmark}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'Quitar marcador de esta frase (M)' : 'Marcar esta frase para repasar (M)'}
          title={isBookmarked ? 'Quitar marcador (M)' : 'Marcar para repasar (M)'}
        >
          {isBookmarked ? '★' : '☆'}
        </button>

        <label className="group">
          Velocidad
          <select value={state.rate} onChange={(e) => dispatch({ type: 'SET_RATE', rate: Number(e.target.value) })}>
            {RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
        </label>

        <span className="status">
          {percent}% · frase {position + 1}/{total} · pág. {page}
          {voiceName ? ` · ${voiceName}` : ' · sin voz disponible'}
        </span>
      </div>
    </footer>
  );
}
