import { ActionType } from '../engine/types';
import type { GameState } from '../engine/types';
import { getValidActions } from '../game';

export interface AIDecision {
  action: ActionType;
  amount?: number;
}

export interface AILevel {
  name: string;
  description: string;
  makeDecision: (state: GameState, playerId: number) => AIDecision;
}

/**
 * 获取 AI 玩家当前可用的动作列表（委托给引擎实现）
 */
export function getValidActionsForAI(state: GameState): ActionType[] {
  return getValidActions(state, state.currentPlayerIndex);
}

/**
 * 计算 AI 加注的总下注额（不超过玩家全部筹码）
 */
export function getRaiseTotal(state: GameState, player: GameState['players'][number], extra: number): number {
  return Math.min(player.currentBet + player.chips, state.maxBet + state.minRaise + extra);
}
