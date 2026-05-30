import { useState } from 'react';

interface ExampleCard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rankLabel: string;
}

const HAND_RANKS = [
  {
    rank: 9, name: '皇家同花顺', desc: 'A-K-Q-J-10 同花', color: '#f1c40f',
    cards: [
      { suit: 'spades' as const, rankLabel: 'A' },
      { suit: 'spades' as const, rankLabel: 'K' },
      { suit: 'spades' as const, rankLabel: 'Q' },
      { suit: 'spades' as const, rankLabel: 'J' },
      { suit: 'spades' as const, rankLabel: '10' },
    ],
  },
  {
    rank: 8, name: '同花顺', desc: '五张连续同花色的牌', color: '#f1c40f',
    cards: [
      { suit: 'hearts' as const, rankLabel: '9' },
      { suit: 'hearts' as const, rankLabel: '8' },
      { suit: 'hearts' as const, rankLabel: '7' },
      { suit: 'hearts' as const, rankLabel: '6' },
      { suit: 'hearts' as const, rankLabel: '5' },
    ],
  },
  {
    rank: 7, name: '四条', desc: '四张相同点数的牌 + 一张踢脚', color: '#e74c3c',
    cards: [
      { suit: 'clubs' as const, rankLabel: 'A' },
      { suit: 'diamonds' as const, rankLabel: 'A' },
      { suit: 'hearts' as const, rankLabel: 'A' },
      { suit: 'spades' as const, rankLabel: 'A' },
      { suit: 'spades' as const, rankLabel: 'K' },
    ],
  },
  {
    rank: 6, name: '葫芦', desc: '三条 + 一对', color: '#e74c3c',
    cards: [
      { suit: 'clubs' as const, rankLabel: 'K' },
      { suit: 'diamonds' as const, rankLabel: 'K' },
      { suit: 'hearts' as const, rankLabel: 'K' },
      { suit: 'spades' as const, rankLabel: '5' },
      { suit: 'hearts' as const, rankLabel: '5' },
    ],
  },
  {
    rank: 5, name: '同花', desc: '五张相同花色的牌（不连续）', color: '#e74c3c',
    cards: [
      { suit: 'spades' as const, rankLabel: 'A' },
      { suit: 'spades' as const, rankLabel: '10' },
      { suit: 'spades' as const, rankLabel: '7' },
      { suit: 'spades' as const, rankLabel: '5' },
      { suit: 'spades' as const, rankLabel: '3' },
    ],
  },
  {
    rank: 4, name: '顺子', desc: '五张连续点数的牌（不同花）', color: '#3498db',
    cards: [
      { suit: 'clubs' as const, rankLabel: '10' },
      { suit: 'diamonds' as const, rankLabel: '9' },
      { suit: 'hearts' as const, rankLabel: '8' },
      { suit: 'spades' as const, rankLabel: '7' },
      { suit: 'clubs' as const, rankLabel: '6' },
    ],
  },
  {
    rank: 3, name: '三条', desc: '三张相同点数的牌 + 两张踢脚', color: '#3498db',
    cards: [
      { suit: 'clubs' as const, rankLabel: 'Q' },
      { suit: 'diamonds' as const, rankLabel: 'Q' },
      { suit: 'hearts' as const, rankLabel: 'Q' },
      { suit: 'spades' as const, rankLabel: 'A' },
      { suit: 'spades' as const, rankLabel: 'K' },
    ],
  },
  {
    rank: 2, name: '两对', desc: '两组对子 + 一张踢脚', color: '#2ecc71',
    cards: [
      { suit: 'clubs' as const, rankLabel: 'J' },
      { suit: 'diamonds' as const, rankLabel: 'J' },
      { suit: 'hearts' as const, rankLabel: '8' },
      { suit: 'spades' as const, rankLabel: '8' },
      { suit: 'spades' as const, rankLabel: 'A' },
    ],
  },
  {
    rank: 1, name: '一对', desc: '两张相同点数的牌 + 三张踢脚', color: '#2ecc71',
    cards: [
      { suit: 'clubs' as const, rankLabel: '10' },
      { suit: 'diamonds' as const, rankLabel: '10' },
      { suit: 'hearts' as const, rankLabel: 'A' },
      { suit: 'spades' as const, rankLabel: 'K' },
      { suit: 'spades' as const, rankLabel: '7' },
    ],
  },
  {
    rank: 0, name: '高牌', desc: '没有组合，以最高牌点数比较', color: '#95a5a6',
    cards: [
      { suit: 'clubs' as const, rankLabel: 'A' },
      { suit: 'diamonds' as const, rankLabel: 'K' },
      { suit: 'hearts' as const, rankLabel: 'Q' },
      { suit: 'spades' as const, rankLabel: 'J' },
      { suit: 'clubs' as const, rankLabel: '9' },
    ],
  },
];

function MiniCard({ card }: { card: ExampleCard }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? '#c0392b' : '#2c3e50';
  const symbol =
    card.suit === 'hearts' ? '♥' :
    card.suit === 'diamonds' ? '♦' :
    card.suit === 'clubs' ? '♣' : '♠';

  return (
    <div
      style={{
        width: 28,
        height: 38,
        borderRadius: 3,
        background: 'white',
        border: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: 10, color, lineHeight: 1.1 }}>{symbol}</span>
      <span style={{ fontSize: 12, color, fontWeight: 'bold', lineHeight: 1.1 }}>{card.rankLabel}</span>
    </div>
  );
}

export function HandRankHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Help button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 150,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid #f39c12',
          background: 'rgba(44, 62, 80, 0.85)',
          color: '#f39c12',
          fontSize: 18,
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        ?
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 300,
          }}
        />
      )}

      {/* Side panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : -380,
          width: 340,
          height: '100vh',
          background: '#1a2332',
          borderLeft: '2px solid #2c3e50',
          zIndex: 310,
          padding: '24px 20px',
          overflowY: 'auto',
          transition: 'right 0.3s ease',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ color: '#f39c12', fontSize: 20, fontWeight: 'bold', margin: 0 }}>
            牌型列表
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: 'none',
              background: '#2c3e50',
              color: '#95a5a6',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {HAND_RANKS.map((hand, i) => (
          <div
            key={hand.rank}
            style={{
              padding: '12px 14px',
              marginBottom: 8,
              borderRadius: 10,
              background: i === 0
                ? 'linear-gradient(135deg, rgba(241, 196, 15, 0.15), rgba(241, 196, 15, 0.05))'
                : 'rgba(44, 62, 80, 0.4)',
              border: i === 0 ? '1px solid rgba(241, 196, 15, 0.3)' : '1px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(243, 156, 18, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f39c12',
                  fontSize: 11,
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                {hand.rank}
              </div>
              <span style={{ color: hand.color, fontWeight: 'bold', fontSize: 15 }}>
                {hand.name}
              </span>
            </div>
            <div style={{ color: '#95a5a6', fontSize: 12, marginTop: 4, marginLeft: 34 }}>
              {hand.desc}
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 8, marginLeft: 34 }}>
              {hand.cards.map((c, ci) => (
                <MiniCard key={ci} card={c} />
              ))}
            </div>
          </div>
        ))}

        <div style={{ color: '#7f8c8d', fontSize: 11, textAlign: 'center', marginTop: 20, padding: '10px 0', borderTop: '1px solid #2c3e50' }}>
          数字越大牌型越大
        </div>
      </div>
    </>
  );
}