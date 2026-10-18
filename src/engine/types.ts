import type { RuleConfig } from './config';

export type Player = 'B' | 'W';

export interface Stack {
  owner: Player;
  height: number;
}

export type Cell = Stack | null;

export type Move =
  | { kind: 'place'; row: number; col: number }
  | { kind: 'stack'; row: number; col: number }
  | { kind: 'pass' };

export interface GameState {
  board: Cell[][];
  turn: Player;
  tokens: Record<Player, number>;
  /** Number of consecutive passes just played (2 ends the game). */
  passes: number;
  config: RuleConfig;
}

/** What happens to each sandwiched stack when a move is applied. */
export interface MoveEffect {
  flips: { row: number; col: number }[];
  shaves: { row: number; col: number }[];
}

export interface Score {
  cells: Record<Player, number>;
  heights: Record<Player, number>;
  winner: Player | 'draw';
}
