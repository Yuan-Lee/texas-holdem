import { ActionType } from '../engine/types';
import type { OpponentProfile } from './types';

interface HandResultFlags {
  sawFlop: boolean;
  sawShowdown: boolean;
  wasVoluntary: boolean;
}

interface PlayerStats {
  /** 手牌数 */
  hands: number;
  /** VPIP = 主动入池手数 / 总手数 */
  voluntaryHands: number;
  /** PFR = 翻牌前加注手数 / 总手数 */
  preflopRaiseHands: number;
  /** 翻牌后加注/全押次数（用于AF） */
  postflopAggressive: number;
  /** 翻牌后跟注次数（用于AF） */
  postflopPassive: number;
  /** 面对持续下注的次数 */
  cBetFaced: number;
  /** 面对持续下注弃牌次数 */
  cBetFolded: number;
  /** 看到翻牌的手数（用于WTSD） */
  flopSeen: number;
  /** 看到摊牌的手数（用于WTSD） */
  showdownSeen: number;
  /** 本手牌是否在翻牌前有主动行动 */
  hasPreflopAction: boolean;
}

export class ProfileTracker {
  private stats: Map<number, PlayerStats> = new Map();

  private getStats(playerId: number): PlayerStats {
    let s = this.stats.get(playerId);
    if (!s) {
      s = {
        hands: 0,
        voluntaryHands: 0,
        preflopRaiseHands: 0,
        postflopAggressive: 0,
        postflopPassive: 0,
        cBetFaced: 0,
        cBetFolded: 0,
        flopSeen: 0,
        showdownSeen: 0,
        hasPreflopAction: false,
      };
      this.stats.set(playerId, s);
    }
    return s;
  }

  /** 标记一手牌开始（重置手牌级标记） */
  recordHandStart(playerId: number): void {
    const s = this.getStats(playerId);
    s.hasPreflopAction = false;
  }

  /** 记录翻牌前行动 */
  recordPreflopAction(playerId: number, action: ActionType): void {
    const s = this.getStats(playerId);
    s.hasPreflopAction = true;
    if (action === ActionType.Raise || action === ActionType.AllIn) {
      s.preflopRaiseHands++;
    }
  }

  /** 记录翻牌后行动（用于AF） */
  recordPostflopAction(playerId: number, action: ActionType): void {
    const s = this.getStats(playerId);
    if (action === ActionType.Raise || action === ActionType.AllIn) {
      s.postflopAggressive++;
    } else if (action === ActionType.Call) {
      s.postflopPassive++;
    }
  }

  /** 记录手牌结果 */
  recordHandResult(playerId: number, flags: HandResultFlags): void {
    const s = this.getStats(playerId);
    s.hands++;
    if (flags.wasVoluntary) {
      s.voluntaryHands++;
    }
    if (flags.sawFlop) {
      s.flopSeen++;
      if (flags.sawShowdown) {
        s.showdownSeen++;
      }
    }
  }

  /** 记录面对持续下注的反应 */
  recordFacingCBet(playerId: number, folded: boolean): void {
    const s = this.getStats(playerId);
    s.cBetFaced++;
    if (folded) {
      s.cBetFolded++;
    }
  }

  /** 获取对手画像 */
  getProfile(playerId: number): OpponentProfile {
    const s = this.stats.get(playerId);
    if (!s) {
      return {
        vpip: 0,
        pfr: 0,
        af: 0,
        foldToCBet: 0,
        wtsd: 0,
        totalHands: 0,
      };
    }

    const af = s.postflopPassive > 0
      ? s.postflopAggressive / s.postflopPassive
      : 0;

    return {
      vpip: s.hands > 0 ? s.voluntaryHands / s.hands : 0,
      pfr: s.hands > 0 ? s.preflopRaiseHands / s.hands : 0,
      af,
      foldToCBet: s.cBetFaced > 0 ? s.cBetFolded / s.cBetFaced : 0,
      wtsd: s.flopSeen > 0 ? s.showdownSeen / s.flopSeen : 0,
      totalHands: s.hands,
    };
  }

  /** 重置所有数据 */
  reset(): void {
    this.stats.clear();
  }
}

/** 全局单例 */
export const globalTracker = new ProfileTracker();