import { create } from 'zustand';
import type { GameState, Winner } from '../engine/types';
import { ActionType, Difficulty } from '../engine/types';
import * as gameEngine from '../game';
import { playDeal, playShuffle, playActionSound, playWin, playLose } from '../utils/sound';
import { globalTracker } from '../ai/opponentModel';

interface GameConfig {
  playerCount: number;
  difficulty: Difficulty;
  startingChips: number;
  playerName: string;
}

export interface HandRecord {
  handNumber: number;
  winners: { name: string; amount: number }[];
  pot: number;
  communityCards: string;
  playerProfit: Record<number, number>; // playerId → chip change
}

interface GameStore {
  state: GameState | null;
  config: GameConfig | null;
  isDealing: boolean;
  gameOver: boolean;
  handCount: number;
  blindLevel: number;
  handHistory: HandRecord[];
  /** 每手牌开始前各玩家的筹码快照，用于计算利润 */
  handStartChips: number[];
  startGame: (config: GameConfig) => void;
  playerAction: (action: ActionType, amount?: number) => void;
  setState: (state: GameState) => void;
  nextHand: () => void;
  completeDealing: () => void;
  endGame: () => void;
}

const BLIND_LEVELS = [
  { sb: 10, bb: 20 },
  { sb: 15, bb: 30 },
  { sb: 25, bb: 50 },
  { sb: 40, bb: 80 },
  { sb: 60, bb: 120 },
  { sb: 100, bb: 200 },
  { sb: 150, bb: 300 },
  { sb: 250, bb: 500 },
];

const HANDS_PER_LEVEL = 6;

/** 构建手牌记录（`prevChips` 来自 `handStartChips`，即本局开始前的筹码基线） */
function buildHandRecord(
  state: GameState,
  handCount: number,
  prevChips: number[],
): HandRecord {
  const record: HandRecord = {
    handNumber: handCount + 1,
    winners: state.winners.map(w => ({
      name: state.players.find(p => p.id === w.playerId)?.name ?? `P${w.playerId}`,
      amount: w.amount,
    })),
    pot: state.pot,
    communityCards: state.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(' '),
    playerProfit: {},
  };
  for (const p of state.players) {
    record.playerProfit[p.id] = p.chips - prevChips[p.id];
  }
  return record;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  config: null,
  isDealing: false,
  gameOver: false,
  handCount: 0,
  blindLevel: 0,
  handHistory: [],
  handStartChips: [],

  startGame: (config: GameConfig) => {
    let state = gameEngine.createGame(config.playerCount, config.difficulty, config.startingChips, config.playerName);
    const handStartChips = state.players.map(p => p.chips);
    state = gameEngine.startHand(state);
    playShuffle();
    globalTracker.reset(); // 新游戏清除旧数据
    set({ state, config, gameOver: false, isDealing: true, handCount: 0, blindLevel: 0, handHistory: [], handStartChips });
  },

  playerAction: (action: ActionType, amount?: number) => {
    let { state } = get();
    if (!state) return;
    playActionSound(action);
    let newState = gameEngine.performAction(state, action, amount);

    // Safety: if the engine rejected the action (returns the same reference)
    // the store won't trigger a re-render, causing the game to hang.
    // Force-fold the current player to unstick the game.
    if (newState === state) {
      newState = gameEngine.performAction(state, ActionType.Fold);
      if (newState === state) {
        // Even Fold failed — force a new reference so the UI re-renders
        newState = { ...state, players: [...state.players] };
        return set({ state: newState });
      }
    }

    const winners = newState.winners;
    if (winners && winners.length > 0) {
      const humanWon = winners.some(w => w.playerId === 0);
      if (humanWon) playWin(); else playLose();
    }
    set({ state: newState });
  },

  setState: (state: GameState) => {
    set({ state });
  },

  nextHand: () => {
    const { state, config, handCount, blindLevel, handStartChips } = get();
    if (!state || !config) return;

    // Record hand history — use baseline from before this hand
    const prevChips = handStartChips;

    // Mark out players and check game over
    const players = state.players.map(p =>
      p.chips <= 0 && p.id !== 0 ? { ...p, isOut: true } : p
    );

    const record = buildHandRecord(state, handCount, prevChips);

    // 更新对手画像：通知 tracker 每手牌结束的结果
    for (const player of state.players) {
      if (player.isAI) {
        const sawFlop = state.communityCards.length >= 3;
        const sawShowdown = state.handComplete && !player.folded && !player.isOut;
        const wasVoluntary = player.totalBet > (player.isSmallBlind ? state.smallBlind : 0) +
                             (player.isBigBlind ? state.bigBlind : 0);
        globalTracker.recordHandResult(player.id, { sawFlop, sawShowdown, wasVoluntary });
      }
    }

    const humanPlayer = players[0];
    if (humanPlayer.chips <= 0) {
      playLose();
      set({
        gameOver: true,
        state: { ...state, players, handComplete: true },
        handHistory: [...get().handHistory, record],
      });
      return;
    }

    const remaining = players.filter(p => !p.isOut);
    if (remaining.length <= 1) {
      playWin();
      set({
        gameOver: true,
        state: { ...state, players, handComplete: true },
        handHistory: [...get().handHistory, record],
      });
      return;
    }

    const newHandCount = handCount + 1;
    const newBlindLevel = Math.min(
      Math.floor(newHandCount / HANDS_PER_LEVEL),
      BLIND_LEVELS.length - 1,
    );

    const level = BLIND_LEVELS[newBlindLevel];
    const preppedState = {
      ...state,
      players,
      smallBlind: level.sb,
      bigBlind: level.bb,
    };
    // Save baseline chips before next hand starts
    const nextHandStartChips = preppedState.players.map(p => p.chips);
    const finalState = gameEngine.startHand(preppedState);

    playShuffle();
    set({
      state: finalState,
      gameOver: false,
      isDealing: true,
      handCount: newHandCount,
      blindLevel: newBlindLevel,
      handHistory: [...get().handHistory, record],
      handStartChips: nextHandStartChips,
    });
  },

  completeDealing: () => {
    playDeal();
    set({ isDealing: false });
  },

  endGame: () => {
    set({ state: null, gameOver: false, config: null, handCount: 0, blindLevel: 0 });
  },
}));