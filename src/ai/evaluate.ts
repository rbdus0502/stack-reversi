import { legalMoves, opponent, score } from '../engine/rules';
import type { GameState, Player } from '../engine/types';

export interface Weights {
  cell: number;
  height: number;
  corner: number;
  edge: number;
  xSquare: number;
  token: number;
  mobility: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  cell: 10,
  height: 6,
  corner: 60,
  edge: 6,
  xSquare: -25,
  token: 8,
  mobility: 4,
};

export const WIN_SCORE = 1_000_000;

/** Terminal score from `me`'s point of view. */
export function terminalValue(state: GameState, me: Player): number {
  const s = score(state);
  if (s.winner === 'draw') return 0;
  const margin = (s.cells[me] - s.cells[opponent(me)]) * 100 + (s.heights[me] - s.heights[opponent(me)]);
  return s.winner === me ? WIN_SCORE + margin : -WIN_SCORE + margin;
}

/** Static evaluation from `me`'s point of view. Higher is better for `me`. */
export function evaluate(state: GameState, me: Player, w: Weights = DEFAULT_WEIGHTS): number {
  const n = state.board.length;
  const last = n - 1;
  const opp = opponent(me);
  let v = 0;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = state.board[r][c];
      if (!cell) continue;
      const sign = cell.owner === me ? 1 : -1;
      const isCorner = (r === 0 || r === last) && (c === 0 || c === last);
      const isEdge = r === 0 || r === last || c === 0 || c === last;
      const isX =
        (r === 1 || r === last - 1) &&
        (c === 1 || c === last - 1) &&
        !state.board[r === 1 ? 0 : last][c === 1 ? 0 : last];
      v += sign * w.cell;
      v += sign * (cell.height - 1) * w.height;
      if (isCorner) v += sign * w.corner * cell.height;
      else if (isEdge) v += sign * w.edge;
      if (isX) v += sign * w.xSquare;
    }
  }

  v += (state.tokens[me] - state.tokens[opp]) * w.token;

  const mine = legalMoves({ ...state, turn: me }).length;
  const theirs = legalMoves({ ...state, turn: opp }).length;
  v += (mine - theirs) * w.mobility;

  return v;
}
