import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Watchlist from '../Watchlist';

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  getWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const confirmSpy = vi.spyOn(window, 'confirm');

function renderPage() {
  return render(
    <MemoryRouter>
      <Watchlist />
    </MemoryRouter>
  );
}

describe('Watchlist page', () => {
  const sampleWatchlist = [
    {
      _id: 'w1',
      auctionId: 'a1',
      auction: {
        _id: 'a1',
        title: 'Vintage Guitar',
        currentBid: 5000,
        startingPrice: 3000,
        endTime: '2025-01-01T00:00:00Z',
        totalBids: 7,
        item: { category: 'Music', condition: 'Used', images: [] },
      },
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.getCurrentUser.mockResolvedValue({ user: { username: 'Buyer' } });
    apiMocks.getWatchlist.mockResolvedValue({ watchlist: sampleWatchlist });
    apiMocks.removeFromWatchlist.mockResolvedValue({ success: true });
    confirmSpy.mockReturnValue(true);
  });

  afterAll(() => {
    confirmSpy.mockRestore();
  });

  it('loads watchlist entries and shows summary counts', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getWatchlist).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /Watchlist/i })).toBeInTheDocument();
    expect(screen.getByText(/Vintage Guitar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    expect(screen.getByText('Showing 1 items')).toBeInTheDocument();
  });

  it('filters when search query entered', async () => {
    renderPage();
    await screen.findByText(/Vintage Guitar/i);

    fireEvent.change(screen.getByPlaceholderText(/Search auction/i), { target: { value: 'nonexistent' } });
    expect(screen.getByText(/No items in watchlist/i)).toBeInTheDocument();
  });

  it('removes item after confirmation', async () => {
    renderPage();
    await screen.findByText(/Vintage Guitar/i);

    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    await waitFor(() => expect(apiMocks.removeFromWatchlist).toHaveBeenCalledWith('a1'));
    expect(screen.getByText(/No items in watchlist/i)).toBeInTheDocument();
  });

  it('shows empty state when API returns empty list', async () => {
    apiMocks.getWatchlist.mockResolvedValueOnce({ watchlist: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/No items in watchlist/i)).toBeInTheDocument());
  });
});
