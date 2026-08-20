import type { Language } from './types';

export type SpeakHandlers = {
  onEnd: () => void;
  onWord?: (charIndex: number, charLength: number) => void;
};

/** Una voz del selector: nativa del navegador, o remota (síntesis por red). */
export type Voice = {
  /** Identificador persistible: el nombre nativo, o «openrouter:<voz>» en las remotas. */
  name: string;
  lang: string;
  localService: boolean;
  /** Texto del selector, ya recortado. */
  label: string;
  native?: SpeechSynthesisVoice;
};

export const isRemote = (voice: Voice | null): boolean => !!voice?.name.startsWith('openrouter:');

/** Kokoro 82M vía OpenRouter. Lista corta a mano: el selector no necesita las 54 voces. */
const REMOTE_VOICES: Voice[] = [
  { name: 'openrouter:ef_dora', lang: 'es-ES', localService: false, label: 'Dora (IA, con red)' },
  { name: 'openrouter:em_alex', lang: 'es-ES', localService: false, label: 'Alex (IA, con red)' },
  { name: 'openrouter:em_santa', lang: 'es-ES', localService: false, label: 'Santa (IA, con red)' },
  { name: 'openrouter:af_heart', lang: 'en-US', localService: false, label: 'Heart (IA, con red)' },
  { name: 'openrouter:am_adam', lang: 'en-US', localService: false, label: 'Adam (IA, con red)' },
];

/** Espera a que el navegador publique las voces (llegan de forma asíncrona). */
export function loadVoices(): Promise<Voice[]> {
  const wrap = (natives: SpeechSynthesisVoice[]): Voice[] => [
    ...natives.map((native) => ({
      name: native.name,
      lang: native.lang,
      localService: native.localService,
      label: voiceLabel(native.name),
      native,
    })),
    ...REMOTE_VOICES,
  ];
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(wrap(voices));
  return new Promise((resolve) => {
    speechSynthesis.addEventListener('voiceschanged', () => resolve(wrap(speechSynthesis.getVoices())), { once: true });
  });
}

const speaks = (voice: Voice, language: Language): boolean => voice.lang.toLowerCase().startsWith(language);

/** De mejor a peor: primero el idioma del documento, dentro de él las neurales ("Natural" en Edge) y las online. */
export function sortVoices(voices: Voice[], language: Language): Voice[] {
  const score = (voice: Voice) =>
    (speaks(voice, language) ? 4 : 0) + (/natural/i.test(voice.name) ? 2 : 0) + (voice.localService ? 0 : 1);
  return [...voices].sort((a, b) => score(b) - score(a));
}

/**
 * La mejor voz del idioma pedido, o ninguna: leer español con voz inglesa es peor que avisar.
 * Nunca una remota: gasta red y saldo, así que solo suena elegida a mano.
 */
export const pickVoice = (voices: Voice[], language: Language): Voice | null =>
  sortVoices(voices.filter((v) => speaks(v, language) && !isRemote(v)), language)[0] ?? null;

/** «Microsoft Alvaro Online (Natural) - Spanish (Spain)» no cabe en el selector. */
export const voiceLabel = (name: string): string => name.replace(/^Microsoft | Online/g, '');

let current: SpeechSynthesisUtterance | null = null;

/**
 * Una utterance por frase: el fin de frase es un evento real, así que el resaltado
 * nunca se desincroniza aunque se cambie la velocidad o se salte de bloque.
 */
export const tts = {
  speak(text: string, options: { voice: Voice | null; rate: number }, handlers: SpeakHandlers): void {
    tts.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    if (options.voice?.native) {
      utterance.voice = options.voice.native;
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
