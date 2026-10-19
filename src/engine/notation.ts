import type { RuleConfig } from './config';
import type { Move } from './types';

const FILES = 'abcdefghijklmnopqrstuvwxyz';

export function toNotation(row: number, col: number): string {
  return `${FILES[col]}${row + 1}`;
}

export function fromNotation(s: string): { row: number; col: number } {
  const m = /^([a-z])(\d+)$/.exec(s.trim().toLowerCase());
  if (!m) throw new Error(`Invalid notation: ${s}`);
  return { row: Number(m[2]) - 1, col: FILES.indexOf(m[1]) };
}

export function moveToString(move: Move, config: RuleConfig): string {
  if (move.kind === 'pass') return '패스';
  const to = toNotation(move.row, move.col);
  if (move.kind === 'move') return `${toNotation(move.fromRow, move.fromCol)}→${to}`;
  return `${config.UNITS[move.unit]?.name ?? move.unit} ${to}`;
}
