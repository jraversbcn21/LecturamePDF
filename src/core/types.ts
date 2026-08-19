export type Language = 'es' | 'en';

export type Block = {
  /** `table`: renglones alineados en columnas. Se enseñan, pero no se recitan celda a celda. */
  type: 'heading' | 'paragraph' | 'list-item' | 'table';
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
