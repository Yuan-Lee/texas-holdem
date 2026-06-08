import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameSetup } from '../../src/components/GameSetup';
import { Difficulty } from '../../src/engine/types';

// Mock the game store
const mockStartGame = vi.fn();
vi.mock('../../src/store/gameStore', () => ({
  useGameStore: (selector?: any) => {
    const store = {
      startGame: mockStartGame,
    };
    return selector ? selector(store) : store;
  },
}));

describe('GameSetup', () => {
  beforeEach(() => {
    mockStartGame.mockClear();
    cleanup();
  });

  it('renders title and subtitle', () => {
    render(<GameSetup />);
    expect(screen.getByText("Texas Hold'em")).toBeInTheDocument();
    expect(screen.getByText('单机版德州扑克')).toBeInTheDocument();
  });

  it('renders all config form sections', () => {
    render(<GameSetup />);
    expect(screen.getByText('玩家名称')).toBeInTheDocument();
    expect(screen.getByText('玩家人数')).toBeInTheDocument();
    expect(screen.getByText('AI 难度')).toBeInTheDocument();
    expect(screen.getByText('初始筹码')).toBeInTheDocument();
  });

  it('renders the start game button', () => {
    render(<GameSetup />);
    expect(screen.getByText('开始游戏')).toBeInTheDocument();
  });

  it('has a player name input', () => {
    render(<GameSetup />);
    const input = screen.getByPlaceholderText('输入你的昵称（可选）');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Master');
  });

  it('allows typing a custom player name', async () => {
    const user = userEvent.setup();
    render(<GameSetup />);
    const input = screen.getByPlaceholderText('输入你的昵称（可选）');
    await user.clear(input);
    await user.type(input, 'PokerKing');
    expect(input).toHaveValue('PokerKing');
  });

  it('renders player count buttons [2,3,4,5,6]', () => {
    render(<GameSetup />);
    [2, 3, 4, 5, 6].forEach(n => {
      expect(screen.getByText(String(n))).toBeInTheDocument();
    });
  });

  it('highlights selected player count (default 5)', () => {
    render(<GameSetup />);
    const btn5 = screen.getByText('5');
    // Default selected is 5 — button should have the highlighted border color
    expect(btn5).toHaveStyle('border: 2px solid rgb(243, 156, 18)');
  });

  it('switches player count on click', async () => {
    const user = userEvent.setup();
    render(<GameSetup />);
    const btn3 = screen.getByText('3');
    await user.click(btn3);
    expect(btn3).toHaveStyle('border: 2px solid rgb(243, 156, 18)');
    // The previously selected 5 should no longer be highlighted
    const btn5 = screen.getByText('5');
    expect(btn5).not.toHaveStyle('border: 2px solid rgb(243, 156, 18)');
  });

  it('renders all difficulty options', () => {
    render(<GameSetup />);
    expect(screen.getByText('简单')).toBeInTheDocument();
    expect(screen.getByText('中等')).toBeInTheDocument();
    expect(screen.getByText('困难')).toBeInTheDocument();
  });

  it('highlights medium difficulty by default', () => {
    render(<GameSetup />);
    const mediumBtn = screen.getByRole('button', { name: /中等/ });
    expect(mediumBtn).toHaveStyle('border: 2px solid rgb(243, 156, 18)');
  });

  it('switches difficulty on click', async () => {
    const user = userEvent.setup();
    render(<GameSetup />);
    const easyBtn = screen.getByRole('button', { name: /简单/ });
    await user.click(easyBtn);
    expect(easyBtn).toHaveStyle('border: 2px solid rgb(243, 156, 18)');
    const mediumBtn = screen.getByRole('button', { name: /中等/ });
    expect(mediumBtn).not.toHaveStyle('border: 2px solid rgb(243, 156, 18)');
  });

  it('renders difficulty descriptions', () => {
    render(<GameSetup />);
    expect(screen.getByText('基础策略，随机决策')).toBeInTheDocument();
    expect(screen.getByText('考虑手牌强度和底池赔率')).toBeInTheDocument();
    expect(screen.getByText('高级策略，蒙特卡洛模拟')).toBeInTheDocument();
  });

  it('renders starting chip buttons [500,1000,2000,5000]', () => {
    render(<GameSetup />);
    ['500', '1000', '2000', '5000'].forEach(n => {
      expect(screen.getByText(n)).toBeInTheDocument();
    });
  });

  it('highlights 1000 as default starting chips', () => {
    render(<GameSetup />);
    const chips1000 = screen.getByText('1000');
    expect(chips1000).toHaveStyle('border: 2px solid rgb(243, 156, 18)');
  });

  it('calls startGame with correct config on click', async () => {
    const user = userEvent.setup();
    render(<GameSetup />);
    await user.click(screen.getByText('开始游戏'));
    expect(mockStartGame).toHaveBeenCalledTimes(1);
    expect(mockStartGame).toHaveBeenCalledWith({
      playerCount: 5,
      difficulty: Difficulty.Medium,
      startingChips: 1000,
      playerName: 'Master',
    });
  });

  it('calls startGame with custom name and settings', async () => {
    const user = userEvent.setup();
    render(<GameSetup />);

    // Change name
    const input = screen.getByPlaceholderText('输入你的昵称（可选）');
    await user.clear(input);
    await user.type(input, 'Pro');

    // Change difficulty to hard
    await user.click(screen.getByText('困难'));

    // Change player count to 3
    await user.click(screen.getByText('3'));

    // Change chips to 5000
    await user.click(screen.getByText('5000'));

    // Start game
    await user.click(screen.getByText('开始游戏'));

    expect(mockStartGame).toHaveBeenCalledWith({
      playerCount: 3,
      difficulty: Difficulty.Hard,
      startingChips: 5000,
      playerName: 'Pro',
    });
  });
});