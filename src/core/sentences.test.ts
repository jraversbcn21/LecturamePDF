import { describe, expect, it } from 'vitest';
import { splitSentences } from './sentences';

describe('splitSentences', () => {
  it('divide en frases conservando el orden', () => {
    expect(splitSentences('Primera frase. Segunda frase; con punto y coma. ¿Tercera?', 'es')).toEqual([
      'Primera frase.',
      'Segunda frase; con punto y coma.',
      '¿Tercera?',
    ]);
  });

  it('trocea frases larguísimas para que no las corte el navegador', () => {
    const long = `${'palabra '.repeat(80)}final.`;
    const parts = splitSentences(long, 'es');
    expect(parts.length).toBeGreaterThan(1);
    expect(Math.max(...parts.map((p) => p.length))).toBeLessThanOrEqual(280);
  });

  it('no deja el marcador de lista como frase suelta', () => {
    expect(splitSentences('1. To member boards, to translate into their local language.', 'en')).toEqual([
      '1. To member boards, to translate into their local language.',
    ]);
    expect(splitSentences('A. Primera opción. Y una segunda frase.', 'es')).toEqual([
      'A. Primera opción.',
      'Y una segunda frase.',
    ]);
  });

  it('mantiene entero un título con numeración multinivel', () => {
    expect(splitSentences('0.2. Examinable Learning Objectives', 'en')).toEqual(['0.2. Examinable Learning Objectives']);
    expect(splitSentences('2.1.3 Niveles de prueba', 'es')).toEqual(['2.1.3 Niveles de prueba']);
  });

  it('ignora bloques vacíos', () => {
    expect(splitSentences('   ', 'es')).toEqual([]);
  });
});
