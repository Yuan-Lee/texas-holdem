import { useRef, useState, useCallback } from 'react';
import type { Winner as WinnerType, HandResult } from '../engine/types';
import type { Player } from '../engine/types';

interface ResultModalProps {
  winners: WinnerType[];
  players: Player[];
  onNewHand: () => void;
}

const HAND_NAMES = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺', '皇家同花顺'];

function getHandLabel(handResult?: HandResult): string {
  if (!handResult) return '';
  return handResult.description || HAND_NAMES[handResult.rank] || '';
}

export function ResultModal({ winners, players, onNewHand }: ResultModalProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragging.current = true;
      dragStart.current = { x: e.touches[0].clientX - posRef.current.x, y: e.touches[0].clientY - posRef.current.y };
    }
  }, []);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    const newX = cx - dragStart.current.x;
    const newY = cy - dragStart.current.y;
    posRef.current = { x: newX, y: newY };
    setPos({ x: newX, y: newY });
  }, []);

  const handleUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const winnerName = (winner: WinnerType) => {
    const player = players.find(p => p.id === winner.playerId);
    return player ? player.name : `玩家 ${winner.playerId + 1}`;
  };

  const hasMultipleWinners = winners.length > 1;

  return (
    <div
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'auto',
        zIndex: 200,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `calc(50% + ${pos.x}px)`,
          top: `calc(50% + ${pos.y}px)`,
          transform: 'translate(-50%, -50%)',
          background: '#2c3e50',
          borderRadius: 16,
          textAlign: 'center',
          minWidth: 320,
          maxWidth: 440,
          width: '90%',
          border: '2px solid #f39c12',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          userSelect: dragging.current ? 'none' : 'auto',
        }}
      >
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            cursor: 'grab',
            padding: '16px 40px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>🎉</span>
          <h2
            style={{
              color: '#f39c12',
              fontSize: 20,
              fontWeight: 'bold',
              margin: 0,
            }}
          >
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
                  {winnerName(winner)}
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