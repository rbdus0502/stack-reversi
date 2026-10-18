import { DEFAULT_CONFIG, type RuleConfig } from './config';
import type { Cell, GameState, Move, MoveEffect, Player, Score } from './types';

const DIRS: readonly [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

export function opponent(p: Player): Player {
  return p === 'B' ? 'W' : 'B';
}

export function emptyBoard(size: number): Cell[][] {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function initialState(config: RuleConfig = DEFAULT_CONFIG): GameState {
  const n = config.BOARD_SIZE;
  const board = emptyBoard(n);
  const a = n / 2 - 1;
  const b = n / 2;
  // d4/e5 white, e4/d5 black (RULES.md section 4).
  board[a][a] = { owner: 'W', height: 1 };
  board[b][b] = { owner: 'W', height: 1 };
  board[a][b] = { owner: 'B', height: 1 };
  board[b][a] = { owner: 'B', height: 1 };
  return {
    board,
    turn: 'B',
    tokens: { B: config.STACK_TOKENS, W: config.STACK_TOKENS },
    passes: 0,
    config,
  };
}

/** Cells sandwiched by `player` if anchored at (row, col). Heights are ignored for the test. */
export function sandwiched(
  board: Cell[][],
  row: number,
  col: number,
  player: Player,
): { row: number; col: number }[] {
  const n = board.length;
  const opp = opponent(player);
  const out: { row: number; col: number }[] = [];
  for (const [dr, dc] of DIRS) {
    const line: { row: number; col: number }[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < n && c >= 0 && c < n && board[r][c]?.owner === opp) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    if (line.length > 0 && r >= 0 && r < n && c >= 0 && c < n && board[r][c]?.owner === player) {
      out.push(...line);
    }
  }
  return out;
}

function canStackAt(state: GameState, row: number, col: number): boolean {
  const cell = state.board[row][col];
  const p = state.turn;
  if (!cell || cell.owner !== p) return false;
  if (cell.height >= state.config.MAX_HEIGHT) return false;
  if (state.tokens[p] < 1) return false;
  if (state.config.STACK_MUST_FLIP && sandwiched(state.board, row, col, p).length === 0) return false;
  return true;
}

/** Legal non-pass moves for the side to move. Empty array means the player must pass. */
export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const n = state.board.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = state.board[r][c];
      if (cell === null) {
        if (sandwiched(state.board, r, c, state.turn).length > 0) moves.push({ kind: 'place', row: r, col: c });
      } else if (canStackAt(state, r, c)) {
        moves.push({ kind: 'stack', row: r, col: c });
      }
    }
  }
  return moves;
}

export function isLegal(state: GameState, move: Move): boolean {
  if (isGameOver(state)) return false;
  const legal = legalMoves(state);
  if (move.kind === 'pass') return legal.length === 0;
  return legal.some((m) => m.kind === move.kind && m.row === move.row && m.col === move.col);
}

/** Which sandwiched cells change color and which lose a layer. Computed on the pre-move board. */
export function moveEffect(state: GameState, move: Move): MoveEffect {
  if (move.kind === 'pass') return { flips: [], shaves: [] };
  const targets = sandwiched(state.board, move.row, move.col, state.turn);
  const flips: MoveEffect['flips'] = [];
  const shaves: MoveEffect['shaves'] = [];
  for (const t of targets) {
    if ((state.board[t.row][t.col] as NonNullable<Cell>).height === 1) flips.push(t);
    else shaves.push(t);
  }
  return { flips, shaves };
}

/** Returns a new state; never mutates the input. Throws on illegal moves. */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegal(state, move)) throw new Error(`Illegal move: ${JSON.stringify(move)}`);
  const p = state.turn;
  if (move.kind === 'pass') {
    return { ...state, turn: opponent(p), passes: state.passes + 1 };
  }
  const { flips, shaves } = moveEffect(state, move);
  const board = state.board.map((row) => row.map((c) => (c ? { ...c } : null)));
  for (const f of flips) board[f.row][f.col] = { owner: p, height: 1 };
  for (const s of shaves) (board[s.row][s.col] as NonNullable<Cell>).height -= 1;
  const tokens = { ...state.tokens };
  if (move.kind === 'place') {
    board[move.row][move.col] = { owner: p, height: 1 };
  } else {
    (board[move.row][move.col] as NonNullable<Cell>).height += 1;
    tokens[p] -= 1;
  }
  return { ...state, board, tokens, turn: opponent(p), passes: 0 };
}

export function isGameOver(state: GameState): boolean {
  return state.passes >= 2;
}

export function score(state: GameState): Score {
  const cells = { B: 0, W: 0 };
  const heights = { B: 0, W: 0 };
  for (const row of state.board) {
    for (const c of row) {
      if (!c) continue;
      cells[c.owner] += 1;
      heights[c.owner] += c.height;
    }
  }
  let winner: Score['winner'] = 'draw';
  if (cells.B !== cells.W) winner = cells.B > cells.W ? 'B' : 'W';
  else if (heights.B !== heights.W) winner = heights.B > heights.W ? 'B' : 'W';
  return { cells, heights, winner };
}
