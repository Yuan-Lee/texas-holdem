import { useState, useRef, useEffect } from 'react';
import { ActionType } from '../engine/types';
import * as gameEngine from '../game';
import { useGameStore } from '../store/gameStore';

interface ActionPanelProps {
  playerIndex: number;
}

export function ActionPanel({ playerIndex }: ActionPanelProps) {
  const { state, playerAction } = useGameStore();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaisePopup, setShowRaisePopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

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

  // Close popup on outside click
  useEffect(() => {
    if (!showRaisePopup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowRaisePopup(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showRaisePopup]);

  const handleRaiseConfirm = () => {
    const amount = Math.max(raiseAmount, minRaise);
    playerAction(ActionType.Raise, amount);
    setRaiseAmount(0);
    setShowRaisePopup(false);
  };

  const handleOpenPopup = () => {
    if (!showRaisePopup) {
      setRaiseAmount(minRaise);
    }
    setShowRaisePopup(!showRaisePopup);
  };

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
        <button
          onClick={() => playerAction(ActionType.Fold)}
          style={actionButtonStyle('#c0392b')}
        >
          弃牌
        </button>
      )}
      {canCheck && (
        <button
          onClick={() => playerAction(ActionType.Check)}
          style={actionButtonStyle('#2980b9')}
        >
          过牌
        </button>
      )}
      {canCall && (
        <button
          onClick={() => playerAction(ActionType.Call)}
          style={actionButtonStyle('#27ae60')}
        >
          跟注 {callAmount > 0 ? `(${callAmount})` : ''}
        </button>
      )}
      {canRaise && (
        <div style={{ position: 'relative' }}>
          {showRaisePopup && (
            <div
              ref={popupRef}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 10,
                background: 'rgba(30, 30, 50, 0.97)',
                border: '2px solid #f39c12',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minWidth: 280,
                boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
                zIndex: 200,
              }}
            >
              {/* Quick bet buttons */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <button
                  onClick={() => setRaiseAmount(halfPotTotalBet)}
                  style={quickBetButtonStyle(raiseAmount === halfPotTotalBet)}
                >
                  1/2底池
                </button>
                <button
                  onClick={() => setRaiseAmount(potTotalBet)}
                  style={quickBetButtonStyle(raiseAmount === potTotalBet)}
                >
                  底池
                </button>
                <button
                  onClick={() => setRaiseAmount(maxTotalBet)}
                  style={quickBetButtonStyle(raiseAmount === maxTotalBet)}
                >
                  全押
                </button>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={minRaise}
                max={maxTotalBet}
                step={10}
                value={raiseAmount || minRaise}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                style={sliderStyle}
              />

              {/* Amount display */}
              <div
                style={{
                  textAlign: 'center',
                  color: '#f39c12',
                  fontSize: 20,
                  fontWeight: 'bold',
                }}
              >
                加注至 {raiseAmount || minRaise}
              </div>

              {/* Confirm button */}
              <button
                onClick={handleRaiseConfirm}
                style={{
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 3px 10px rgba(243, 156, 18, 0.4)',
                }}
              >
                确认加注
              </button>
            </div>
          )}
          <button
            onClick={handleOpenPopup}
            style={{
              ...actionButtonStyle('#f39c12'),
              ...(showRaisePopup
                ? {
                    boxShadow:
                      '0 0 0 2px #f39c12, 0 0 12px rgba(243,156,18,0.5)',
                  }
                : {}),
            }}
          >
            加注
          </button>
        </div>
      )}
      {canAllIn && (
        <button
          onClick={() => playerAction(ActionType.AllIn)}
          style={actionButtonStyle('#e74c3c')}
        >
          全押 ({player.chips})
        </button>
      )}
    </div>
  );
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

function quickBetButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 6,
    border: active ? '2px solid #f39c12' : '1px solid #555',
    background: active ? 'rgba(243, 156, 18, 0.2)' : 'transparent',
    color: active ? '#f39c12' : '#bbb',
    fontSize: 13,
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  WebkitAppearance: 'none',
  appearance: 'none',
  background: '#3a3a5a',
  borderRadius: 3,
  outline: 'none',
  cursor: 'pointer',
};