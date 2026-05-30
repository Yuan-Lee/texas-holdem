import { ActionType, Suit } from '../engine/types';
import type { Card, GameState, Rank } from '../engine/types';
import { AIDecision, AILevel } from './types';
import * as evaluator from '../engine/evaluator';

export const hardAI: AILevel = {
  name: '困难',
  description: '高级策略，蒙特卡洛模拟',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = state.players.find(p => p.id === playerId)!;
    const validActions = getValidActionsForAI(state);

    if (validActions.length === 0) {
      return { action: ActionType.Fold };
    }

    const winRate = monteCarloSimulation(state, playerId, 100);
    const playerCards = [...player.holeCards, ...state.communityCards];
    const handResult = evaluator.evaluateHand(playerCards);

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
  const deck = createSimulationDeck(knownCards);
  const iterationCount = Math.min(iterations, 50);
  let wins = 0;

  for (let i = 0; i < iterationCount; i++) {
    const shuffled = shuffleCards(deck);
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

function createSimulationDeck(knownCards: Card[]): Card[] {
  const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  return suits.flatMap(suit =>
    ranks
      .map(rank => ({ suit, rank }))
      .filter(card => !knownCards.some(known => known.suit === card.suit && known.rank === card.rank)),
  );
}

function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRaiseTotal(state: GameState, player: GameState['players'][number], extra: number): number {
  return Math.min(player.currentBet + player.chips, state.maxBet + state.minRaise + extra);
}
