import { ALL_DIRS, DEFAULT_CONFIG, dirsOf, type RuleConfig, type UnitId } from './config';
import type { Cell, GameState, Move, Piece, Player, Pos, Score } from './types';

export function opponent(p: Player): Player {
  return p === 'B' ? 'W' : 'B';
}

export function emptyBoard(size: number): Cell[][] {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function newPiece(owner: Player, unit: UnitId, config: RuleConfig): Piece {
  return { owner, unit, hp: config.UNITS[unit].maxHp };
}

export function initialSupply(config: RuleConfig): Record<UnitId, number | null> {
  const s: Record<UnitId, number | null> = {};
  for (const [id, def] of Object.entries(config.UNITS)) s[id] = def.supply;
  return s;
}

export function initialState(config: RuleConfig = DEFAULT_CONFIG): GameState {
  const n = config.BOARD_SIZE;
  const board = emptyBoard(n);
  const a = n / 2 - 1;
  const b = n / 2;
  // d4/e5 white, e4/d5 black (RULES.md section 4).
  board[a][a] = newPiece('W', config.START_UNIT, config);
  board[b][b] = newPiece('W', config.START_UNIT, config);
  board[a][b] = newPiece('B', config.START_UNIT, config);
  board[b][a] = newPiece('B', config.START_UNIT, config);
  return {
    board,
    turn: 'B',
    supply: { B: initialSupply(config), W: initialSupply(config) },
    moveTickets: { B: config.MOVE_TICKETS, W: config.MOVE_TICKETS },
    passes: 0,
    config,
  };
}

export function isToken(p: Piece): boolean {
  return p.unit === null;
}

export function atkOf(p: Piece, config: RuleConfig): number {
  return p.unit === null ? 0 : config.UNITS[p.unit].atk;
}

export function auraOf(p: Piece, config: RuleConfig): number {
  return p.unit === null ? 0 : config.UNITS[p.unit].aura;
}

export interface Line {
  dir: readonly [number, number];
  /** Enemy pieces sandwiched in this line, nearest first. */
  cells: Pos[];
  anchor: Pos;
}

/** Sandwiched lines if `player` occupied (row, col). Pieces count regardless of unit/hp. */
export function linesAt(board: Cell[][], row: number, col: number, player: Player): Line[] {
  const n = board.length;
  const opp = opponent(player);
  const out: Line[] = [];
  for (const dir of ALL_DIRS) {
    const [dr, dc] = dir;
    const cells: Pos[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < n && c >= 0 && c < n && board[r][c]?.owner === opp) {
      cells.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    if (cells.length > 0 && r >= 0 && r < n && c >= 0 && c < n && board[r][c]?.owner === player) {
      out.push({ dir, cells, anchor: { row: r, col: c } });
    }
  }
  return out;
}

function hasLine(board: Cell[][], row: number, col: number, player: Player): boolean {
  const n = board.length;
  const opp = opponent(player);
  for (const [dr, dc] of ALL_DIRS) {
    let r = row + dr;
    let c = col + dc;
    let seen = false;
    while (r >= 0 && r < n && c >= 0 && c < n && board[r][c]?.owner === opp) {
      seen = true;
      r += dr;
      c += dc;
    }
    if (seen && r >= 0 && r < n && c >= 0 && c < n && board[r][c]?.owner === player) return true;
  }
  return false;
}

/** Empty cells where `player` could place (ignores supply). */
export function placeableCells(state: GameState, player: Player = state.turn): Pos[] {
  const out: Pos[] = [];
  const n = state.board.length;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (state.board[r][c] === null && hasLine(state.board, r, c, player)) out.push({ row: r, col: c });
  return out;
}

export function availableUnits(state: GameState, player: Player = state.turn): UnitId[] {
  return Object.keys(state.config.UNITS).filter((u) => {
    const left = state.supply[player][u];
    return left === null || left > 0;
  });
}

/** Board with the piece at `from` lifted off (for move legality). */
function without(board: Cell[][], from: Pos): Cell[][] {
  const b = board.map((row) => row.slice());
  b[from.row][from.col] = null;
  return b;
}

export function moveTargets(state: GameState, from: Pos): Pos[] {
  const p = state.turn;
  const piece = state.board[from.row][from.col];
  if (!piece || piece.owner !== p || isToken(piece) || state.moveTickets[p] < 1) return [];
  const n = state.board.length;
  const lifted = without(state.board, from);
  const out: Pos[] = [];
  for (const [dr, dc] of dirsOf(state.config.MOVE_DIRS)) {
    const r = from.row + dr;
    const c = from.col + dc;
    if (r < 0 || r >= n || c < 0 || c >= n || lifted[r][c] !== null) continue;
    if (hasLine(lifted, r, c, p)) out.push({ row: r, col: c });
  }
  return out;
}

/** Legal non-pass moves for the side to move. Empty array means the player must pass. */
export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const units = availableUnits(state);
  for (const { row, col } of placeableCells(state)) for (const unit of units) moves.push({ kind: 'place', unit, row, col });
  if (state.moveTickets[state.turn] > 0) {
    const n = state.board.length;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        for (const t of moveTargets(state, { row: r, col: c }))
          moves.push({ kind: 'move', fromRow: r, fromCol: c, row: t.row, col: t.col });
  }
  return moves;
}

function sameMove(a: Move, b: Move): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'pass') return true;
  if (a.row !== (b as typeof a).row || a.col !== (b as typeof a).col) return false;
  if (a.kind === 'place') return a.unit === (b as typeof a).unit;
  const m = b as typeof a;
  return a.fromRow === m.fromRow && a.fromCol === m.fromCol;
}

