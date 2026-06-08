import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionType, Round } from '../../src/engine/types';
import { ActionPanel } from '../../src/components/ActionPanel';

// Per-test mutable state for mocks
let testValidActions: ActionType[] = [];
let testStoreState: any = null;
let mockPlayerAction = vi.fn();

vi.mock('../../src/store/gameStore', () => ({
  useGameStore: (selector?: any) => {
    const store = {
      state: testStoreState,
      playerAction: mockPlayerAction,
    };
    return selector ? selector(store) : store;
  },
}));

vi.mock('../../src/game', () => ({
  getValidActions: () => testValidActions,
}));

function defaultStoreState() {
  return {
    players: [
      { id: 0, name: 'Human', chips: 980, currentBet: 20, totalBet: 20, folded: false, isAllIn: false, isAI: false, isDealer: false, isSmallBlind: false, isBigBlind: false },
      { id: 1, name: 'AI-1', chips: 1000, currentBet: 20, totalBet: 20, folded: false, isAllIn: false, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false },
      { id: 2, name: 'AI-2', chips: 1000, currentBet: 20, totalBet: 20, folded: false, isAllIn: false, isAI: true, isDealer: false, isSmallBlind: true, isBigBlind: false },
    ],
    pot: 60,
    maxBet: 20,
    minRaise: 20,
    currentRound: Round.Flop,
  };
}

describe('ActionPanel', () => {
  beforeEach(() => {
    testValidActions = [];
    testStoreState = defaultStoreState();
    mockPlayerAction = vi.fn();
    cleanup();
  });

  it('renders fold button when Fold is valid', () => {
    testValidActions = [ActionType.Fold, ActionType.Call];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText('弃牌')).toBeInTheDocument();
  });

  it('renders check button when Check is valid', () => {
    testValidActions = [ActionType.Check];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText('过牌')).toBeInTheDocument();
  });

  it('renders call button with amount when Call is valid', () => {
    testValidActions = [ActionType.Call];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText(/跟注/)).toBeInTheDocument();
  });

  it('renders raise button when Raise is valid', () => {
    testValidActions = [ActionType.Raise];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText('加注')).toBeInTheDocument();
  });

  it('renders all-in button when AllIn is valid', () => {
    testValidActions = [ActionType.AllIn];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText(/全押/)).toBeInTheDocument();
  });

  it('calls playerAction with Fold when fold button clicked', async () => {
    const user = userEvent.setup();
    testValidActions = [ActionType.Fold, ActionType.Check];
    render(<ActionPanel playerIndex={0} />);
    await user.click(screen.getByText('弃牌'));
    expect(mockPlayerAction).toHaveBeenCalledWith(ActionType.Fold);
  });

  it('calls playerAction with Check when check button clicked', async () => {
    const user = userEvent.setup();
    testValidActions = [ActionType.Check];
    render(<ActionPanel playerIndex={0} />);
    await user.click(screen.getByText('过牌'));
    expect(mockPlayerAction).toHaveBeenCalledWith(ActionType.Check);
  });

  it('calls playerAction with Call when call button clicked', async () => {
    const user = userEvent.setup();
    testValidActions = [ActionType.Call];
    render(<ActionPanel playerIndex={0} />);
    await user.click(screen.getByText(/跟注/));
    expect(mockPlayerAction).toHaveBeenCalledWith(ActionType.Call);
  });

  it('calls playerAction with AllIn when all-in button clicked', async () => {
    const user = userEvent.setup();
    testValidActions = [ActionType.AllIn];
    render(<ActionPanel playerIndex={0} />);
    await user.click(screen.getByText(/全押/));
    expect(mockPlayerAction).toHaveBeenCalledWith(ActionType.AllIn);
  });

  it('shows call amount when amount > 0', () => {
    testStoreState = {
      ...defaultStoreState(),
      players: [
        { id: 0, name: 'Human', chips: 980, currentBet: 10, totalBet: 10, folded: false, isAllIn: false, isAI: false, isDealer: false, isSmallBlind: false, isBigBlind: false },
        { id: 1, name: 'AI-1', chips: 1000, currentBet: 50, totalBet: 50, folded: false, isAllIn: false, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false },
      ],
      pot: 60,
      maxBet: 50,
      minRaise: 20,
      currentRound: Round.Flop,
    };
    testValidActions = [ActionType.Call];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText(/40/)).toBeInTheDocument();
  });

  it('shows raise popup when raise button clicked', async () => {
    const user = userEvent.setup();
    testValidActions = [ActionType.Raise];
    render(<ActionPanel playerIndex={0} />);
    await user.click(screen.getByText('加注'));
    expect(screen.getByText('确认加注')).toBeInTheDocument();
  });

  it('shows quick bet buttons in raise popup', async () => {
    const user = userEvent.setup();
    testValidActions = [ActionType.Raise];
    render(<ActionPanel playerIndex={0} />);
    await user.click(screen.getByText('加注'));
    expect(screen.getByText('1/2底池')).toBeInTheDocument();
    expect(screen.getByText('底池')).toBeInTheDocument();
    expect(screen.getByText('全押')).toBeInTheDocument();
  });

  it('shows all buttons when multiple actions valid', () => {
    testValidActions = [ActionType.Fold, ActionType.Call, ActionType.Raise, ActionType.AllIn];
    render(<ActionPanel playerIndex={0} />);
    expect(screen.getByText('弃牌')).toBeInTheDocument();
    expect(screen.getByText(/跟注/)).toBeInTheDocument();
    expect(screen.getByText('加注')).toBeInTheDocument();
    expect(screen.getByText(/全押/)).toBeInTheDocument();
  });

  it('returns null when player folded', () => {
    testStoreState = {
      ...defaultStoreState(),
      players: [
        { id: 0, name: 'Human', chips: 980, currentBet: 20, totalBet: 20, folded: true, isAllIn: false, isAI: false, isDealer: false, isSmallBlind: false, isBigBlind: false },
        { id: 1, name: 'AI-1', chips: 1000, currentBet: 20, totalBet: 20, folded: false, isAllIn: false, isAI: true },
        { id: 2, name: 'AI-2', chips: 1000, currentBet: 20, totalBet: 20, folded: false, isAllIn: false, isAI: true },
      ],
    };
    testValidActions = [ActionType.Fold];
    const { container } = render(<ActionPanel playerIndex={0} />);
    expect(container.innerHTML).toBe('');
  });
});