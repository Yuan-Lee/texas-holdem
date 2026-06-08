import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlayerSeat } from '../../src/components/PlayerSeat';
import { Suit } from '../../src/engine/types';
import type { Player } from '../../src/engine/types';

function makePlayer(overrides: Partial<Player> & { id: number }): Player {
  return {
    id: overrides.id,
    name: overrides.name ?? `P${overrides.id + 1}`,
    chips: overrides.chips ?? 1000,
    holeCards: overrides.holeCards ?? [],
    currentBet: overrides.currentBet ?? 0,
    totalBet: overrides.totalBet ?? 0,
    folded: overrides.folded ?? false,
    isAllIn: overrides.isAllIn ?? false,
    isDealer: overrides.isDealer ?? false,
    isSmallBlind: overrides.isSmallBlind ?? false,
    isBigBlind: overrides.isBigBlind ?? false,
    isAI: overrides.isAI ?? (overrides.id !== 0),
    isOut: overrides.isOut,
    handRank: overrides.handRank,
  };
}

describe('PlayerSeat', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders player name and chips', () => {
    const player = makePlayer({ id: 0, name: 'Human', chips: 500 });
    render(<PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} />);
    expect(screen.getByText(/Human/)).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it('shows dealer badge for the dealer player', () => {
    const player = makePlayer({ id: 1, isDealer: true });
    const { container } = render(
      <PlayerSeat player={player} isCurrentPlayer={false} isHuman={false} showAllCards={false} />,
    );
    // The dealer badge "D" appears inside the avatar circle
    const dBadges = container.querySelectorAll('span');
    const dealerD = Array.from(dBadges).find(el => el.textContent === 'D');
    expect(dealerD).toBeTruthy();
  });

  it('shows folded text when player folded', () => {
    const player = makePlayer({ id: 0, folded: true });
    render(<PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} />);
    expect(screen.getByText('弃牌')).toBeInTheDocument();
  });

  it('shows all-in text when player is all-in', () => {
    const player = makePlayer({ id: 0, isAllIn: true });
    render(<PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} />);
    expect(screen.getByText('ALL IN')).toBeInTheDocument();
  });

  it('shows current bet amount', () => {
    const player = makePlayer({ id: 0, currentBet: 50 });
    render(<PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} />);
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('shows hand rank description when available', () => {
    const player = makePlayer({
      id: 0,
      handRank: { rank: 4, value: 2500, description: '三条', bestCards: [] },
    });
    render(<PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} />);
    expect(screen.getByText('三条')).toBeInTheDocument();
  });

  it('shows player cards when showAllCards is true', () => {
    const player = makePlayer({
      id: 0,
      holeCards: [
        { rank: 14, suit: Suit.Spades },
        { rank: 13, suit: Suit.Hearts },
      ],
    });
    const { container } = render(
      <PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={true} />,
    );
    // CardView renders rank labels for visible cards
    const rankLabels = container.querySelectorAll('span');
    const aLabels = Array.from(rankLabels).filter(el => el.textContent?.trim() === 'A');
    const kLabels = Array.from(rankLabels).filter(el => el.textContent?.trim() === 'K');
    expect(aLabels.length).toBeGreaterThanOrEqual(1);
    expect(kLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders card backs when hideCards is true', () => {
    const player = makePlayer({
      id: 0,
      holeCards: [
        { rank: 14, suit: Suit.Spades },
        { rank: 13, suit: Suit.Hearts },
      ],
    });
    const { container } = render(
      <PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} hideCards={true} />,
    );
    // Should not show rank letters when hidden
    const rankLabels = container.querySelectorAll('span');
    const aLabels = Array.from(rankLabels).filter(el => el.textContent?.trim() === 'A');
    const kLabels = Array.from(rankLabels).filter(el => el.textContent?.trim() === 'K');
    expect(aLabels.length).toBe(0);
    expect(kLabels.length).toBe(0);
  });

  it('is dimmed when player is out', () => {
    const player = makePlayer({ id: 0, isOut: true });
    const { container } = render(
      <PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={false} />,
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.style.opacity).toBe('0.58');
  });

  it('does not show cards for out player', () => {
    const player = makePlayer({
      id: 0,
      isOut: true,
      holeCards: [{ rank: 14, suit: Suit.Spades }, { rank: 13, suit: Suit.Hearts }],
    });
    render(<PlayerSeat player={player} isCurrentPlayer={false} isHuman={true} showAllCards={true} />);
    // Should NOT show 弃牌/ALL IN/注 labels for out player
    expect(screen.queryByText('弃牌')).not.toBeInTheDocument();
    expect(screen.queryByText('ALL IN')).not.toBeInTheDocument();
  });
});