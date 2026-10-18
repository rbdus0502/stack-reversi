// All rule constants live here. See docs/RULES.md section 2.
export interface RuleConfig {
  BOARD_SIZE: number;
  MAX_HEIGHT: number;
  STACK_TOKENS: number;
  STACK_MUST_FLIP: boolean;
}

export const DEFAULT_CONFIG: RuleConfig = {
  BOARD_SIZE: 8,
  MAX_HEIGHT: 3,
  STACK_TOKENS: 5,
  STACK_MUST_FLIP: true,
};

export const BOARD_SIZE = DEFAULT_CONFIG.BOARD_SIZE;
export const MAX_HEIGHT = DEFAULT_CONFIG.MAX_HEIGHT;
export const STACK_TOKENS = DEFAULT_CONFIG.STACK_TOKENS;
export const STACK_MUST_FLIP = DEFAULT_CONFIG.STACK_MUST_FLIP;
