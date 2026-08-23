import { useRef, type ChangeEvent, type CSSProperties, type DragEvent } from 'react';
import type { LibraryEntry } from '../../core/storage';

type Props = {
  entries: LibraryEntry[];
  busy: boolean;
  error: string | null;
  synced: boolean;
  onFile: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onConnectSync: (code: string) => void;
  onDisconnectSync: () => void;
};

const percentOf = (entry: LibraryEntry): number =>
  entry.totalSentences === 0 ? 0 : Math.round((entry.position / entry.totalSentences) * 100);

export function Library({ entries, busy, error, synced, onFile, onOpen, onDelete, onConnectSync, onDisconnectSync }: Props) {
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
              Sube un PDF y suena en voz alta, frase a frase y resaltado según avanza. Vuelve donde lo dejaste.
            </p>
            <div className="hero-actions">
              {/* El botón lleva el estado porque en táctil el recuadro no está: sería el único
                  aviso de que se está extrayendo, y sin él la espera parece que no pasa nada. */}
              <button className="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
                {busy ? 'Extrayendo…' : 'Elegir PDF'}
              </button>
              {resume && (
                <button onClick={() => onOpen(resume.id)}>Seguir con «{resume.name.replace(/\.pdf$/i, '')}»</button>
              )}
              {/* Fuera del recuadro: en táctil ese se oculta, y el campo es el que abre el selector. */}
              <input ref={inputRef} type="file" accept="application/pdf" onChange={onChange} hidden />
            </div>
            {synced ? (
              <p className="fine">
                Sincronizado: tus PDFs y tu progreso se copian a tu nube privada para tus otros dispositivos.{' '}
                <button className="linky" onClick={onDisconnectSync}>
                  Dejar de sincronizar
                </button>
              </p>
            ) : (
              <>
                <p className="fine">Todo ocurre en tu navegador. Ningún archivo sale de tu equipo…</p>
                <p className="fine">
                  …salvo que actives la sincronización para seguir leyendo en otro dispositivo:{' '}
                  <input
                    className="api-key"
                    type="password"
                    placeholder="código de sincronización y Enter"
                    aria-label="Código de sincronización entre dispositivos"
                    onKeyDown={(event) => {
                      const value = event.currentTarget.value.trim();
                      if (event.key === 'Enter' && value) onConnectSync(value);
                    }}
                  />
                </p>
              </>
            )}
          </div>

          <div className="dropzone" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
            <span className="drop-icon" aria-hidden="true">
              📄
            </span>
            <p>{busy ? 'Extrayendo el texto del PDF…' : 'Arrastra un PDF aquí'}</p>
            <small>o pulsa «Elegir PDF»</small>
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
                  {/* Confirmación nativa: en táctil el aspa queda a un dedo del botón de abrir, y el
                      borrado viaja (tombstone) a la nube y al resto de dispositivos, sin deshacer. */}
                  <button
                    className="ghost"
                    onClick={() => {
                      if (window.confirm(`¿Quitar «${entry.name}»${synced ? ' de este y de tus otros dispositivos' : ''}?`))
                        onDelete(entry.id);
                    }}
                    aria-label={`Eliminar ${entry.name}`}
                  >
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
