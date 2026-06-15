import { ActionType, Round } from '../engine/types';
import type { GameState, Card } from '../engine/types';
import type { AIDecision, AILevel, BoardTexture } from './types';
import * as evaluator from '../engine/evaluator';
import * as deckUtils from '../engine/deck';
import { getValidActions } from '../game';
import { globalTracker } from './opponentModel';
import { getPreflopTier, getPositionLabel, getPreflopAction } from './preflopTable';
import { calculateBetSize, calculatePreflopBetSize } from './betSizer';

// ── Constants ──

const SHORT_STACK_BB = 10;
const MC_TIME_BUDGET_MS = 1500;
const MC_MAX_SIMULATIONS = 3000;
const PERTURBATION_RATE = 0.1;
const PERTURBATION_EV_THRESHOLD = 0.85;
const CBET_FOLD_THRESHOLD = 0.6;
const POT_ODDS_CALL_THRESHOLD = 0.25;
const POT_ODDS_FOLD_THRESHOLD = 0.35;
const NUTS_RANK = 8;

// ── Utility functions ──

function getPlayer(state: GameState, playerId: number) {
  return state.players[playerId];
}

function isValidAction(action: ActionType, validActions: ActionType[]): boolean {
  return validActions.includes(action);
}

/** Filter for active opponents (not folded, not out, not self) */
function getActiveOpponents(state: GameState, playerId: number) {
  return state.players.filter(p => !p.folded && !p.isOut && p.id !== playerId);
}

/** Determine board texture from community cards */
function getBoardTexture(communityCards: Card[]): BoardTexture {
  if (communityCards.length < 3) return 'none';
  const isPaired = communityCards.some((c, i) =>
    communityCards.some((c2, j) => i !== j && c.rank === c2.rank),
  );
  if (isPaired) return 'paired';
  const flushPossible = communityCards.filter(c => c.suit === communityCards[0].suit).length >= 3;
  const sortedRanks = [...new Set(communityCards.map(c => c.rank))].sort((a, b) => a - b);
  let straightPossible = false;
  for (let i = 2; i < sortedRanks.length; i++) {
    if (sortedRanks[i] - sortedRanks[i - 2] <= 4) { straightPossible = true; break; }
  }
  if (straightPossible || flushPossible) return 'wet';
  return 'dry';
}

/** Check if player has the nuts */
function isNuts(state: GameState, playerId: number): boolean {
  const player = getPlayer(state, playerId);
  if (!player || state.communityCards.length < 3) return false;
  const result = evaluator.evaluateHand([...player.holeCards, ...state.communityCards]);
  return result.rank >= NUTS_RANK;
}

// ── Layer 1: Heuristic quick decisions ──

function layer1Heuristic(
  state: GameState, playerId: number, validActions: ActionType[],
): AIDecision | null {
  const player = getPlayer(state, playerId);
  if (!player) return { action: ActionType.Fold };

  // Short stack → push/fold
  const bbSize = state.bigBlind;
  if (player.chips <= bbSize * SHORT_STACK_BB) {
    const handResult = state.communityCards.length >= 3
      ? evaluator.evaluateHand([...player.holeCards, ...state.communityCards])
      : null;
    if (handResult && handResult.rank >= 2 && isValidAction(ActionType.AllIn, validActions)) {
      return { action: ActionType.AllIn };
    }
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
  }

  // Nuts/near-nuts → raise/all-in
  if (isNuts(state, playerId)) {
    if (isValidAction(ActionType.AllIn, validActions)) return { action: ActionType.AllIn };
    if (isValidAction(ActionType.Raise, validActions)) return { action: ActionType.Raise, amount: 0 };
  }

  // Can check for free → check (with weak hand)
  if (isValidAction(ActionType.Check, validActions)) {
    const handResult = state.communityCards.length >= 3
      ? evaluator.evaluateHand([...player.holeCards, ...state.communityCards])
      : null;
    if (!handResult || handResult.rank <= 1) {
      return { action: ActionType.Check };
    }
  }

  // Pre-flop: use range table
  if (state.currentRound === Round.Preflop) {
    const position = getPositionLabel(
      playerId, state.dealerIndex,
      player.isSmallBlind, player.isBigBlind,
      getActiveOpponents(state, playerId).length + 1,
    );
    const tier = getPreflopTier(player.holeCards);
    const facingRaise = state.maxBet > (player.isBigBlind ? state.bigBlind : 0);
    const facingAllIn = state.players.some(p => p.isAllIn && p.id !== playerId);
    const callAmount = state.maxBet - player.currentBet;
    const potOdds = callAmount > 0 ? callAmount / (state.pot + callAmount) : 0;

    const action = getPreflopAction(tier, validActions, facingRaise, facingAllIn, potOdds);
    if (action) return action;
  }

  return null;
}

