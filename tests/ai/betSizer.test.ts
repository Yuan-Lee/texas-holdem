import { describe, it, expect } from 'vitest';
import { calculateBetSize, calculatePreflopBetSize } from '../../src/ai/betSizer';

describe('calculateBetSize', () => {
  it('价值下注在干燥牌面约为 50% 底池', () => {
    const result = calculateBetSize({
      potSize: 200, stackSize: 800, maxBet: 0, currentBet: 0,
      minRaise: 20, handValue: 5000, boardTexture: 'dry',
      intention: 'value',
    });
    expect(result).toBeGreaterThanOrEqual(80);
    expect(result).toBeLessThanOrEqual(120);
  });

  it('诈唬在干燥牌面用小注', () => {
    const result = calculateBetSize({
      potSize: 200, stackSize: 800, maxBet: 0, currentBet: 0,
      minRaise: 20, handValue: 100, boardTexture: 'dry',
      intention: 'bluff',
    });
    expect(result).toBeGreaterThanOrEqual(60);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('湿润牌面价值下注约 75% 底池', () => {
    const result = calculateBetSize({
      potSize: 200, stackSize: 800, maxBet: 0, currentBet: 0,
      minRaise: 20, handValue: 8000, boardTexture: 'wet',
      intention: 'value',
    });
    expect(result).toBeGreaterThanOrEqual(130);
    expect(result).toBeLessThanOrEqual(170);
  });

  it('筹码不足时返回 All-In', () => {
    const result = calculateBetSize({
      potSize: 200, stackSize: 15, maxBet: 0, currentBet: 0,
      minRaise: 20, handValue: 5000, boardTexture: 'dry',
      intention: 'value',
    });
    expect(result).toBe(15);
  });

  it('已有下注时增加新下注', () => {
    const result = calculateBetSize({
      potSize: 200, stackSize: 800, maxBet: 50, currentBet: 50,
      minRaise: 30, handValue: 5000, boardTexture: 'dry',
      intention: 'value',
    });
    expect(result).toBeGreaterThan(50);
  });
});

describe('calculatePreflopBetSize', () => {
  it('开池加注约 3BB', () => {
    const result = calculatePreflopBetSize(20, 0, 1000, 0);
    expect(result).toBeGreaterThanOrEqual(55);
    expect(result).toBeLessThanOrEqual(65);
  });

  it('短筹码时 All-In', () => {
    const result = calculatePreflopBetSize(20, 0, 40, 0);
    expect(result).toBe(40);
  });

  it('已有下注时重新加注（3-bet）', () => {
    // currentBet=20 (盲注), 3-bet 期望 3.5BB=70
    const result = calculatePreflopBetSize(20, 20, 1000, 1);
    expect(result).toBeGreaterThanOrEqual(65);
    expect(result).toBeLessThanOrEqual(75);
  });
});