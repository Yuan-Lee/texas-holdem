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
  const state = useGameStore((s) => s.state);
  const config = useGameStore((s) => s.config);
  const isDealing = useGameStore((s) => s.isDealing);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Derive whether it's an AI turn — used as a guard to avoid
  // setting up timers when no AI action is needed.
  const isAITurn = !!(
    state &&
    config &&
    !state.handComplete &&
    !isDealing &&
    state.players[state.currentPlayerIndex]?.isAI &&
    !state.players[state.currentPlayerIndex].folded &&
    !state.players[state.currentPlayerIndex].isAllIn &&
    !state.players[state.currentPlayerIndex].isOut
  );

  useEffect(() => {
    if (!isAITurn) return;

    const aiEngine = getAIEngine(config!.difficulty);
    const playerId = state!.players[state!.currentPlayerIndex].id;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
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
  }, [isAITurn, state?.currentPlayerIndex, config?.difficulty]);
}
