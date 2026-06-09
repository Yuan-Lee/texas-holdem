import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { PlayerSeat } from './PlayerSeat';
import { ActionPanel } from './ActionPanel';
import { ResultModal } from './ResultModal';
import { CardView } from './CardView';
import { HandRankHelp } from './HandRankHelp';
import { DealerAvatar } from './DealerAvatar';
import { Round } from '../engine/types';
import {
  seatPositions,
  PLAYER_SEAT_MAP,
  getSeatRole,
  getRoundName,
} from './gameTableUtils';
import { isMuted, toggleMute } from '../utils/sound';

const STAGGER_PER_CARD = 120;

function getMarkerTone(code: string, isHuman: boolean, isCurrentPlayer: boolean, isInactive: boolean) {
  if (isInactive) return 'muted';
  if (isCurrentPlayer) return 'green';
  if (isHuman || code === 'BTN') return 'white';
  if (code === 'HJ' || code === 'CO') return 'green';
  return 'red';
}

function SoundToggle() {
  const [muted, setMuted] = useState(isMuted());
  return (
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
  );
}

function GameOverOverlay({ endGame, message }: { endGame: () => void; message: string }) {
  return (
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
        <h2 style={{ color: '#f39c12', marginBottom: 24, fontSize: 28 }}>
          游戏结束
        </h2>
        <p style={{ color: '#ecf0f1', fontSize: 18, marginBottom: 32 }}>
          {message}
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
  );
}

function DealingAnimation({ state, isDealing }: { state: NonNullable<ReturnType<typeof useGameStore.getState>['state']>; isDealing: boolean }) {
  if (!isDealing) return null;

  return (
    <>
      {state.players.filter(p => !p.isOut).map((player) =>
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
    </>
  );
}

function BlindsDisplay() {
  const blindLevel = useGameStore(s => s.blindLevel);
  const state = useGameStore(s => s.state);
  if (!state) return null;
  return (
    <div style={{ fontSize: 11, color: 'rgba(238,255,249,0.55)', fontWeight: 600, textAlign: 'center', marginTop: 2 }}>
      盲注 {state.smallBlind}/{state.bigBlind}
      {blindLevel > 0 && <span> · Lv{blindLevel + 1}</span>}
    </div>
  );
}

function StatsPanel() {
  const handHistory = useGameStore(s => s.handHistory);
  const state = useGameStore(s => s.state);
  const [open, setOpen] = useState(false);
  if (!state || handHistory.length === 0) return null;

  const humanProfit = handHistory.reduce((sum, h) => sum + (h.playerProfit[0] ?? 0), 0);
  const wins = handHistory.filter(h => h.winners.some(w => w.name === state.players[0]?.name)).length;
  const recent = handHistory.slice(-10).reverse();

  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 150,
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid #3498db', background: 'rgba(44, 62, 80, 0.85)',
          color: '#3498db', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          userSelect: 'none',
        }}
      >
        📊
      </div>
      {open && (
        <div
          style={{
            position: 'fixed', top: 58, left: 16, zIndex: 160,
            background: 'rgba(30, 30, 50, 0.97)', border: '2px solid #3498db',
            borderRadius: 12, padding: 14, minWidth: 260, maxHeight: 360,
            overflowY: 'auto', boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ color: '#ecf0f1', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
            统计概览
          </div>
          <div style={{ fontSize: 12, color: '#95a5a6', marginBottom: 8, lineHeight: 1.6 }}>
            总局数: {handHistory.length}<br />
            胜局: {wins} ({handHistory.length > 0 ? Math.round(wins / handHistory.length * 100) : 0}%)<br />
            总盈亏: <span style={{ color: humanProfit >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
              {humanProfit >= 0 ? '+' : ''}{humanProfit}
            </span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 4 }}>
            <div style={{ color: '#95a5a6', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
              最近牌局
            </div>
            {recent.map((h, i) => (
              <div key={h.handNumber} style={{ fontSize: 11, color: '#bdc3c7', padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>#{h.handNumber} 底池{h.pot}</span>
                <span style={{ color: (h.playerProfit[0] ?? 0) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                  {(h.playerProfit[0] ?? 0) >= 0 ? '+' : ''}{h.playerProfit[0] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function GameTable() {
  const { state, nextHand, endGame, gameOver, isDealing, completeDealing } = useGameStore();
  useGameLoop();

  const activePlayerIndex = 0;

  useEffect(() => {
    if (!isDealing || !state) return;
    const activeCount = state.players.filter(p => !p.isOut).length;
    const duration = activeCount * 2 * STAGGER_PER_CARD + 400;
    const timer = setTimeout(() => {
      completeDealing();
    }, duration);
    return () => clearTimeout(timer);
  }, [isDealing, completeDealing]);

  if (!state) return null;

  const isHumanTurn = state.currentPlayerIndex === activePlayerIndex;
  const showAllCards = state.currentRound === Round.Showdown || state.handComplete;
  const tableLabel = `${Math.min(state.players.length, 6)}-MAX`;

  const gameOverMessage = state.players[0]?.chips <= 0
    ? '人类玩家破产，游戏结束！'
    : `${state.players.find(p => !p.isOut && p.chips > 0)?.name || 'Winner'} 赢得游戏！`;

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
      {/* Ambient light overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 38%)',
          pointerEvents: 'none',
        }}
      />

      {/* Table area */}
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
        {/* Table felt */}
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
            {/* Inner ring */}
            <div
              style={{
                position: 'absolute',
                inset: '10% 12%',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            />

            {/* Table label */}
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

            {/* Community cards */}
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

            {/* Pot display & round name */}
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
              <BlindsDisplay />
              {state.currentRound !== Round.Showdown && (
                <div style={{ fontSize: 12, color: 'rgba(238,255,249,0.78)', marginTop: 4, fontWeight: 700 }}>
                  {getRoundName(state.currentRound)}
                </div>
              )}
            </div>

            <DealerAvatar isDealing={isDealing} />
          </div>
        </div>

        <DealingAnimation state={state} isDealing={isDealing} />

        {/* Player seats */}
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
                isThinking={state.currentPlayerIndex === i && player.isAI && !state.handComplete && !isDealing}
                isHuman={i === 0}
                showAllCards={showAllCards}
                hideCards={isDealing}
                markerTone={getMarkerTone(role.code, i === 0, state.currentPlayerIndex === i, player.folded || Boolean(player.isOut))}
              />
            </div>
          );
        })}
      </div>

      {/* Action panel */}
      {isHumanTurn && !state.handComplete && !isDealing && (
        <ActionPanel playerIndex={activePlayerIndex} />
      )}

      {/* Game over overlay */}
      {gameOver && (
        <GameOverOverlay endGame={endGame} message={gameOverMessage} />
      )}

      {/* Result modal */}
      {state.handComplete && state.winners.length > 0 && !gameOver && (
        <ResultModal winners={state.winners} players={state.players} onNewHand={nextHand} />
      )}

      <SoundToggle />
      <HandRankHelp />
      <StatsPanel />
    </div>
  );
}
