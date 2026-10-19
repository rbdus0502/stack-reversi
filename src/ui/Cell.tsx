import type { RuleConfig } from '../engine/config';
import type { ChangeKind } from '../engine/preview';
import type { Piece, Player } from '../engine/types';
import UnitIcon from './UnitIcon';

export type Marker = 'place' | 'target' | 'movable' | null;

export interface CellPreview {
  kind: ChangeKind;
  lineDamage: number;
  turretDamage: number;
  after: Piece | null;
}

/** What happened to this cell on the last applied move (drives animations). */
export interface CellAnim {
  key: number;
  kind: 'place' | 'move' | ChangeKind | 'shot';
  damage: number;
  /** Piece before the hit, for the shatter effect. */
  before: Piece | null;
  /** Slide offset in cells for a moved piece. */
  dx?: number;
  dy?: number;
}

export function pieceLabel(p: Piece | null, cfg: RuleConfig): string {
  if (!p) return '빈칸';
  const side = p.owner === 'B' ? '흑' : '백';
  if (p.unit === null) return `${side} 토큰`;
  const def = cfg.UNITS[p.unit];
  return `${side} ${def.name} HP ${p.hp}/${def.maxHp}`;
}

export function PieceView({ piece, cfg, ghost, anim }: { piece: Piece; cfg: RuleConfig; ghost?: boolean; anim?: CellAnim | null }) {
  const animCls = anim ? ` anim-${anim.kind}` : '';
  const style = anim?.kind === 'move' ? ({ '--dx': anim.dx ?? 0, '--dy': anim.dy ?? 0 } as React.CSSProperties) : undefined;
  if (piece.unit === null) {
    return <div key={anim?.key} className={`token side-${piece.owner}${ghost ? ' ghost' : ''}${animCls}`} style={style} />;
  }
  const def = cfg.UNITS[piece.unit];
  return (
    <div key={anim?.key} className={`unit side-${piece.owner}${ghost ? ' ghost' : ''}${animCls}`} style={style}>
      <UnitIcon unit={piece.unit} name={def.name} className="unit-icon" />
      {def.maxHp > 1 && (
        <span className="hp" aria-hidden>
          {Array.from({ length: def.maxHp }, (_, i) => (
            <i key={i} className={i < piece.hp ? 'on' : ''} />
          ))}
        </span>
      )}
    </div>
  );
}

export interface CellProps {
  piece: Piece | null;
  label: string;
  cfg: RuleConfig;
  turn: Player;
  marker: Marker;
  playable: boolean;
  ghost: Piece | null;
  movingFrom: boolean;
  selected: boolean;
  anchor: boolean;
  shot: boolean;
  preview: CellPreview | null;
  last: boolean;
  anim: CellAnim | null;
  arrow: { dx: number; dy: number } | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

export default function Cell(p: CellProps) {
  const cls = [
    'cell',
    p.marker ? `mk-${p.marker}` : '',
    p.preview ? `pv-${p.preview.kind}` : '',
    p.anchor ? 'pv-anchor' : '',
    p.shot ? 'pv-shot' : '',
    p.movingFrom ? 'moving-from' : '',
    p.selected ? 'selected' : '',
    p.last ? 'last' : '',
    p.anim?.kind === 'shot' ? 'anim-shot-cell' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const pv = p.preview;
  const dmg = pv ? pv.lineDamage + pv.turretDamage : 0;
  const shatter = p.anim && p.anim.kind === 'tokenized' && p.anim.before;
  const floatDmg = p.anim && (p.anim.kind === 'hurt' || p.anim.kind === 'tokenized' || p.anim.kind === 'blocked');

  return (
    <button
      type="button"
      className={cls}
      aria-label={`${p.label} ${pieceLabel(p.piece, p.cfg)}`}
      aria-disabled={!p.playable}
      tabIndex={p.playable ? 0 : -1}
      onPointerDown={p.onPointerDown}
      onPointerEnter={p.onPointerEnter}
      onClick={p.onClick}
    >
      {p.piece && <PieceView piece={p.piece} cfg={p.cfg} anim={p.anim} />}
      {shatter && (
        <div key={`sh-${p.anim!.key}`} className={`shatter side-${p.anim!.before!.owner}`} aria-hidden>
          <span />
          <span />
        </div>
      )}
      {floatDmg && (
        <span key={`fd-${p.anim!.key}`} className={`float-dmg${p.anim!.damage === 0 ? ' zero' : ''}`} aria-hidden>
          {p.anim!.damage === 0 ? '0' : `−${p.anim!.damage}`}
        </span>
      )}
      {p.ghost && !p.piece && <PieceView piece={p.ghost} cfg={p.cfg} ghost />}
      {p.marker === 'place' && !p.ghost && <span className={`dot side-${p.turn}`} aria-hidden />}
      {p.arrow && !p.ghost && (
        <svg className="arrow" viewBox="0 0 24 24" aria-hidden style={{ rotate: `${Math.atan2(p.arrow.dy, p.arrow.dx)}rad` }}>
          <path d="M4 12h13M12 6l6 6-6 6" />
        </svg>
      )}
      {p.anchor && <span className="anchor-tag" aria-hidden>받침</span>}
      {pv && pv.kind !== 'flipped' && (
        <span className={`dmg-tag${dmg === 0 ? ' zero' : ''}`} aria-hidden>
          {dmg === 0 ? '0' : `−${dmg}`}
        </span>
      )}
      {pv?.kind === 'tokenized' && <span className="break-mark" aria-hidden />}
      {pv?.kind === 'flipped' && <span className={`flip-mark side-${p.turn}`} aria-hidden />}
      {p.shot && <span className="shot-mark" aria-hidden />}
    </button>
  );
}
