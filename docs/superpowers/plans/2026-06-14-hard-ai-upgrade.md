# Hard AI 升级实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Hard 难度 AI 从简单的 if-else + 200 次 MC 升级为三层混合决策引擎（启发式→范围推演→MC强化），支持自适应打牌风格。

**Architecture:** 新增 3 个模块（对手画像、翻牌前范围表、下注额策略），重写 hard.ts 为三层决策流，修改 gameStore.ts 接入对手画像更新。

**Tech Stack:** TypeScript, Zustand, existing game engine

---

### Task 1: 更新类型定义

**Files:**
- Modify: `src/ai/types.ts`

- [ ] **Step 1: 追加新类型到 types.ts**

打开 `src/ai/types.ts`，在文件末尾新增以下类型：

```typescript
// ── Hard AI 升级新增类型 ──

/** 位置标签 */
export type PositionLabel = 'EP' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

/** 牌力等级 */
export type HandTier = 1 | 2 | 3 | 4 | 5;

/** 对手画像 */
export interface OpponentProfile {
  /** 主动入池率 0-1 */
  vpip: number;
  /** 翻牌前加注率 0-1 */
  pfr: number;
  /** 侵略系数 */
  af: number;
  /** 面对持续下注弃牌率 0-1 */
  foldToCBet: number;
  /** 摊牌率 0-1 */
  wtsd: number;
  /** 统计基准手数 */
  totalHands: number;
}

/** 牌面湿润度 */
export type BoardTexture = 'dry' | 'wet' | 'paired' | 'none';
```

- [ ] **Step 2: 编译检查**

```bash
npx tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
git add src/ai/types.ts
git commit -m "feat(ai): add types for hard AI upgrade (PositionLabel, HandTier, OpponentProfile)"
```

---

### Task 2: 对手画像模块

**Files:**
- Create: `src/ai/opponentModel.ts`
- Test: 新建 `tests/ai/opponentModel.test.ts`

- [ ] **Step 1: 创建测试文件**

新建 `tests/ai/opponentModel.test.ts`：

```typescript
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
    expect(profile.vpip).toBe(0);
    expect(profile.pfr).toBe(0);
    expect(profile.af).toBe(0);
    expect(profile.foldToCBet).toBe(0);
    expect(profile.wtsd).toBe(0);
    expect(profile.totalHands).toBe(0);
  });

  it('记录翻牌前加注后 PFR > 0', () => {
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordPreflopAction(1, ActionType.Call);  // 非加注
    const profile = tracker.getProfile(1);
    expect(profile.pfr).toBeCloseTo(2 / 3, 3);
    expect(profile.totalHands).toBe(1); // 每手牌只计 1
  });

  it('记录主动入池影响 VPIP', () => {
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);  // 主动入池
    tracker.recordHandResult(1, true, true, false);
    const profile = tracker.getProfile(1);
    expect(profile.vpip).toBe(1);
    expect(profile.totalHands).toBe(1);
  });

  it('多次手牌累计统计', () => {
    // 手牌 1: 主动加注
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordHandResult(1, true, true, false);

    // 手牌 2: 弃牌（被动）
    tracker.recordHandStart(1);
    // 没记录任何主动行动
    tracker.recordHandResult(1, false, false, true);

    // 手牌 3: 主动跟注
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Call);
    tracker.recordHandResult(1, true, false, false); // 没到摊牌

    const profile = tracker.getProfile(1);
    expect(profile.vpip).toBeCloseTo(2 / 3, 3); // 3局中2局主动
    expect(profile.totalHands).toBe(3);
  });

  it('记录 fold to CBet', () => {
    tracker.recordPreflopAction(1, ActionType.Call);
    tracker.recordPostflopAction(1, ActionType.Fold); // 翻牌后遇下注弃牌 — 记为 facing cbet + fold
    const profile = tracker.getProfile(1);
    expect(profile.foldToCBet).toBe(1);
  });

  it('记录侵略系数 AF', () => {
    tracker.recordPostflopAction(1, ActionType.Raise);  // 侵略
    tracker.recordPostflopAction(1, ActionType.Bet);    // 侵略（虽然 Bet 不是 ActionType 里的）
    tracker.recordPostflopAction(1, ActionType.Call);   // 被动
    const profile = tracker.getProfile(1);
    // 注意: Bet 不在 ActionType 中，所以不计
    expect(profile.af).toBe(1); // 1 aggressive / 1 passive
  });

  it('reset() 清除所有数据', () => {
    tracker.recordHandStart(1);
    tracker.recordPreflopAction(1, ActionType.Raise);
    tracker.recordHandResult(1, true, true, false);
    tracker.reset();
    const profile = tracker.getProfile(1);
    expect(profile.totalHands).toBe(0);
  });
});
```

Wait — `ActionType.Bet` doesn't exist in the enum. Let me reconsider the AF tracking. In Texas Holdem, the aggressive actions are Raise and Bet. But from the engine's perspective, we only have: Fold, Check, Call, Raise, AllIn. So aggressive actions = Raise + AllIn. Let me adjust.

