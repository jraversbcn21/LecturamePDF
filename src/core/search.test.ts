import { describe, expect, it } from 'vitest';
import { searchDoc } from './search';
import type { Block } from './types';

const block = (type: Block['type'], sentences: string[], page = 1): Block => ({
  type,
  text: sentences.join(' '),
  page,
  sentences,
});

const doc: Block[] = [
  block('heading', ['1. Análisis de requisitos']),
  block('paragraph', ['El análisis empieza pronto.', 'Nada que ver aquí.']),
  block('heading', ['2. Diseño de pruebas'], 7),
  block('paragraph', ['El ANÁLISIS estático detecta defectos.'], 7),
];

describe('searchDoc', () => {
  it('ignora mayúsculas y acentos', () => {
    const { hits, total } = searchDoc(doc, 'analisis');
    expect(total).toBe(3);
    expect(hits.map((hit) => hit.text)).toEqual([
      '1. Análisis de requisitos',
      'El análisis empieza pronto.',
      'El ANÁLISIS estático detecta defectos.',
    ]);
  });

  it('sitúa cada resultado en su sección y su página', () => {
    const hit = searchDoc(doc, 'estático').hits[0];
    expect(hit).toMatchObject({ section: '2. Diseño de pruebas', page: 7, blockIndex: 3, sentenceIndex: 0 });
  });

  it('marca el tramo coincidente para poder resaltarlo', () => {
    const hit = searchDoc(doc, 'empieza').hits[0];
    expect(hit?.text.slice(hit.start, hit.end)).toBe('empieza');
  });

  it('el tramo sigue cuadrando cuando hay acentos por medio', () => {
    const hit = searchDoc(doc, 'estatico').hits[0];
    expect(hit?.text.slice(hit.start, hit.end)).toBe('estático');
  });

  it('no busca con menos de dos caracteres', () => {
    expect(searchDoc(doc, 'a')).toEqual({ hits: [], total: 0 });
    expect(searchDoc(doc, '  ')).toEqual({ hits: [], total: 0 });
  });

  it('limita los resultados pero informa del total', () => {
    const many = Array.from({ length: 80 }, () => block('paragraph', ['repetido']));
    const { hits, total } = searchDoc(many, 'repetido');
    expect(total).toBe(80);
    expect(hits).toHaveLength(60);
  });
});
