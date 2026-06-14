import { describe, it, expect } from 'vitest';
import { Suit, ActionType } from '../../src/engine/types';
import type { Rank } from '../../src/engine/types';
import { getPreflopTier, isPlayable, getPositionLabel, getPreflopAction } from '../../src/ai/preflopTable';

function card(rank: Rank, suit: Suit) {
  return { rank, suit };
}

describe('getPreflopTier', () => {
  it('AA 为 Tier 1', () => {
    expect(getPreflopTier([card(14, Suit.Hearts), card(14, Suit.Spades)])).toBe(1);
  });
  it('AKs 为 Tier 1', () => {
    expect(getPreflopTier([card(14, Suit.Hearts), card(13, Suit.Hearts)])).toBe(1);
  });
  it('AKo 为 Tier 2', () => {
    expect(getPreflopTier([card(14, Suit.Hearts), card(13, Suit.Spades)])).toBe(2);
  });
  it('ATo 为 Tier 3（无 Tier 3/4 重复）', () => {
    expect(getPreflopTier([card(14, Suit.Hearts), card(10, Suit.Spades)])).toBe(3);
  });
  it('66 为 Tier 4', () => {
    expect(getPreflopTier([card(6, Suit.Hearts), card(6, Suit.Spades)])).toBe(4);
  });
  it('KTo 为 Tier 4', () => {
    expect(getPreflopTier([card(13, Suit.Hearts), card(10, Suit.Spades)])).toBe(4);
  });
  it('72o 为 Tier 5', () => {
    expect(getPreflopTier([card(7, Suit.Hearts), card(2, Suit.Spades)])).toBe(5);
  });
});

describe('isPlayable', () => {
  it('EP 不能玩 66 (Tier 4 > EP 阈值 2)', () => {
    expect(isPlayable([card(6, Suit.Hearts), card(6, Suit.Spades)], 'EP')).toBe(false);
  });
  it('BTN 可以玩 66 (Tier 4 <= BTN 阈值 4)', () => {
    expect(isPlayable([card(6, Suit.Hearts), card(6, Suit.Spades)], 'BTN')).toBe(true);
  });
  it('EP 可以玩 JJ (Tier 1 <= EP 阈值 2)', () => {
    expect(isPlayable([card(11, Suit.Hearts), card(11, Suit.Spades)], 'EP')).toBe(true);
  });
  it('BB 可以玩 72o (BB 阈值 5 >= Tier 5)', () => {
    expect(isPlayable([card(7, Suit.Hearts), card(2, Suit.Spades)], 'BB')).toBe(true);
  });
});

describe('getPositionLabel', () => {
  it('按钮位', () => {
    expect(getPositionLabel(0, 0, false, false, 6)).toBe('BTN');
  });
  it('小盲位', () => {
    expect(getPositionLabel(1, 0, true, false, 6)).toBe('SB');
  });
  it('大盲位', () => {
    expect(getPositionLabel(2, 0, false, true, 6)).toBe('BB');
  });
  it('枪口位 (6人桌)', () => {
    expect(getPositionLabel(3, 0, false, false, 6)).toBe('EP');
  });
  it('中间位 (6人桌)', () => {
    expect(getPositionLabel(4, 0, false, false, 6)).toBe('MP');
  });
  it('关煞位 (6人桌)', () => {
    expect(getPositionLabel(5, 0, false, false, 6)).toBe('CO');
  });
  it('4人桌 CO 位（仅剩 1 个非盲注位）', () => {
    // 4 players: indices 0=BTN, 1=SB, 2=BB, 3=CO (distanceRight=1)
    expect(getPositionLabel(3, 0, false, false, 4)).toBe('CO');
  });
});

describe('getPreflopAction', () => {
  it('Tier 1 无人加注时建议加注', () => {
    expect(getPreflopAction(1, [ActionType.Raise, ActionType.Call, ActionType.Fold], false, false, 0)?.action)
      .toBe(ActionType.Raise);
  });
  it('Tier 3 面对加注且赔率好时跟注', () => {
    expect(getPreflopAction(3, [ActionType.Call, ActionType.Fold], true, false, 0.6)?.action)
      .toBe(ActionType.Call);
  });
  it('Tier 5 建议弃牌', () => {
    expect(getPreflopAction(5, [ActionType.Fold], false, false, 0)?.action)
      .toBe(ActionType.Fold);
  });
  it('Tier 2 面对 all-in 且赔率好时跟注', () => {
    expect(getPreflopAction(2, [ActionType.Call, ActionType.Fold], false, true, 0.5)?.action)
      .toBe(ActionType.Call);
  });
  it('Tier 2 面对 all-in 赔率不足时弃牌', () => {
    expect(getPreflopAction(2, [ActionType.Call, ActionType.Fold], false, true, 0.2)?.action)
      .toBe(ActionType.Fold);
  });
  it('Tier 3 无人加注有 Check 时过牌', () => {
    expect(getPreflopAction(3, [ActionType.Check, ActionType.Fold], false, false, 0)?.action)
      .toBe(ActionType.Check);
  });
  it('仅剩 Fold 选项时返回 Fold', () => {
    expect(getPreflopAction(4, [ActionType.Fold], true, false, 0.2)?.action)
      .toBe(ActionType.Fold);
  });
});