Actually, looking at this more carefully, the AF (Aggression Factor) is typically calculated as (bets + raises) / calls. In our engine, we only have Raise and AllIn as "aggressive" actions (since Bet isn't a separate action — you "bet" by raising from 0). So AF = (RaiseCount + AllInCount) / CallCount.

Let me fix the test:

```
it('记录侵略系数 AF', () => {
    tracker.recordPostflopAction(1, ActionType.Raise);   // 侵略
    tracker.recordPostflopAction(1, ActionType.AllIn);   // 侵略
    tracker.recordPostflopAction(1, ActionType.Call);    // 被动
    const profile = tracker.getProfile(1);
    expect(profile.af).toBe(2); // 2 aggressive / 1 passive
  });
```

And for foldToCBet:
The foldToCBet needs a specific tracking mechanism. In poker, "facing a continuation bet" means: the opponent raised preflop, then bet on the flop. We need to track:
1. Was the opponent the preflop aggressor?
2. Did they bet on the flop?
3. Did the player face that bet?

For simplicity, I'll track foldToCBet as: when the player faces a flop bet (maxBet > 0 on flop) and folds. This isn't perfectly accurate but is a reasonable approximation for a game AI.

Actually, let me simplify: track CBet as when the player is facing a flop bet and checks or folds. The Fold to CBet = folds / (folds + calls) when facing a flop bet.

Hmm, this is getting complicated. Let me simplify the tracking to just use the state directly in the hard.ts decision logic instead of trying to track it automatically. I'll track just the basic stats and compute CBet stats manually.

Actually, let me re-think the approach. The ProfileTracker should be fed data from the game engine/store, not try to infer complex patterns. Let me redesign:

```typescript
class ProfileTracker {
  // Simple per-player counters
  // Record when we have the information
  recordPreflopAction(playerId: number, action: ActionType): void
  recordPostflopAction(playerId: number, action: ActionType): void
  recordHandStart(playerId: number): void  // marks start of a hand for VPIP
  recordHandResult(playerId: number, sawFlop: boolean, sawShowdown: boolean, wasVoluntary: boolean): void
  recordFacingCBet(playerId: number, folded: boolean): void
  getProfile(playerId: number): OpponentProfile
  reset(): void
}
```

And use `recordFacingCBet` explicitly from hard.ts when we detect the scenario.

Let me simplify the test to match.

Let me redo the test file properly:

```typescript
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
```

OK that looks better. Now let me finish writing the full plan document.</think>

<｜DSML｜tool_calls>
<｜DSML｜invoke name="Write">
<｜DSML｜parameter name="file_path" string="true">/Users/liyuan/texas-holdem/docs/superpowers/plans/2026-06-14-hard-ai-u 2,   // 只玩 Tier 1-2
  MP: 3,   // Tier 1-3
  CO: 3,   // Tier 1-3
  BTN: 4,  // Tier 1-4
  SB: 3,   // Tier 1-3
  BB: 5,   // 防守宽泛
};

/** 获取底牌的牌力等级 */
export function getPreflopTier(cards: Card[]): HandTier {
  const key = handKey(cards);
  return HAND_TIERS[key] ?? 5;
}

/** 判断底牌在当前位置是否可玩 */
export function isPlayable(cards: Card[], position: PositionLabel): boolean {
  const tier = getPreflopTier(cards);
  return tier <= POSITION_TIER_THRESHOLD[position];
}

/** 根据位置获取位置标签 */
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
  // 计算从 BB 到 BTN 之间的玩家数来确定 EP/MP/CO
  const afterBB = (dealerIndex - 1 + activePlayerCount) % activePlayerCount;
  let count = 0;
  let idx = (dealerIndex + 1) % activePlayerCount;
  while (idx !== afterBB) {
    count++;
    idx = (idx + 1) % activePlayerCount;
  }
  if (activePlayerCount <= 4) {
    return count <= 1 ? 'CO' : 'MP';
  }
  if (count <= 1) return 'CO';
  if (count <= 2) return 'MP';
  return 'EP';
}

