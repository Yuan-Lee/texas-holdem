import { ActionType } from '../engine/types';
import type { GameState } from '../engine/types';
import { AIDecision, AILevel } from './types';
import * as evaluator from '../engine/evaluator';

export const mediumAI: AILevel = {
  name: '中等',
  description: '考虑手牌强度和底池赔率',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = state.players.find(p => p.id === playerId)!;
    const validActions = getValidActionsForAI(state);

    if (validActions.length === 0) {
      return { action: ActionType.Fold };
    }

    const playerCards = [...player.holeCards, ...state.communityCards];
    const handResult = evaluator.evaluateHand(playerCards);

    if (handResult.rank >= 6) {
      // Strong hand: Full house or better
      if (validActions.includes(ActionType.AllIn)) return { action: ActionType.AllIn };
      if (validActions.includes(ActionType.Raise)) return { action: ActionType.Raise, amount: getRaiseTotal(state, player, 50) };
      if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      return { action: ActionType.Fold };
    }

    if (handResult.rank >= 4) {
      // straights / flushes
      if (Math.random() < 0.7) {
        if (validActions.includes(ActionType.Raise)) return { action: ActionType.Raise, amount: getRaiseTotal(state, player, 30) };
        if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
      }
      if (Math.random() < 0.5) {
        if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
      }
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      return { action: ActionType.Fold };
    }

    if (handResult.rank >= 2) {
      // Two pairs or three of a kind
      const callAmount = state.maxBet - player.currentBet;
      const potOdds = state.pot / (state.pot + callAmount);
      if (potOdds > 0.4 && validActions.includes(ActionType.Call)) {
        return { action: ActionType.Call };
      }
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      return { action: ActionType.Fold };
    }

    if (handResult.rank === 1) {
      // One pair
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      const callAmount = state.maxBet - player.currentBet;
      if (callAmount <= state.smallBlind * 2 && validActions.includes(ActionType.Call)) {
        return { action: ActionType.Call };
      }
      return { action: ActionType.Fold };
    }

    if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
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
