import { useEffect, useRef } from 'react';
import { ActionType, Difficulty } from '../engine/types';
import { useGameStore } from '../store/gameStore';
import { easyAI } from '../ai/easy';
import { mediumAI } from '../ai/medium';
import { hardAI } from '../ai/hard';

const THINK_DELAY = 1200;

let nextGen = 0;

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
  const genRef = useRef(0);
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
    const currentState = state!;
    const playerId = currentState.players[currentState.currentPlayerIndex].id;
    const gen = ++nextGen;
    genRef.current = gen;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    /** Verify the timeout's state is still current — guard against
     *  stale timeouts that escaped cleanup (e.g. concurrent rendering). */
    function verifyAndGetAction(
      latestState: NonNullable<typeof state>,
      expectedPlayerId: number,
      ai: typeof aiEngine,
    ): { doit: false } | { doit: true; action: ReturnType<typeof ai.makeDecision> } {
      if (genRef.current !== gen) return { doit: false };
      const player = latestState.players[latestState.currentPlayerIndex];
      if (!player || player.id !== expectedPlayerId) return { doit: false };
      if (player.folded || player.isAllIn || player.isOut || !player.isAI) return { doit: false };
      const decision = ai.makeDecision(latestState, expectedPlayerId);
      return { doit: true, action: decision };
    }

    timeoutRef.current = setTimeout(() => {
      const latestState = stateRef.current;
      if (!latestState) return;

      try {
        const verdict = verifyAndGetAction(latestState, playerId, aiEngine);
        if (!verdict.doit) return;

        const { playerAction } = useGameStore.getState();
        const decision = verdict.action;

        if (decision.action === ActionType.Raise && decision.amount) {
          playerAction(decision.action, decision.amount);
        } else {
          playerAction(decision.action);
        }
      } catch (error) {
        console.error('AI decision error, forcing fold:', error);
        try {
          const { playerAction } = useGameStore.getState();
          playerAction(ActionType.Fold);
        } catch { /* safety net in playerAction handles it */ }
      }
    }, isAITurn && config?.difficulty === Difficulty.Hard ? 2500 : THINK_DELAY);

    return () => {
      // Mark this generation as stale so the timeout callback is a no-op
      genRef.current = -1;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAITurn, state, config?.difficulty]);
}
