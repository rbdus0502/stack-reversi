import { describe, expect, it } from 'vitest';
import { applyMove, initialState, isGameOver, legalMoves, previewMove, type GameState, type Move } from '../src/engine';
import { rng } from './helpers';

/** Rebuilds the post-move board from a preview alone. */
function boardFromPreview(state: GameState, m: Move) {
  const pv = previewMove(state, m);
  const board = state.board.map((row) => row.slice());
  if (m.kind === 'pass') return board;
  if (m.kind === 'move') {
    board[m.row][m.col] = board[m.fromRow][m.fromCol];
    board[m.fromRow][m.fromCol] = null;
  } else {
    const def = state.config.UNITS[m.unit];
    board[m.row][m.col] = { owner: state.turn, unit: m.unit, hp: def.maxHp };
  }
  for (const c of pv.changes) board[c.row][c.col] = c.after;
  return board;
}

describe('previewMove', () => {
  it('matches applyMove on 1,000 random plies (places and moves)', () => {
    const r = rng(7);
    let s: GameState = initialState();
    let checked = 0;
    let moves = 0;
    while (checked < 1000) {
      if (isGameOver(s)) {
        s = initialState();
        continue;
      }
      const ms = legalMoves(s);
      const moveOnly = ms.filter((m) => m.kind === 'move');
      const m: Move =
        ms.length === 0 ? { kind: 'pass' } : moveOnly.length && r() < 0.35 ? moveOnly[Math.floor(r() * moveOnly.length)] : ms[Math.floor(r() * ms.length)];
      const next = applyMove(s, m);
      expect(boardFromPreview(s, m)).toEqual(next.board);
      if (m.kind === 'move') moves++;
      s = next;
      checked++;
    }
    expect(moves).toBeGreaterThan(20);
  });

  it('marks anchors, line damage and turret shots', () => {
    const s = initialState();
    const pv = previewMove(s, { kind: 'place', unit: 'lancer', row: 2, col: 3 });
    expect(pv.anchors).toEqual([{ row: 4, col: 3 }]);
    expect(pv.lines[0].damage).toBe(3);
    expect(pv.changes).toEqual([
      expect.objectContaining({ row: 3, col: 3, kind: 'tokenized', lineDamage: 3, turretDamage: 0 }),
    ]);
  });
});
