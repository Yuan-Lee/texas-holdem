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
  isAnyAllIn: boolean;
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
  isAnyAllIn: false,
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

    // 标记筹码为 0 的玩家为出局，不删除、不改名、不改变座位
    for (const player of state.players) {
      if (player.chips <= 0 && player.id !== 0) {
        player.isOut = true;
      }
    }

    for (let i = 0; i < state.players.length; i++) {
      state.players[i].holeCards = [];
      state.players[i].currentBet = 0;
      state.players[i].folded = false;
      state.players[i].isAllIn = false;
      state.players[i].handRank = undefined;
    }

    // 检查人类玩家是否破产
    const humanPlayer = state.players[0];
    if (humanPlayer.chips <= 0) {
      playLose();
      set({ gameOver: true, state: { ...state, handComplete: true } });
      return;
    }

    // 检查是否只剩一个非出局玩家
    const remaining = state.players.filter(p => !p.isOut);
    if (remaining.length <= 1) {
      playWin();
      set({ gameOver: true, state: { ...state, handComplete: true } });
      return;
    }

    const newState = { ...state, players: state.players };
    const finalState = gameEngine.startHand(newState);
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
