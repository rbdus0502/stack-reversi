/// <reference lib="webworker" />
import type { GameState, Move } from '../engine/types';
import { DIFFICULTY_DEPTH, search, type Difficulty } from './search';

export interface AiRequest {
  id: number;
  state: GameState;
  difficulty: Difficulty;
}

export interface AiResponse {
  id: number;
  move: Move;
}

const RANDOMNESS: Record<Difficulty, number> = { easy: 0.3, normal: 0.05, hard: 0 };

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = e.data;
  const { move } = search(state, { depth: DIFFICULTY_DEPTH[difficulty], randomness: RANDOMNESS[difficulty] });
  const res: AiResponse = { id, move };
  self.postMessage(res);
};
