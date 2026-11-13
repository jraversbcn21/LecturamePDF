import type { Language } from './types';

export type SpeakHandlers = {
  onEnd: () => void;
  onWord?: (charIndex: number, charLength: number) => void;
  /** Solo la voz remota lo dispara: fallo de red o de clave. El que escucha decide qué hacer. */
  onError?: (message: string) => void;
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

/**
 * iOS solo arranca la síntesis si su primera locución nace de un gesto del usuario, y aquí
 * speak() llega siempre tras un setTimeout (el tick que necesita Chromium tras cancel()), ya
 * fuera del gesto. Una locución vacía dicha en el primer toque desbloquea las siguientes; en
 * Solo en táctil, que es donde ocurre: en escritorio la locución vacía se colaría en lo
 * pronunciado (las comprobaciones e2e la ven) sin arreglar nada. En los tests no hay window.
 */
if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
  window.addEventListener('pointerdown', () => speechSynthesis.speak(new SpeechSynthesisUtterance('')), { once: true });
}

const API_KEY = 'lecturame:openrouter-key';
export const getApiKey = (): string | null => localStorage.getItem(API_KEY);
export const saveApiKey = (key: string): void => localStorage.setItem(API_KEY, key);

async function fetchAudio(text: string, voiceId: string): Promise<Blob> {
  const key = getApiKey();
  if (!key) throw new Error('Falta la clave de OpenRouter.');
  // Reintenta fallos pasajeros (red, 429, 5xx) antes de rendirse: sin esto, un solo
  // hipo de OpenRouter pausaba la lectura. Los 4xx restantes (clave, saldo) no se reintentan.
  // ponytail: 3 intentos con espera fija creciente; Retry-After si el 429 llega a molestar.
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 600 * attempt));
    try {
      const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'hexgrad/kokoro-82m', input: text, voice: voiceId, response_format: 'mp3' }),
      });
      if (response.ok) return await response.blob();
      status = response.status;
      if (status !== 429 && status < 500) break;
    } catch {
      status = 0;
    }
  }
  throw new Error(status ? `La voz de IA no responde (${status}).` : 'La voz de IA no responde (sin red).');
}

/**
 * Las últimas frases pedidas, de la más vieja a la más reciente (un Map recuerda el orden de
 * inserción). Con una sola entrada, el prefetch de la siguiente echaba a la que suena: cambiar
 * la velocidad a mitad de frase o volver atrás una frase pagaba la petición otra vez, y con la
 * cuota free de ~50 al día eso se nota. Cuatro cubren la anterior, la actual y la siguiente.
 * ponytail: solo en memoria; releer un documento sigue yendo a la red (caché persistente,
 * en PENDIENTE.md).
 */
const CACHE_SIZE = 4;
const cache = new Map<string, Promise<Blob>>();
const cacheKey = (text: string, voiceId: string): string => `${voiceId}\u0000${text}`;

function cachedFetch(text: string, voiceId: string): Promise<Blob> {
  const key = cacheKey(text, voiceId);
  let blob = cache.get(key);
  if (blob) cache.delete(key); // reinsertar la mueve al final: es la más reciente
  else {
    blob = fetchAudio(text, voiceId);
    // Un prefetch fallido no puede quedar como rechazo sin manejar; speak lo verá al consumirlo.
    blob.catch(() => {});
  }
  cache.set(key, blob);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return blob;
}

const remoteId = (voice: Voice): string => voice.name.slice('openrouter:'.length);

let current: SpeechSynthesisUtterance | null = null;
/** Invalida el audio remoto que llega tarde: cancel (y pause con el fetch en vuelo) lo suben. */
let generation = 0;
let audio: HTMLAudioElement | null = null;

async function speakRemote(text: string, voiceId: string, rate: number, handlers: SpeakHandlers): Promise<void> {
  const gen = generation;
  try {
    const blob = await cachedFetch(text, voiceId);
    if (gen !== generation) return;
    const url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.playbackRate = rate;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (gen !== generation) return;
      audio = null;
      handlers.onEnd();
    };
    await audio.play();
  } catch (error) {
    cache.delete(cacheKey(text, voiceId)); // que el reintento vuelva a la red, no a la promesa rechazada
    if (gen === generation) handlers.onError?.(error instanceof Error ? error.message : 'Fallo de red.');
  }
}

/**
 * Una utterance por frase: el fin de frase es un evento real, así que el resaltado
 * nunca se desincroniza aunque se cambie la velocidad o se salte de bloque.
 */
export const tts = {
  speak(text: string, options: { voice: Voice | null; rate: number }, handlers: SpeakHandlers): void {
    tts.cancel();
    if (options.voice && isRemote(options.voice)) {
      void speakRemote(text, remoteId(options.voice), options.rate, handlers);
      return;
    }
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

  /** El audio de la frase siguiente se pide mientras suena la actual: sin esto hay un silencio entre frases. */
  prefetch(text: string, voice: Voice | null): void {
    if (text && voice && isRemote(voice) && getApiKey()) void cachedFetch(text, remoteId(voice));
  },

  cancel(): void {
    generation++;
    current = null;
    speechSynthesis.cancel();
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
      audio = null;
    }
  },

  // ponytail: pause/resume nativos; si alguna voz local los ignora, usePlayer re-lanza la frase.
  // En remoto, pausar con el fetch aún en vuelo descarta el audio (sube generation): isPaused
  // queda en false y usePlayer relanza la frase al reanudar, en vez de esperar a un blob tardío.
  pause: (): void => {
    if (audio) audio.pause();
    else {
      generation++;
      speechSynthesis.pause();
    }
  },
  resume: (): void => {
    if (audio) void audio.play();
    else speechSynthesis.resume();
  },
  isPaused: (): boolean => (audio ? audio.paused && !audio.ended : speechSynthesis.paused),
  isSpeaking: (): boolean => (audio ? !audio.paused && !audio.ended : speechSynthesis.speaking),
};
