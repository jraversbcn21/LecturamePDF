import { useEffect, useMemo, useRef } from 'react';
import type { Block } from '../../core/types';
import { activeEntry, outlineOf } from '../../core/outline';

type Props = {
  blocks: Block[];
  blockIndex: number;
  /** Índices de los títulos cuyas secciones ya se han escuchado enteras. */
  heard: Set<number>;
  onJump: (blockIndex: number) => void;
};

export function Outline({ blocks, blockIndex, heard, onJump }: Props) {
  const entries = useMemo(() => outlineOf(blocks), [blocks]);
  const active = activeEntry(entries, blockIndex);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (entries.length === 0) return null;

  return (
    <nav className="outline" aria-label="Índice del documento">
      <ul>
        {entries.map((entry, position) => {
          const isHeard = heard.has(entry.index);
          return (
            <li key={entry.index}>
              <button
                ref={position === active ? activeRef : null}
                className={`outline-item level-${entry.level}${position === active ? ' current' : ''}${isHeard ? ' heard' : ''}`}
                onClick={(event) => {
                  event.currentTarget.blur();
                  onJump(entry.index);
                }}
                aria-current={position === active ? 'true' : undefined}
                title={isHeard ? 'Ya escuchada' : undefined}
              >
                <span className="outline-check" aria-hidden="true">
                  {isHeard ? '✓' : ''}
                </span>
                <span className="outline-text">{entry.text}</span>
                <span className="outline-page">{entry.page}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
