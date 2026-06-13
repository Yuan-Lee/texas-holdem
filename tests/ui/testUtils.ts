import { vi } from 'vitest';
import { ActionType, Round, Suit, Difficulty } from '../../src/engine/types';
import type { Card, GameState, Winner, Player } from '../../src/engine/types';

/** Create a mock card */
export const card = (rank: Card['rank'], suit: Suit = Suit.Spades): Card => ({ rank, suit });

/** Create a mock player */
export function createMockPlayer(overrides: Partial<Player> & { id: number }): Player {
  return {
    ...overrides,
    name: overrides.name ?? `P${overrides.id + 1}`,
    chips: overrides.chips ?? 1000,
    holeCards: overrides.holeCards ?? [card(14), card(13)],
    currentBet: overrides.currentBet ?? 0,
    totalBet: overrides.totalBet ?? 0,
    folded: overrides.folded ?? false,
    isAllIn: overrides.isAllIn ?? false,
    isDealer: overrides.isDealer ?? false,
    isSmallBlind: overrides.isSmallBlind ?? false,
    isBigBlind: overrides.isBigBlind ?? false,
    isAI: overrides.isAI ?? (overrides.id !== 0),
    isOut: overrides.isOut,
    handRank: overrides.handRank,
  };
}

/** Create a minimal mock GameState */
export function createMockGameState(overrides?: Partial<GameState>): GameState {
  return {
    players: [
      createMockPlayer({ id: 0, name: 'Human', chips: 980, currentBet: 20 }),
      createMockPlayer({ id: 1, name: 'AI-1', chips: 1000, isAI: true }),
      createMockPlayer({ id: 2, name: 'AI-2', chips: 1000, isAI: true }),
    ],
    deck: [],
    communityCards: [card(2, Suit.Hearts), card(7, Suit.Clubs), card(13, Suit.Diamonds)],
    pot: 60,
    sidePots: [],
    currentRound: Round.Flop,
    currentPlayerIndex: 0,
    dealerIndex: 2,
    smallBlind: 10,
    bigBlind: 20,
    minRaise: 20,
    maxBet: 20,
    lastActionPlayerIndex: 0,
    firstToActIndex: 0,
    roundComplete: false,
    handComplete: false,
    winners: [],
    ...overrides,
  };
}

/** Create mock winners */
export function createMockWinners(count = 1): Winner[] {
  const winners: Winner[] = [];
  for (let i = 0; i < count; i++) {
    winners.push({
      playerId: i,
      amount: count > 1 ? Math.floor(60 / count) : 60,
      handResult: {
        rank: 1,
        value: 1000,
        description: '一对',
        bestCards: [card(14), card(13), card(12), card(11), card(10)],
      },
    });
  }
  return winners;
}

/** Mock the game store — returns a function that returns zustand store shape */
export function createStoreMock(partial: Partial<ReturnType<typeof import('../../src/store/gameStore').useGameStore.getState>> = {}) {
  const defaults: ReturnType<typeof import('../../src/store/gameStore').useGameStore.getState> = {
    state: createMockGameState(),
    config: { playerCount: 3, difficulty: Difficulty.Medium, startingChips: 1000, playerName: 'Human' },
    isDealing: false,
    gameOver: false,
    handCount: 0,
    blindLevel: 0,
    handHistory: [],
    handStartChips: [1000, 1000, 1000],
    startGame: vi.fn(),
    playerAction: vi.fn(),
    setState: vi.fn(),
    nextHand: vi.fn(),
    completeDealing: vi.fn(),
    endGame: vi.fn(),
  };
  return { ...defaults, ...partial };
}