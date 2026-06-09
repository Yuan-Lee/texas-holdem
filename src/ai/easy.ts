import { ActionType } from '../engine/types';
import type { GameState } from '../engine/types';
import { AIDecision, AILevel, getValidActionsForAI, getRaiseTotal } from './types';
import * as evaluator from '../engine/evaluator';

export const easyAI: AILevel = {
  name: '简单',
  description: '基础策略，随机决策',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = state.players[playerId];
    if (!player) return { action: ActionType.Fold };
    const validActions = getValidActionsForAI(state);

    if (validActions.length === 0) {
      return { action: ActionType.Fold };
    }

    const hasCommunityCards = state.communityCards.length >= 3;
    const handResult = hasCommunityCards
      ? evaluator.evaluateHand([...player.holeCards, ...state.communityCards])
      : { rank: 0, value: 0, description: '高牌', bestCards: player.holeCards };

    const rand = Math.random();

    // 30% random action
    if (rand < 0.3) {
      const randomAction = validActions[Math.floor(Math.random() * validActions.length)];
      if (randomAction === ActionType.Raise) {
        return { action: randomAction, amount: getRaiseTotal(state, player, 20) };
      }
      return { action: randomAction };
    }

    // 简单策略：有对子以上就跟注，否则看运气
    if (handResult.rank >= 1) {
      if (validActions.includes(ActionType.Call)) {
        return { action: ActionType.Call };
      }
      if (validActions.includes(ActionType.Check)) {
        return { action: ActionType.Check };
      }
    }

    if (validActions.includes(ActionType.Check)) {
      return { action: ActionType.Check };
    }

    if (validActions.includes(ActionType.Call)) {
      return { action: ActionType.Call };
    }

    return { action: ActionType.Fold };
  },
};
