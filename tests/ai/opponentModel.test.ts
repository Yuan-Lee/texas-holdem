import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileTracker } from '../../src/ai/opponentModel';
import { ActionType } from '../../src/engine/types';

describe('ProfileTracker', () => {
  let tracker: ProfileTracker;

  beforeEach(() => {
    tracker = new ProfileTracker();
  });

  it('初始状态返回空画像', () => {
    const profile = tracker.getProfile(1);
    expect(profile.totalHands).toBe(0);
  });

  it('记录手牌和主动入池影响 VPIP 和 PFR', () => {
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordHandResult(1, { sawFlop: true, sawShowdown: true, wasVoluntary: true });

    const profile = tracker.getProfile(1);
    expect(profile.vpip).toBe(1);
    expect(profile.pfr).toBe(1);
    expect(profile.totalHands).toBe(1);
  });

  it('多次手牌累计', () => {
    // 手牌 1: 主动加注
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordHandResult(1, { sawFlop: true, sawShowdown: true, wasVoluntary: true });

    // 手牌 2: 弃牌
    tracker.recordHandStart(1);
    tracker.recordHandResult(1, { sawFlop: false, sawShowdown: false, wasVoluntary: false });

    // 手牌 3: 被动入池
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Call);
    tracker.recordHandResult(1, { sawFlop: true, sawShowdown: false, wasVoluntary: true });

    const profile = tracker.getProfile(1);
    expect(profile.vpip).toBeCloseTo(2 / 3, 3);
    expect(profile.pfr).toBeCloseTo(1 / 3, 3);
    expect(profile.totalHands).toBe(3);
  });

  it('侵略系数 AF = (Raise+AllIn)/Call', () => {
    tracker.recordPostflopAction(1, ActionType.Raise);
    tracker.recordPostflopAction(1, ActionType.AllIn);
    tracker.recordPostflopAction(1, ActionType.Call);
    const profile = tracker.getProfile(1);
    expect(profile.af).toBe(2);
  });

  it('零被动行动时 AF 返回 0', () => {
    tracker.recordPostflopAction(1, ActionType.Raise);
    const profile = tracker.getProfile(1);
    expect(profile.af).toBe(0);
  });

  it('Fold to CBet', () => {
    tracker.recordFacingCBet(1, true);  // folded
    tracker.recordFacingCBet(1, false); // called
    tracker.recordFacingCBet(1, true);  // folded
    const profile = tracker.getProfile(1);
    expect(profile.foldToCBet).toBeCloseTo(2 / 3, 3);
  });

  it('WTSD = 看到摊牌 / 看到翻牌', () => {
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Call);
    tracker.recordHandResult(1, { sawFlop: true, sawShowdown: true, wasVoluntary: true });

    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordHandResult(1, { sawFlop: true, sawShowdown: false, wasVoluntary: true });

    const profile = tracker.getProfile(1);
    expect(profile.wtsd).toBeCloseTo(0.5, 3);
  });

  it('reset() 清除所有数据', () => {
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordHandResult(1, { sawFlop: true, sawShowdown: true, wasVoluntary: true });
    tracker.reset();
    const profile = tracker.getProfile(1);
    expect(profile.totalHands).toBe(0);
  });
});