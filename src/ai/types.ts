import { ActionType } from '../engine/types';
import type { GameState } from '../engine/types';

export interface AIDecision {
  action: ActionType;
  amount?: number;
}

export interface AILevel {
  name: string;
  description: string;
  makeDecision: (state: GameState, playerId: number) => AIDecision;
}
