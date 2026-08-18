import { describe, expect, it } from 'vitest';
import { detectLanguage } from './language';

describe('detectLanguage', () => {
  it('detecta español', () => {
    expect(detectLanguage('El objetivo de este capítulo es que el lector entienda la teoría y los métodos.')).toBe('es');
  });

  it('detecta inglés', () => {
    expect(detectLanguage('The goal of this chapter is that the reader understands the theory and the methods.')).toBe('en');
  });

  it('cae en español cuando no hay señal', () => {
    expect(detectLanguage('')).toBe('es');
  });
});
