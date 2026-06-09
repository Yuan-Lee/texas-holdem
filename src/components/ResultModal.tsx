import type { Winner as WinnerType, HandResult, Player } from '../engine/types';
import { HAND_NAMES } from '../engine/constants';
import { CardView } from './CardView';

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
  const winnerIds = new Set(winners.map(w => w.playerId));
  const activePlayers = players.filter(p => !p.folded && !p.isOut);

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
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          background: '#2c3e50',
          borderRadius: 16,
          textAlign: 'center',
          minWidth: 340,
          maxWidth: 480,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
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
          {/* Winners */}
          <div style={{ marginBottom: 16 }}>
            {winners.map((winner) => (
              <div
                key={winner.playerId}
                style={{
                  padding: '12px 16px',
                  margin: '6px 0',
                  background: 'rgba(243, 156, 18, 0.15)',
                  borderRadius: 8,
                  textAlign: 'center',
                  border: '1px solid rgba(243, 156, 18, 0.3)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#ecf0f1', marginBottom: 4 }}>
                  🏆 {winnerName(players, winner)}
                </div>
                <div style={{ fontSize: 14, color: '#2ecc71', fontWeight: 'bold', marginBottom: 4 }}>
                  🪙 +{winner.amount}
                </div>
                <div style={{ fontSize: 13, color: '#f39c12', fontWeight: 'bold', padding: '2px 10px', display: 'inline-block', background: 'rgba(243, 156, 18, 0.15)', borderRadius: 4 }}>
                  {getHandLabel(winner.handResult)}
                </div>
                {winner.handResult?.bestCards && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                    {winner.handResult.bestCards.map((card, ci) => (
                      <CardView key={ci} card={card} size="sm" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Other active players' hands */}
          {activePlayers.filter(p => !winnerIds.has(p.id) && p.handRank).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#95a5a6', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>
                其他玩家手牌
              </div>
              {activePlayers
                .filter(p => !winnerIds.has(p.id) && p.handRank)
                .map(player => (
                  <div
                    key={player.id}
                    style={{
                      padding: '8px 12px',
                      margin: '4px 0',
                      background: '#34495e',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 'bold', color: '#bdc3c7' }}>{player.name}</div>
                      <div style={{ fontSize: 12, color: '#95a5a6' }}>{getHandLabel(player.handRank)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {player.holeCards.map((card, ci) => (
                        <CardView key={ci} card={card} size="sm" />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

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
