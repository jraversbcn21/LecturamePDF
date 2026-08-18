import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Doc } from '../core/types';
import { loadVoices, pickVoice, tts } from '../core/tts';
import { saveProgress, saveRate } from '../core/storage';
import { flatIndex, initPlayer, playerReducer } from './playerReducer';

export type WordRange = { start: number; end: number };

export type Player = ReturnType<typeof usePlayer>;

export type PlayerStart = { blockIndex: number; sentenceIndex: number; rate: number };

/** Conecta el estado de reproducción con la síntesis de voz y con el progreso guardado. */
export function usePlayer(doc: Doc, start: PlayerStart, onBlockFinished: (blockIndex: number) => void) {
  const counts = useMemo(() => doc.blocks.map((block) => block.sentences.length), [doc]);
  const [state, dispatch] = useReducer(playerReducer, undefined, () =>
    initPlayer(counts, start.blockIndex, start.sentenceIndex, start.rate),
  );
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [word, setWord] = useState<WordRange | null>(null);
  const spokenRef = useRef<string | null>(null);

  const { status, blockIndex, sentenceIndex, rate } = state;
  const sentence = doc.blocks[blockIndex]?.sentences[sentenceIndex] ?? '';

  // Por referencia: si entrara en las dependencias del efecto de voz, cada render
  // reiniciaría la frase en curso.
  const finishedRef = useRef(onBlockFinished);
  useEffect(() => {
    finishedRef.current = onBlockFinished;
  });

  useEffect(() => {
    let active = true;
    void loadVoices().then((voices) => {
      if (active) setVoice(pickVoice(voices, doc.language));
    });
    return () => {
      active = false;
    };
  }, [doc.language]);

  useEffect(() => {
    const key = `${blockIndex}:${sentenceIndex}:${rate}:${voice?.name ?? ''}`;

    if (status !== 'playing') {
      if (status === 'paused') tts.pause();
      else {
        tts.cancel();
        spokenRef.current = null;
      }
      return;
    }

    // Reanudar en el mismo punto: no repetimos la frase desde el principio.
    if (spokenRef.current === key && tts.isPaused()) {
      tts.resume();
      return;
    }

    spokenRef.current = key;
    setWord(null);
    tts.speak(sentence, { voice, rate }, {
      onEnd: () => {
        // Solo cuenta como bloque escuchado si la voz llegó a su última frase.
        if (sentenceIndex === (counts[blockIndex] ?? 0) - 1) finishedRef.current(blockIndex);
        dispatch({ type: 'SENTENCE_ENDED' });
      },
      onWord: (charIndex, charLength) => setWord({ start: charIndex, end: charIndex + (charLength || 1) }),
    });
  }, [status, blockIndex, sentenceIndex, rate, voice, sentence, counts]);

  useEffect(() => () => tts.cancel(), []);

  useEffect(() => {
    void saveProgress(doc.id, blockIndex, sentenceIndex, flatIndex(counts, blockIndex, sentenceIndex));
  }, [doc.id, blockIndex, sentenceIndex, counts]);

  useEffect(() => {
    void saveRate(doc.id, rate);
  }, [doc.id, rate]);

  return { state, dispatch, voice, word, counts };
}
