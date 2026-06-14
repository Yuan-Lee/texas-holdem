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
export function getValidActionsForAI(state: GameState, playerId: number): ActionType[] {
  return getValidActions(state, playerId);
}

/**
 * 计算 AI 加注的总下注额（不超过玩家全部筹码）
 */
export function getRaiseTotal(state: GameState, player: GameState['players'][number], extra: number): number {
  return Math.min(player.currentBet + player.chips, state.maxBet + state.minRaise + extra);
}

// ── Hard AI 升级新增类型 ──

/** 位置标签 */
export type PositionLabel = 'EP' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

/** 牌力等级 */
export type HandTier = 1 | 2 | 3 | 4 | 5;

/** 对手画像 */
export interface OpponentProfile {
  /** 主动入池率 0-1 */
  vpip: number;
  /** 翻牌前加注率 0-1 */
  pfr: number;
  /** 侵略系数 */
  af: number;
  /** 面对持续下注弃牌率 0-1 */
  foldToCBet: number;
  /** 摊牌率 0-1 */
  wtsd: number;
  /** 统计基准手数 */
  totalHands: number;
}

/** 牌面湿润度 */
export type BoardTexture = 'dry' | 'wet' | 'paired' | 'none';
