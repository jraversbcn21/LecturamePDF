import { useEffect, useState } from 'react';
import { getFile } from '../../core/storage';

type Props = {
  docId: string;
  name: string;
  /** Página del bloque que se está escuchando. */
  readingPage: number;
  onClose: () => void;
};

/**
 * `undefined` mientras se busca, `null` si el documento se guardó antes de que se conservara
 * el original. El `blob:` se libera al cerrar el panel: si no, el PDF entero se queda en memoria.
 */
function usePdfUrl(docId: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let created: string | null = null;
    let active = true;

    void getFile(docId).then((file) => {
      if (!active) return;
      if (!file) {
        setUrl(null);
        return;
      }
      created = URL.createObjectURL(file);
      setUrl(created);
    });

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [docId]);

  return url;
}

/**
 * El PDF original en el visor del propio navegador. Cambiar `#page` obliga a recargarlo, y con
 * él se van el zoom y el desplazamiento, así que la página solo se mueve cuando se pide.
 */
export function PdfPane({ docId, name, readingPage, onClose }: Props) {
  const url = usePdfUrl(docId);
  const [shownPage, setShownPage] = useState(readingPage);

  return (
    <aside id="pdf-pane" className="pdf-pane">
      <div className="pdf-bar">
        <span className="pdf-title">Original · pág. {shownPage}</span>
        {readingPage !== shownPage && (
          <button className="ghost" onClick={(event) => {
            event.currentTarget.blur();
            setShownPage(readingPage);
          }}>
            ir a la pág. {readingPage}
          </button>
        )}
        <button className="ghost" aria-label="Cerrar el PDF original" onClick={onClose}>
          ✕
        </button>
      </div>

      {url === undefined && <p className="pdf-note">Abriendo el original…</p>}
      {url === null && (
        <p className="pdf-note">
          Este documento se añadió antes de que se guardara el PDF original. Vuelve a subirlo desde la
          biblioteca: se reconoce por su contenido, así que conservarás el progreso, los marcadores y las notas.
        </p>
      )}
      {url && <iframe className="pdf-frame" src={`${url}#page=${shownPage}`} title={`PDF original de ${name}`} />}
    </aside>
  );
}
