import { create } from 'zustand';
import type { GameState } from '../engine/types';
import { ActionType, Difficulty } from '../engine/types';
import * as gameEngine from '../game';
import { playDeal, playShuffle, playActionSound, playWin, playLose, playButtonClick } from '../utils/sound';

interface GameConfig {
  playerCount: number;
  difficulty: Difficulty;
  startingChips: number;
  playerName: string;
}

interface GameStore {
  state: GameState | null;
  config: GameConfig | null;
  isDealing: boolean;
  gameOver: boolean;
  startGame: (config: GameConfig) => void;
  playerAction: (action: ActionType, amount?: number) => void;
  setState: (state: GameState) => void;
  nextHand: () => void;
  completeDealing: () => void;
  endGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  config: null,
  isDealing: false,
  gameOver: false,

  startGame: (config: GameConfig) => {
    let state = gameEngine.createGame(config.playerCount, config.difficulty, config.startingChips, config.playerName);
    state = gameEngine.startHand(state);
    playShuffle();
    set({ state, config, gameOver: false, isDealing: true });
  },

  playerAction: (action: ActionType, amount?: number) => {
    const { state } = get();
    if (!state) return;
    playActionSound(action);
    playButtonClick();
    const newState = gameEngine.performAction(state, action, amount);
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
    const { state, config } = get();
    if (!state || !config) return;

    // 深度克隆后修改，避免污染前一个 store state
    const cloned = {
      ...state,
      players: state.players.map(p => ({
        ...p,
        holeCards: [...p.holeCards],
        handRank: p.handRank ? { ...p.handRank, bestCards: [...p.handRank.bestCards] } : undefined,
      })),
    };

    // 标记筹码为 0 的玩家为出局
    for (const player of cloned.players) {
      if (player.chips <= 0 && player.id !== 0) {
        player.isOut = true;
      }
    }

    for (const player of cloned.players) {
      player.holeCards = [];
      player.currentBet = 0;
      player.folded = false;
      player.isAllIn = false;
      player.handRank = undefined;
    }

    // 检查人类玩家是否破产
    const humanPlayer = cloned.players[0];
    if (humanPlayer.chips <= 0) {
      playLose();
      set({ gameOver: true, state: { ...cloned, handComplete: true } });
      return;
    }

    // 检查是否只剩一个非出局玩家
    const remaining = cloned.players.filter(p => !p.isOut);
    if (remaining.length <= 1) {
      playWin();
      set({ gameOver: true, state: { ...cloned, handComplete: true } });
      return;
    }

    const finalState = gameEngine.startHand(cloned);
    playShuffle();
    set({ state: finalState, gameOver: false, isDealing: true });
  },

  completeDealing: () => {
    playDeal();
    set({ isDealing: false });
  },

  endGame: () => {
    set({ state: null, gameOver: false, config: null });
  },
}));
