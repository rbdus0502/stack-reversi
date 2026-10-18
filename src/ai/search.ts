import { applyMove, isGameOver, legalMoves, moveEffect } from '../engine/rules';
import type { GameState, Move } from '../engine/types';
import { DEFAULT_WEIGHTS, evaluate, terminalValue, type Weights } from './evaluate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 5,
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

/** Cheap ordering: corners first, then moves that change more stacks. */
function orderMoves(state: GameState, moves: Move[]): Move[] {
  const last = state.board.length - 1;
  const key = (m: Move) => {
    if (m.kind === 'pass') return 0;
    const e = moveEffect(state, m);
    const corner = (m.row === 0 || m.row === last) && (m.col === 0 || m.col === last) ? 100 : 0;
    return corner + e.flips.length * 2 + e.shaves.length;
  };
  return moves.map((m) => [key(m), m] as const).sort((a, b) => b[0] - a[0]).map(([, m]) => m);
}

export function search(state: GameState, opts: SearchOptions): SearchResult {
  const w = opts.weights ?? DEFAULT_WEIGHTS;
  const rng = opts.rng ?? Math.random;
  let nodes = 0;

  const root = orderMoves(state, movesOf(state));
  if (opts.randomness && rng() < opts.randomness) {
    return { move: root[Math.floor(rng() * root.length)], value: 0, nodes: 0 };
  }

  // Negamax with alpha-beta. Value is always from the side-to-move's view.
  const negamax = (s: GameState, depth: number, alpha: number, beta: number): number => {
    nodes++;
    if (isGameOver(s)) return terminalValue(s, s.turn);
    if (depth === 0) return evaluate(s, s.turn, w);
    let best = -Infinity;
    for (const m of orderMoves(s, movesOf(s))) {
      const v = -negamax(applyMove(s, m), depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  let bestMoves: Move[] = [];
  let bestValue = -Infinity;
  let alpha = -Infinity;
  for (const m of root) {
    // Window lets equal values through exactly so ties can be broken randomly.
    const v = -negamax(applyMove(state, m), opts.depth - 1, -Infinity, -alpha + 1);
    if (v > bestValue) {
      bestValue = v;
      bestMoves = [m];
    } else if (v === bestValue) {
      bestMoves.push(m);
    }
    if (v > alpha) alpha = v;
  }
  // Break ties randomly so games vary.
  const move = bestMoves[Math.floor(rng() * bestMoves.length)];
  return { move, value: bestValue, nodes };
}
