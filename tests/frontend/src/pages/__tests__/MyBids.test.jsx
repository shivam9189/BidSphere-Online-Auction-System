import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import MyBids from '../MyBids';

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getBiddingHistory: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MyBids page', () => {
  const now = new Date('2025-01-01T08:00:00Z').getTime();
  const baseHistory = [
    {
      _id: 'bid1',
      amount: 5000,
      auctionId: {
        _id: 'a1',
        title: 'Rare Coin',
        currentBid: 4500,
        totalBids: 5,
        item: { name: 'Coin', images: [] },
        endTime: '2025-01-02T10:00:00Z',
      },
    },
    {
      _id: 'bid2',
      amount: 3000,
      youWon: true,
      auctionId: {
        _id: 'a2',
        title: 'Vintage Painting',
        currentBid: 3000,
        totalBids: 8,
        item: { name: 'Painting', images: [] },
        endTime: '2024-12-20T10:00:00Z',
      },
    },
  ];

  let dateSpy;

  beforeEach(() => {
    apiMocks.getCurrentUser.mockResolvedValue({ user: { username: 'bidder1' } });
    apiMocks.getBiddingHistory.mockResolvedValue({ history: baseHistory, total: baseHistory.length });
    mockNavigate.mockReset();
    dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <MyBids />
      </MemoryRouter>
    );
  }

  it('loads bidding history and shows summary cards', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getBiddingHistory).toHaveBeenCalledWith({ page: 1, limit: 10 }));
    expect(screen.getByText(/Rare Coin/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Bids/i)).toBeInTheDocument();
    expect(screen.getByText(/Won \(1\)/i)).toBeInTheDocument();
  });

  it('filters bids when switching tabs and using search', async () => {
    renderPage();
    await screen.findByText(/Rare Coin/i);

    fireEvent.click(screen.getByText(/Won \(1\)/i));
    expect(screen.getByText(/Vintage Painting/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rare Coin/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Search auctions by name/i), {
      target: { value: 'painting' },
    });
    expect(screen.getByText(/Vintage Painting/i)).toBeInTheDocument();
  });
});
