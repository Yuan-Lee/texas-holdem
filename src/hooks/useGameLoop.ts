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
  const { state, config, isAnyAllIn, isDealing } = useGameStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    timeoutRef.current = setTimeout(() => {
      const decision = aiEngine.makeDecision(state, currentPlayer.id);

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
  }, [state, config, isAnyAllIn, isDealing]);
}
