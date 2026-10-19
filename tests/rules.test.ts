import { describe, expect, it } from 'vitest';
import {
  applyMove,
  initialState,
  isGameOver,
  isLegal,
  legalMoves,
  placeableCells,
  score,
  toNotation,
  type GameState,
  type Move,
} from '../src/engine';
import { at, move, place, rng, setup } from './helpers';

function placesOf(moves: Move[]): string[] {
  return moves
    .filter((m): m is Extract<Move, { kind: 'place' }> => m.kind === 'place')
    .map((m) => `${toNotation(m.row, m.col)}:${m.unit}`)
    .sort();
}

function movesOf(moves: Move[]): string[] {
  return moves
    .filter((m): m is Extract<Move, { kind: 'move' }> => m.kind === 'move')
    .map((m) => `${toNotation(m.fromRow, m.fromCol)}>${toNotation(m.row, m.col)}`)
    .sort();
}

describe('RULES.md section 9', () => {
  it('T1: opening moves', () => {
    const ms = legalMoves(initialState());
    const places = placesOf(ms);
    expect(places).toHaveLength(16);
    expect([...new Set(places.map((p) => p.split(':')[0]))].sort()).toEqual(['c4', 'd3', 'e6', 'f5']);
    expect(movesOf(ms)).toEqual(['d5>c4', 'd5>e6', 'e4>d3', 'e4>f5']);
  });

  it('T2: soldier + soldier anchor deals 2', () => {
    const s = applyMove(setup({ a1: 'B병', b1: 'W방' }), place('soldier', 'c1'));
    expect(at(s, 'b1')).toBe('W방1');
  });

  it('T3: lancer + lancer anchor breaks a guard into a token', () => {
    const s = applyMove(setup({ a1: 'B창', b1: 'W방' }), place('lancer', 'c1'));
    expect(at(s, 'b1')).toBe('B토');
    expect(s.supply.B.lancer).toBe(2);
  });

  it('T4: zero damage is still a legal move and leaves a unit untouched', () => {
    const s0 = setup({ a1: 'B토', b1: 'W방' });
    expect(isLegal(s0, place('guard', 'c1'))).toBe(true);
    expect(at(applyMove(s0, place('guard', 'c1')), 'b1')).toBe('W방3');
  });

  it('T5: tokens flip even on zero damage', () => {
    const s = applyMove(setup({ a1: 'B토', b1: 'W토' }), place('guard', 'c1'));
    expect(at(s, 'b1')).toBe('B토');
  });

  it('T6: damage differs per line by anchor', () => {
    const s = applyMove(setup({ a3: 'B창', b3: 'W병', c1: 'B토', c2: 'W방' }), place('soldier', 'c3'));
    expect(at(s, 'b3')).toBe('B토');
    expect(at(s, 'c2')).toBe('W방2');
  });

  it('T7: tokens and units in one line are handled individually', () => {
    const s = applyMove(setup({ a1: 'B병', b1: 'W토', c1: 'W방' }), place('soldier', 'd1'));
    expect(at(s, 'b1')).toBe('B토');
    expect(at(s, 'c1')).toBe('W방1');
  });

  it('T8: moving adds the charge bonus and spends a ticket', () => {
    const s = applyMove(setup({ c3: 'B창', e3: 'W방', f3: 'B병' }), move('c3', 'd3'));
    expect(at(s, 'c3')).toBe('·');
    expect(at(s, 'd3')).toBe('B창1');
    expect(at(s, 'e3')).toBe('B토');
    expect(s.moveTickets.B).toBe(2);
  });

  it('T9: tokens cannot move', () => {
    expect(movesOf(legalMoves(setup({ c3: 'B토', e3: 'W병', f3: 'B병' })))).toEqual([]);
  });

  it('T10: no tickets, no moves', () => {
    const s = setup({ c3: 'B병', e3: 'W병', f3: 'B병' }, { moveTickets: { B: 0, W: 3 } });
    const ms = legalMoves(s);
    expect(movesOf(ms)).toEqual([]);
    expect(placesOf(ms)).toEqual(['d3:guard', 'd3:lancer', 'd3:soldier', 'd3:tower']);
  });

  it('T11: a moved turret fires from its new square', () => {
    const s = applyMove(setup({ c3: 'B포', e3: 'W병', f3: 'B병', d4: 'W병', d2: 'W방' }), move('c3', 'd3'));
    expect(at(s, 'e3')).toBe('B토');
    expect(at(s, 'd4')).toBe('B토');
    expect(at(s, 'd2')).toBe('W방2');
  });

  it('T12: a just-placed turret does not fire', () => {
    const s = applyMove(setup({ a1: 'B병', b1: 'W병', c2: 'W병' }), place('tower', 'c1'));
    expect(at(s, 'b1')).toBe('B토');
    expect(at(s, 'c1')).toBe('B포2');
    expect(at(s, 'c2')).toBe('W병1');
  });

  it('T13: turrets flip tokens; diagonals are out of range', () => {
    const s = applyMove(setup({ a1: 'B포', a2: 'W토', b2: 'W병', d1: 'B병', e1: 'W병' }), place('soldier', 'f1'));
    expect(at(s, 'e1')).toBe('B토');
    expect(at(s, 'a2')).toBe('B토');
    expect(at(s, 'b2')).toBe('W병1');
  });

  it('T14: line damage and turret damage stack', () => {
    const s = applyMove(setup({ a3: 'B포', b3: 'W방' }), place('soldier', 'c3'));
    expect(at(s, 'b3')).toBe('W방1');
  });

  it('T15: lancer + soldier anchor deals 3 to every piece in the line', () => {
    const s = applyMove(setup({ a1: 'B병', b1: 'W방2', c1: 'W병' }), place('lancer', 'd1'));
    expect(at(s, 'b1')).toBe('B토');
    expect(at(s, 'c1')).toBe('B토');
  });

  it('T16: two passes end the game; ties broken by HP sum', () => {
    let s = setup({ a1: 'B방', a8: 'B병', h1: 'W병', h8: 'W병' });
    expect(legalMoves(s)).toEqual([]);
    s = applyMove(s, { kind: 'pass' });
    expect(isGameOver(s)).toBe(false);
    expect(legalMoves(s)).toEqual([]);
    s = applyMove(s, { kind: 'pass' });
    expect(isGameOver(s)).toBe(true);
    const sc = score(s);
    expect(sc.pieces).toEqual({ B: 2, W: 2 });
    expect(sc.hp).toEqual({ B: 4, W: 2 });
    expect(sc.winner).toBe('B');
  });

  it('T17: units with zero supply cannot be placed', () => {
    const s = setup({ a1: 'B병', b1: 'W병' });
    s.supply.B.lancer = 0;
    expect(placesOf(legalMoves(s))).toEqual(['c1:guard', 'c1:soldier', 'c1:tower']);
  });

  it('T18: voluntary pass is rejected', () => {
    const s = initialState();
    expect(isLegal(s, { kind: 'pass' })).toBe(false);
    expect(() => applyMove(s, { kind: 'pass' })).toThrow();
  });

  it('T19: 1,000 random plies keep invariants', () => {
    const r = rng(19);
    let s: GameState = initialState();
    let plies = 0;
    let movesSeen = 0;
    while (plies < 1000) {
      if (isGameOver(s)) {
        s = initialState();
        continue;
      }
      const ms = legalMoves(s);
      const places = new Set(placeableCells(s).map((p) => `${p.row},${p.col}`));
      for (const m of ms) if (m.kind === 'move') expect(places.has(`${m.row},${m.col}`)).toBe(true);
      const moveOnly = ms.filter((m) => m.kind === 'move');
      const m: Move =
        ms.length === 0 ? { kind: 'pass' } : moveOnly.length && r() < 0.3 ? moveOnly[Math.floor(r() * moveOnly.length)] : ms[Math.floor(r() * ms.length)];
      if (m.kind === 'move') movesSeen++;
      const snapshot = JSON.stringify(s);
      const next = applyMove(s, m);
      expect(JSON.stringify(s)).toBe(snapshot);
      expect(JSON.parse(JSON.stringify(next))).toEqual(next);
      s = next;
      plies++;
    }
    expect(movesSeen).toBeGreaterThan(20);
  });
});
