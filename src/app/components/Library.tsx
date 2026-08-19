import { useRef, type ChangeEvent, type DragEvent } from 'react';
import type { LibraryEntry } from '../../core/storage';

type Props = {
  entries: LibraryEntry[];
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const percentOf = (entry: LibraryEntry): number =>
  entry.totalSentences === 0 ? 0 : Math.round((entry.position / entry.totalSentences) * 100);

export function Library({ entries, busy, error, onFile, onOpen, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const takeFirstPdf = (files: FileList | null) => {
    const pdf = [...(files ?? [])].find((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (pdf) onFile(pdf);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    takeFirstPdf(event.dataTransfer.files);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    takeFirstPdf(event.target.files);
    event.target.value = '';
  };

  return (
    <div className="screen">
      <header className="bar">
        <h1>LecturamePDF</h1>
        <span className="tag">Escucha tus PDFs</span>
      </header>

      <div className="library">
        <div className="dropzone" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
          <p>{busy ? 'Extrayendo el texto del PDF…' : 'Arrastra un PDF aquí'}</p>
          <button onClick={() => inputRef.current?.click()} disabled={busy}>
            Elegir PDF
          </button>
          <input ref={inputRef} type="file" accept="application/pdf" onChange={onChange} hidden />
        </div>

        {error && <p className="error">{error}</p>}

        <ul className="docs">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button className="doc" onClick={() => onOpen(entry.id)}>
                <span className="doc-name">{entry.name}</span>
                <span className="doc-meta">
                  {entry.language === 'es' ? 'Español' : 'Inglés'} · {percentOf(entry)}% escuchado
                </span>
              </button>
              <button className="ghost" onClick={() => onDelete(entry.id)} aria-label={`Eliminar ${entry.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
