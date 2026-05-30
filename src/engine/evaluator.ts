import type { Card, HandResult } from './types';

const VALUE_BASE = 15;
const SCORE_CARD_COUNT = 5;

function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.rank - a.rank);
}

function encodeValue(handRank: number, ranks: number[]): number {
  let value = handRank;
  for (let i = 0; i < SCORE_CARD_COUNT; i++) {
    value = value * VALUE_BASE + (ranks[i] ?? 0);
  }
  return value;
}

function rankGroups(cards: Card[]): { rank: number; cards: Card[]; count: number }[] {
  const groups = new Map<number, Card[]>();
  for (const card of cards) {
    const cardsForRank = groups.get(card.rank) ?? [];
    cardsForRank.push(card);
    groups.set(card.rank, cardsForRank);
  }

  return [...groups.entries()]
    .map(([rank, groupCards]) => ({
      rank,
      cards: sortByRankDesc(groupCards),
      count: groupCards.length,
    }))
    .sort((a, b) => b.rank - a.rank);
}

function isFlush(cards: Card[]): boolean {
  return cards.length === SCORE_CARD_COUNT && cards.every(card => card.suit === cards[0].suit);
}

function getStraightHighRank(cards: Card[]): number | null {
  if (cards.length !== SCORE_CARD_COUNT) return null;

  const ranks = [...new Set(cards.map(card => card.rank))].sort((a, b) => b - a);
  if (ranks.length !== SCORE_CARD_COUNT) return null;

  if (ranks[0] - ranks[SCORE_CARD_COUNT - 1] === SCORE_CARD_COUNT - 1) {
    return ranks[0];
  }

  const wheelRanks = [14, 5, 4, 3, 2] as const;
  const isWheel = wheelRanks.every(rank => ranks.includes(rank));
  return isWheel ? 5 : null;
}

function cardsForRanks(cards: Card[], ranks: number[]): Card[] {
  const remaining = [...cards];
  return ranks.flatMap(rank => {
    const index = remaining.findIndex(card => card.rank === rank);
    if (index === -1) return [];
    const [selected] = remaining.splice(index, 1);
    return [selected];
  });
}

function straightCards(cards: Card[], highRank: number): Card[] {
  const ranks = highRank === 5
    ? [5, 4, 3, 2, 14]
    : Array.from({ length: SCORE_CARD_COUNT }, (_, index) => highRank - index);
  return cardsForRanks(sortByRankDesc(cards), ranks);
}

function scoreCards(cards: Card[]): HandResult {
  const sortedCards = sortByRankDesc(cards);
  const groups = rankGroups(cards);
  const straightHighRank = getStraightHighRank(cards);
  const flush = isFlush(cards);

  if (flush && straightHighRank !== null) {
    const royal = straightHighRank === 14 && cards.some(card => card.rank === 10);
    return {
      rank: royal ? 9 : 8,
      value: encodeValue(royal ? 9 : 8, [straightHighRank]),
      description: royal ? '皇家同花顺' : '同花顺',
      bestCards: straightCards(cards, straightHighRank),
    };
  }

  const four = groups.find(group => group.count === 4);
  if (four) {
    const kicker = sortedCards.find(card => card.rank !== four.rank);
    const bestCards = kicker ? [...four.cards, kicker] : four.cards;
    return {
      rank: 7,
      value: encodeValue(7, [four.rank, kicker?.rank ?? 0]),
      description: '四条',
      bestCards,
    };
  }

  const trips = groups.filter(group => group.count >= 3);
  const pairs = groups.filter(group => group.count >= 2);
  if (trips.length > 0) {
    const trip = trips[0];
    const pair = pairs.find(group => group.rank !== trip.rank);
    if (pair) {
      return {
        rank: 6,
        value: encodeValue(6, [trip.rank, pair.rank]),
        description: '葫芦',
        bestCards: [...trip.cards.slice(0, 3), ...pair.cards.slice(0, 2)],
      };
    }
  }

  if (flush) {
    const ranks = sortedCards.map(card => card.rank);
    return {
      rank: 5,
      value: encodeValue(5, ranks),
      description: '同花',
      bestCards: sortedCards,
    };
  }

  if (straightHighRank !== null) {
    return {
      rank: 4,
      value: encodeValue(4, [straightHighRank]),
      description: '顺子',
      bestCards: straightCards(cards, straightHighRank),
    };
  }

  if (trips.length > 0) {
    const trip = trips[0];
    const kickers = sortedCards.filter(card => card.rank !== trip.rank).slice(0, 2);
    return {
      rank: 3,
      value: encodeValue(3, [trip.rank, ...kickers.map(card => card.rank)]),
      description: '三条',
      bestCards: [...trip.cards.slice(0, 3), ...kickers],
    };
  }

  if (pairs.length >= 2) {
    const [highPair, lowPair] = pairs;
    const kicker = sortedCards.find(card => card.rank !== highPair.rank && card.rank !== lowPair.rank);
    const bestCards = [
      ...highPair.cards.slice(0, 2),
      ...lowPair.cards.slice(0, 2),
      ...(kicker ? [kicker] : []),
    ];
    return {
      rank: 2,
      value: encodeValue(2, [highPair.rank, lowPair.rank, kicker?.rank ?? 0]),
      description: '两对',
      bestCards,
    };
  }

  if (pairs.length === 1) {
    const [pair] = pairs;
    const kickers = sortedCards.filter(card => card.rank !== pair.rank).slice(0, 3);
    return {
      rank: 1,
      value: encodeValue(1, [pair.rank, ...kickers.map(card => card.rank)]),
      description: '一对',
      bestCards: [...pair.cards.slice(0, 2), ...kickers],
    };
  }

  const highCards = sortedCards.slice(0, SCORE_CARD_COUNT);
  return {
    rank: 0,
    value: encodeValue(0, highCards.map(card => card.rank)),
    description: '高牌',
    bestCards: highCards,
  };
}

function getCombinations<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  if (count === 1) return items.map(item => [item]);

  const result: T[][] = [];
  for (let i = 0; i <= items.length - count; i++) {
    const combinations = getCombinations(items.slice(i + 1), count - 1);
    for (const combination of combinations) {
      result.push([items[i], ...combination]);
    }
  }
  return result;
}

export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length === 0) {
    return {
      rank: 0,
      value: 0,
      description: '高牌',
      bestCards: [],
    };
  }

  if (cards.length <= SCORE_CARD_COUNT) {
    return scoreCards(cards);
  }

  return getCombinations(cards, SCORE_CARD_COUNT)
    .map(scoreCards)
    .sort((a, b) => b.value - a.value)[0];
}

export function compareHands(hands: { playerId: number; cards: Card[] }[]): { playerId: number; handResult: HandResult }[] {
  const results = hands.map(({ playerId, cards }) => ({
    playerId,
    handResult: evaluateHand(cards),
  }));

  return results.sort((a, b) => b.handResult.value - a.handResult.value);
}
