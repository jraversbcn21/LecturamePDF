import type { Language } from './types';

export type SpeakHandlers = {
  onEnd: () => void;
  onWord?: (charIndex: number, charLength: number) => void;
};

/** Espera a que el navegador publique las voces (llegan de forma asíncrona). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    speechSynthesis.addEventListener('voiceschanged', () => resolve(speechSynthesis.getVoices()), { once: true });
  });
}

const speaks = (voice: SpeechSynthesisVoice, language: Language): boolean => voice.lang.toLowerCase().startsWith(language);

/** De mejor a peor: primero el idioma del documento, dentro de él las neurales ("Natural" en Edge) y las online. */
export function sortVoices(voices: SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice[] {
  const score = (voice: SpeechSynthesisVoice) =>
    (speaks(voice, language) ? 4 : 0) + (/natural/i.test(voice.name) ? 2 : 0) + (voice.localService ? 0 : 1);
  return [...voices].sort((a, b) => score(b) - score(a));
}

/** La mejor voz del idioma pedido, o ninguna: leer español con voz inglesa es peor que avisar. */
export const pickVoice = (voices: SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice | null =>
  sortVoices(voices.filter((v) => speaks(v, language)), language)[0] ?? null;

/** «Microsoft Alvaro Online (Natural) - Spanish (Spain)» no cabe en el selector. */
export const voiceLabel = (name: string): string => name.replace(/^Microsoft | Online/g, '');

let current: SpeechSynthesisUtterance | null = null;

/**
 * Una utterance por frase: el fin de frase es un evento real, así que el resaltado
 * nunca se desincroniza aunque se cambie la velocidad o se salte de bloque.
 */
export const tts = {
  speak(text: string, options: { voice: SpeechSynthesisVoice | null; rate: number }, handlers: SpeakHandlers): void {
    tts.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    if (options.voice) {
      utterance.voice = options.voice;
      utterance.lang = options.voice.lang;
    }
    utterance.onend = () => {
      if (current !== utterance) return;
      current = null;
      handlers.onEnd();
    };
    utterance.onerror = (event) => {
      if (current !== utterance || event.error === 'interrupted' || event.error === 'canceled') return;
      current = null;
      handlers.onEnd();
    };
    utterance.onboundary = (event) => {
      if (current === utterance && event.name === 'word') handlers.onWord?.(event.charIndex, event.charLength ?? 0);
    };
    current = utterance;
    // cancel() seguido de speak() inmediato se pierde en Chromium: hace falta un tick.
    setTimeout(() => {
      if (current === utterance) speechSynthesis.speak(utterance);
    }, 0);
  },

  cancel(): void {
    current = null;
    speechSynthesis.cancel();
  },

  // ponytail: pause/resume nativos; si alguna voz local los ignora, usePlayer re-lanza la frase.
  pause: (): void => speechSynthesis.pause(),
  resume: (): void => speechSynthesis.resume(),
  isPaused: (): boolean => speechSynthesis.paused,
  isSpeaking: (): boolean => speechSynthesis.speaking,
};
