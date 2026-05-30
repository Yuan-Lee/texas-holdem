import type { GameState, Player } from '../engine/types';
import { Round, ActionType, Difficulty } from '../engine/types';
import type { HandResult } from '../engine/types';
import * as evaluator from '../engine/evaluator';
import * as deckUtils from '../engine/deck';
import {
  DEFAULT_STARTING_CHIPS,
  DEFAULT_SMALL_BLIND,
  DEFAULT_BIG_BLIND,
  DEFAULT_MIN_RAISE,
} from '../engine/constants';

export function createGame(playerCount: number, difficulty: Difficulty, startingChips: number = DEFAULT_STARTING_CHIPS, playerName: string = ''): GameState {
  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: i === 0 ? (playerName || '玩家') : `AI ${i}`,
      chips: startingChips,
      holeCards: [],
      currentBet: 0,
      totalBet: 0,
      folded: false,
      isAllIn: false,
      isOut: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isAI: i !== 0,
    });
  }

  const gameState: GameState = {
    players,
    deck: deckUtils.shuffleDeck(deckUtils.createDeck()),
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentRound: Round.Preflop,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlind: DEFAULT_SMALL_BLIND,
    bigBlind: DEFAULT_BIG_BLIND,
    minRaise: DEFAULT_MIN_RAISE,
    maxBet: DEFAULT_BIG_BLIND,
    lastActionPlayerIndex: -1,
    firstToActIndex: 0,
    roundComplete: false,
    handComplete: false,
    winners: [],
  };

  return gameState;
}

function findNextNonOut(players: Player[], startIndex: number): number {
  for (let i = 0; i < players.length; i++) {
    const idx = (startIndex + i) % players.length;
    if (!players[idx].isOut) return idx;
  }
  return -1;
}

