import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickVoice, saveApiKey, sortVoices, tts, voiceLabel, type Voice } from './tts';

const voice = (name: string, lang: string, localService = false): Voice => ({
  name,
  lang,
  localService,
  label: voiceLabel(name),
});

const basica = voice('Spanish Basic Local', 'es-ES', true);
const alvaro = voice('Microsoft Alvaro Online (Natural) - Spanish (Spain)', 'es-ES');
const helena = voice('Microsoft Helena - Spanish (Spain)', 'es-ES');
const ana = voice('Microsoft Ana Online (Natural) - English (US)', 'en-US');
const dora: Voice = { name: 'openrouter:ef_dora', lang: 'es-ES', localService: false, label: 'Dora (IA, con red)' };

describe('pickVoice', () => {
  it('prefiere la neural sobre la online y la online sobre la local', () => {
    expect(pickVoice([basica, helena, alvaro], 'es')).toBe(alvaro);
    expect(pickVoice([basica, helena], 'es')).toBe(helena);
  });

  it('no devuelve una voz de otro idioma', () => {
    expect(pickVoice([ana], 'es')).toBeNull();
  });

  // La remota gasta red y saldo: solo suena elegida a mano, nunca por defecto.
  it('no elige sola una voz remota, aunque sea la única del idioma', () => {
    expect(pickVoice([dora, ana], 'es')).toBeNull();
    expect(pickVoice([dora, basica], 'es')).toBe(basica);
  });
});

describe('sortVoices', () => {
  it('pone delante las del idioma del documento, pero no descarta las demás', () => {
    expect(sortVoices([ana, basica, alvaro], 'es')).toEqual([alvaro, basica, ana]);
    expect(sortVoices([basica, ana], 'en')).toEqual([ana, basica]);
  });

  it('la remota del idioma queda por delante de las de otro idioma', () => {
    const sorted = sortVoices([ana, dora], 'es');
    expect(sorted.indexOf(dora)).toBeLessThan(sorted.indexOf(ana));
  });
});

describe('voiceLabel', () => {
  it('recorta el nombre largo de Edge dejando lo que distingue a la voz', () => {
    expect(voiceLabel('Microsoft Alvaro Online (Natural) - Spanish (Spain)')).toBe('Alvaro (Natural) - Spanish (Spain)');
    expect(voiceLabel('Spanish Basic Local')).toBe('Spanish Basic Local');
  });
});

