import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultModal } from '../../src/components/ResultModal';
import type { Player, Winner, HandResult } from '../../src/engine/types';
import { Suit } from '../../src/engine/types';

function makePlayer(id: number, name: string): Player {
  return {
    id, name, chips: 1000, holeCards: [], currentBet: 0, totalBet: 0,
    folded: false, isAllIn: false, isDealer: false, isSmallBlind: false,
    isBigBlind: false, isAI: id !== 0,
  };
}

function makeWinner(playerId: number, amount: number, handResult?: HandResult): Winner {
  return {
    playerId,
    amount,
    handResult: handResult ?? {
      rank: 1, value: 1000, description: '一对',
      bestCards: [{ rank: 14, suit: Suit.Spades }, { rank: 14, suit: Suit.Hearts }, { rank: 13, suit: Suit.Clubs }, { rank: 12, suit: Suit.Diamonds }, { rank: 11, suit: Suit.Spades }],
    },
  };
}

describe('ResultModal', () => {
  const onNewHand = vi.fn();
  const players = [makePlayer(0, 'Human'), makePlayer(1, 'AI-1'), makePlayer(2, 'AI-2')];

  beforeEach(() => {
    onNewHand.mockClear();
    cleanup();
  });

  it('renders the result header', () => {
    const winners = [makeWinner(0, 60)];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText('牌局结果')).toBeInTheDocument();
  });

  it('shows the winner name and amount', () => {
    const winners = [makeWinner(0, 60)];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText(/Human/)).toBeInTheDocument();
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  it('shows the hand rank for a single winner', () => {
    const winners = [makeWinner(0, 100, { rank: 4, value: 4500, description: '顺子', bestCards: [] })];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText('顺子')).toBeInTheDocument();
  });

  it('shows multiple winners with their amounts', () => {
    const winners = [
      makeWinner(0, 30, { rank: 1, value: 1000, description: '一对', bestCards: [] }),
      makeWinner(1, 30, { rank: 1, value: 1000, description: '一对', bestCards: [] }),
    ];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText(/Human/)).toBeInTheDocument();
    expect(screen.getByText(/AI-1/)).toBeInTheDocument();
    // Each winner has amount 30
    const amounts = screen.getAllByText(/30/);
    expect(amounts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows hand rank even with multiple winners (split pot)', () => {
    const winners = [
      makeWinner(0, 30),
      makeWinner(1, 30),
    ];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    // New behavior: hand rank is now shown for all winners
    const labels = screen.getAllByText('一对');
    expect(labels.length).toBe(2);
  });

  it('renders "下一局" button', () => {
    const winners = [makeWinner(0, 60)];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText('下一局')).toBeInTheDocument();
  });

  it('calls onNewHand when button clicked', async () => {
    const user = userEvent.setup();
    const winners = [makeWinner(0, 60)];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    await user.click(screen.getByText('下一局'));
    expect(onNewHand).toHaveBeenCalledTimes(1);
  });

  it('displays hand rank for winner with rank 9 (royal flush)', () => {
    const winners = [makeWinner(0, 200, { rank: 9, value: 10000, description: '皇家同花顺', bestCards: [] })];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText('皇家同花顺')).toBeInTheDocument();
  });

  it('handles player name not found gracefully', () => {
    // Winner ID 99 doesn't exist in players
    const winners = [makeWinner(99, 60)];
    render(<ResultModal winners={winners} players={players} onNewHand={onNewHand} />);
    expect(screen.getByText(/玩家 100/)).toBeInTheDocument();
  });

  it('shows other players hands when they have handRank', () => {
    const hand: HandResult = { rank: 2, value: 2000, description: '两对', bestCards: [] };
    const losersWithHands = [
      makePlayer(1, 'AI-1'),
      makePlayer(2, 'AI-2'),
    ];
    losersWithHands[0].handRank = hand;
    losersWithHands[1].handRank = hand;
    const allPlayers = [players[0], ...losersWithHands];
    const winners = [makeWinner(0, 100)];
    render(<ResultModal winners={winners} players={allPlayers} onNewHand={onNewHand} />);
    expect(screen.getByText(/其他玩家手牌/)).toBeInTheDocument();
  });

  it('handles missing handResult without crashing', () => {
    const winnerWithUndefined: Winner = { playerId: 0, amount: 60, handResult: undefined as unknown as HandResult };
    render(<ResultModal winners={[winnerWithUndefined]} players={players} onNewHand={onNewHand} />);
    // Should render without crashing — hand rank label will be empty, bestCards section skipped
    expect(screen.getByText(/Human/)).toBeInTheDocument();
  });
});