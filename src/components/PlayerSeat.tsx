import type { Player as PlayerType } from '../engine/types';
import { CardView } from './CardView';

type MarkerTone = 'red' | 'green' | 'white' | 'muted';

interface PlayerSeatProps {
  player: PlayerType;
  isCurrentPlayer: boolean;
  isHuman: boolean;
  showAllCards: boolean;
  hideCards?: boolean;
  isThinking?: boolean;
  markerTone?: MarkerTone;
}

const markerColors: Record<MarkerTone, { background: string; border: string; glow: string }> = {
  red: {
    background: 'linear-gradient(145deg, #fb4a57 0%, #c7192a 100%)',
    border: '#1d1115',
    glow: 'rgba(234, 49, 67, 0.35)',
  },
  green: {
    background: 'linear-gradient(145deg, #35e767 0%, #05a93d 100%)',
    border: '#092818',
    glow: 'rgba(32, 219, 92, 0.38)',
  },
  white: {
    background: 'linear-gradient(145deg, #ffffff 0%, #d8dde2 100%)',
    border: '#1f2933',
    glow: 'rgba(255, 255, 255, 0.42)',
  },
  muted: {
    background: 'linear-gradient(145deg, #768292 0%, #4a5565 100%)',
    border: '#252b34',
    glow: 'rgba(80, 90, 105, 0.24)',
  },
};

export function PlayerSeat({
  player,
  isCurrentPlayer,
  isHuman,
  showAllCards,
  hideCards,
  isThinking,
  markerTone = 'red',
}: PlayerSeatProps) {
  const isInactive = player.isOut || player.folded;
  const marker = markerColors[player.isOut ? 'muted' : markerTone];

  return (
    <div
      style={{
        width: 'clamp(96px, 13vw, 138px)',
        minHeight: 164,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        opacity: isInactive ? 0.58 : 1,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        transform: isCurrentPlayer ? 'translateY(-3px)' : 'translateY(0)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 'clamp(48px, 6.8vw, 66px)',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          background: marker.background,
          border: `3px solid ${marker.border}`,
          boxShadow: isCurrentPlayer
            ? `0 0 0 4px rgba(244, 196, 82, 0.9), 0 12px 26px ${marker.glow}`
            : `0 10px 22px ${marker.glow}, inset 0 2px 4px rgba(255,255,255,0.24)`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {player.isDealer && (
          <span
            style={{
              position: 'absolute',
              right: -8,
              bottom: 2,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2px solid #fff8b8',
              background: '#f4d64a',
              color: '#31504e',
              fontSize: 13,
              lineHeight: '18px',
              textAlign: 'center',
              fontWeight: 900,
              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }}
          >
            D
          </span>
        )}
      </div>

      {/* Player name & chips */}
      <div
        style={{
          maxWidth: 132,
          padding: '4px 8px',
          borderRadius: 6,
          background: isCurrentPlayer ? 'rgba(244, 196, 82, 0.18)' : 'rgba(13, 23, 32, 0.68)',
          color: isHuman ? '#f6d77a' : '#d8e4ec',
          border: isCurrentPlayer ? '1px solid rgba(244, 196, 82, 0.45)' : '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
          lineHeight: 1.15,
          fontWeight: 700,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.name} · {player.isOut ? 0 : player.chips}
      </div>

      {!player.isOut && (
        <>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center', minHeight: 60 }}>
            {player.holeCards.map((card, i) => (
              <div key={i} style={hideCards ? { width: 44, height: 60 } : undefined}>
                {!hideCards && (
                  <CardView
                    card={card}
                    hidden={!isHuman && !showAllCards && !player.folded}
                    size="sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              minHeight: 17,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              color: '#f0d56a',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {isThinking && (
              <span style={{ color: '#4fc3f7', animation: 'pulse 1s ease-in-out infinite' }}>
                思考中...
              </span>
            )}
            {player.currentBet > 0 && <span>注 {player.currentBet}</span>}
            {player.isAllIn && <span style={{ color: '#ff7a7a' }}>ALL IN</span>}
            {player.folded && <span style={{ color: '#aeb9c3' }}>弃牌</span>}
            {player.handRank && <span style={{ color: '#4ff08f' }}>{player.handRank.description}</span>}
          </div>
        </>
      )}
    </div>
  );
}
