import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Round, ActionType, Difficulty } from '../../src/engine/types';
import { card, createMockGameState, createMockWinners, createMockPlayer } from './testUtils';

// Per-test state
let testStore: any = null;

vi.mock('../../src/store/gameStore', () => ({
  useGameStore: (selector?: any) => selector ? selector(testStore) : testStore,
}));

// Mock useGameLoop — does nothing in tests
vi.mock('../../src/hooks/useGameLoop', () => ({
  useGameLoop: () => {},
}));

// Mock sound player to avoid AudioContext issues
vi.mock('../../src/utils/sound', () => ({
  isMuted: () => true,
  toggleMute: () => true,
  playDeal: () => {},
  playShuffle: () => {},
  playActionSound: () => {},
  playWin: () => {},
  playLose: () => {},
  playButtonClick: () => {},
}));

// Mock DealerAvatar for simplicity
vi.mock('../../src/components/DealerAvatar', () => ({
  DealerAvatar: () => null,
}));

// GameTable import must come after mocks (hoisted by vitest)
import { GameTable } from '../../src/components/GameTable';

describe('GameTable', () => {
  beforeEach(() => {
    cleanup();
    // Default store — game in progress, flop, human's turn
    const state = createMockGameState();
    testStore = {
      state,
      config: { playerCount: 3, difficulty: Difficulty.Medium, startingChips: 1000, playerName: 'Human' },
      isAnyAllIn: false,
      isDealing: false,
      gameOver: false,
      handCount: 0,
      blindLevel: 0,
      handHistory: [],
      nextHand: vi.fn(),
      endGame: vi.fn(),
      completeDealing: vi.fn(),
      playerAction: vi.fn(),
      setState: vi.fn(),
    };
  });

  it('renders table label', async () => {
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText(/3-MAX/)).toBeInTheDocument();
    });
  });

  it('renders pot amount', async () => {
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText(/底池 60/)).toBeInTheDocument();
    });
  });

  it('renders current round name', async () => {
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('翻牌')).toBeInTheDocument();
    });
  });

  it('renders community cards', async () => {
    const { container } = render(<GameTable />);
    await waitFor(() => {
      const kLabels = container.querySelectorAll('span');
      const foundK = Array.from(kLabels).filter(el => el.textContent?.trim() === 'K');
      expect(foundK.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders player names', async () => {
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText(/Human/)).toBeInTheDocument();
      expect(screen.getByText(/AI-1/)).toBeInTheDocument();
      expect(screen.getByText(/AI-2/)).toBeInTheDocument();
    });
  });

  it('shows action panel when it is human turn', async () => {
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('加注')).toBeInTheDocument();
    });
  });

  it('hides action panel when hand is complete', async () => {
    testStore.state = createMockGameState({ handComplete: true, winners: [] });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.queryByText('加注')).not.toBeInTheDocument();
    });
  });

  it('shows result modal when hand is complete and winners exist', async () => {
    testStore.state = createMockGameState({
      handComplete: true,
      winners: createMockWinners(1),
    });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('牌局结果')).toBeInTheDocument();
      expect(screen.getByText('下一局')).toBeInTheDocument();
    });
  });

  it('shows game over overlay when gameOver is true', async () => {
    testStore.gameOver = true;
    testStore.state = createMockGameState({ handComplete: true });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('再来一局')).toBeInTheDocument();
      expect(screen.getByText('游戏结束')).toBeInTheDocument();
    });
  });

  it('shows "人类玩家破产" message when human player chips <= 0', async () => {
    testStore.gameOver = true;
    testStore.state = createMockGameState({
      handComplete: true,
      players: [
        createMockPlayer({ id: 0, name: 'Human', chips: 0 }),
        createMockPlayer({ id: 1, name: 'AI-1', chips: 2000, isAI: true }),
        createMockPlayer({ id: 2, name: 'AI-2', chips: 2000, isAI: true }),
      ],
    });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('人类玩家破产，游戏结束！')).toBeInTheDocument();
    });
  });

  it('shows game winner message when all other players are out', async () => {
    testStore.gameOver = true;
    testStore.state = createMockGameState({
      handComplete: true,
      players: [
        createMockPlayer({ id: 0, name: 'Human', chips: 100 }),
        createMockPlayer({ id: 1, name: 'AI-1', chips: 0, isOut: true, isAI: true }),
        createMockPlayer({ id: 2, name: 'AI-2', chips: 0, isOut: true, isAI: true }),
      ],
    });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText(/赢得游戏/)).toBeInTheDocument();
    });
  });

  it('calls endGame when "再来一局" clicked', async () => {
    const user = userEvent.setup();
    testStore.gameOver = true;
    testStore.state = createMockGameState({ handComplete: true });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('再来一局')).toBeInTheDocument();
    });
    await user.click(screen.getByText('再来一局'));
    expect(testStore.endGame).toHaveBeenCalledTimes(1);
  });

  it('calls nextHand when "下一局" clicked', async () => {
    const user = userEvent.setup();
    testStore.state = createMockGameState({
      handComplete: true,
      winners: createMockWinners(1),
    });
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('下一局')).toBeInTheDocument();
    });
    await user.click(screen.getByText('下一局'));
    expect(testStore.nextHand).toHaveBeenCalledTimes(1);
  });

  it('renders sound toggle button', async () => {
    render(<GameTable />);
    await waitFor(() => {
      expect(screen.getByText('🔇')).toBeInTheDocument();
    });
  });

  it('returns null when state is null', () => {
    testStore.state = null;
    const { container } = render(<GameTable />);
    expect(container.innerHTML).toBe('');
  });
});