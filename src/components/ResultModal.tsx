import type { Winner as WinnerType, HandResult } from '../engine/types';
import type { Player } from '../engine/types';
import { HAND_NAMES } from '../engine/constants';

interface ResultModalProps {
  winners: WinnerType[];
  players: Player[];
  onNewHand: () => void;
}

function getHandLabel(handResult?: HandResult): string {
  if (!handResult) return '';
  const names = HAND_NAMES as readonly string[];
  return handResult.description || names[handResult.rank] || '';
}

function winnerName(players: Player[], winner: WinnerType) {
  const player = players.find(p => p.id === winner.playerId);
  return player ? player.name : `玩家 ${winner.playerId + 1}`;
}

export function ResultModal({ winners, players, onNewHand }: ResultModalProps) {
  const hasMultipleWinners = winners.length > 1;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          background: '#2c3e50',
          borderRadius: 16,
          textAlign: 'center',
          minWidth: 320,
          maxWidth: 440,
          width: '90%',
          border: '2px solid #f39c12',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            padding: '16px 40px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>🎉</span>
          <h2 style={{ color: '#f39c12', fontSize: 20, fontWeight: 'bold', margin: 0 }}>
            牌局结果
          </h2>
          <span style={{ fontSize: 20 }}>🎉</span>
        </div>

        <div style={{ padding: '16px 24px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            {winners.map((winner) => (
              <div
                key={winner.playerId}
                style={{
                  padding: '12px 16px',
                  margin: '6px 0',
                  background: '#34495e',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#ecf0f1', marginBottom: 4 }}>
                  {winnerName(players, winner)}
                </div>
                <div style={{ fontSize: 14, color: '#2ecc71', fontWeight: 'bold', marginBottom: hasMultipleWinners ? 0 : 4 }}>
                  🪙 {winner.amount}
                </div>
                {!hasMultipleWinners && (
                  <div style={{ fontSize: 13, color: '#f39c12', fontWeight: 'bold', marginTop: 6, padding: '2px 10px', display: 'inline-block', background: 'rgba(243, 156, 18, 0.15)', borderRadius: 4 }}>
                    {getHandLabel(winner.handResult)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onNewHand}
            style={{
              padding: '10px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#27ae60',
              color: 'white',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            下一局
          </button>
        </div>
      </div>
    </div>
  );
}
