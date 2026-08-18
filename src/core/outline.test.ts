import { describe, expect, it } from 'vitest';
import { activeEntry, headingLevel, outlineOf, sectionEndingAt } from './outline';
import type { Block } from './types';

const block = (type: Block['type'], text: string, page = 1): Block => ({ type, text, page, sentences: [text] });

describe('headingLevel', () => {
  it('deduce el nivel de la numeración', () => {
    expect(headingLevel('0. Introduction')).toBe(1);
    expect(headingLevel('0.1. Purpose of this Syllabus')).toBe(2);
    expect(headingLevel('2.1.3 Niveles de prueba')).toBe(3);
  });

  it('limita la profundidad y acepta títulos sin numerar', () => {
    expect(headingLevel('1.2.3.4.5 Demasiado hondo')).toBe(3);
    expect(headingLevel('Bibliografía')).toBe(1);
  });
});

describe('outlineOf', () => {
  it('recoge solo los títulos, con su posición en el documento', () => {
    const blocks = [
      block('heading', '0. Introduction'),
      block('paragraph', 'Texto de la introducción.'),
      block('heading', '0.1. Purpose', 2),
      block('list-item', '1. Un punto.', 2),
    ];
    expect(outlineOf(blocks)).toEqual([
      { index: 0, text: '0. Introduction', page: 1, level: 1 },
      { index: 2, text: '0.1. Purpose', page: 2, level: 2 },
    ]);
  });

  it('devuelve vacío si el documento no tiene títulos', () => {
    expect(outlineOf([block('paragraph', 'Solo texto.')])).toEqual([]);
  });
});

describe('sectionEndingAt', () => {
  // 0 título · 1 texto · 2 texto · 3 título · 4 texto
  const blocks = [
    block('heading', 'Uno'),
    block('paragraph', 'a'),
    block('paragraph', 'b'),
    block('heading', 'Dos'),
    block('paragraph', 'c'),
  ];
  const outline = outlineOf(blocks);

  it('solo el último bloque cierra su sección', () => {
    expect(sectionEndingAt(outline, 2, blocks.length)).toBe(0);
    expect(sectionEndingAt(outline, 1, blocks.length)).toBe(-1);
    expect(sectionEndingAt(outline, 0, blocks.length)).toBe(-1);
  });

  it('la última sección se cierra con el último bloque del documento', () => {
    expect(sectionEndingAt(outline, 4, blocks.length)).toBe(3);
  });

  it('una sección de un solo bloque se cierra en él mismo', () => {
    const solo = outlineOf([block('heading', 'Solo'), block('heading', 'Otra')]);
    expect(sectionEndingAt(solo, 0, 2)).toBe(0);
  });
});

describe('activeEntry', () => {
  const outline = outlineOf([
    block('heading', 'Uno'),
    block('paragraph', 'a'),
    block('heading', 'Dos'),
    block('paragraph', 'b'),
  ]);

  it('marca la sección en la que estamos', () => {
    expect(activeEntry(outline, 0)).toBe(0);
    expect(activeEntry(outline, 1)).toBe(0);
    expect(activeEntry(outline, 2)).toBe(1);
    expect(activeEntry(outline, 3)).toBe(1);
  });

  it('no marca nada si el documento empieza antes del primer título', () => {
    expect(activeEntry(outlineOf([block('paragraph', 'a'), block('heading', 'Uno')]), 0)).toBe(-1);
  });
});
