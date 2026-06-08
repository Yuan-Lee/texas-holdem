import type { CSSProperties } from 'react';
import { Round } from '../engine/types';
import type { GameState } from '../engine/types';

export type SeatCode = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export interface PositionLabel {
  label: string;
  code: SeatCode;
}

export const positionCopy: Record<SeatCode, PositionLabel> = {
  UTG: { label: '枪口位', code: 'UTG' },
  HJ: { label: '劫持位', code: 'HJ' },
  CO: { label: '关煞位', code: 'CO' },
  BTN: { label: '按钮位', code: 'BTN' },
  SB: { label: '小盲位', code: 'SB' },
  BB: { label: '大盲位', code: 'BB' },
};

export const fallbackSeatOrder: SeatCode[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

export const seatPositions: Record<SeatCode, CSSProperties> = {
  UTG: { top: '3%', left: '29%', transform: 'translateX(-50%)' },
  HJ: { top: '3%', left: '71%', transform: 'translateX(-50%)' },
  CO: { top: '36%', right: '0%', transform: 'translateY(-50%)' },
  BTN: { bottom: '1%', left: '71%', transform: 'translateX(-50%)' },
  SB: { bottom: '1%', left: '29%', transform: 'translateX(-50%)' },
  BB: { top: '36%', left: '0%', transform: 'translateY(-50%)' },
};

export const dealerButtonPositions: Record<SeatCode, CSSProperties> = {
  UTG: { top: '29%', left: '34%' },
  HJ: { top: '29%', right: '34%' },
  CO: { top: '46%', right: '21%' },
  BTN: { bottom: '24%', right: '31%' },
  SB: { bottom: '24%', left: '31%' },
  BB: { top: '46%', left: '21%' },
};

export const PLAYER_SEAT_MAP: SeatCode[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

export function getSeatRole(state: GameState, playerIndex: number): PositionLabel {
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

export function getRoundName(round: Round): string {
  switch (round) {
    case Round.Preflop: return '翻牌前';
    case Round.Flop: return '翻牌';
    case Round.Turn: return '转牌';
    case Round.River: return '河牌';
    case Round.Showdown: return '摊牌';
    default: return '';
  }
}
