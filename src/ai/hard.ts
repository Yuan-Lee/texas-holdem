import { ActionType } from '../engine/types';
import type { GameState } from '../engine/types';
import { AIDecision, AILevel, getValidActionsForAI, getRaiseTotal } from './types';
import * as evaluator from '../engine/evaluator';
import * as deckUtils from '../engine/deck';

export const hardAI: AILevel = {
  name: '困难',
  description: '高级策略，蒙特卡洛模拟',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = state.players.find(p => p.id === playerId)!;
    const validActions = getValidActionsForAI(state);

    if (validActions.length === 0) {
      return { action: ActionType.Fold };
    }

    const winRate = monteCarloSimulation(state, playerId, 200);
    const hasCommunityCards = state.communityCards.length >= 3;
    const handResult = hasCommunityCards
      ? evaluator.evaluateHand([...player.holeCards, ...state.communityCards])
      : { rank: 0, value: 0, description: '高牌', bestCards: player.holeCards };

    // Bluffing
    if (Math.random() < 0.13 && validActions.includes(ActionType.Raise)) {
      return { action: ActionType.Raise, amount: getRaiseTotal(state, player, Math.floor(Math.random() * 50) + 20) };
    }

    if (winRate > 0.7 || handResult.rank >= 7) {
      if (validActions.includes(ActionType.AllIn)) return { action: ActionType.AllIn };
      if (validActions.includes(ActionType.Raise)) return { action: ActionType.Raise, amount: getRaiseTotal(state, player, 100) };
      if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      return { action: ActionType.Fold };
    }

    if (winRate > 0.5 || handResult.rank >= 4) {
      if (validActions.includes(ActionType.Raise) && Math.random() < 0.6) {
        return { action: ActionType.Raise, amount: getRaiseTotal(state, player, 50) };
      }
      if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      return { action: ActionType.Fold };
    }

    if (winRate > 0.35 || handResult.rank >= 2) {
      if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
      if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
      return { action: ActionType.Fold };
    }

    if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
    return { action: ActionType.Fold };
  },
};

function monteCarloSimulation(state: GameState, playerId: number, iterations: number): number {
  const player = state.players.find(p => p.id === playerId)!;
  const holeCards = [...player.holeCards];
  const communityCards = [...state.communityCards];
  const otherPlayers = state.players.filter(p => !p.folded && !p.isOut && p.id !== playerId);
  const knownCards = [...holeCards, ...communityCards];
  const deck = deckUtils.createDeck().filter(
    card => !knownCards.some(known => known.suit === card.suit && known.rank === card.rank),
  );
  // Monte Carlo: 使用请求的迭代次数，但上限 200 以避免浏览器卡顿
  const iterationCount = Math.min(iterations, 200);
  let wins = 0;

  for (let i = 0; i < iterationCount; i++) {
    const shuffled = deckUtils.shuffleDeck(deck);
    let deckIndex = 0;

    const totalCommunity = [...communityCards];
    const remainingCards = 5 - totalCommunity.length;
    for (let j = 0; j < remainingCards; j++) {
      totalCommunity.push(shuffled[deckIndex++]);
    }

    const playerResult = evaluator.evaluateHand([...holeCards, ...totalCommunity]);
    let bestOpponentValue = -1;

    for (let opponentIndex = 0; opponentIndex < otherPlayers.length; opponentIndex++) {
      const opponentHoleCards = [shuffled[deckIndex++], shuffled[deckIndex++]];
      const opponentResult = evaluator.evaluateHand([...opponentHoleCards, ...totalCommunity]);
      bestOpponentValue = Math.max(bestOpponentValue, opponentResult.value);
    }

    if (playerResult.value >= bestOpponentValue) wins++;
  }

  return iterationCount > 0 ? wins / iterationCount : 0;
}
