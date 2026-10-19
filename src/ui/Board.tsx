import { useEffect, useMemo, useRef, useState } from 'react';
import type { UnitId } from '../engine/config';
import { toNotation } from '../engine/notation';
import { previewMove, type MovePreview } from '../engine/preview';
import type { GameState, Move, Piece, Pos } from '../engine/types';
import Cell, { type CellAnim, type CellPreview, type Marker } from './Cell';

interface BoardProps {
  state: GameState;
  legal: Move[];
  unit: UnitId;
  interactive: boolean;
  showHints: boolean;
  anims: Map<string, CellAnim>;
  lastCells: Pos[];
  onMove: (m: Move) => void;
}

type PlaceMove = Extract<Move, { kind: 'place' }>;
type StepMove = Extract<Move, { kind: 'move' }>;

const key = (r: number, c: number) => `${r},${c}`;
const sameTarget = (a: Move | null, b: Move | null) =>
  !!a && !!b && a.kind !== 'pass' && b.kind !== 'pass' && a.kind === b.kind && a.row === b.row && a.col === b.col;

export default function Board({ state, legal, unit, interactive, showHints, anims, lastCells, onMove }: BoardProps) {
  const n = state.board.length;
  const [hover, setHover] = useState<Pos | null>(null);
  const [movingFrom, setMovingFrom] = useState<Pos | null>(null);
  /** Touch: the move previewed by the first tap, confirmed by the second. */
  const [armed, setArmed] = useState<Move | null>(null);
  const pointerType = useRef<string>('mouse');

  // Reset transient selection whenever the position or the chosen unit changes.
  useEffect(() => {
    setMovingFrom(null);
    setArmed(null);
  }, [state, unit, interactive]);

  const places = useMemo(() => {
    const m = new Map<string, PlaceMove>();
    if (interactive) for (const mv of legal) if (mv.kind === 'place' && mv.unit === unit) m.set(key(mv.row, mv.col), mv);
    return m;
  }, [legal, unit, interactive]);

  const stepsByFrom = useMemo(() => {
    const m = new Map<string, StepMove[]>();
    if (!interactive) return m;
    for (const mv of legal) {
      if (mv.kind !== 'move') continue;
      const k = key(mv.fromRow, mv.fromCol);
      m.set(k, [...(m.get(k) ?? []), mv]);
    }
    return m;
  }, [legal, interactive]);

  const steps = useMemo(() => {
    const m = new Map<string, StepMove>();
    if (movingFrom) for (const s of stepsByFrom.get(key(movingFrom.row, movingFrom.col)) ?? []) m.set(key(s.row, s.col), s);
    return m;
  }, [movingFrom, stepsByFrom]);

  const moveAt = (r: number, c: number): Move | null => (movingFrom ? steps.get(key(r, c)) : places.get(key(r, c))) ?? null;

  const focus: Move | null = armed ?? (hover ? moveAt(hover.row, hover.col) : null);
  const pv: MovePreview | null = useMemo(() => (focus ? previewMove(state, focus) : null), [focus, state]);

  const cellPv = new Map<string, CellPreview>();
  const anchors = new Set<string>();
  const shots = new Set<string>();
  if (pv) {
    for (const ch of pv.changes) cellPv.set(key(ch.row, ch.col), ch);
    for (const a of pv.anchors) anchors.add(key(a.row, a.col));
    for (const s of pv.shots) shots.add(key(s.to.row, s.to.col));
  }

  let ghost: { at: string; piece: Piece } | null = null;
  if (focus && focus.kind === 'place') {
    ghost = { at: key(focus.row, focus.col), piece: { owner: state.turn, unit: focus.unit, hp: state.config.UNITS[focus.unit].maxHp } };
  } else if (focus && focus.kind === 'move') {
    ghost = { at: key(focus.row, focus.col), piece: state.board[focus.fromRow][focus.fromCol] as Piece };
  }

  const lastSet = new Set(lastCells.map((p) => key(p.row, p.col)));
  const files = Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i));

  const handleClick = (r: number, c: number, e: React.MouseEvent) => {
    if (!interactive) return;
    const k = key(r, c);
    const isTouch = e.detail !== 0 && pointerType.current !== 'mouse';
    const target = moveAt(r, c);
    if (target) {
      // Touch (and keyboard-less taps): first tap previews, second confirms.
      if (isTouch && !sameTarget(armed, target)) {
        setArmed(target);
        return;
      }
      setArmed(null);
      setMovingFrom(null);
      setHover(null);
      onMove(target);
      return;
    }
    setArmed(null);
    if (movingFrom && movingFrom.row === r && movingFrom.col === c) {
      setMovingFrom(null);
      return;
    }
    if (stepsByFrom.has(k)) {
      setMovingFrom({ row: r, col: c });
      return;
    }
    if (movingFrom) {
      setMovingFrom(null);
      // Allow a direct switch back to placing on the same tap.
      const p = places.get(k);
      if (p && !isTouch) onMove(p);
      else if (p) setArmed(p);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMovingFrom(null);
        setArmed(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="board-wrap" onPointerLeave={() => setHover(null)}>
      <div className="coords coords-top" aria-hidden>
        {files.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
      <div className="coords coords-left" aria-hidden>
        {files.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <div className={`board${movingFrom ? ' is-moving' : ''}`} role="grid" style={{ '--n': n } as React.CSSProperties}>
        {state.board.map((row, r) =>
          row.map((piece, c) => {
            const k = key(r, c);
            const placeMv = !movingFrom ? places.get(k) : undefined;
            const stepMv = movingFrom ? steps.get(k) : undefined;
            const canMoveFrom = !movingFrom && stepsByFrom.has(k);
            let marker: Marker = null;
            if (stepMv) marker = 'target';
            else if (placeMv && showHints) marker = 'place';
            else if (canMoveFrom && showHints) marker = 'movable';
            const isFrom = !!movingFrom && movingFrom.row === r && movingFrom.col === c;
            return (
              <Cell
                key={k}
                piece={piece}
                label={toNotation(r, c)}
                cfg={state.config}
                turn={state.turn}
                marker={marker}
                playable={!!placeMv || !!stepMv || stepsByFrom.has(k) || isFrom}
                ghost={ghost?.at === k ? ghost.piece : null}
                movingFrom={isFrom}
                selected={!!armed && armed.kind !== 'pass' && armed.row === r && armed.col === c}
                anchor={anchors.has(k)}
                shot={shots.has(k)}
                preview={cellPv.get(k) ?? null}
                last={lastSet.has(k)}
                anim={anims.get(k) ?? null}
                arrow={stepMv && movingFrom ? { dx: c - movingFrom.col, dy: r - movingFrom.row } : null}
                onPointerDown={(e) => {
                  pointerType.current = e.pointerType;
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setHover({ row: r, col: c });
                }}
                onClick={(e) => handleClick(r, c, e)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
