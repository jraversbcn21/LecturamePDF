import type { Language } from './types';

const STOPWORDS: Record<Language, string[]> = {
  es: ['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'por', 'con', 'para', 'es', 'se', 'no', 'su', 'al', 'lo'],
  en: ['the', 'of', 'and', 'to', 'in', 'a', 'is', 'that', 'for', 'it', 'as', 'with', 'was', 'on', 'are', 'this', 'be', 'by', 'or', 'an'],
};

const SAMPLE_CHARS = 2000;

function score(words: string[], stopwords: string[]): number {
  const set = new Set(stopwords);
  return words.reduce((n, w) => (set.has(w) ? n + 1 : n), 0);
}

/** Detecta español vs inglés contando stopwords. Empate o texto vacío => 'es'. */
export function detectLanguage(text: string): Language {
  const words = text
    .slice(0, SAMPLE_CHARS)
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
  return score(words, STOPWORDS.en) > score(words, STOPWORDS.es) ? 'en' : 'es';
}