export function isGameOver(state: GameState): boolean {
  return state.passes >= 2;
}

export function isLegal(state: GameState, move: Move): boolean {
  if (isGameOver(state)) return false;
  const legal = legalMoves(state);
  if (move.kind === 'pass') return legal.length === 0;
  return legal.some((m) => sameMove(m, move));
}

// ---------------------------------------------------------------------------
// Resolution (RULES.md section 6). Shared by applyMove and previewMove.

export interface LineHit {
  dir: readonly [number, number];
  cells: Pos[];
  anchor: Pos;
  damage: number;
}

export interface TurretShot {
  from: Pos;
  to: Pos;
  damage: number;
}

export interface Resolution {
  board: Cell[][];
  /** Where the acting piece ends up (null for pass). */
  actor: Pos | null;
  lines: LineHit[];
  shots: TurretShot[];
}

function hit(piece: Piece, damage: number, attacker: Player): Piece {
  if (piece.unit === null) return { owner: attacker, unit: null, hp: 0 };
  if (damage <= 0) return piece;
  const hp = piece.hp - damage;
  return hp <= 0 ? { owner: attacker, unit: null, hp: 0 } : { ...piece, hp };
}

/** Resolves a move without legality checks. Callers must ensure the move is legal. */
export function resolve(state: GameState, move: Move): Resolution {
  const cfg = state.config;
  const me = state.turn;
  const opp = opponent(me);
  if (move.kind === 'pass') return { board: state.board, actor: null, lines: [], shots: [] };

  // 1. Lines on the pre-move board (origin vacated for moves).
  const before = move.kind === 'move' ? without(state.board, { row: move.fromRow, col: move.fromCol }) : state.board;
  const rawLines = linesAt(before, move.row, move.col, me);

  // 2. Place or move the actor.
  const board = before.map((row) => row.slice());
  const actor: Piece =
    move.kind === 'place' ? newPiece(me, move.unit, cfg) : (state.board[move.fromRow][move.fromCol] as Piece);
  board[move.row][move.col] = actor;
  const actorAtk = atkOf(actor, cfg) + (move.kind === 'move' ? cfg.CHARGE_BONUS : 0);

  // 3. Line damage: each sandwiched enemy takes actor ATK (+charge) + anchor ATK.
  const lines: LineHit[] = rawLines.map((l) => {
    const anchor = before[l.anchor.row][l.anchor.col] as Piece;
    const damage = actorAtk + atkOf(anchor, cfg);
    for (const c of l.cells) board[c.row][c.col] = hit(board[c.row][c.col] as Piece, damage, me);
    return { ...l, damage };
  });

  // 4. Turrets fire (newly placed turret excluded), summed then applied at once.
  const n = board.length;
  const shots: TurretShot[] = [];
  const pending = new Map<string, number>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const p = board[r][c];
      if (!p || p.owner !== me) continue;
      const aura = auraOf(p, cfg);
      if (aura <= 0) continue;
      if (move.kind === 'place' && r === move.row && c === move.col) continue;
      for (const [dr, dc] of dirsOf(cfg.AURA_DIRS)) {
        const tr = r + dr;
        const tc = c + dc;
        if (tr < 0 || tr >= n || tc < 0 || tc >= n || board[tr][tc]?.owner !== opp) continue;
        shots.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, damage: aura });
        const k = `${tr},${tc}`;
        pending.set(k, (pending.get(k) ?? 0) + aura);
      }
    }
  }
  for (const [k, dmg] of pending) {
    const [r, c] = k.split(',').map(Number);
    board[r][c] = hit(board[r][c] as Piece, dmg, me);
  }

  return { board, actor: { row: move.row, col: move.col }, lines, shots };
}

/** Returns a new state; never mutates the input. Throws on illegal moves. */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegal(state, move)) throw new Error(`Illegal move: ${JSON.stringify(move)}`);
  return applyUnchecked(state, move);
}

/** applyMove without the legality check, for search code that only plays legalMoves(). */
export function applyUnchecked(state: GameState, move: Move): GameState {
  const me = state.turn;
  if (move.kind === 'pass') return { ...state, turn: opponent(me), passes: state.passes + 1 };
  const { board } = resolve(state, move);
  let supply = state.supply;
  let moveTickets = state.moveTickets;
  if (move.kind === 'place') {
    const left = state.supply[me][move.unit];
    if (left !== null) supply = { ...supply, [me]: { ...supply[me], [move.unit]: left - 1 } };
  } else {
    moveTickets = { ...moveTickets, [me]: moveTickets[me] - 1 };
  }
  return { ...state, board, supply, moveTickets, turn: opponent(me), passes: 0 };
}

export function score(state: GameState): Score {
  const pieces = { B: 0, W: 0 };
  const hp = { B: 0, W: 0 };
  for (const row of state.board) {
    for (const c of row) {
      if (!c) continue;
      pieces[c.owner] += 1;
      hp[c.owner] += c.hp;
    }
  }
  let winner: Score['winner'] = 'draw';
  if (pieces.B !== pieces.W) winner = pieces.B > pieces.W ? 'B' : 'W';
  else if (hp.B !== hp.W) winner = hp.B > hp.W ? 'B' : 'W';
  return { pieces, hp, winner };
}

export function winner(state: GameState): Score['winner'] {
  return score(state).winner;
}
