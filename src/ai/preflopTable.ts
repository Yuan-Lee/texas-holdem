import { ActionType } from '../engine/types';
import type { Card } from '../engine/types';
import type { AIDecision, HandTier, PositionLabel } from './types';

function handKey(cards: Card[]): string {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const suited = sorted[0].suit === sorted[1].suit;
  return `${sorted[0].rank}-${sorted[1].rank}${suited ? 's' : 'o'}`;
}

// Tier 1 (最强): AA, KK, QQ, JJ, AKs
// Tier 2 (强): AKo, TT, AQs, AJs, KQs, 99
// Tier 3 (中等): AQo, ATo, ATs, KJs, QJs, JTs, 88, 77, AJo, KQo
// Tier 4 (可玩): ATo, KTo, QJo, JTo, 66, 55, 44, T9s, 98s, 87s, A2s-A9s, K9s, Q9s
// Tier 5 (垃圾): 其余

const TIER1 = new Set([
  '14-14o', '13-13o', '12-12o', '11-11o',
  '14-13s',
]);

const TIER2 = new Set([
  '14-13o',
  '10-10o',
  '14-12s', '14-11s',
  '13-12s',
  '9-9o',
]);

const TIER3 = new Set([
  '14-12o', '14-10o',
  '14-10s',
  '13-11s',
  '12-11s',
  '11-10s',
  '8-8o', '7-7o',
  '14-11o',
  '13-12o',
]);

const TIER4 = new Set([
  '14-10o',
  '13-10o',
  '12-11o',
  '11-10o',
  '6-6o', '5-5o', '4-4o',
  '10-9s', '9-8s', '8-7s',
  '14-9s', '14-8s', '14-7s', '14-6s', '14-5s', '14-4s', '14-3s', '14-2s',
  '13-9s',
  '12-9s',
]);

const POSITION_TIER_THRESHOLD: Record<PositionLabel, number> = {
  EP: 2, MP: 3, CO: 3, BTN: 4, SB: 3, BB: 5,
};

export function getPreflopTier(cards: Card[]): HandTier {
  const key = handKey(cards);
  if (TIER1.has(key)) return 1;
  if (TIER2.has(key)) return 2;
  if (TIER3.has(key)) return 3;
  if (TIER4.has(key)) return 4;
  return 5;
}

export function isPlayable(cards: Card[], position: PositionLabel): boolean {
  return getPreflopTier(cards) <= POSITION_TIER_THRESHOLD[position];
}

export function getPositionLabel(
  playerIndex: number,
  dealerIndex: number,
  isSmallBlind: boolean,
  isBigBlind: boolean,
  activePlayerCount: number,
): PositionLabel {
  if (isSmallBlind) return 'SB';
  if (isBigBlind) return 'BB';
  if (playerIndex === dealerIndex) return 'BTN';

  // Distance to the right of dealer (counter-clockwise, through BB direction)
  const distanceRight = (dealerIndex - playerIndex + activePlayerCount) % activePlayerCount;

  if (activePlayerCount <= 4) {
    return distanceRight <= 1 ? 'CO' : 'MP';
  }
  if (distanceRight === 1) return 'CO';
  if (distanceRight === 2) return 'MP';
  return 'EP';
}

export function getPreflopAction(
  tier: HandTier,
  validActions: ActionType[],
  facingRaise: boolean,
  facingAllIn: boolean,
  potOdds: number,
): AIDecision | null {
  if (facingAllIn) {
    if (tier <= 1 && validActions.includes(ActionType.Call)) {
      return { action: ActionType.Call };
    }
    if (tier <= 2 && potOdds > 0.4 && validActions.includes(ActionType.Call)) {
      return { action: ActionType.Call };
    }
    if (validActions.includes(ActionType.Fold)) return { action: ActionType.Fold };
    return null;
  }

  if (facingRaise) {
    if (tier <= 1) {
      if (validActions.includes(ActionType.Raise)) return { action: ActionType.Raise, amount: 0 };
      if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
    }
    if (tier <= 2 && potOdds > 0.33 && validActions.includes(ActionType.Call)) {
      return { action: ActionType.Call };
    }
    if (tier <= 3 && potOdds > 0.5 && validActions.includes(ActionType.Call)) {
      return { action: ActionType.Call };
    }
    if (validActions.includes(ActionType.Fold)) return { action: ActionType.Fold };
    return null;
  }

  // No raise faced
  if (tier <= 2 && validActions.includes(ActionType.Raise)) {
    return { action: ActionType.Raise, amount: 0 };
  }
  if (tier <= 4) {
    if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
    if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
  }
  if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
  if (validActions.includes(ActionType.Fold)) return { action: ActionType.Fold };
  return null;
}