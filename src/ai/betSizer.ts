import type { BoardTexture } from './types';

export interface BetSizeParams {
  potSize: number;
  stackSize: number;
  maxBet: number;
  currentBet: number;
  minRaise: number;
  handValue: number;
  boardTexture: BoardTexture;
  intention: 'value' | 'bluff' | 'semiBluff';
  opponentFoldCBet?: number;
}

export function calculateBetSize(params: BetSizeParams): number {
  const { potSize, stackSize, maxBet, currentBet, minRaise,
          intention, boardTexture, opponentFoldCBet } = params;

  if (stackSize <= minRaise) {
    return currentBet + stackSize;
  }

  let desiredAdditional: number;

  if (intention === 'bluff') {
    const factor = opponentFoldCBet && opponentFoldCBet > 0.6 ? 0.5 : 0.33;
    desiredAdditional = Math.max(potSize * factor, minRaise);
  } else if (boardTexture === 'wet') {
    desiredAdditional = intention === 'value' ? potSize * 0.75 : potSize * 0.6;
  } else if (boardTexture === 'dry') {
    desiredAdditional = intention === 'value' ? potSize * 0.5 : potSize * 0.33;
  } else {
    desiredAdditional = potSize * 0.5;
  }

  let totalBet = currentBet + Math.round(desiredAdditional / 10) * 10;
  totalBet = Math.max(totalBet, currentBet + minRaise);
  totalBet = Math.min(totalBet, currentBet + stackSize);

  return totalBet;
}

export function calculatePreflopBetSize(
  blindsSize: number,
  currentBet: number,
  stackSize: number,
  raisesFaced: number,
): number {
  if (stackSize <= blindsSize * 3) {
    return currentBet + stackSize;
  }

  let multiplier: number;
  if (raisesFaced === 0) {
    multiplier = 3;
  } else if (raisesFaced === 1) {
    multiplier = 3.5;
  } else {
    multiplier = 2.5;
  }

  const desired = Math.round(blindsSize * multiplier / 10) * 10;
  const totalBet = currentBet + Math.max(desired, currentBet);
  return Math.min(totalBet, currentBet + stackSize);
}