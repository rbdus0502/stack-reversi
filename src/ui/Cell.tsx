import type { Cell as CellData, Player } from '../engine/types';

export type Marker = 'place' | 'stack' | null;
export type Preview = 'flip' | 'shave' | null;
export type Anim = 'place' | 'stack' | 'flip' | 'shave' | null;

export interface CellProps {
  cell: CellData;
  label: string;
  marker: Marker;
  playable: boolean;
  preview: Preview;
  /** Player whose ghost disc is shown on this cell (hover/selected target). */
  ghost: Player | null;
  selected: boolean;
  focus: boolean;
  last: boolean;
  anim: Anim;
  animKey: number;
  turn: Player;
  /** Owner of the layer that fell off, for the shield animation. */
  shavedOwner: Player | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

function Disc({ owner, height, anim, animKey }: { owner: Player; height: number; anim: Anim; animKey: number }) {
  const layers = Array.from({ length: height }, (_, i) => i);
  return (
    <div className="stack" style={{ '--h': height } as React.CSSProperties}>
      {layers.map((i) => (
        <div
          key={i === height - 1 ? `top-${animKey}` : i}
          className={`disc disc-${owner}${i === height - 1 && anim ? ` anim-${anim}` : ''}`}
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
      {height > 1 && <span className="badge">{height}</span>}
    </div>
  );
}

export default function Cell(p: CellProps) {
  const cls = [
    'cell',
    p.marker ? `can-${p.marker}` : '',
    p.preview ? `pv-${p.preview}` : '',
    p.selected ? 'selected' : '',
    p.focus ? 'focus' : '',
    p.last ? 'last' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const desc = p.cell ? `${p.cell.owner === 'B' ? '흑' : '백'} ${p.cell.height}층` : '빈칸';
  const action = !p.playable ? '' : p.cell === null ? ', 놓기 가능' : ', 겹치기 가능';

  return (
    <button
      type="button"
      className={cls}
      aria-label={`${p.label} ${desc}${action}`}
      aria-disabled={!p.playable}
      tabIndex={p.playable ? 0 : -1}
      onPointerDown={p.onPointerDown}
      onPointerEnter={p.onPointerEnter}
      onClick={p.onClick}
    >
      {p.cell && <Disc owner={p.cell.owner} height={p.cell.height} anim={p.anim} animKey={p.animKey} />}
      {p.shavedOwner && p.anim === 'shave' && (
        <div key={`fall-${p.animKey}`} className={`disc disc-${p.shavedOwner} layer-fall`} aria-hidden />
      )}
      {p.marker === 'place' && !p.ghost && <span className={`dot dot-${p.turn}`} aria-hidden />}
      {p.marker === 'stack' && <span className="stack-mark" aria-hidden>+</span>}
      {p.ghost && !p.cell && <div className={`disc disc-${p.ghost} ghost`} aria-hidden />}
      {p.focus && p.cell && p.marker !== null && (
        <div className="stack" style={{ '--h': p.cell.height + 1 } as React.CSSProperties} aria-hidden>
          <div className={`disc disc-${p.cell.owner} ghost-layer`} style={{ '--i': p.cell.height } as React.CSSProperties} />
        </div>
      )}
      {p.preview === 'shave' && <span className="pv-tag" aria-hidden>−1</span>}
      {p.preview === 'flip' && <span className={`pv-flip-dot dot-${p.turn}`} aria-hidden />}
    </button>
  );
}
