import type { Card } from '../engine/types';
import { SUIT_SYMBOLS, SUIT_COLORS, RANK_NAMES } from '../engine/constants';

interface CardViewProps {
  card: Card | null;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function CardView({ card, hidden, size = 'md', animate }: CardViewProps) {
  const sizeMap = {
    sm: { width: 44, height: 60, fontSize: 14, symbolSize: 16 },
    md: { width: 60, height: 84, fontSize: 18, symbolSize: 22 },
    lg: { width: 80, height: 112, fontSize: 24, symbolSize: 30 },
  };

  const { width, height, fontSize, symbolSize } = sizeMap[size];

  if (hidden || !card) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #b0c4de 0%, #778899 100%)',
          border: '1px solid #5a6a7a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '1px 1px 3px rgba(0,0,0,0.3)',
          animation: animate ? 'dealCard 0.3s ease-out' : undefined,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '70%',
            height: '70%',
            borderRadius: 4,
            background: 'repeating-linear-gradient(45deg, #6a7c8d, #6a7c8d 3px, #7a8d9f 3px, #7a8d9f 6px)',
          }}
        />
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const rank = RANK_NAMES[card.rank];

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: 'white',
        border: '1px solid #d0d0d0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.3)',
        animation: animate ? 'dealCard 0.3s ease-out' : undefined,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <span style={{ position: 'absolute', top: 2, left: 4, fontSize, fontWeight: 'bold', color }}>
        {rank}
      </span>
      <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize, fontWeight: 'bold', color, transform: 'rotate(180deg)' }}>
        {rank}
      </span>
      <span style={{ fontSize: symbolSize, color, lineHeight: 1 }}>{symbol}</span>
    </div>
  );
}