// ── Layer 2: Range inference ──

function layer2RangeInference(
  state: GameState, playerId: number, validActions: ActionType[],
): AIDecision | null {
  const player = getPlayer(state, playerId);
  if (!player) return { action: ActionType.Fold };

  if (state.currentRound === Round.Preflop) return null;

  const allCards = [...player.holeCards, ...state.communityCards];
  const handResult = evaluator.evaluateHand(allCards);

  const callAmount = state.maxBet - player.currentBet;
  const potOddsPercent = callAmount > 0 ? callAmount / (state.pot + callAmount) : 0;

  const opponents = getActiveOpponents(state, playerId);
  const profiles = opponents.map(p => ({
    player: p,
    profile: globalTracker.getProfile(p.id),
  }));

  // Strong hand with free check → defer to MC for optimal decision (value bet vs check)
  if (handResult.rank >= 2 && callAmount === 0 && isValidAction(ActionType.Check, validActions)) {
    return null;
  }

  // One pair+, good pot odds → call
  if (handResult.rank >= 1 && potOddsPercent < POT_ODDS_CALL_THRESHOLD && isValidAction(ActionType.Call, validActions)) {
    return { action: ActionType.Call };
  }

  // High card, bad pot odds → fold
  if (handResult.rank === 0 && potOddsPercent > POT_ODDS_FOLD_THRESHOLD) {
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
  }

  // Opponent high foldToCBet → can c-bet bluff
  const highFoldCBet = profiles.some(p => p.profile.totalHands > 2 && p.profile.foldToCBet > CBET_FOLD_THRESHOLD);
  if (highFoldCBet && callAmount === 0 && isValidAction(ActionType.Raise, validActions)) {
    return { action: ActionType.Raise, amount: 0 };
  }

  return null;
}

// ── Layer 3: MC simulation ──

function layer3MCSimulation(
  state: GameState, playerId: number, validActions: ActionType[],
): AIDecision {
  const player = getPlayer(state, playerId);
  if (!player) return { action: ActionType.Fold };

  if (state.currentRound === Round.Preflop) {
    if (isValidAction(ActionType.Check, validActions)) return { action: ActionType.Check };
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
    return { action: ActionType.Fold };
  }

  const timeBudgetMs = MC_TIME_BUDGET_MS;
  const startTime = performance.now();

  const currentResult = evaluator.evaluateHand([...player.holeCards, ...state.communityCards]);
  const knownCards = [...player.holeCards, ...state.communityCards];
  const deck = deckUtils.createDeck().filter(
    c => !knownCards.some(k => k.suit === c.suit && k.rank === c.rank),
  );
  const otherPlayers = getActiveOpponents(state, playerId);

  interface ActionEV { action: ActionType; amount?: number; ev: number }
  const results: ActionEV[] = [];

  for (const action of validActions) {
    if (action === ActionType.Fold) {
      results.push({ action, ev: 0 });
      continue;
    }

    let simCount = 0;
    let totalEV = 0;
    const remainingCards = 5 - state.communityCards.length;
    const cardsNeeded = remainingCards + otherPlayers.length * 2;

    while (simCount < MC_MAX_SIMULATIONS) {
      if (performance.now() - startTime > timeBudgetMs) break;

      const shuffled = deckUtils.shuffleDeck(deck);
      if (shuffled.length < cardsNeeded) continue;

      let idx = 0;
      const totalCommunity = [...state.communityCards];
      for (let j = 0; j < remainingCards; j++) totalCommunity.push(shuffled[idx++]);

      const playerResult = evaluator.evaluateHand([...player.holeCards, ...totalCommunity]);
      let bestOpponentValue = -1;

      for (const opp of otherPlayers) {
        const oppCards = [shuffled[idx++], shuffled[idx++]];
        const oppResult = evaluator.evaluateHand([...oppCards, ...totalCommunity]);
        bestOpponentValue = Math.max(bestOpponentValue, oppResult.value);
      }

      // Cost of this action (additional chips player puts in to see showdown)
      const actionCost = action === ActionType.Call
        ? state.maxBet - player.currentBet
        : action === ActionType.Raise
          ? state.maxBet - player.currentBet + state.minRaise
          : 0;

      const finalPot = state.pot + actionCost;
      let netEV = 0;
      if (playerResult.value > bestOpponentValue) {
        netEV = finalPot - actionCost;
      } else if (playerResult.value === bestOpponentValue) {
        // Split pot: equal share among tied players
        const tiedCount = 1 + otherPlayers.filter(o => {
          const oResult = evaluator.evaluateHand([...o.holeCards, ...totalCommunity]);
          return oResult.value === playerResult.value;
        }).length;
        netEV = (finalPot / tiedCount) - actionCost;
      } else {
        // Loss: player forfeits the cost of the action
        netEV = -actionCost;
      }

      totalEV += netEV;
      simCount++;
    }

    if (simCount > 0) {
      results.push({ action, ev: totalEV / simCount });
    }
  }

  if (results.length === 0) {
    if (isValidAction(ActionType.Check, validActions)) return { action: ActionType.Check };
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
    return { action: ActionType.Fold };
  }

  results.sort((a, b) => b.ev - a.ev);
  const best = results[0];

  // 10% strategy perturbation: sometimes pick second-best to avoid being exploited
  if (results.length > 1 && Math.random() < PERTURBATION_RATE) {
    const second = results[1];
    if (second.ev >= best.ev * PERTURBATION_EV_THRESHOLD) {
      return buildFinalAction(state, playerId, second.action, validActions, currentResult);
    }
  }

  return buildFinalAction(state, playerId, best.action, validActions, currentResult);
}