export function startHand(state: GameState): GameState {
  const newState = { ...state };
  const deck = deckUtils.shuffleDeck(deckUtils.createDeck());

  for (let i = 0; i < newState.players.length; i++) {
    const player = newState.players[i];
    player.holeCards = [];
    player.currentBet = 0;
    player.totalBet = 0;
    player.folded = false;
    player.isAllIn = false;
    player.handRank = undefined;
  }

  newState.deck = deck;
  newState.communityCards = [];
  newState.pot = 0;
  newState.sidePots = [];
  newState.currentRound = Round.Preflop;
  newState.roundComplete = false;
  newState.handComplete = false;
  newState.winners = [];
  newState.maxBet = 0;
  newState.lastActionPlayerIndex = -1;
  newState.firstToActIndex = 0;

  // 跳过已出局玩家旋转庄家
  const totalPlayers = newState.players.length;
  let attempts = 0;
  while (newState.players[newState.dealerIndex].isOut && attempts < totalPlayers) {
    newState.dealerIndex = (newState.dealerIndex + 1) % totalPlayers;
    attempts++;
  }
  // 正常轮转：指向下一个非出局玩家
  newState.dealerIndex = (newState.dealerIndex + 1) % totalPlayers;
  attempts = 0;
  while (newState.players[newState.dealerIndex].isOut && attempts < totalPlayers) {
    newState.dealerIndex = (newState.dealerIndex + 1) % totalPlayers;
    attempts++;
  }

  for (const player of newState.players) {
    player.isDealer = false;
    player.isSmallBlind = false;
    player.isBigBlind = false;
  }
  newState.players[newState.dealerIndex].isDealer = true;

  const activePlayerCount = newState.players.filter(player => !player.isOut).length;
  const sbIndex = activePlayerCount === 2
    ? newState.dealerIndex
    : findNextNonOut(newState.players, newState.dealerIndex + 1);
  const bbIndex = findNextNonOut(newState.players, sbIndex + 1);

  const sbPlayer = newState.players[sbIndex];
  const bbPlayer = newState.players[bbIndex];

  sbPlayer.isSmallBlind = true;
  bbPlayer.isBigBlind = true;

  const sbAmount = Math.min(newState.smallBlind, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;

  const bbAmount = Math.min(newState.bigBlind, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;

  newState.maxBet = bbAmount;
  newState.minRaise = newState.bigBlind;

  // 仅给非出局玩家发牌
  let cards = [...deck];
  for (const player of newState.players) {
    if (player.isOut) continue;
    const dealResult = deckUtils.dealCards(cards, 2);
    player.holeCards = dealResult.cards;
    cards = dealResult.remainingDeck;
  }
  newState.deck = cards;

  newState.currentPlayerIndex = getNextActivePlayer(newState, bbIndex);
  if (newState.currentPlayerIndex === -1) {
    return advanceRound(newState);
  }
  newState.firstToActIndex = newState.currentPlayerIndex;

  return newState;
}

export function performAction(state: GameState, action: ActionType, amount: number = 0): GameState {
  const newState = { ...state };
  const player = newState.players[newState.currentPlayerIndex];
  const validActions = getValidActions(newState, newState.currentPlayerIndex);

  if (!player || !validActions.includes(action)) {
    return state;
  }

  const previousMaxBet = newState.maxBet;

  switch (action) {
    case ActionType.Fold:
      player.folded = true;
      break;

    case ActionType.Check:
      break;

    case ActionType.Call: {
      const callAmount = newState.maxBet - player.currentBet;
      if (callAmount > 0) {
        const actualCall = Math.min(callAmount, player.chips);
        player.chips -= actualCall;
        player.currentBet += actualCall;
        if (player.chips === 0 && !player.isAllIn) {
          player.isAllIn = true;
        }
      }
      break;
    }

    case ActionType.Raise: {
      if (!isLegalRaise(newState, player, amount)) {
        return state;
      }

      const raiseAmount = amount - player.currentBet;
      player.chips -= raiseAmount;
      player.currentBet = amount;
      const raiseIncrement = player.currentBet - previousMaxBet;
      newState.maxBet = player.currentBet;
      newState.minRaise = raiseIncrement;
      newState.firstToActIndex = newState.currentPlayerIndex;
      if (player.chips === 0 && !player.isAllIn) {
        player.isAllIn = true;
      }
      break;
    }

    case ActionType.AllIn: {
      const allInAmount = player.chips;
      player.chips = 0;
      player.currentBet += allInAmount;
      player.isAllIn = true;
      if (player.currentBet > newState.maxBet) {
        const raiseIncrement = player.currentBet - previousMaxBet;
        newState.maxBet = player.currentBet;
        if (raiseIncrement >= newState.minRaise) {
          newState.minRaise = raiseIncrement;
          newState.firstToActIndex = newState.currentPlayerIndex;
        }
      }
      break;
    }
  }

  newState.lastActionPlayerIndex = newState.currentPlayerIndex;
  newState.currentPlayerIndex = getNextActivePlayer(newState, newState.currentPlayerIndex);

  if (newState.currentPlayerIndex === -1 || isRoundComplete(newState)) {
    return advanceRound(newState);
  }

  return newState;
}

export function isRoundComplete(state: GameState): boolean {
  const remainingPlayers = state.players.filter(p => !p.folded && !p.isOut);
  const activePlayers = remainingPlayers.filter(p => !p.isAllIn);

  if (remainingPlayers.length <= 1) {
    return true;
  }

  if (activePlayers.length === 0) {
    return true;
  }

  // 所有活跃玩家的下注额必须匹配
  const allMatched = activePlayers.every(p => p.currentBet === state.maxBet);
  if (!allMatched) return false;

  // 还没有任何行动
  if (state.lastActionPlayerIndex === -1) return false;

  // 检查是否行动已经绕完一圈回到起始玩家
  // 当前 currentPlayerIndex 是下一个要行动的玩家
  // 如果下一个玩家等于本轮第一个行动的玩家，说明所有人都行动了一轮
  const nextToAct = state.currentPlayerIndex;

  // 检查 firstToActIndex 玩家是否仍然活跃
  // 如果该玩家在本轮中弃牌/AllIn/出局，则永远无法绕回他
  const firstToActPlayer = state.players[state.firstToActIndex];
  const firstToActActive = firstToActPlayer && !firstToActPlayer.folded && !firstToActPlayer.isAllIn && !firstToActPlayer.isOut;

  if (firstToActActive) {
    return nextToAct === state.firstToActIndex;
  }

  // firstToAct 已不活跃，以顺位第一个活跃玩家作为替代目标
  const effectiveFirst = getNextActivePlayer(state, state.firstToActIndex - 1);
  if (effectiveFirst === -1) return true;
  return nextToAct === effectiveFirst;
}

export function advanceRound(state: GameState): GameState {
  const newState = { ...state };

  const nextRoundMap: Record<Round, Round> = {
    [Round.Preflop]: Round.Flop,
    [Round.Flop]: Round.Turn,
    [Round.Turn]: Round.River,
    [Round.River]: Round.Showdown,
    [Round.Showdown]: Round.Showdown,
  };

  while (true) {
    if (newState.currentRound === Round.Showdown) {
      return showdown(newState);
    }

    // 推进到下一个 round
    newState.currentRound = nextRoundMap[newState.currentRound];

    if (newState.currentRound === Round.Showdown) {
      return showdown(newState);
    }

    // 发公共牌
    if (newState.currentRound === Round.Flop) {
      const { cards, remainingDeck } = deckUtils.dealCards(newState.deck, 3);
      newState.communityCards = cards;
      newState.deck = remainingDeck;
    } else if (newState.currentRound === Round.Turn || newState.currentRound === Round.River) {
      const { cards, remainingDeck } = deckUtils.dealCards(newState.deck, 1);
      newState.communityCards = [...newState.communityCards, ...cards];
      newState.deck = remainingDeck;
    }

    // 收拢赌注（所有玩家的下注都进入 pot + totalBet，包括已弃牌的）
    newState.maxBet = 0;
    for (const player of newState.players) {
      if (player.currentBet > 0) {
        player.totalBet += player.currentBet;
        newState.pot += player.currentBet;
        player.currentBet = 0;
      }
    }

    // 如果只剩一个未弃牌的玩家，直接进入 showdown
    const nonFolded = newState.players.filter(p => !p.folded && !p.isOut);
    if (nonFolded.length <= 1) {
      return showdown(newState);
    }

    // 检查是否所有未弃牌玩家都已 all-in
    const activeNotAllIn = nonFolded.filter(p => !p.isAllIn);
    if (activeNotAllIn.length > 0) {
      // 还有需要行动的玩家，结束自动推进
      break;
    }
    // 全部 all-in 了，继续推进到下一个 round（发更多公共牌）
  }

  // 设置下一个需要行动的玩家
  newState.minRaise = newState.bigBlind;
  newState.lastActionPlayerIndex = -1;

  newState.currentPlayerIndex = (newState.dealerIndex + 1) % newState.players.length;
  const firstPlayer = newState.players[newState.currentPlayerIndex];
  if (firstPlayer.folded || firstPlayer.isAllIn || firstPlayer.isOut) {
    newState.currentPlayerIndex = getNextActivePlayer(newState, newState.currentPlayerIndex);
  }
  newState.firstToActIndex = newState.currentPlayerIndex;

  return newState;
}

export function showdown(state: GameState): GameState {
  const newState = { ...state };

  // 收集剩余的赌注到 pot 和 totalBet
  for (const player of newState.players) {
    if (player.currentBet > 0) {
      player.totalBet += player.currentBet;
      newState.pot += player.currentBet;
      player.currentBet = 0;
    }
  }

  const activePlayers = newState.players.filter(p => !p.folded && !p.isOut);

  if (activePlayers.length === 0) {
    newState.handComplete = true;
    newState.currentRound = Round.Showdown;
    return newState;
  }

  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    winner.chips += newState.pot;
    newState.winners = [{
      playerId: winner.id,
      amount: newState.pot,
      handResult: { rank: 0, value: 0, description: '未摊牌', bestCards: winner.holeCards },
    }];
    newState.handComplete = true;
    newState.pot = 0;
    newState.currentRound = Round.Showdown;
    return newState;
  }

  // 为所有非弃牌玩家评估手牌
  for (const player of activePlayers) {
    const result = evaluator.evaluateHand([...player.holeCards, ...newState.communityCards]);
    player.handRank = result;
  }

  // 计算边池：只以未弃牌玩家的 totalBet 作为分级依据
  // 已弃牌玩家的筹码按级别合并到已有边池中
  const allPlayersWithBets = newState.players.filter(p => p.totalBet > 0);
  const activeBetLevels = [...new Set(activePlayers.map(p => p.totalBet))].sort((a, b) => a - b);

  const sidePots: { amount: number; eligiblePlayerIds: number[] }[] = [];
  let prevLevel = 0;

  for (const level of activeBetLevels) {
    if (level <= prevLevel) continue;
    const diff = level - prevLevel;
    // 所有下注达到或超过此级别的玩家（含弃牌）计入 pot 总额
    const totalCount = allPlayersWithBets.filter(p => p.totalBet >= level).length;
    const potAmount = diff * totalCount;
    // 只有未弃牌的玩家才可参与此边池的争夺
    const eligibleIds = activePlayers.filter(p => p.totalBet >= level).map(p => p.id);

    if (potAmount > 0 && eligibleIds.length > 0) {
      sidePots.push({ amount: potAmount, eligiblePlayerIds: eligibleIds });
    }
    prevLevel = level;
  }

  // 已弃牌玩家超出最高 active 级别的筹码，合并到最高的边池中
  const totalPotActual = allPlayersWithBets.reduce((sum, p) => sum + p.totalBet, 0);
  const totalDistributed = sidePots.reduce((sum, sp) => sum + sp.amount, 0);
  const leftover = totalPotActual - totalDistributed;
  if (leftover > 0) {
    if (sidePots.length > 0) {
      sidePots[sidePots.length - 1].amount += leftover;
    } else if (activePlayers.length > 0) {
      sidePots.push({ amount: leftover, eligiblePlayerIds: activePlayers.map(p => p.id) });
    }
  }

  // 逐个边池分配
  const totalWinners = new Map<number, { amount: number; handResult: HandResult }>();

  for (const sidePot of sidePots) {
    const eligibleResults = sidePot.eligiblePlayerIds.map(id => ({
      playerId: id,
      handResult: activePlayers.find(p => p.id === id)!.handRank!,
    }));

    eligibleResults.sort((a, b) => b.handResult.value - a.handResult.value);

    const topValue = eligibleResults[0].handResult.value;
    const potWinners = eligibleResults.filter(r => r.handResult.value === topValue);

    const share = Math.floor(sidePot.amount / potWinners.length);
    const remainder = sidePot.amount - share * potWinners.length;

    for (let i = 0; i < potWinners.length; i++) {
      const w = potWinners[i];
      const extra = i === 0 ? remainder : 0; // 余数给第一个赢家
      const existing = totalWinners.get(w.playerId) || { amount: 0, handResult: w.handResult };
      totalWinners.set(w.playerId, {
        amount: existing.amount + share + extra,
        handResult: existing.handResult,
      });
    }
  }

  // 分配筹码给赢家
  for (const [playerId, { amount }] of totalWinners) {
    const player = newState.players.find(p => p.id === playerId)!;
    player.chips += amount;
  }

  newState.winners = [...totalWinners.entries()].map(([playerId, { amount, handResult }]) => ({
    playerId,
    amount,
    handResult,
  }));

  newState.pot = 0;
  newState.handComplete = true;
  newState.currentRound = Round.Showdown;

  return newState;
}

export function getNextActivePlayer(state: GameState, currentIndex: number): number {
  const numPlayers = state.players.length;
  let nextIndex = (currentIndex + 1) % numPlayers;
  let attempts = 0;

  while (attempts < numPlayers) {
    const player = state.players[nextIndex];
    if (!player.folded && !player.isAllIn && !player.isOut) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % numPlayers;
    attempts++;
  }

  return -1;
}

export function getValidActions(state: GameState, playerIndex: number): ActionType[] {
  const player = state.players[playerIndex];
  const actions: ActionType[] = [];

  if (player.folded || player.isAllIn || player.isOut) {
    return actions;
  }

  actions.push(ActionType.Fold);

  if (state.maxBet === 0 || player.currentBet === state.maxBet) {
    actions.push(ActionType.Check);
  }

  if (state.maxBet > player.currentBet) {
    const callAmount = state.maxBet - player.currentBet;
    if (player.chips >= callAmount) {
      actions.push(ActionType.Call);
    }
  }

  if (state.maxBet >= player.currentBet) {
    const minRaiseAmount = state.maxBet + state.minRaise - player.currentBet;
    if (player.chips >= minRaiseAmount) {
      actions.push(ActionType.Raise);
    }
  }

  if (player.chips > 0) {
    actions.push(ActionType.AllIn);
  }

  return actions;
}

function isLegalRaise(state: GameState, player: Player, totalBet: number): boolean {
  const minTotalBet = state.maxBet + state.minRaise;
  const maxTotalBet = player.currentBet + player.chips;
  return totalBet >= minTotalBet && totalBet <= maxTotalBet && totalBet > state.maxBet;
}

export function isPlayerTurn(state: GameState, playerIndex: number): boolean {
  return state.currentPlayerIndex === playerIndex && !state.handComplete;
}

export { Difficulty };
