export type Language = 'es' | 'en';

export type Block = {
  /** `table` y `formula` se enseñan tal cual, pero la voz solo los anuncia: recitarlos no se entiende. */
  type: 'heading' | 'paragraph' | 'list-item' | 'table' | 'formula';
  /** En una tabla, un renglón por línea. */
  text: string;
  page: number;
  /** Frases pre-divididas: cada una es una utterance de TTS. */
  sentences: string[];
};

export type Doc = {
  /** SHA-256 del PDF: mismo fichero => mismo documento y mismo progreso. */
  id: string;
  name: string;
  language: Language;
  blocks: Block[];
  addedAt: number;
};

export type Progress = {
  docId: string;
  blockIndex: number;
  sentenceIndex: number;
  updatedAt: number;
};
