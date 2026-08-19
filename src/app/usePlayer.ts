import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Doc } from '../core/types';
import { loadVoices, pickVoice, sortVoices, tts } from '../core/tts';
import { saveProgress, saveRate, saveVoice } from '../core/storage';
import { flatIndex, initPlayer, playerReducer } from './playerReducer';

export type WordRange = { start: number; end: number };

export type Player = ReturnType<typeof usePlayer>;

export type PlayerStart = { blockIndex: number; sentenceIndex: number; rate: number; voiceName: string | null };

/** Conecta el estado de reproducción con la síntesis de voz y con el progreso guardado. */
export function usePlayer(doc: Doc, start: PlayerStart, onBlockFinished: (blockIndex: number) => void) {
  const counts = useMemo(() => doc.blocks.map((block) => block.sentences.length), [doc]);
  const [state, dispatch] = useReducer(playerReducer, undefined, () =>
    initPlayer(counts, start.blockIndex, start.sentenceIndex, start.rate),
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState(start.voiceName);
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
    void loadVoices().then((available) => {
      if (active) setVoices(sortVoices(available, doc.language));
    });
    return () => {
      active = false;
    };
  }, [doc.language]);

  // La voz guardada puede no existir en este navegador: entonces se vuelve a elegir por idioma.
  const voice = useMemo(
    () => voices.find((v) => v.name === voiceName) ?? pickVoice(voices, doc.language),
    [voices, voiceName, doc.language],
  );

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

  // Solo se guarda la elegida a mano: si no, escribiríamos la automática y dejaría de seguir al idioma.
  useEffect(() => {
    if (voiceName) void saveVoice(doc.id, voiceName);
  }, [doc.id, voiceName]);

  return { state, dispatch, voice, voices, setVoiceName, word, counts };
}
