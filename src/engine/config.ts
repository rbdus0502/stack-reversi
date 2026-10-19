// All rule constants and unit stats live here. See docs/RULES.md section 2.

export type UnitId = string;

export interface UnitDef {
  name: string;
  maxHp: number;
  atk: number;
  /** Pieces each player may place. null = unlimited. */
  supply: number | null;
  /** Damage dealt to each adjacent enemy piece after every own action. 0 = not a turret. */
  aura: number;
}

export type DirSet = 'all' | 'orthogonal';

export interface RuleConfig {
  BOARD_SIZE: number;
  UNITS: Record<UnitId, UnitDef>;
  MOVE_TICKETS: number;
  CHARGE_BONUS: number;
  MOVE_DIRS: DirSet;
  AURA_DIRS: DirSet;
  /** Unit used for the four starting pieces. */
  START_UNIT: UnitId;
}

export const DEFAULT_UNITS: Record<UnitId, UnitDef> = {
  soldier: { name: '병사', maxHp: 1, atk: 1, supply: null, aura: 0 },
  guard: { name: '방패병', maxHp: 3, atk: 0, supply: 3, aura: 0 },
  lancer: { name: '창병', maxHp: 1, atk: 2, supply: 3, aura: 0 },
  tower: { name: '포탑', maxHp: 2, atk: 0, supply: 2, aura: 1 },
};

export const DEFAULT_CONFIG: RuleConfig = {
  BOARD_SIZE: 8,
  UNITS: DEFAULT_UNITS,
  MOVE_TICKETS: 3,
  CHARGE_BONUS: 1,
  MOVE_DIRS: 'all',
  AURA_DIRS: 'orthogonal',
  START_UNIT: 'soldier',
};

export const ALL_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

export const ORTHO_DIRS: readonly (readonly [number, number])[] = [
  [-1, 0], [0, -1], [0, 1], [1, 0],
];

export function dirsOf(set: DirSet): readonly (readonly [number, number])[] {
  return set === 'all' ? ALL_DIRS : ORTHO_DIRS;
}
