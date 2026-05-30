import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateHand } from '../src/engine/evaluator';
import { createGame, getValidActions, performAction, showdown, startHand } from '../src/game';
import { ActionType, Difficulty, Round, Suit } from '../src/engine/types';
import type { Card, GameState, Rank } from '../src/engine/types';

const card = (rank: Rank, suit: Suit = Suit.Spades): Card => ({ rank, suit });

function winnerAmount(state: GameState, playerId: number): number {
  return state.winners.find(winner => winner.playerId === playerId)?.amount ?? 0;
}

test('牌型比较使用完整五张牌且 A-2-3-4-5 是最低顺子', () => {
  const wheel = evaluateHand([
    card(14, Suit.Spades),
    card(5, Suit.Hearts),
    card(4, Suit.Clubs),
    card(3, Suit.Diamonds),
    card(2, Suit.Spades),
  ]);
  const kingHighStraight = evaluateHand([
    card(13, Suit.Spades),
    card(12, Suit.Hearts),
    card(11, Suit.Clubs),
    card(10, Suit.Diamonds),
    card(9, Suit.Spades),
  ]);
  assert.equal(wheel.description, '顺子');
  assert.ok(wheel.value < kingHighStraight.value);

  const highCardNineKicker = evaluateHand([
    card(14, Suit.Spades),
    card(13, Suit.Hearts),
    card(12, Suit.Clubs),
    card(11, Suit.Diamonds),
    card(9, Suit.Spades),
  ]);
  const highCardTwoKicker = evaluateHand([
    card(14, Suit.Spades),
    card(13, Suit.Hearts),
    card(12, Suit.Clubs),
    card(11, Suit.Diamonds),
    card(2, Suit.Hearts),
  ]);
  assert.ok(highCardNineKicker.value > highCardTwoKicker.value);

  const flushNineKicker = evaluateHand([
    card(14, Suit.Spades),
    card(13, Suit.Spades),
    card(12, Suit.Spades),
    card(11, Suit.Spades),
    card(9, Suit.Spades),
  ]);
  const flushTwoKicker = evaluateHand([
    card(14, Suit.Hearts),
    card(13, Suit.Hearts),
    card(12, Suit.Hearts),
    card(11, Suit.Hearts),
    card(2, Suit.Hearts),
  ]);
  assert.ok(flushNineKicker.value > flushTwoKicker.value);

  const acesAndTwosWithKing = evaluateHand([
    card(14, Suit.Spades),
    card(14, Suit.Hearts),
    card(2, Suit.Clubs),
    card(2, Suit.Diamonds),
    card(13, Suit.Spades),
  ]);
  const acesAndThreesWithTwo = evaluateHand([
    card(14, Suit.Spades),
    card(14, Suit.Hearts),
    card(3, Suit.Clubs),
    card(3, Suit.Diamonds),
    card(2, Suit.Spades),
  ]);
  assert.ok(acesAndThreesWithTwo.value > acesAndTwosWithKing.value);
});

test('花色不参与大小，同样五张牌应平分', () => {
  const spadeHigh = evaluateHand([
    card(14, Suit.Spades),
    card(13, Suit.Hearts),
    card(12, Suit.Clubs),
    card(11, Suit.Diamonds),
    card(9, Suit.Spades),
  ]);
  const heartHigh = evaluateHand([
    card(14, Suit.Hearts),
    card(13, Suit.Clubs),
    card(12, Suit.Diamonds),
    card(11, Suit.Spades),
    card(9, Suit.Hearts),
  ]);

  assert.equal(spadeHigh.value, heartHigh.value);
});

test('七张牌中选择最佳五张牌', () => {
  const result = evaluateHand([
    card(14, Suit.Spades),
    card(14, Suit.Hearts),
    card(13, Suit.Clubs),
    card(13, Suit.Diamonds),
    card(3, Suit.Spades),
    card(3, Suit.Hearts),
    card(2, Suit.Clubs),
  ]);

  assert.equal(result.description, '两对');
  assert.deepEqual(
    result.bestCards.map(bestCard => bestCard.rank),
    [14, 14, 13, 13, 3],
  );
});

test('两人局按钮玩家同时是小盲，且翻前先行动', () => {
  const state = startHand(createGame(2, Difficulty.Easy));
  const dealer = state.players.find(player => player.isDealer)!;
  const smallBlind = state.players.find(player => player.isSmallBlind)!;
  const bigBlind = state.players.find(player => player.isBigBlind)!;

  assert.equal(dealer.id, smallBlind.id);
  assert.notEqual(dealer.id, bigBlind.id);
  assert.equal(state.currentPlayerIndex, dealer.id);
});

