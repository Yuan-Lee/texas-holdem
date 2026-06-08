import { useEffect, useRef } from 'react';
import { ActionType, Difficulty } from '../engine/types';
import { useGameStore } from '../store/gameStore';
import { easyAI } from '../ai/easy';
import { mediumAI } from '../ai/medium';
import { hardAI } from '../ai/hard';

const THINK_DELAY = 1000;

function getAIEngine(difficulty: Difficulty) {
  switch (difficulty) {
    case Difficulty.Easy:
      return easyAI;
    case Difficulty.Medium:
      return mediumAI;
    case Difficulty.Hard:
      return hardAI;
    default:
      return easyAI;
  }
}

export function useGameLoop() {
  const { state, config, isDealing } = useGameStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!state || !config || state.handComplete || isDealing) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.folded || currentPlayer.isAllIn || currentPlayer.isOut) {
      return;
    }

    const aiEngine = getAIEngine(config.difficulty);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const playerId = currentPlayer.id;

    timeoutRef.current = setTimeout(() => {
      // 使用 ref 读取最新 state，避免闭包捕获过期 state
      const latestState = stateRef.current;
      if (!latestState) return;

      const decision = aiEngine.makeDecision(latestState, playerId);

      const { playerAction } = useGameStore.getState();

      if (decision.action === ActionType.Raise && decision.amount) {
        playerAction(decision.action, decision.amount);
      } else {
        playerAction(decision.action);
      }
    }, THINK_DELAY);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, config, isDealing]);
}