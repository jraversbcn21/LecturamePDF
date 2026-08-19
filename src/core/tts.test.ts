import { describe, expect, it } from 'vitest';
import { pickVoice, sortVoices, voiceLabel } from './tts';

const voice = (name: string, lang: string, localService = false): SpeechSynthesisVoice =>
  ({ name, lang, localService }) as SpeechSynthesisVoice;

const basica = voice('Spanish Basic Local', 'es-ES', true);
const alvaro = voice('Microsoft Alvaro Online (Natural) - Spanish (Spain)', 'es-ES');
const helena = voice('Microsoft Helena - Spanish (Spain)', 'es-ES');
const ana = voice('Microsoft Ana Online (Natural) - English (US)', 'en-US');

describe('pickVoice', () => {
  it('prefiere la neural sobre la online y la online sobre la local', () => {
    expect(pickVoice([basica, helena, alvaro], 'es')).toBe(alvaro);
    expect(pickVoice([basica, helena], 'es')).toBe(helena);
  });

  it('no devuelve una voz de otro idioma', () => {
    expect(pickVoice([ana], 'es')).toBeNull();
  });
});

describe('sortVoices', () => {
  it('pone delante las del idioma del documento, pero no descarta las demás', () => {
    expect(sortVoices([ana, basica, alvaro], 'es')).toEqual([alvaro, basica, ana]);
    expect(sortVoices([basica, ana], 'en')).toEqual([ana, basica]);
  });
});

describe('voiceLabel', () => {
  it('recorta el nombre largo de Edge dejando lo que distingue a la voz', () => {
    expect(voiceLabel('Microsoft Alvaro Online (Natural) - Spanish (Spain)')).toBe('Alvaro (Natural) - Spanish (Spain)');
    expect(voiceLabel('Spanish Basic Local')).toBe('Spanish Basic Local');
  });
});