test('最小下注/加注等于大盲或上一手加注额', () => {
  let state = startHand(createGame(3, Difficulty.Easy));
  assert.equal(state.minRaise, state.bigBlind);

  state = performAction(state, ActionType.Raise, state.bigBlind + state.smallBlind);
  assert.equal(state.maxBet, state.bigBlind);
  assert.equal(state.currentPlayerIndex, state.firstToActIndex);

  state = performAction(state, ActionType.Raise, state.bigBlind * 2);
  assert.equal(state.maxBet, state.bigBlind * 2);
  assert.equal(state.minRaise, state.bigBlind);

  state = performAction(state, ActionType.Raise, state.maxBet + state.smallBlind);
  assert.equal(state.maxBet, state.bigBlind * 2);
});

test('大盲在无人加注时有过牌或加注选择', () => {
  let state = startHand(createGame(3, Difficulty.Easy));
  state = performAction(state, ActionType.Call);
  state = performAction(state, ActionType.Call);

  const bigBlind = state.players.find(player => player.isBigBlind)!;
  assert.equal(state.currentPlayerIndex, bigBlind.id);
  const actions = getValidActions(state, bigBlind.id);
  assert.ok(actions.includes(ActionType.Check));
  assert.ok(actions.includes(ActionType.Raise));
});

test('一方 all-in 后，对手必须先跟注或弃牌，不能直接进入后续轮次', () => {
  let state = startHand(createGame(2, Difficulty.Easy));
  const allInPlayer = state.currentPlayerIndex;
  const caller = state.players.find(player => player.id !== allInPlayer)!;

  state.players[allInPlayer].holeCards = [card(2, Suit.Clubs), card(3, Suit.Diamonds)];
  caller.holeCards = [card(14, Suit.Spades), card(14, Suit.Hearts)];
  state.deck = [
    card(7, Suit.Clubs),
    card(8, Suit.Diamonds),
    card(9, Suit.Hearts),
    card(11, Suit.Clubs),
    card(13, Suit.Diamonds),
  ];

  state = performAction(state, ActionType.AllIn);

  assert.equal(state.currentRound, Round.Preflop);
  assert.equal(state.handComplete, false);
  assert.equal(state.currentPlayerIndex, caller.id);
  assert.ok(getValidActions(state, caller.id).includes(ActionType.Call));

  state = performAction(state, ActionType.Call);

  assert.equal(state.handComplete, true);
  assert.equal(winnerAmount(state, caller.id), 2000);
  assert.equal(state.players[caller.id].chips, 2000);
});

test('全下主池与边池只分给有资格的玩家', () => {
  const state = createGame(3, Difficulty.Easy, 0);
  state.currentRound = Round.Showdown;
  state.communityCards = [
    card(8, Suit.Hearts),
    card(8, Suit.Clubs),
    card(2, Suit.Spades),
    card(7, Suit.Diamonds),
    card(12, Suit.Hearts),
  ];
  state.players[0].holeCards = [card(8, Suit.Diamonds), card(3, Suit.Clubs)];
  state.players[1].holeCards = [card(13, Suit.Spades), card(13, Suit.Diamonds)];
  state.players[2].holeCards = [card(14, Suit.Spades), card(14, Suit.Diamonds)];
  state.players[0].totalBet = 25;
  state.players[1].totalBet = 75;
  state.players[2].totalBet = 75;
  state.players.forEach(player => {
    player.chips = 0;
    player.isAllIn = true;
  });
  state.pot = 175;

  const result = showdown(state);

  assert.equal(winnerAmount(result, 0), 75);
  assert.equal(winnerAmount(result, 2), 100);
  assert.equal(winnerAmount(result, 1), 0);
  assert.equal(result.players[0].chips, 75);
  assert.equal(result.players[2].chips, 100);
});

test('相同最佳牌型时平分对应底池', () => {
  const state = createGame(2, Difficulty.Easy, 0);
  state.currentRound = Round.Showdown;
  state.communityCards = [
    card(14, Suit.Spades),
    card(13, Suit.Hearts),
    card(12, Suit.Clubs),
    card(11, Suit.Diamonds),
    card(9, Suit.Spades),
  ];
  state.players[0].holeCards = [card(2, Suit.Clubs), card(3, Suit.Clubs)];
  state.players[1].holeCards = [card(2, Suit.Diamonds), card(3, Suit.Diamonds)];
  state.players[0].totalBet = 50;
  state.players[1].totalBet = 50;
  state.players[0].chips = 0;
  state.players[1].chips = 0;
  state.pot = 100;

  const result = showdown(state);

  assert.equal(winnerAmount(result, 0), 50);
  assert.equal(winnerAmount(result, 1), 50);
});
