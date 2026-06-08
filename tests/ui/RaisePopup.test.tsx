import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaisePopup } from '../../src/components/RaisePopup';

describe('RaisePopup', () => {
  const baseProps = {
    minRaise: 40,
    maxTotalBet: 1000,
    halfPotTotalBet: 150,
    potTotalBet: 300,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    baseProps.onConfirm.mockClear();
    baseProps.onClose.mockClear();
    cleanup();
  });

  it('renders with quick bet buttons', () => {
    render(<RaisePopup {...baseProps} />);
    expect(screen.getByText('1/2底池')).toBeInTheDocument();
    expect(screen.getByText('底池')).toBeInTheDocument();
    expect(screen.getByText('全押')).toBeInTheDocument();
  });

  it('renders confirm button', () => {
    render(<RaisePopup {...baseProps} />);
    expect(screen.getByText('确认加注')).toBeInTheDocument();
  });

  it('displays the current raise amount', () => {
    render(<RaisePopup {...baseProps} />);
    // Default is minRaise = 40
    expect(screen.getByText(/加注至 40/)).toBeInTheDocument();
  });

  it('renders a range slider', () => {
    render(<RaisePopup {...baseProps} />);
    const slider = document.querySelector('input[type="range"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '40');
    expect(slider).toHaveAttribute('max', '1000');
    expect(slider).toHaveAttribute('step', '10');
  });

  it('quick bet button "1/2底池" sets amount to halfPotTotalBet', async () => {
    const user = userEvent.setup();
    render(<RaisePopup {...baseProps} />);
    await user.click(screen.getByText('1/2底池'));
    expect(screen.getByText(/加注至 150/)).toBeInTheDocument();
  });

  it('quick bet button "底池" sets amount to potTotalBet', async () => {
    const user = userEvent.setup();
    render(<RaisePopup {...baseProps} />);
    await user.click(screen.getByText('底池'));
    expect(screen.getByText(/加注至 300/)).toBeInTheDocument();
  });

  it('quick bet button "全押" sets amount to maxTotalBet', async () => {
    const user = userEvent.setup();
    render(<RaisePopup {...baseProps} />);
    await user.click(screen.getByText('全押'));
    expect(screen.getByText(/加注至 1000/)).toBeInTheDocument();
  });

  it('calls onConfirm with selected amount when confirm clicked', async () => {
    const user = userEvent.setup();
    render(<RaisePopup {...baseProps} />);
    // First click "底池" quick bet
    await user.click(screen.getByText('底池'));
    // Then click confirm
    await user.click(screen.getByText('确认加注'));
    expect(baseProps.onConfirm).toHaveBeenCalledWith(300);
  });

  it('calls onConfirm with minRaise when confirm clicked without changing amount', async () => {
    const user = userEvent.setup();
    render(<RaisePopup {...baseProps} />);
    await user.click(screen.getByText('确认加注'));
    expect(baseProps.onConfirm).toHaveBeenCalledWith(40);
  });

  it('updates amount via slider', async () => {
    render(<RaisePopup {...baseProps} />);
    const slider = document.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: '500' } });
    expect(screen.getByText(/加注至 500/)).toBeInTheDocument();
  });

  it('calls onClose when clicking outside the popup', async () => {
    render(<RaisePopup {...baseProps} />);
    // Click on document body (outside the popup)
    await userEvent.setup().click(document.body);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});