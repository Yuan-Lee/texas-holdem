import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CardView } from '../../src/components/CardView';
import { Suit } from '../../src/engine/types';
import type { Card } from '../../src/engine/types';

describe('CardView', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders card back when hidden is true', () => {
    render(<CardView card={null} hidden />);
    const cardBack = document.querySelector('[style*="repeating-linear-gradient"]');
    expect(cardBack).toBeTruthy();
  });

  it('renders card back when card is null', () => {
    render(<CardView card={null} />);
    const cardBack = document.querySelector('[style*="repeating-linear-gradient"]');
    expect(cardBack).toBeTruthy();
  });

  it('renders rank and suit for a visible card', () => {
    const c: Card = { rank: 14, suit: Suit.Spades };
    const { container } = render(<CardView card={c} />);
    // Should show rank "A" and suit symbol "♠"
    const labels = container.querySelectorAll('span');
    const rankLabel = Array.from(labels).find(el => el.textContent?.trim() === 'A');
    const suitLabel = Array.from(labels).find(el => el.textContent?.trim() === '♠');
    expect(rankLabel).toBeTruthy();
    expect(suitLabel).toBeTruthy();
  });

  it('renders correct suit symbol and color for hearts', () => {
    const c: Card = { rank: 10, suit: Suit.Hearts };
    const { container } = render(<CardView card={c} />);
    const labels = container.querySelectorAll('span');
    const heartLabel = Array.from(labels).find(el => el.textContent?.trim() === '♥');
    expect(heartLabel).toBeTruthy();
  });

  it('renders correct suit symbol for clubs', () => {
    const c: Card = { rank: 2, suit: Suit.Clubs };
    const { container } = render(<CardView card={c} />);
    const labels = container.querySelectorAll('span');
    const clubLabel = Array.from(labels).find(el => el.textContent?.trim() === '♣');
    expect(clubLabel).toBeTruthy();
  });

  it('renders correct suit symbol for diamonds', () => {
    const c: Card = { rank: 5, suit: Suit.Diamonds };
    const { container } = render(<CardView card={c} />);
    const labels = container.querySelectorAll('span');
    const diamondLabel = Array.from(labels).find(el => el.textContent?.trim() === '♦');
    expect(diamondLabel).toBeTruthy();
  });

  it('renders correct rank for Jack (11)', () => {
    const c: Card = { rank: 11, suit: Suit.Spades };
    const { container } = render(<CardView card={c} />);
    const labels = container.querySelectorAll('span');
    const jLabel = Array.from(labels).find(el => el.textContent?.trim() === 'J');
    expect(jLabel).toBeTruthy();
  });

  it('renders correct rank for Queen (12)', () => {
    const c: Card = { rank: 12, suit: Suit.Spades };
    const { container } = render(<CardView card={c} />);
    const labels = container.querySelectorAll('span');
    const qLabel = Array.from(labels).find(el => el.textContent?.trim() === 'Q');
    expect(qLabel).toBeTruthy();
  });

  it('renders correct rank for King (13)', () => {
    const c: Card = { rank: 13, suit: Suit.Spades };
    const { container } = render(<CardView card={c} />);
    const labels = container.querySelectorAll('span');
    const kLabel = Array.from(labels).find(el => el.textContent?.trim() === 'K');
    expect(kLabel).toBeTruthy();
  });

  it('applies size classes correctly (sm)', () => {
    const c: Card = { rank: 14, suit: Suit.Spades };
    const { container } = render(<CardView card={c} size="sm" />);
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.style.width).toBe('44px');
    expect(cardDiv.style.height).toBe('60px');
  });

  it('applies size classes correctly (lg)', () => {
    const c: Card = { rank: 14, suit: Suit.Spades };
    const { container } = render(<CardView card={c} size="lg" />);
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.style.width).toBe('80px');
    expect(cardDiv.style.height).toBe('112px');
  });
});