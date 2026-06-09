import { useState, useEffect, useCallback } from 'react';
import { ActionType } from '../engine/types';
import * as gameEngine from '../game';
import { useGameStore } from '../store/gameStore';
import { RaisePopup } from './RaisePopup';

interface ActionPanelProps {
  playerIndex: number;
}

function actionButtonStyle(color: string): React.CSSProperties {
  return {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    background: color,
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    minWidth: 80,
  };
}

const SHORTCUT_STYLE: React.CSSProperties = {
  fontSize: 10,
  opacity: 0.6,
  marginLeft: 4,
  fontWeight: 400,
};

export function ActionPanel({ playerIndex }: ActionPanelProps) {
  const { state, playerAction } = useGameStore();
  const [showRaisePopup, setShowRaisePopup] = useState(false);

  if (!state) return null;

  const player = state.players[playerIndex];
  if (!player || player.folded || player.isAllIn) return null;

  const validActions = gameEngine.getValidActions(state, playerIndex);
  const canFold = validActions.includes(ActionType.Fold);
  const canCheck = validActions.includes(ActionType.Check);
  const canCall = validActions.includes(ActionType.Call);
  const canRaise = validActions.includes(ActionType.Raise);
  const canAllIn = validActions.includes(ActionType.AllIn);

  const callAmount = state.maxBet - player.currentBet;
  const minRaise = state.maxBet + state.minRaise;
  const maxTotalBet = player.chips + player.currentBet;
  const totalPot = state.pot + state.players.reduce((sum, p) => sum + p.currentBet, 0);
  const halfPotTotalBet = Math.min(maxTotalBet, Math.max(minRaise, player.currentBet + Math.floor(totalPot / 2)));
  const potTotalBet = Math.min(maxTotalBet, Math.max(minRaise, player.currentBet + totalPot));

  const handleAction = useCallback((action: ActionType, amount?: number) => {
    playerAction(action, amount);
  }, [playerAction]);

  // 键盘快捷键
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 输入框中不触发
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'f':
          if (canFold) handleAction(ActionType.Fold);
          break;
        case 'c':
          if (canCheck) handleAction(ActionType.Check);
          else if (canCall) handleAction(ActionType.Call);
          break;
        case 'r':
          e.preventDefault();
          if (canRaise) setShowRaisePopup(prev => !prev);
          break;
        case 'a':
          e.preventDefault();
          if (canAllIn) handleAction(ActionType.AllIn);
          break;
        case 'escape':
          setShowRaisePopup(false);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canFold, canCheck, canCall, canRaise, canAllIn, handleAction]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: 'rgba(30, 30, 50, 0.95)',
        padding: '12px 20px',
        borderRadius: 12,
        border: '2px solid #2c3e50',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        zIndex: 100,
      }}
    >
      {canFold && (
        <button onClick={() => handleAction(ActionType.Fold)} style={actionButtonStyle('#c0392b')}>
          弃牌<span style={SHORTCUT_STYLE}>F</span>
        </button>
      )}
      {canCheck && (
        <button onClick={() => handleAction(ActionType.Check)} style={actionButtonStyle('#2980b9')}>
          过牌<span style={SHORTCUT_STYLE}>C</span>
        </button>
      )}
      {canCall && (
        <button onClick={() => handleAction(ActionType.Call)} style={actionButtonStyle('#27ae60')}>
          跟注{!canCheck && <span style={SHORTCUT_STYLE}>C</span>} {callAmount > 0 ? `(${callAmount})` : ''}
        </button>
      )}
      {canRaise && (
        <div style={{ position: 'relative' }}>
          {showRaisePopup && (
            <RaisePopup
              minRaise={minRaise}
              maxTotalBet={maxTotalBet}
              halfPotTotalBet={halfPotTotalBet}
              potTotalBet={potTotalBet}
              currentBet={player.currentBet}
              onConfirm={(amount) => {
                handleAction(ActionType.Raise, Math.max(amount, minRaise));
                setShowRaisePopup(false);
              }}
              onClose={() => setShowRaisePopup(false)}
            />
          )}
          <button
            onClick={() => setShowRaisePopup(!showRaisePopup)}
            style={{
              ...actionButtonStyle('#f39c12'),
              ...(showRaisePopup ? { boxShadow: '0 0 0 2px #f39c12, 0 0 12px rgba(243,156,18,0.5)' } : {}),
            }}
          >
            加注<span style={SHORTCUT_STYLE}>R</span>
          </button>
        </div>
      )}
      {canAllIn && (
        <button onClick={() => handleAction(ActionType.AllIn)} style={actionButtonStyle('#e74c3c')}>
          全押<span style={SHORTCUT_STYLE}>A</span> ({player.chips})
        </button>
      )}
    </div>
  );
}
