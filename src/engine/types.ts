import type { RuleConfig, UnitId } from './config';

export type Player = 'B' | 'W';

/** A unit piece (unit set, hp >= 1) or a token (unit null, hp 0). */
export interface Piece {
  owner: Player;
  unit: UnitId | null;
  hp: number;
}

export type Cell = Piece | null;

export interface Pos {
  row: number;
  col: number;
}

export type Move =
  | { kind: 'place'; unit: UnitId; row: number; col: number }
  | { kind: 'move'; fromRow: number; fromCol: number; row: number; col: number }
  | { kind: 'pass' };

export interface GameState {
  board: Cell[][];
  turn: Player;
  /** Remaining placements per unit. null = unlimited. */
  supply: Record<Player, Record<UnitId, number | null>>;
  moveTickets: Record<Player, number>;
  /** Consecutive passes just played (2 ends the game). */
  passes: number;
  config: RuleConfig;
}

export interface Score {
  pieces: Record<Player, number>;
  hp: Record<Player, number>;
  winner: Player | 'draw';
}
