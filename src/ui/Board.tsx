import { useMemo, useRef, useState } from 'react';
import { moveEffect } from '../engine/rules';
import { toNotation } from '../engine/notation';
import type { GameState, Move, MoveEffect, Player } from '../engine/types';
import Cell, { type Anim, type Marker, type Preview } from './Cell';

export interface LastAction {
  move: Move;
  effect: MoveEffect;
  /** Pre-move owners of shaved stacks, keyed by "r,c". */
  shavedOwners: Record<string, Player>;
  key: number;
  /** False when we navigated history instead of playing: highlight only, no animation. */
  animate: boolean;
}

interface BoardProps {
  state: GameState;
  legal: Move[];
  interactive: boolean;
  showHints: boolean;
  last: LastAction | null;
  onMove: (m: Move) => void;
}

type Target = Extract<Move, { row: number }>;

export default function Board({ state, legal, interactive, showHints, last, onMove }: BoardProps) {
  const n = state.board.length;
  const [hover, setHover] = useState<Target | null>(null);
  const [selected, setSelected] = useState<Target | null>(null);
  const pointerType = useRef<string>('mouse');

  const byCell = useMemo(() => {
    const map = new Map<string, Target>();
    if (interactive) for (const m of legal) if (m.kind !== 'pass') map.set(`${m.row},${m.col}`, m);
    return map;
  }, [legal, interactive]);

  // Selected (touch) takes priority over hover (mouse).
  const focus = selected && byCell.has(`${selected.row},${selected.col}`) ? selected : hover;
  const effect = useMemo(() => (focus ? moveEffect(state, focus) : null), [focus, state]);

  const preview = new Map<string, Preview>();
  if (effect) {
    for (const f of effect.flips) preview.set(`${f.row},${f.col}`, 'flip');
    for (const s of effect.shaves) preview.set(`${s.row},${s.col}`, 'shave');
  }

  const anims = new Map<string, Anim>();
  if (last && last.animate && last.move.kind !== 'pass') {
    anims.set(`${last.move.row},${last.move.col}`, last.move.kind);
    for (const f of last.effect.flips) anims.set(`${f.row},${f.col}`, 'flip');
    for (const s of last.effect.shaves) anims.set(`${s.row},${s.col}`, 'shave');
  }

  const files = Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i));

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
      <div className="board" role="grid" style={{ '--n': n } as React.CSSProperties}>
        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const k = `${r},${c}`;
            const move = byCell.get(k) ?? null;
            const marker: Marker = move && (showHints || move.kind === 'stack') ? move.kind : null;
            const isFocus = !!focus && focus.row === r && focus.col === c;
            return (
              <Cell
                key={k}
                cell={cell}
                label={toNotation(r, c)}
                marker={marker}
                playable={!!move}
                preview={preview.get(k) ?? null}
                ghost={isFocus && move?.kind === 'place' ? state.turn : null}
                selected={!!selected && selected.row === r && selected.col === c}
                focus={isFocus && !!move}
                last={!!last && last.move.kind !== 'pass' && last.move.row === r && last.move.col === c}
                anim={anims.get(k) ?? null}
                animKey={last?.key ?? 0}
                turn={state.turn}
                shavedOwner={last?.shavedOwners[k] ?? null}
                onPointerDown={(e) => {
                  pointerType.current = e.pointerType;
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setHover(move);
                }}
                onClick={(e) => {
                  if (!move) return;
                  // detail === 0 means keyboard activation: always confirm.
                  const isTouch = e.detail !== 0 && pointerType.current !== 'mouse';
                  // Touch: first tap previews, second tap on the same cell confirms.
                  if (isTouch && !(selected && selected.row === r && selected.col === c)) {
                    setSelected(move);
                    return;
                  }
                  setSelected(null);
                  setHover(null);
                  onMove(move);
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
