import {
  DEFAULT_CONFIG,
  emptyBoard,
  fromNotation,
  initialSupply,
  type GameState,
  type Move,
  type Piece,
  type Player,
} from '../src/engine';

// Test notation from RULES.md section 9: 'B병' = black soldier (full HP), 'W방2' = white guard HP 2, 'B토' = black token.
const UNIT_BY_CHAR: Record<string, string | null> = { 병: 'soldier', 방: 'guard', 창: 'lancer', 포: 'tower', 토: null };
const CHAR_BY_UNIT: Record<string, string> = { soldier: '병', guard: '방', lancer: '창', tower: '포' };

export function piece(code: string): Piece {
  const owner = code[0] as Player;
  const unit = UNIT_BY_CHAR[code[1]];
  if (unit === undefined) throw new Error(`Unknown unit in ${code}`);
  if (unit === null) return { owner, unit: null, hp: 0 };
  const hp = code.length > 2 ? Number(code.slice(2)) : DEFAULT_CONFIG.UNITS[unit].maxHp;
  return { owner, unit, hp };
}

/** Build a state from { a1: 'B병', b1: 'W방2' }. Black to move, default supply and tickets. */
export function setup(cells: Record<string, string>, overrides: Partial<GameState> = {}): GameState {
  const board = emptyBoard(DEFAULT_CONFIG.BOARD_SIZE);
  for (const [sq, code] of Object.entries(cells)) {
    const { row, col } = fromNotation(sq);
    board[row][col] = piece(code);
  }
  return {
    board,
    turn: 'B',
    supply: { B: initialSupply(DEFAULT_CONFIG), W: initialSupply(DEFAULT_CONFIG) },
    moveTickets: { B: DEFAULT_CONFIG.MOVE_TICKETS, W: DEFAULT_CONFIG.MOVE_TICKETS },
    passes: 0,
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

/** Cell contents in test notation, full HP written explicitly (e.g. 'W방3'), '·' for empty. */
export function at(state: GameState, sq: string): string {
  const { row, col } = fromNotation(sq);
  const p = state.board[row][col];
  if (!p) return '·';
  if (p.unit === null) return `${p.owner}토`;
  return `${p.owner}${CHAR_BY_UNIT[p.unit]}${p.hp}`;
}

export function place(unit: string, sq: string): Move {
  return { kind: 'place', unit, ...fromNotation(sq) };
}

export function move(from: string, to: string): Move {
  const f = fromNotation(from);
  return { kind: 'move', fromRow: f.row, fromCol: f.col, ...fromNotation(to) };
}

/** Deterministic PRNG so random tests are reproducible. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
