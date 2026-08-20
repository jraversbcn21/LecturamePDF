import { describe, expect, it } from 'vitest';
import { pickVoice, sortVoices, voiceLabel, type Voice } from './tts';

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
