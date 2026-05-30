import { ActionType } from '../engine/types';
import type { GameState } from '../engine/types';
import { AIDecision, AILevel } from './types';
import * as evaluator from '../engine/evaluator';

export const easyAI: AILevel = {
  name: '简单',
  description: '基础策略，随机决策',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = state.players.find(p => p.id === playerId)!;
    const validActions = getValidActionsForAI(state);

    if (validActions.length === 0) {
      return { action: ActionType.Fold };
    }

    const playerCards = [...player.holeCards, ...state.communityCards];
    const handResult = evaluator.evaluateHand(playerCards);

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

function getValidActionsForAI(state: GameState): ActionType[] {
  if (state.currentPlayerIndex === -1) return [];
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.folded || player.isAllIn) return [];

  const actions: ActionType[] = [ActionType.Fold];

  if (state.maxBet === 0 || player.currentBet === state.maxBet) {
    actions.push(ActionType.Check);
  }

  if (state.maxBet > player.currentBet && player.chips >= (state.maxBet - player.currentBet)) {
    actions.push(ActionType.Call);
  }

  const minRaise = state.maxBet + state.minRaise - player.currentBet;
  if (player.chips >= minRaise && minRaise > 0) {
    actions.push(ActionType.Raise);
  }

  if (player.chips > 0) {
    actions.push(ActionType.AllIn);
  }

  return actions;
}

function getRaiseTotal(state: GameState, player: GameState['players'][number], extra: number): number {
  return Math.min(player.currentBet + player.chips, state.maxBet + state.minRaise + extra);
}