/** 获取翻牌前建议动作 */
export function getPreflopAction(
  tier: HandTier,
  validActions: ActionType[],
  facingRaise: boolean,
  facingAllIn: boolean,
  potOdds: number,
): AIDecision | null {
  if (facingAllIn) {
    // 面对 all-in：仅 Tier 1-2 考虑跟注
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
    // 面对加注
    if (tier <= 1) {
      // Tier 1: 3-bet 或 call
      if (validActions.includes(ActionType.Raise)) {
        return { action: ActionType.Raise, amount: 0 }; // 金额由 betSizer 决定
      }
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

  // 无人加注
  if (tier <= 2) {
    if (validActions.includes(ActionType.Raise)) {
      return { action: ActionType.Raise, amount: 0 };
    }
  }
  if (tier <= 4) {
    if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
    if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
  }
  if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
  if (validActions.includes(ActionType.Fold)) return { action: ActionType.Fold };
  return null;
}
```

- [ ] **Step 2: 创建测试文件 `tests/ai/preflopTable.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { card } from '../ui/testUtils';
import { Suit, ActionType } from '../../src/engine/types';
import { getPreflopTier, isPlayable, getPositionLabel, getPreflopAction } from '../../src/ai/preflopTable';

describe('preflopTable', () => {
  describe('getPreflopTier', () => {
    it('AA 为 Tier 1', () => {
      expect(getPreflopTier([card(14, Suit.Hearts), card(14, Suit.Spades)])).toBe(1);
    });
    it('AKs 为 Tier 1', () => {
      expect(getPreflopTier([card(14, Suit.Hearts), card(13, Suit.Hearts)])).toBe(1);
    });
    it('AKo 为 Tier 1', () => {
      expect(getPreflopTier([card(14, Suit.Hearts), card(13, Suit.Spades)])).toBe(1);
    });
    it('72o 为 Tier 5', () => {
      expect(getPreflopTier([card(7, Suit.Hearts), card(2, Suit.Spades)])).toBe(5);
    });
    it('66 为 Tier 3', () => {
      expect(getPreflopTier([card(6, Suit.Hearts), card(6, Suit.Spades)])).toBe(3);
    });
  });

  describe('isPlayable', () => {
    it('EP 不能玩 66 (Tier 3 > EP 阈值 2)', () => {
      const cards = [card(6, Suit.Hearts), card(6, Suit.Spades)];
      expect(isPlayable(cards, 'EP')).toBe(false);
    });
    it('BTN 可以玩 66 (Tier 3 ≤ BTN 阈值 4)', () => {
      const cards = [card(6, Suit.Hearts), card(6, Suit.Spades)];
      expect(isPlayable(cards, 'BTN')).toBe(true);
    });
    it('EP 可以玩 QQ (Tier 1 ≤ EP 阈值 2)', () => {
      const cards = [card(12, Suit.Hearts), card(12, Suit.Spades)];
      expect(isPlayable(cards, 'EP')).toBe(true);
    });
  });

  describe('getPositionLabel', () => {
    // 6 人桌: 0=BTN, 1=SB, 2=BB, 3=UTG, 4=HJ, 5=CO
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
    it('关煞位 (6人桌)', () => {
      expect(getPositionLabel(5, 0, false, false, 6)).toBe('CO');
    });
  });

  describe('getPreflopAction', () => {
    it('Tier 1 无人加注时建议加注', () => {
      const result = getPreflopAction(1, [ActionType.Raise, ActionType.Call, ActionType.Fold], false, false, 0);
      expect(result?.action).toBe(ActionType.Raise);
    });
    it('Tier 3 面对加注且赔率好时跟注', () => {
      const result = getPreflopAction(3, [ActionType.Call, ActionType.Fold], true, false, 0.6);
      expect(result?.action).toBe(ActionType.Call);
    });
    it('Tier 5 建议弃牌', () => {
      const result = getPreflopAction(5, [ActionType.Fold], false, false, 0);
      expect(result?.action).toBe(ActionType.Fold);
    });
    it('Tier 2 面对 all-in 且赔率好时跟注', () => {
      const result = getPreflopAction(2, [ActionType.Call, ActionType.Fold], false, true, 0.5);
      expect(result?.action).toBe(ActionType.Call);
    });
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test 2>&1 | tail -15
```
Expected: 新增测试全部通过，现有测试无回归。

- [ ] **Step 4: 提交**

```bash
git add src/ai/preflopTable.ts tests/ai/preflopTable.test.ts
git commit -m "feat(ai): add pre-flop hand range table for hard AI"
```

---

### Task 3: 翻牌前范围表模块

**Files:**
- Create: `src/ai/preflopTable.ts`
- Create: `tests/ai/preflopTable.test.ts`

- [ ] **Step 1: 创建实现文件 `src/ai/preflopTable.ts`**

```typescript
import { Suit } from '../engine/types';
import type { Card } from '../engine/types';
import { ActionType } from '../engine/types';
import type { AIDecision, HandTier, PositionLabel } from './types';

// ── 牌力等级查找表 ──
// 使用 rank1-rank2-suit 作为 key。suited 加 's' 后缀。
// 169 hand combinations (13 × 13) + suited indicators

function handKey(cards: Card[]): string {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const suited = sorted[0].suit === sorted[1].suit;
  return `${sorted[0].rank}-${sorted[1].rank}${suited ? 's' : 'o'}`;
}

// Tier 1 (最强): AA, KK, QQ, JJ, AKs
// Tier 2 (强): AK, TT, AQs, AJs, KQs, 99
// Tier 3 (中等): AQo, ATs, KJs, QJs, JTs, 88, 77, AJo, KQo
// Tier 4 (可玩): ATo, KTo, QJo, JTo, 66, 55, 44, T9s, 98s, 87s, A9s-A2s, K9s, Q9s
// Tier 5 (垃圾): 其余

const TIER1 = new Set([
  '14-14o', '13-13o', '12-12o', '11-11o',   // AA, KK, QQ, JJ
  '14-13s',                                    // AKs
]);

const TIER2 = new Set([
  '14-13o',                                    // AKo (offsuit)
  '10-10o',                                    // TT
  '14-12s', '14-11s',                          // AQs, AJs
  '13-12s',                                    // KQs
  '9-9o',                                      // 99
]);

const TIER3 = new Set([
  '14-12o', '14-10o',                          // AQo, ATo
  '14-10s',                                    // ATs
  '13-11s',                                    // KJs
  '12-11s',                                    // QJs
  '11-10s',                                    // JTs
  '8-8o', '7-7o',                              // 88, 77
  '14-11o',                                    // AJo
  '13-12o',                                    // KQo
]);

const TIER4 = new Set([
  '14-10o',                                    // ATo
  '13-10o',                                    // KTo
  '12-11o',                                    // QJo
  '11-10o',                                    // JTo
  '6-6o', '5-5o', '4-4o',                      // 66, 55, 44
  '10-9s', '9-8s', '8-7s',                     // T9s, 98s, 87s
  '14-9s', '14-8s', '14-7s', '14-6s', '14-5s', '14-4s', '14-3s', '14-2s', // A2s-A9s
  '13-9s',                                      // K9s
  '12-9s',                                      // Q9s
]);

// 位置阈值：每个位置能玩的最高 Tier
const POSITION_TIER_THRESHOLD: Record<PositionLabel, number> = {
  EP: 2,   // 只玩 Tier 1-2
  MP: 3,   // Tier 1-3
  CO: 3,   // Tier 1-3
  BTN: 4,  // Tier 1-4
  SB: 3,   // Tier 1-3
  BB: 5,   // 防守宽泛
};

/** 获取底牌的牌力等级 */
export function getPreflopTier(cards: Card[]): HandTier {
  const key = handKey(cards);
  if (TIER1.has(key)) return 1;
  if (TIER2.has(key)) return 2;
  if (TIER3.has(key)) return 3;
  if (TIER4.has(key)) return 4;
  return 5;
}

/** 判断底牌在当前位置是否可玩 */
export function isPlayable(cards: Card[], position: PositionLabel): boolean {
  const tier = getPreflopTier(cards);
  return tier <= POSITION_TIER_THRESHOLD[position];
}

/** 根据位置获取位置标签 */
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
  // 计算从 BB 到 BTN 之间的玩家数来确定 EP/MP/CO
  const afterBB = (dealerIndex - 1 + activePlayerCount) % activePlayerCount;
  let count = 0;
  let idx = (dealerIndex + 1) % activePlayerCount;
  while (idx !== afterBB) {
    count++;
    idx = (idx + 1) % activePlayerCount;
  }
  if (activePlayerCount <= 4) {
    return count <= 1 ? 'CO' : 'MP';
  }
  if (count <= 1) return 'CO';
  if (count <= 2) return 'MP';
  return 'EP';
}

/** 获取翻牌前建议动作 */
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
      if (validActions.includes(ActionType.Raise)) {
        return { action: ActionType.Raise, amount: 0 };
      }
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

  // 无人加注
  if (tier <= 2) {
    if (validActions.includes(ActionType.Raise)) {
      return { action: ActionType.Raise, amount: 0 };
    }
  }
  if (tier <= 4) {
    if (validActions.includes(ActionType.Call)) return { action: ActionType.Call };
    if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
  }
  if (validActions.includes(ActionType.Check)) return { action: ActionType.Check };
  if (validActions.includes(ActionType.Fold)) return { action: ActionType.Fold };
  return null;
}
```

- [ ] **Step 2: 创建测试文件 `tests/ai/preflopTable.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { Suit, ActionType } from '../../src/engine/types';
import { getPreflopTier, isPlayable, getPositionLabel, getPreflopAction } from '../../src/ai/preflopTable';

function card(rank: number, suit: Suit) {
  return { rank, suit };
}

describe('preflopTable', () => {
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
    it('72o 为 Tier 5', () => {
      expect(getPreflopTier([card(7, Suit.Hearts), card(2, Suit.Spades)])).toBe(5);
    });
    it('66 为 Tier 4', () => {
      expect(getPreflopTier([card(6, Suit.Hearts), card(6, Suit.Spades)])).toBe(4);
    });
  });

  describe('isPlayable', () => {
    it('EP 不能玩 66 (Tier 4 > EP 阈值 2)', () => {
      const cards = [card(6, Suit.Hearts), card(6, Suit.Spades)];
      expect(isPlayable(cards, 'EP')).toBe(false);
    });
    it('BTN 可以玩 66 (Tier 4 ≤ BTN 阈值 4)', () => {
      const cards = [card(6, Suit.Hearts), card(6, Suit.Spades)];
      expect(isPlayable(cards, 'BTN')).toBe(true);
    });
    it('EP 可以玩 JJ (Tier 1 ≤ EP 阈值 2)', () => {
      const cards = [card(11, Suit.Hearts), card(11, Suit.Spades)];
      expect(isPlayable(cards, 'EP')).toBe(true);
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
    it('关煞位 (6人桌)', () => {
      expect(getPositionLabel(5, 0, false, false, 6)).toBe('CO');
    });
  });

  describe('getPreflopAction', () => {
    it('Tier 1 无人加注时建议加注', () => {
      const result = getPreflopAction(1, [ActionType.Raise, ActionType.Call, ActionType.Fold], false, false, 0);
      expect(result?.action).toBe(ActionType.Raise);
    });
    it('Tier 3 面对加注且赔率好时跟注', () => {
      const result = getPreflopAction(3, [ActionType.Call, ActionType.Fold], true, false, 0.6);
      expect(result?.action).toBe(ActionType.Call);
    });
    it('Tier 5 建议弃牌', () => {
      const result = getPreflopAction(5, [ActionType.Fold], false, false, 0);
      expect(result?.action).toBe(ActionType.Fold);
    });
    it('Tier 2 面对 all-in 且赔率好时跟注', () => {
      const result = getPreflopAction(2, [ActionType.Call, ActionType.Fold], false, true, 0.5);
      expect(result?.action).toBe(ActionType.Call);
    });
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test 2>&1 | tail -15
```
Expected: 新增测试全部通过，现有测试无回归。

- [ ] **Step 4: 提交**

```bash
git add src/ai/preflopTable.ts tests/ai/preflopTable.test.ts
git commit -m "feat(ai): add pre-flop hand range table for hard AI"
```

---

### Task 4: 下注额策略模块

**Files:**
- Create: `src/ai/betSizer.ts`
- Create: `tests/ai/betSizer.test.ts`

- [ ] **Step 1: 创建实现文件 `src/ai/betSizer.ts`**

```typescript
import type { BoardTexture } from './types';

export interface BetSizeParams {
  /** 当前底池大小 */
  potSize: number;
  /** 玩家剩余筹码 */
  stackSize: number;
  /** 当前最高下注额 (maxBet) */
  maxBet: number;
  /** 玩家当前下注额 */
  currentBet: number;
  /** 最小加注额 (minRaise) */
  minRaise: number;
  /** 玩家手牌强度值 (handResult.value) */
  handValue: number;
  /** 牌面湿润度 */
  boardTexture: BoardTexture;
  /** 下注意图 */
  intention: 'value' | 'bluff' | 'semiBluff';
  /** 对手 fold to CBet 率 (0-1)，仅持续下注时使用 */
  opponentFoldCBet?: number;
}

/**
 * 计算下注额。
 * 翻牌后使用底池比例，翻牌前使用大盲注倍数。
 * 返回总下注额（含已有下注）。
 */
export function calculateBetSize(params: BetSizeParams): number {
  const { potSize, stackSize, maxBet, currentBet, minRaise,
          intention, boardTexture, opponentFoldCBet } = params;

  // 如果筹码太少，直接简化
  if (stackSize <= minRaise) {
    return currentBet + stackSize; // All-In
  }

  // 计算期望的加注额（不含已有下注）
  let desiredAdditional: number;

  if (intention === 'bluff') {
    // 诈唬用小注
    const factor = opponentFoldCBet && opponentFoldCBet > 0.6 ? 0.5 : 0.33;
    desiredAdditional = Math.max(potSize * factor, minRaise);
  } else if (boardTexture === 'wet') {
    // 湿润牌面加大注保护
    desiredAdditional = intention === 'value' ? potSize * 0.75 : potSize * 0.6;
  } else if (boardTexture === 'dry') {
    // 干燥牌面中小注
    desiredAdditional = intention === 'value' ? potSize * 0.5 : potSize * 0.33;
  } else {
    desiredAdditional = potSize * 0.5;
  }

  // 转为总下注额
  let totalBet = currentBet + Math.round(desiredAdditional / 10) * 10;
  totalBet = Math.max(totalBet, currentBet + minRaise);
  totalBet = Math.min(totalBet, currentBet + stackSize);

  return totalBet;
}

/**
 * 计算翻牌前加注额（基于 BB 倍数）。
 */
export function calculatePreflopBetSize(
  blindsSize: number,
  currentBet: number,
  stackSize: number,
  raisesFaced: number,
): number {
  if (stackSize <= blindsSize * 3) {
    return currentBet + stackSize; // All-In
  }

  let multiplier: number;
  if (raisesFaced === 0) {
    multiplier = 3; // 开池 3BB
  } else if (raisesFaced === 1) {
    multiplier = 3.5; // 3-bet: 3.5x
  } else {
    multiplier = 2.5; // 4-bet+: 2.5x
  }

  const desired = Math.round((blindsSize * multiplier) / 10) * 10;
  const totalBet = currentBet + Math.max(desired, currentBet);
  return Math.min(totalBet, currentBet + stackSize);
}
```

- [ ] **Step 2: 创建测试文件 `tests/ai/betSizer.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateBetSize, calculatePreflopBetSize } from '../../src/ai/betSizer';

describe('betSizer', () => {
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
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test 2>&1 | tail -15
```
Expected: 新增测试全部通过，现有测试无回归。

- [ ] **Step 4: 提交**

```bash
git add src/ai/betSizer.ts tests/ai/betSizer.test.ts
git commit -m "feat(ai): add bet sizing module for hard AI"
```

---

### Task 5: 接入对手画像到 Store

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/hooks/useGameLoop.ts`

- [ ] **Step 1: 在 gameStore.ts 中集成对手画像更新**

导入全局 tracker 并在 `nextHand()` 中触发更新。关键是要从 state 中获取每手牌结束后各玩家的行动统计。

在 `src/store/gameStore.ts` 顶部添加导入：

```typescript
import { globalTracker } from '../ai/opponentModel';
```

在 `nextHand()` 的 `startGame` → `set(...)` 调用之前，添加对手画像更新逻辑。在 `nextHand()` 方法中，构建 handRecord 之后，调用 `startHand(preppedState)` 之前插入：

```typescript
// 更新对手画像：通知 tracker 每手牌结束
for (const player of state.players) {
  if (player.isAI) {
    const sawFlop = state.communityCards.length >= 3;
    const sawShowdown = state.handComplete && !player.folded && !player.isOut;
    const wasVoluntary = player.totalBet > (player.isSmallBlind ? state.smallBlind : 0) ||
                         player.totalBet > (player.isBigBlind ? state.bigBlind : 0);
    globalTracker.recordHandResult(player.id, { sawFlop, sawShowdown, wasVoluntary });
  }
}
```

并在 `startGame()` 中调用 `globalTracker.reset()`，在 `set({...})` 之前：

```typescript
startGame: (config: GameConfig) => {
  globalTracker.reset(); // 新游戏清除旧数据
  ...
}
```

- [ ] **Step 2: 编译检查**

```bash
npx tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: 运行全部测试**

```bash
npm test 2>&1 | tail -10
```
Expected: 14 个测试全部通过（现有测试不会触及 AI 模块的 store 变更）。

- [ ] **Step 4: 提交**

```bash
git add src/store/gameStore.ts
git commit -m "feat(ai): integrate opponent profile tracker into game store"
```

---

### Task 6: 重写 Hard AI 三层决策引擎

**Files:**
- Modify: `src/ai/hard.ts`（重写）
- Modify: `src/hooks/useGameLoop.ts`（增大 THINK_DELAY 给 Hard AI 更多时间）

- [ ] **Step 1: 创建新的三层 Hard AI 引擎**

完全重写 `src/ai/hard.ts`：

```typescript
import { ActionType, Round } from '../engine/types';
import type { GameState, Card } from '../engine/types';
import type { AIDecision, AILevel, BoardTexture } from './types';
import * as evaluator from '../engine/evaluator';
import * as deckUtils from '../engine/deck';
import { getValidActions } from '../game';
import { globalTracker } from './opponentModel';
import { getPreflopTier, getPositionLabel, getPreflopAction } from './preflopTable';
import { calculateBetSize, calculatePreflopBetSize } from './betSizer';

// ── 工具函数 ──

function getPlayer(state: GameState, playerId: number) {
  return state.players[playerId];
}

function isValidAction(action: ActionType, validActions: ActionType[]): boolean {
  return validActions.includes(action);
}

/** 判断牌面湿润度 */
function getBoardTexture(communityCards: Card[]): BoardTexture {
  if (communityCards.length < 3) return 'none';
  const isPaired = communityCards.some((c, i) =>
    communityCards.some((c2, j) => i !== j && c.rank === c2.rank),
  );
  if (isPaired) return 'paired';
  // 湿润判断：有同花听牌可能或顺子听牌可能
  const flushPossible = communityCards.filter(c => c.suit === communityCards[0].suit).length >= 3;
  const sortedRanks = [...new Set(communityCards.map(c => c.rank))].sort((a, b) => a - b);
  let straightPossible = false;
  for (let i = 2; i < sortedRanks.length; i++) {
    if (sortedRanks[i] - sortedRanks[i - 2] <= 4) { straightPossible = true; break; }
  }
  if (straightPossible || flushPossible) return 'wet';
  return 'dry';
}

/** 检查是否坚果 */
function isNuts(state: GameState, playerId: number): boolean {
  const player = getPlayer(state, playerId);
  if (!player || state.communityCards.length < 3) return false;
  const result = evaluator.evaluateHand([...player.holeCards, ...state.communityCards]);
  return result.rank >= 8; // 同花顺或皇家同花顺
}

/** 检查是否坚果同花 */
function isNutFlush(state: GameState, playerId: number): boolean {
  const player = getPlayer(state, playerId);
  if (!player || state.communityCards.length < 3) return false;
  const result = evaluator.evaluateHand([...player.holeCards, ...state.communityCards]);
  return result.rank === 5; // 同花
}

// ── 第1层：启发式快判 ──

function layer1Heuristic(
  state: GameState, playerId: number, validActions: ActionType[],
): AIDecision | null {
  const player = getPlayer(state, playerId);
  if (!player) return { action: ActionType.Fold };

  // 短筹码（<10BB）→ 推/弃
  const bbSize = state.bigBlind;
  if (player.chips <= bbSize * 10) {
    const handResult = state.communityCards.length >= 3
      ? evaluator.evaluateHand([...player.holeCards, ...state.communityCards])
      : null;
    if (handResult && handResult.rank >= 2 && isValidAction(ActionType.AllIn, validActions)) {
      return { action: ActionType.AllIn };
    }
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
  }

  // 坚果/几乎坚果 → 加注/All-In
  if (isNuts(state, playerId)) {
    if (isValidAction(ActionType.AllIn, validActions)) return { action: ActionType.AllIn };
    if (isValidAction(ActionType.Raise, validActions)) return { action: ActionType.Raise, amount: 0 };
  }

  // 坚果同花 → 大注
  if (isNutFlush(state, playerId) && isValidAction(ActionType.Raise, validActions)) {
    return { action: ActionType.Raise, amount: 0 };
  }

  // 免费看牌机会 → Check
  if (isValidAction(ActionType.Check, validActions)) {
    // 有弱牌且可 Check → Check
    const handResult = state.communityCards.length >= 3
      ? evaluator.evaluateHand([...player.holeCards, ...state.communityCards])
      : null;
    if (!handResult || handResult.rank <= 1) {
      return { action: ActionType.Check };
    }
  }

  // 翻牌前 → 使用范围表
  if (state.currentRound === Round.Preflop) {
    const position = getPositionLabel(
      playerId, state.dealerIndex,
      player.isSmallBlind, player.isBigBlind,
      state.players.filter(p => !p.isOut).length,
    );
    const tier = getPreflopTier(player.holeCards);
    const facingRaise = state.maxBet > (player.isBigBlind ? state.bigBlind : 0);
    const facingAllIn = state.players.some(p => p.isAllIn && p.id !== playerId);
    const callAmount = state.maxBet - player.currentBet;
    const potOdds = state.pot / (state.pot + callAmount);

    const action = getPreflopAction(tier, validActions, facingRaise, facingAllIn, potOdds);
    if (action) return action;
  }

  return null; // 无法决定，降级到第2层
}

// ── 第2层：对手范围推演 ──

function layer2RangeInference(
  state: GameState, playerId: number, validActions: ActionType[],
): AIDecision | null {
  const player = getPlayer(state, playerId);
  if (!player) return { action: ActionType.Fold };

  // 评估自己的手牌
  const allCards = [...player.holeCards, ...state.communityCards];
  const handResult = evaluator.evaluateHand(allCards);
  const isPreflop = state.currentRound === Round.Preflop;

  if (isPreflop) return null; // 翻牌前已由第1层处理

  // 读取对手画像
  const opponents = state.players.filter(p => !p.folded && !p.isOut && p.id !== playerId);
  const profiles = opponents.map(p => ({
    player: p,
    profile: globalTracker.getProfile(p.id),
  }));

  // 计算底池赔率
  const callAmount = state.maxBet - player.currentBet;
  const potOdds = callAmount > 0 ? callAmount / (state.pot + callAmount) : 0;
  const potOddsPercent = callAmount > 0 ? (state.pot + callAmount > 0 ? callAmount / (state.pot + callAmount) : 1) : 0;

  // 底池赔率驱动的快判
  if (handResult.rank >= 4) {
    // 顺子/同花+ → +EV 几乎总是
    return null; // 交给第3层决定加注额
  }

  if (handResult.rank >= 2 && callAmount === 0 && isValidAction(ActionType.Check, validActions)) {
    // 两对以上，可过牌 → 过牌（引诱诈唬或免费听牌）
    return null; // 交第3层
  }

  if (handResult.rank >= 1 && potOddsPercent < 0.25 && isValidAction(ActionType.Call, validActions)) {
    // 一对以上，赔率好 → 跟注
    return { action: ActionType.Call };
  }

  if (handResult.rank === 0 && potOddsPercent > 0.35) {
    // 高牌，赔率差 → 弃牌
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
  }

  // 对方高 foldToCBet → 可以用持续下注诈唬
  const highFoldCBet = profiles.some(p => p.profile.totalHands > 2 && p.profile.foldToCBet > 0.6);
  if (highFoldCBet && callAmount === 0 && isValidAction(ActionType.Raise, validActions)) {
    return { action: ActionType.Raise, amount: 0 };
  }

  return null; // 降级到第3层
}

// ── 第3层：MC强化模拟 ──

function layer3MCSimulation(
  state: GameState, playerId: number, validActions: ActionType[],
): AIDecision {
  const player = getPlayer(state, playerId);
  if (!player) return { action: ActionType.Fold };

  const timeBudgetMs = 1500; // 1.5 秒
  const startTime = performance.now();
  const isPreflop = state.currentRound === Round.Preflop;

  if (isPreflop) {
    // 翻牌前不应进入第3层，兜底
    if (isValidAction(ActionType.Check, validActions)) return { action: ActionType.Check };
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
    return { action: ActionType.Fold };
  }

  // 评估当前手牌
  const currentResult = evaluator.evaluateHand([...player.holeCards, ...state.communityCards]);

  // 对每种可选动作模拟 EV
  interface ActionEV { action: ActionType; amount?: number; ev: number }
  const results: ActionEV[] = [];

  for (const action of validActions) {
    if (action === ActionType.Fold) {
      results.push({ action, ev: 0 }); // Fold = 0 EV
      continue;
    }

    let simCount = 0;
    let totalEV = 0;
    const maxSims = action === ActionType.AllIn ? 500 : 3000;

    while (simCount < maxSims) {
      if (performance.now() - startTime > timeBudgetMs) break;

      // 模拟发牌
      const deck = deckUtils.createDeck().filter(
        c => ![...player.holeCards, ...state.communityCards].some(
          k => k.suit === c.suit && k.rank === c.rank,
        ),
      );
      const shuffled = deckUtils.shuffleDeck(deck);
      let idx = 0;

      const totalCommunity = [...state.communityCards];
      const remaining = 5 - totalCommunity.length;
      if (shuffled.length < remaining + (state.players.filter(p => !p.folded && !p.isOut && p.id !== playerId).length * 2)) continue;

      for (let j = 0; j < remaining; j++) totalCommunity.push(shuffled[idx++]);

      const playerResult = evaluator.evaluateHand([...player.holeCards, ...totalCommunity]);
      let bestOpponentValue = -1;

      for (const opp of state.players.filter(p => !p.folded && !p.isOut && p.id !== playerId)) {
        const oppCards = [shuffled[idx++], shuffled[idx++]];
        const oppResult = evaluator.evaluateHand([...oppCards, ...totalCommunity]);
        bestOpponentValue = Math.max(bestOpponentValue, oppResult.value);
      }

      // 计算该动作的 EV
      let actionEV = 0;
      const potAfterAction = state.pot + (action === ActionType.Call ? state.maxBet - player.currentBet : 0);

      if (playerResult.value >= bestOpponentValue) {
        actionEV = potAfterAction; // 赢下底池
      }

      totalEV += actionEV;
      simCount++;
    }

    if (simCount > 0) {
      results.push({ action, ev: totalEV / simCount });
    }
  }

  if (results.length === 0) {
    if (isValidAction(ActionType.Check, validActions)) return { action: ActionType.Check };
    if (isValidAction(ActionType.Fold, validActions)) return { action: ActionType.Fold };
    return { action: ActionType.Fold };
  }

  // 选择 EV 最高的动作
  results.sort((a, b) => b.ev - a.ev);
  const best = results[0];

  // 10% 策略扰动：有时选择次优动作防止被读牌
  if (results.length > 1 && Math.random() < 0.1) {
    const second = results[1];
    if (second.ev >= best.ev * 0.85) {
      return buildFinalAction(state, playerId, second.action, validActions, currentResult);
    }
  }

  return buildFinalAction(state, playerId, best.action, validActions, currentResult);
}

/** 构建最终动作（加注时填入金额） */
function buildFinalAction(
  state: GameState, playerId: number, action: ActionType,
  validActions: ActionType[], handResult: { rank: number; value: number },
): AIDecision {
  if (action !== ActionType.Raise && action !== ActionType.AllIn) {
    return { action };
  }

  if (action === ActionType.AllIn) {
    return { action: ActionType.AllIn };
  }

  const player = getPlayer(state, playerId)!;
  const isPreflop = state.currentRound === Round.Preflop;

  if (isPreflop) {
    const raiseCount = state.lastActionPlayerIndex >= 0 ? 1 : 0; // 简化
    const amount = calculatePreflopBetSize(
      state.bigBlind, player.currentBet, player.chips, raiseCount,
    );
    return { action: ActionType.Raise, amount };
  }

  const boardTexture = getBoardTexture(state.communityCards);
  const intention =
    handResult.rank >= 4 ? 'value' :
    handResult.rank >= 2 ? 'semiBluff' : 'bluff';

  // 检查是否能加注
  if (!isValidAction(ActionType.Raise, validActions)) {
    return { action };
  }

  const amount = calculateBetSize({
    potSize: state.pot,
    stackSize: player.chips,
    maxBet: state.maxBet,
    currentBet: player.currentBet,
    minRaise: state.minRaise,
    handValue: handResult.value,
    boardTexture,
    intention,
    opponentFoldCBet: globalTracker.getProfile(playerId).foldToCBet,
  });

  return { action: ActionType.Raise, amount };
}

// ── 主入口 ──

export const hardAI: AILevel = {
  name: '困难',
  description: '高级策略，蒙特卡洛模拟',
  makeDecision: (state: GameState, playerId: number): AIDecision => {
    const player = getPlayer(state, playerId);
    if (!player) return { action: ActionType.Fold };
    const validActions = getValidActions(state, playerId);
    if (validActions.length === 0) return { action: ActionType.Fold };

    // 记录对手行动到画像（对手行动时由 useGameLoop 调用）
    // AI 自己决策时不记录自己的行动

    // 第1层：启发式快判
    const l1 = layer1Heuristic(state, playerId, validActions);
    if (l1) {
      // 第1层返回的 Raise 需要填入金额
      if (l1.action === ActionType.Raise && l1.amount === 0) {
        return buildFinalAction(state, playerId, ActionType.Raise, validActions,
          evaluator.evaluateHand([...player.holeCards, ...state.communityCards]));
      }
      return l1;
    }

    // 第2层：对手范围推演
    const l2 = layer2RangeInference(state, playerId, validActions);
    if (l2) {
      if (l2.action === ActionType.Raise && l2.amount === 0) {
        return buildFinalAction(state, playerId, ActionType.Raise, validActions,
          evaluator.evaluateHand([...player.holeCards, ...state.communityCards]));
      }
      return l2;
    }

    // 第3层：MC 强化模拟
    return layer3MCSimulation(state, playerId, validActions);
  },
};
```

- [ ] **Step 2: 增大 useGameLoop 中 Hard AI 的思考时间**

打开 `src/hooks/useGameLoop.ts`，修改 AI 决策延迟判断：

找到 `const THINK_DELAY = 1200;`，改为根据难度动态调整：

```typescript
import { useGameStore } from '../store/gameStore';
// ... 在 useGameLoop 函数内
const config = useGameStore((s) => s.config);
const isHardAI = config?.difficulty === Difficulty.Hard;
// ...
// 在 setTimeout 处:
timeoutRef.current = setTimeout(() => {
  // ...
}, isHardAI ? 2500 : THINK_DELAY);
```

具体修改：

```typescript
let THINK_DELAY = 1200;

// 在 useGameLoop 内，timeoutRef.current = setTimeout 之前：
const isHardAI = config?.difficulty === Difficulty.Hard;
const delay = isHardAI ? 2500 : THINK_DELAY;

timeoutRef.current = setTimeout(() => {
  // ...原有逻辑...
}, delay);
```

- [ ] **Step 3: 编译检查**

```bash
npx tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 4: 运行全部测试**

```bash
npm test 2>&1 | tail -10
```
Expected: 14 个测试全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/ai/hard.ts src/hooks/useGameLoop.ts
git commit -m "feat(ai): rewrite hard AI with three-layer decision engine"
```

---

### Task 7: 最终检查

- [ ] **Step 1: 完整编译检查**

```bash
npx tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 2: 完整测试套件**

```bash
npm test 2>&1
```
Expected: 全部测试 (14 + 新增) 通过。

- [ ] **Step 3: 最终提交**

```bash
git add -A
git status
git commit -m "feat(ai): complete hard AI upgrade with adaptive three-layer engine

- Add opponent profile tracker (VPIP/PFR/AF/FoldCBet/WTSD)
- Add pre-flop hand range table with position awareness
- Add proportional bet sizing module
- Rewrite hard AI with 3-layer decision: heuristic → range inference → MC simulation
- Integrate opponent tracking into game store lifecycle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```