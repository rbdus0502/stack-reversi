import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  applyMove,
  emptyBoard,
  fromNotation,
  initialState,
  isGameOver,
  isLegal,
  legalMoves,
  score,
  toNotation,
  type GameState,
  type Move,
  type Player,
} from '../src/engine';

/** Build a state from a map like { a1: 'B1', b1: 'W2' }. Black to move, 5 tokens each by default. */
function setup(cells: Record<string, string>, opts: Partial<Pick<GameState, 'turn' | 'tokens'>> = {}): GameState {
  const board = emptyBoard(DEFAULT_CONFIG.BOARD_SIZE);
  for (const [sq, v] of Object.entries(cells)) {
    const { row, col } = fromNotation(sq);
    board[row][col] = { owner: v[0] as Player, height: Number(v.slice(1)) };
  }
  return {
    board,
    turn: opts.turn ?? 'B',
    tokens: opts.tokens ?? { B: DEFAULT_CONFIG.STACK_TOKENS, W: DEFAULT_CONFIG.STACK_TOKENS },
    passes: 0,
    config: DEFAULT_CONFIG,
  };
}

function at(state: GameState, sq: string): string {
  const { row, col } = fromNotation(sq);
  const c = state.board[row][col];
  return c ? `${c.owner}${c.height}` : '·';
}

function names(moves: Move[], kind: 'place' | 'stack'): string[] {
  return moves
    .filter((m): m is Extract<Move, { row: number }> => m.kind === kind)
    .map((m) => toNotation(m.row, m.col))
    .sort();
}

function mv(kind: 'place' | 'stack', sq: string): Move {
  return { kind, ...fromNotation(sq) };
}

describe('RULES.md section 9', () => {
  it('T1: opening moves for black', () => {
    const moves = legalMoves(initialState());
    expect(names(moves, 'place')).toEqual(['c4', 'd3', 'e6', 'f5']);
    expect(names(moves, 'stack')).toEqual([]);
  });

  it('T2: stacking is legal on both ends of a sandwich', () => {
    const s = setup({ a1: 'B1', b1: 'W1', c1: 'B1' });
    expect(names(legalMoves(s), 'stack')).toEqual(['a1', 'c1']);
  });

  it('T2b: stacking on c1 flips b1 and spends a token', () => {
    const s = setup({ a1: 'B1', b1: 'W1', c1: 'B1' });
    const next = applyMove(s, mv('stack', 'c1'));
    expect([at(next, 'a1'), at(next, 'b1'), at(next, 'c1')]).toEqual(['B1', 'B1', 'B2']);
    expect(next.tokens.B).toBe(4);
    // Original state is untouched.
    expect(at(s, 'c1')).toBe('B1');
    expect(s.tokens.B).toBe(5);
  });

  it('T3: a tall stack loses a layer instead of flipping', () => {
    const next = applyMove(setup({ a1: 'B1', b1: 'W2' }), mv('place', 'c1'));
    expect([at(next, 'b1'), at(next, 'c1')]).toEqual(['W1', 'B1']);
  });

  it('T4: mixed heights in one line', () => {
    const next = applyMove(setup({ a1: 'B1', b1: 'W1', c1: 'W2' }), mv('place', 'd1'));
    expect([at(next, 'b1'), at(next, 'c1'), at(next, 'd1')]).toEqual(['B1', 'W1', 'B1']);
  });

  it('T5: sandwich is evaluated once on the pre-move board', () => {
    const next = applyMove(setup({ a1: 'B1', b1: 'W2', c1: 'W1' }), mv('place', 'd1'));
    expect([at(next, 'b1'), at(next, 'c1'), at(next, 'd1')]).toEqual(['W1', 'B1', 'B1']);
  });

  it('T6: max-height stack cannot be stacked', () => {
    const moves = legalMoves(setup({ a1: 'B1', b1: 'W1', c1: 'W1', d1: 'B3' }));
    expect(names(moves, 'stack')).toEqual(['a1']);
    expect(names(moves, 'place')).toEqual([]);
  });

  it('T7: no tokens means no stacking, so black must pass', () => {
    const s = setup({ a1: 'B1', b1: 'W1', c1: 'B1' }, { tokens: { B: 0, W: 5 } });
    expect(legalMoves(s)).toEqual([]);
    expect(isLegal(s, { kind: 'pass' })).toBe(true);
  });

  it('T8: stacking on an opponent stack is rejected', () => {
    const s = setup({ a1: 'B1', b1: 'W1', c1: 'B1' });
    expect(isLegal(s, mv('stack', 'b1'))).toBe(false);
    expect(() => applyMove(s, mv('stack', 'b1'))).toThrow();
  });

  it('T9: two consecutive passes end the game', () => {
    const s = setup({ a1: 'B2', h8: 'W1' });
    expect(legalMoves(s)).toEqual([]);
    const s1 = applyMove(s, { kind: 'pass' });
    expect(isGameOver(s1)).toBe(false);
    expect(legalMoves(s1)).toEqual([]);
    const s2 = applyMove(s1, { kind: 'pass' });
    expect(isGameOver(s2)).toBe(true);
    // Equal cell count (1:1), black height sum 2 > 1.
    expect(score(s2).winner).toBe('B');
  });

  it('T10: cell tie broken by height sum', () => {
    const s = setup({ a1: 'B3', b2: 'B1', g7: 'W1', h8: 'W2' });
    const sc = score(s);
    expect(sc.cells).toEqual({ B: 2, W: 2 });
    expect(sc.heights).toEqual({ B: 4, W: 3 });
    expect(sc.winner).toBe('B');
  });
});

describe('extra engine checks', () => {
  it('voluntary pass is illegal when a move exists', () => {
    expect(isLegal(initialState(), { kind: 'pass' })).toBe(false);
  });

  it('a non-pass move resets the pass counter', () => {
    const s = { ...setup({ a1: 'B1', b1: 'W1' }), passes: 1 };
    expect(applyMove(s, mv('place', 'c1')).passes).toBe(0);
  });

  it('a full draw', () => {
    expect(score(setup({ a1: 'B2', h8: 'W2' })).winner).toBe('draw');
  });

  it('state is JSON-serializable', () => {
    const s = applyMove(initialState(), mv('place', 'd3'));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
