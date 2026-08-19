import { useRef, type ChangeEvent, type CSSProperties, type DragEvent } from 'react';
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

  // listLibrary() ordena por updatedAt, así que el primero empezado es el último que sonó.
  const resume = entries.find((entry) => entry.position > 0);

  return (
    <div className="screen paper">
      <header className="bar">
        <span className="mark" aria-hidden="true">
          ▶
        </span>
        <h1>LecturamePDF</h1>
        <span className="tag">Escucha tus PDFs</span>
      </header>

      <div className="library">
        <div className="hero">
          <div className="pitch">
            <h2>
              Deja de leer apuntes. <em>Escúchalos.</em>
            </h2>
            <p>
              Suelta un PDF y suena en voz alta, frase a frase y resaltado según avanza. Vuelve donde lo dejaste.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
                Elegir PDF
              </button>
              {resume && (
                <button onClick={() => onOpen(resume.id)}>Seguir con «{resume.name.replace(/\.pdf$/i, '')}»</button>
              )}
            </div>
            <p className="fine">Todo ocurre en tu navegador. Ningún archivo sale de tu equipo.</p>
          </div>

          <div className="dropzone" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
            <span className="drop-icon" aria-hidden="true">
              📄
            </span>
            <p>{busy ? 'Extrayendo el texto del PDF…' : 'Arrastra un PDF aquí'}</p>
            <small>o pulsa «Elegir PDF»</small>
            <input ref={inputRef} type="file" accept="application/pdf" onChange={onChange} hidden />
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {entries.length > 0 && (
          <section className="shelf">
            <h3>Tu estantería</h3>
            <ul className="docs">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button className="doc" onClick={() => onOpen(entry.id)}>
                    {/* El arco es decorativo: el porcentaje va en el texto, que es lo que se lee en voz alta. */}
                    <span className="ring" style={{ '--p': percentOf(entry) } as CSSProperties} aria-hidden="true" />
                    <span className="doc-text">
                      <span className="doc-name">{entry.name}</span>
                      <span className="doc-meta">
                        {entry.language === 'es' ? 'Español' : 'Inglés'} · {percentOf(entry)}% escuchado
                      </span>
                    </span>
                  </button>
                  <button className="ghost" onClick={() => onDelete(entry.id)} aria-label={`Eliminar ${entry.name}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
