import { resolve, type LineHit, type TurretShot } from './rules';
import type { Cell, GameState, Move, Pos } from './types';

/**
 * hurt      - unit piece lost HP but stays a unit
 * tokenized - unit piece broke and became the attacker's token
 * flipped   - token changed owner
 * blocked   - was hit for 0 damage and nothing happened
 */
export type ChangeKind = 'hurt' | 'tokenized' | 'flipped' | 'blocked';

export interface CellChange extends Pos {
  before: Cell;
  after: Cell;
  lineDamage: number;
  turretDamage: number;
  kind: ChangeKind;
}

export interface MovePreview {
  /** Where the acting piece lands. */
  target: Pos | null;
  /** Origin of a move (vacated cell). */
  from: Pos | null;
  lines: LineHit[];
  anchors: Pos[];
  shots: TurretShot[];
  /** Every enemy cell that was hit, with before/after. */
  changes: CellChange[];
}

function classify(before: Cell, after: Cell): ChangeKind {
  if (!before || !after) return 'blocked';
  if (before.unit === null) return 'flipped';
  if (after.unit === null) return 'tokenized';
  return after.hp < before.hp ? 'hurt' : 'blocked';
}

/** Describes what `move` would do, cell by cell. Built on the same resolver as applyMove. */
export function previewMove(state: GameState, move: Move): MovePreview {
  const res = resolve(state, move);
  const lineDmg = new Map<string, number>();
  const turretDmg = new Map<string, number>();
  for (const l of res.lines) for (const c of l.cells) lineDmg.set(`${c.row},${c.col}`, l.damage);
  for (const s of res.shots) {
    const k = `${s.to.row},${s.to.col}`;
    turretDmg.set(k, (turretDmg.get(k) ?? 0) + s.damage);
  }
  const keys = new Set([...lineDmg.keys(), ...turretDmg.keys()]);
  const changes: CellChange[] = [...keys].map((k) => {
    const [row, col] = k.split(',').map(Number);
    const before = state.board[row][col];
    const after = res.board[row][col];
    return {
      row,
      col,
      before,
      after,
      lineDamage: lineDmg.get(k) ?? 0,
      turretDamage: turretDmg.get(k) ?? 0,
      kind: classify(before, after),
    };
  });
  return {
    target: res.actor,
    from: move.kind === 'move' ? { row: move.fromRow, col: move.fromCol } : null,
    lines: res.lines,
    anchors: res.lines.map((l) => l.anchor),
    shots: res.shots,
    changes,
  };
}