describe('voz remota', () => {
  /** Instancias creadas de Audio, en orden. */
  let audios: FakeAudio[] = [];

  class FakeAudio {
    src: string;
    playbackRate = 1;
    paused = true;
    ended = false;
    onended: (() => void) | null = null;
    constructor(src: string) {
      this.src = src;
      audios.push(this);
    }
    play(): Promise<void> {
      this.paused = false;
      return Promise.resolve();
    }
    pause(): void {
      this.paused = true;
    }
    /** Simula que el audio llegó a su fin. */
    finish(): void {
      this.paused = true;
      this.ended = true;
      this.onended?.();
    }
  }

  /** fetch controlable desde el test: se resuelve cuando el test quiere. */
  const deferredFetch = () => {
    let resolve!: (blob: Blob) => void;
    let reject!: (reason: Error) => void;
    const mock = vi.fn().mockImplementation(
      () =>
        new Promise((ok, ko) => {
          resolve = (blob) => ok({ ok: true, blob: () => Promise.resolve(blob) });
          reject = ko;
        }),
    );
    return { mock, resolve: () => resolve(new Blob(['audio'])), reject: (message: string) => reject(new Error(message)) };
  };

  const store = new Map<string, string>();
  const revoked: string[] = [];

  beforeEach(() => {
    audios = [];
    store.clear();
    revoked.length = 0;
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockImplementation(() => `blob:${Math.random()}`),
      revokeObjectURL: vi.fn().mockImplementation((url: string) => revoked.push(url)),
    });
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), paused: false, speaking: false });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    saveApiKey('clave-de-prueba');
  });

  afterEach(() => {
    tts.cancel();
    vi.unstubAllGlobals();
  });

  // La caché de una entrada de tts.ts sobrevive entre tests (estado de módulo, a propósito):
  // cada test usa una frase distinta para no acertar en la caché del anterior.
  const speakRemote = (text: string, handlers: { onEnd?: () => void; onWord?: () => void; onError?: (m: string) => void } = {}, rate = 1) =>
    tts.speak(text, { voice: dora, rate }, { onEnd: () => {}, ...handlers });

  it('pide el audio a OpenRouter y avanza al terminar la reproducción', async () => {
    const { mock, resolve } = deferredFetch();
    vi.stubGlobal('fetch', mock);
    const onEnd = vi.fn();
    speakRemote('Frase uno.', { onEnd });

    resolve();
    await vi.waitFor(() => expect(audios).toHaveLength(1));

    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(mock.mock.calls[0]?.[0]).toBe('https://openrouter.ai/api/v1/audio/speech');
    expect(JSON.parse(init.body as string)).toMatchObject({ model: 'hexgrad/kokoro-82m', input: 'Frase uno.', voice: 'ef_dora' });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer clave-de-prueba');

    expect(onEnd).not.toHaveBeenCalled();
    audios[0]?.finish();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(revoked).toContain(audios[0]?.src);
  });

  it('cancel con el audio aún en vuelo lo descarta: ni suena ni avanza', async () => {
    const { mock, resolve } = deferredFetch();
    vi.stubGlobal('fetch', mock);
    const onEnd = vi.fn();
    speakRemote('Frase dos.', { onEnd });

    tts.cancel();
    resolve();
    await Promise.resolve().then(() => Promise.resolve());

    expect(audios).toHaveLength(0);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('en error de red avisa y NO avanza: saltarse una frase en silencio pierde contenido', async () => {
    const { mock, reject } = deferredFetch();
    vi.stubGlobal('fetch', mock);
    const onEnd = vi.fn();
    const onError = vi.fn();
    speakRemote('Frase tres.', { onEnd, onError });

    reject('sin red');
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('sin red'));
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('sin clave guardada avisa sin llegar a pedir nada', async () => {
    store.clear();
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    const onError = vi.fn();
    speakRemote('Frase cuatro.', { onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(mock).not.toHaveBeenCalled();
  });

  it('pausar durante la carga descarta el audio tardío; con audio ya sonando, pausa y reanuda en el punto', async () => {
    const { mock, resolve } = deferredFetch();
    vi.stubGlobal('fetch', mock);
    speakRemote('Frase cinco.');

    tts.pause();
    resolve();
    await Promise.resolve().then(() => Promise.resolve());
    expect(audios).toHaveLength(0);
    expect(tts.isPaused()).toBe(false);

    const second = deferredFetch();
    vi.stubGlobal('fetch', second.mock);
    speakRemote('Frase cinco bis.');
    second.resolve();
    await vi.waitFor(() => expect(audios).toHaveLength(1));

    tts.pause();
    expect(audios[0]?.paused).toBe(true);
    expect(tts.isPaused()).toBe(true);
    tts.resume();
    expect(audios[0]?.paused).toBe(false);
  });

  it('aplica la velocidad como playbackRate', async () => {
    const { mock, resolve } = deferredFetch();
    vi.stubGlobal('fetch', mock);
    speakRemote('Frase seis.', {}, 1.5);
    resolve();
    await vi.waitFor(() => expect(audios).toHaveLength(1));
    expect(audios[0]?.playbackRate).toBe(1.5);
  });

  it('el prefetch adelanta la petición y speak la reutiliza; con voz local no hace nada', async () => {
    const { mock, resolve } = deferredFetch();
    vi.stubGlobal('fetch', mock);

    tts.prefetch('Frase siete.', dora);
    expect(mock).toHaveBeenCalledOnce();
    tts.prefetch('Frase siete.', alvaro);
    expect(mock).toHaveBeenCalledOnce();

    speakRemote('Frase siete.');
    resolve();
    await vi.waitFor(() => expect(audios).toHaveLength(1));
    expect(mock).toHaveBeenCalledOnce();
  });
});
