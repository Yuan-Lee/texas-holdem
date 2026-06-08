import { useState } from 'react';
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
        <button onClick={() => playerAction(ActionType.Fold)} style={actionButtonStyle('#c0392b')}>
          弃牌
        </button>
      )}
      {canCheck && (
        <button onClick={() => playerAction(ActionType.Check)} style={actionButtonStyle('#2980b9')}>
          过牌
        </button>
      )}
      {canCall && (
        <button onClick={() => playerAction(ActionType.Call)} style={actionButtonStyle('#27ae60')}>
          跟注 {callAmount > 0 ? `(${callAmount})` : ''}
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
              onConfirm={(amount) => {
                playerAction(ActionType.Raise, Math.max(amount, minRaise));
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
            加注
          </button>
        </div>
      )}
      {canAllIn && (
        <button onClick={() => playerAction(ActionType.AllIn)} style={actionButtonStyle('#e74c3c')}>
          全押 ({player.chips})
        </button>
      )}
    </div>
  );
}
