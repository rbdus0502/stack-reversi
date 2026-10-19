import { applyUnchecked, isGameOver, legalMoves } from '../engine/rules';
import type { GameState, Move } from '../engine/types';
import { DEFAULT_WEIGHTS, evaluate, terminalValue, type Weights } from './evaluate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 4,
};

export interface SearchOptions {
  depth: number;
  weights?: Weights;
  /** 0..1 chance of playing a random legal move instead of the best one. */
  randomness?: number;
  rng?: () => number;
}

export interface SearchResult {
  move: Move;
  value: number;
  nodes: number;
}

function movesOf(state: GameState): Move[] {
  const moves = legalMoves(state);
  return moves.length > 0 ? moves : [{ kind: 'pass' }];
}

/** Cheap static ordering: corners first, X-squares last, moves after places (DESIGN.md 9-2). */
function orderKey(state: GameState, m: Move): number {
  if (m.kind === 'pass') return 0;
  const last = state.board.length - 1;
  const er = m.row === 0 || m.row === last;
  const ec = m.col === 0 || m.col === last;
  let k = er && ec ? 100 : er || ec ? 10 : 0;
  if ((m.row === 1 || m.row === last - 1) && (m.col === 1 || m.col === last - 1)) k -= 30;
  if (m.kind === 'move') k -= 5;
  return k;
}

function ordered(state: GameState, moves: Move[]): Move[] {
  return moves.map((m) => [orderKey(state, m), m] as const).sort((a, b) => b[0] - a[0]).map(([, m]) => m);
}

export function search(state: GameState, opts: SearchOptions): SearchResult {
  const w = opts.weights ?? DEFAULT_WEIGHTS;
  const rng = opts.rng ?? Math.random;
  let nodes = 0;

  const all = movesOf(state);
  if (opts.randomness && rng() < opts.randomness) {
    return { move: all[Math.floor(rng() * all.length)], value: 0, nodes: 0 };
  }

  // Negamax with alpha-beta. Value is always from the side-to-move's view.
  const negamax = (s: GameState, depth: number, alpha: number, beta: number): number => {
    nodes++;
    if (isGameOver(s)) return terminalValue(s, s.turn);
    if (depth === 0) return evaluate(s, s.turn, w);
    let best = -Infinity;
    for (const m of ordered(s, movesOf(s))) {
      const v = -negamax(applyUnchecked(s, m), depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  // Root: order by a one-ply look so alpha-beta prunes well below.
  const children = all.map((m) => {
    const next = applyUnchecked(state, m);
    return { m, next, quick: isGameOver(next) ? -terminalValue(next, next.turn) : -evaluate(next, next.turn, w) };
  });
  children.sort((a, b) => b.quick - a.quick);

  let bestMoves: Move[] = [];
  let bestValue = -Infinity;
  let alpha = -Infinity;
  for (const { m, next, quick } of children) {
    // Window lets equal values through exactly so ties can be broken randomly.
    const v = opts.depth <= 1 ? quick : -negamax(next, opts.depth - 1, -Infinity, -alpha + 1);
    if (v > bestValue) {
      bestValue = v;
      bestMoves = [m];
    } else if (v === bestValue) {
      bestMoves.push(m);
    }
    if (v > alpha) alpha = v;
  }
  const move = bestMoves[Math.floor(rng() * bestMoves.length)];
  return { move, value: bestValue, nodes };
}
