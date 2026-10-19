import { opponent, placeableCells, score } from '../engine/rules';
import type { GameState, Player } from '../engine/types';

export interface Weights {
  piece: number;
  hp: number;
  corner: number;
  xSquare: number;
  /** Per ATK point of a unit sitting on an edge (good anchor). */
  edgeAtk: number;
  /** Per "value point" of unplaced special units still in supply. */
  reserve: number;
  ticket: number;
  mobility: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  piece: 10,
  hp: 4,
  corner: 35,
  xSquare: -18,
  edgeAtk: 4,
  reserve: 2,
  ticket: 5,
  mobility: 2,
};

export const WIN_SCORE = 1_000_000;

/** Terminal score from `me`'s point of view. */
export function terminalValue(state: GameState, me: Player): number {
  const s = score(state);
  if (s.winner === 'draw') return 0;
  const opp = opponent(me);
  const margin = (s.pieces[me] - s.pieces[opp]) * 100 + (s.hp[me] - s.hp[opp]);
  return s.winner === me ? WIN_SCORE + margin : -WIN_SCORE + margin;
}

/** Static evaluation from `me`'s point of view. Higher is better for `me`. */
export function evaluate(state: GameState, me: Player, w: Weights = DEFAULT_WEIGHTS): number {
  const cfg = state.config;
  const n = state.board.length;
  const last = n - 1;
  const opp = opponent(me);
  let v = 0;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const sign = p.owner === me ? 1 : -1;
      const edgeR = r === 0 || r === last;
      const edgeC = c === 0 || c === last;
      v += sign * (w.piece + p.hp * w.hp);
      if (edgeR && edgeC) v += sign * w.corner;
      else if (edgeR || edgeC) {
        if (p.unit !== null) v += sign * cfg.UNITS[p.unit].atk * w.edgeAtk;
      } else if ((r === 1 || r === last - 1) && (c === 1 || c === last - 1)) {
        if (!state.board[r === 1 ? 0 : last][c === 1 ? 0 : last]) v += sign * w.xSquare;
      }
    }
  }

  // Unplaced special units are future strength.
  for (const [id, def] of Object.entries(cfg.UNITS)) {
    if (def.supply === null) continue;
    const value = def.maxHp + def.atk * 2 + def.aura * 4;
    v += ((state.supply[me][id] ?? 0) - (state.supply[opp][id] ?? 0)) * value * w.reserve;
  }

  v += (state.moveTickets[me] - state.moveTickets[opp]) * w.ticket;
  v += (placeableCells(state, me).length - placeableCells(state, opp).length) * w.mobility;
  return v;
}