function buildFinalAction(
  state: GameState, playerId: number, action: ActionType,
  validActions: ActionType[], handResult: { rank: number; value: number },
): AIDecision {
  if (action !== ActionType.Raise) {
    return { action };
  }

  if (!isValidAction(ActionType.Raise, validActions)) {
    // Raise not available — fall back to call or check
    if (isValidAction(ActionType.Call, validActions)) return { action: ActionType.Call };
    if (isValidAction(ActionType.Check, validActions)) return { action: ActionType.Check };
    return { action: ActionType.Fold };
  }

  const player = getPlayer(state, playerId)!;
  const isPreflop = state.currentRound === Round.Preflop;

  if (isPreflop) {
    const raisesFaced = state.lastActionPlayerIndex >= 0 ? 1 : 0;
    const amount = calculatePreflopBetSize(
      state.bigBlind, player.currentBet, player.chips, raisesFaced,
    );
    return { action: ActionType.Raise, amount };
  }

  const boardTexture = getBoardTexture(state.communityCards);
  const intention = handResult.rank >= 4 ? 'value' : handResult.rank >= 2 ? 'semiBluff' : 'bluff';

  const opponents = getActiveOpponents(state, playerId);
  const avgOpponentFoldCBet = opponents.length > 0
    ? opponents.reduce((sum, o) => sum + globalTracker.getProfile(o.id).foldToCBet, 0) / opponents.length
    : 0;

  const amount = calculateBetSize({
    potSize: state.pot,
    stackSize: player.chips,
    maxBet: state.maxBet,
    currentBet: player.currentBet,
    minRaise: state.minRaise,
    handValue: handResult.value,
    boardTexture,
    intention,
    opponentFoldCBet: avgOpponentFoldCBet,
  });

  return { action: ActionType.Raise, amount };
}

// ── Main entry point ──

export const hardAI: AILevel = {
  name: '困难',
  description: '高级策略，蒙特卡洛模拟',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = getPlayer(state, playerId);
    if (!player) return { action: ActionType.Fold };
    const validActions = getValidActions(state, playerId);
    if (validActions.length === 0) return { action: ActionType.Fold };

    // Layer 1: Heuristic quick decisions
    const l1 = layer1Heuristic(state, playerId, validActions);
    if (l1) {
      if (l1.action === ActionType.Raise && l1.amount === 0) {
        return buildFinalAction(state, playerId, ActionType.Raise, validActions,
          evaluator.evaluateHand([...player.holeCards, ...state.communityCards]));
      }
      return l1;
    }

    // Layer 2: Range inference
    const l2 = layer2RangeInference(state, playerId, validActions);
    if (l2) {
      if (l2.action === ActionType.Raise && l2.amount === 0) {
        return buildFinalAction(state, playerId, ActionType.Raise, validActions,
          evaluator.evaluateHand([...player.holeCards, ...state.communityCards]));
      }
      return l2;
    }

    // Layer 3: MC simulation
    return layer3MCSimulation(state, playerId, validActions);
  },
};