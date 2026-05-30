import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { PlayerSeat } from './PlayerSeat';
import { ActionPanel } from './ActionPanel';
import { ResultModal } from './ResultModal';
import { CardView } from './CardView';
import { HandRankHelp } from './HandRankHelp';
import { Round } from '../engine/types';
import type { GameState } from '../engine/types';
import { isMuted, toggleMute } from '../utils/sound';

const STAGGER_PER_CARD = 120;

type SeatCode = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

const positionCopy: Record<SeatCode, { label: string; code: SeatCode }> = {
  UTG: { label: '枪口位', code: 'UTG' },
  HJ: { label: '劫持位', code: 'HJ' },
  CO: { label: '关煞位', code: 'CO' },
  BTN: { label: '按钮位', code: 'BTN' },
  SB: { label: '小盲位', code: 'SB' },
  BB: { label: '大盲位', code: 'BB' },
};

const fallbackSeatOrder: SeatCode[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

const seatPositions: Record<SeatCode, CSSProperties> = {
  UTG: { top: '3%', left: '29%', transform: 'translateX(-50%)' },
  HJ: { top: '3%', left: '71%', transform: 'translateX(-50%)' },
  CO: { top: '36%', right: '0%', transform: 'translateY(-50%)' },
  BTN: { bottom: '1%', left: '71%', transform: 'translateX(-50%)' },
  SB: { bottom: '1%', left: '29%', transform: 'translateX(-50%)' },
  BB: { top: '36%', left: '0%', transform: 'translateY(-50%)' },
};

// Fixed seat assignment: P0 (human) always at bottom-left, AI players clockwise
const PLAYER_SEAT_MAP: SeatCode[] = ['SB', 'BTN', 'CO', 'HJ', 'UTG', 'BB'];

const dealerButtonPositions: Record<SeatCode, CSSProperties> = {
  UTG: { top: '29%', left: '34%' },
  HJ: { top: '29%', right: '34%' },
  CO: { top: '46%', right: '21%' },
  BTN: { bottom: '24%', right: '31%' },
  SB: { bottom: '24%', left: '31%' },
  BB: { top: '46%', left: '21%' },
};

export function GameTable() {
  const { state, nextHand, endGame, gameOver, isDealing, completeDealing } = useGameStore();
  const [muted, setMuted] = useState(isMuted());
  useGameLoop();

  useEffect(() => {
    if (isDealing && state) {
      const activeCount = state.players.filter(p => !p.isOut).length;
      const duration = activeCount * 2 * STAGGER_PER_CARD + 400;
      const timer = setTimeout(() => {
        completeDealing();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isDealing, state, completeDealing]);

  if (!state) return null;

  const activePlayerIndex = 0;
  const isHumanTurn = state.currentPlayerIndex === activePlayerIndex;
  const showAllCards = state.currentRound === Round.Showdown || state.handComplete;
  const tableLabel = `${Math.min(state.players.length, 6)}-MAX`;
  
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #3e586b 0%, #30495d 46%, #263b4d 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 38%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(94vw, 1120px)',
          height: 'min(74vh, 650px)',
          minHeight: 470,
          maxHeight: 650,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '84%',
            maxWidth: 930,
            aspectRatio: '2.22 / 1',
            borderRadius: 999,
            background: 'linear-gradient(180deg, #6af0bc 0%, #3dd09a 58%, #1d9f72 100%)',
            boxShadow: '0 30px 42px rgba(0,0,0,0.36), inset 0 5px 0 rgba(255,255,255,0.28)',
            padding: 14,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 999,
              background: 'radial-gradient(ellipse at center, #22b582 0%, #16a574 62%, #10825f 100%)',
              boxShadow: 'inset 0 18px 26px rgba(255,255,255,0.12), inset 0 -18px 28px rgba(0,0,0,0.18)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '10% 12%',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: '36%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'rgba(5, 76, 59, 0.52)',
                fontWeight: 800,
                letterSpacing: 0,
                userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 40, lineHeight: 1 }}>{tableLabel}</div>
              <div style={{ fontSize: 18, lineHeight: 1.35 }}>六人桌</div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: '57%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                gap: 7,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 424,
                minHeight: 114,
                zIndex: 3,
              }}
            >
              {state.communityCards.map((card, i) => (
                <CardView key={i} card={card} size="lg" animate />
              ))}
            </div>

            <div
              style={{
                position: 'absolute',
                top: '26%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                minWidth: 102,
                textAlign: 'center',
                zIndex: 3,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 86,
                  height: 28,
                  padding: '0 12px',
                  borderRadius: 999,
                  background: 'rgba(7, 39, 34, 0.68)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  color: '#ffe47a',
                  fontSize: 15,
                  fontWeight: 800,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.18)',
                }}
              >
                底池 {state.pot}
              </div>
              {state.currentRound !== Round.Showdown && (
                <div style={{ fontSize: 12, color: 'rgba(238,255,249,0.78)', marginTop: 4, fontWeight: 700 }}>
                  {getRoundName(state.currentRound)}
                </div>
              )}
            </div>

            <DealerAvatar isDealing={isDealing} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            width: 25,
            height: 25,
            borderRadius: '50%',
            border: '2px solid #fff4a8',
            background: '#f2d84c',
            color: '#30514d',
            fontSize: 14,
            lineHeight: '21px',
            textAlign: 'center',
            fontWeight: 900,
            boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
            zIndex: 18,
            ...dealerButtonPositions[PLAYER_SEAT_MAP[state.dealerIndex % PLAYER_SEAT_MAP.length]],
          }}
        >
          D
        </div>

        {isDealing && state.players.filter(p => !p.isOut).map((player) =>
          player.holeCards.map((_, cardIdx) => {
            const activeIdx = state.players.filter(p => !p.isOut).indexOf(player);
            const delay = (activeIdx * 2 + cardIdx) * STAGGER_PER_CARD;
            const slot = PLAYER_SEAT_MAP[player.id % PLAYER_SEAT_MAP.length];
            return (
              <div
                key={`deal-${player.id}-${cardIdx}`}
                style={{
                  position: 'absolute',
                  ...seatPositions[slot],
                  zIndex: 35,
                  animation: 'dealCard 0.35s ease-out',
                  animationDelay: `${delay}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 60,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #b0c4de 0%, #778899 100%)',
                    border: '1px solid #5a6a7a',
                    boxShadow: '1px 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            );
          })
        )}

        {state.players.map((player, i) => {
          const role = getSeatRole(state, i);
          const slot = PLAYER_SEAT_MAP[i % PLAYER_SEAT_MAP.length];
          return (
            <div
              key={player.id}
              style={{
                position: 'absolute',
                ...seatPositions[slot],
                zIndex: 30,
              }}
            >
              <PlayerSeat
                player={player}
                isCurrentPlayer={state.currentPlayerIndex === i}
                isHuman={i === 0}
                showAllCards={showAllCards}
                hideCards={isDealing}
                positionLabel={role.label}
                positionCode={role.code}
                markerTone={getMarkerTone(role.code, i === 0, state.currentPlayerIndex === i, player.folded || Boolean(player.isOut))}
              />
            </div>
          );
        })}
      </div>

      {isHumanTurn && !state.handComplete && (
        <ActionPanel playerIndex={activePlayerIndex} />
      )}

      {gameOver && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
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
              padding: '40px 50px',
              borderRadius: 8,
              textAlign: 'center',
              maxWidth: 450,
              width: '90%',
              border: '2px solid #f39c12',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <h2
              style={{
                color: '#f39c12',
                marginBottom: 24,
                fontSize: 28,
              }}
            >
              游戏结束
            </h2>
            <p style={{ color: '#ecf0f1', fontSize: 18, marginBottom: 32 }}>
              {state.players.length > 0 && state.players[0]?.chips <= 0
                ? '人类玩家破产，游戏结束！'
                : `${state.players.find(p => !p.isOut && p.chips > 0)?.name || 'Winner'} 赢得游戏！`}
            </p>
            <button
              onClick={endGame}
              style={{
                padding: '14px 40px',
                borderRadius: 8,
                border: 'none',
                background: '#f39c12',
                color: 'white',
                fontSize: 18,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)',
              }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}

      {state.handComplete && state.winners.length > 0 && !gameOver && (
        <ResultModal winners={state.winners} players={state.players} onNewHand={nextHand} />
      )}

      {/* Sound toggle */}
      <div
        onClick={() => { toggleMute(); setMuted(isMuted()); }}
        style={{
          position: 'fixed',
          top: 16,
          right: 58,
          zIndex: 150,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: muted ? '2px solid #7f8c8d' : '2px solid #27ae60',
          background: 'rgba(44, 62, 80, 0.85)',
          color: muted ? '#7f8c8d' : '#27ae60',
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          userSelect: 'none',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </div>

      <HandRankHelp />
    </div>
  );
}

function DealerAvatar({ isDealing }: { isDealing: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '5%',
        transform: 'translateX(-50%)',
        width: 72,
        height: 96,
        zIndex: 2,
        animation: isDealing ? 'dealerDeal 0.5s ease-in-out infinite alternate' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: '#d9b081',
          boxShadow: 'inset 0 5px 0 rgba(121, 77, 37, 0.55)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 33,
          left: 12,
          width: 48,
          height: 58,
          borderRadius: '18px 18px 8px 8px',
          background: 'linear-gradient(90deg, #2c353b 0 24%, #f6f0e8 24% 76%, #2c353b 76% 100%)',
          boxShadow: '0 10px 16px rgba(0,0,0,0.18)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 46,
          left: 31,
          width: 10,
          height: 10,
          borderRadius: 2,
          background: '#c84a44',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
}

function getSeatRole(state: GameState, playerIndex: number): { label: string; code: SeatCode } {
  const player = state.players[playerIndex];
  if (player.isDealer) return positionCopy.BTN;
  if (player.isSmallBlind) return positionCopy.SB;
  if (player.isBigBlind) return positionCopy.BB;

  const bbIndex = state.players.findIndex(p => p.isBigBlind);
  const activeCount = state.players.filter(p => !p.isOut).length;
  const openSeatCodes = activeCount >= 6
    ? ['UTG', 'HJ', 'CO']
    : activeCount === 5
      ? ['UTG', 'CO']
      : activeCount === 4
        ? ['CO']
        : [];

  const playersAfterBigBlind: number[] = [];
  let index = (bbIndex + 1 + state.players.length) % state.players.length;
  let guard = 0;
  while (index !== state.dealerIndex && guard < state.players.length) {
    const candidate = state.players[index];
    if (candidate && !candidate.isOut && !candidate.isSmallBlind && !candidate.isBigBlind) {
      playersAfterBigBlind.push(index);
    }
    index = (index + 1) % state.players.length;
    guard++;
  }

  const relativeIndex = playersAfterBigBlind.indexOf(playerIndex);
  const code = openSeatCodes[relativeIndex] as SeatCode | undefined;
  return code ? positionCopy[code] : positionCopy[fallbackSeatOrder[playerIndex % fallbackSeatOrder.length]];
}

function getMarkerTone(code: SeatCode, isHuman: boolean, isCurrentPlayer: boolean, isInactive: boolean) {
  if (isInactive) return 'muted';
  if (isCurrentPlayer) return 'green';
  if (isHuman || code === 'BTN') return 'white';
  if (code === 'HJ' || code === 'CO') return 'green';
  return 'red';
}

function getRoundName(round: Round): string {
  switch (round) {
    case Round.Preflop: return '翻牌前';
    case Round.Flop: return '翻牌';
    case Round.Turn: return '转牌';
    case Round.River: return '河牌';
    case Round.Showdown: return '摊牌';
    default: return '';
  }
}
