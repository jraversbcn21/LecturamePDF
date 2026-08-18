export type Language = 'es' | 'en';

export type Block = {
  type: 'heading' | 'paragraph' | 'list-item';
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
