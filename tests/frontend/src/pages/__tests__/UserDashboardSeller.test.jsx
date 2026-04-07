import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import UserDashboardSeller from '../UserDashboardSeller';

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getMyAuctions: vi.fn(),
  deleteAuction: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const confirmSpy = vi.spyOn(window, 'confirm');

function renderPage() {
  return render(
    <MemoryRouter>
      <UserDashboardSeller />
    </MemoryRouter>
  );
}

const sampleUser = { user: { username: 'Seller Ace' } };
const sampleAuctions = [
  {
    _id: 'a1',
    title: 'Signed Jersey',
    status: 'LIVE',
    startingPrice: 500,
    currentBid: 800,
    totalBids: 3,
    totalParticipants: 4,
    endTime: '2025-01-05T00:00:00Z',
  },
  {
    _id: 'a2',
    title: 'Collector Coin',
    status: 'ENDED',
    startingPrice: 100,
    currentBid: 2500,
    totalBids: 8,
    totalParticipants: 8,
    endTime: '2025-01-01T00:00:00Z',
  },
];

describe('UserDashboardSeller page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.getCurrentUser.mockResolvedValue(sampleUser);
    apiMocks.getMyAuctions.mockResolvedValue({ auctions: sampleAuctions });
    apiMocks.deleteAuction.mockResolvedValue({ success: true });
    confirmSpy.mockReturnValue(true);
  });

  afterAll(() => {
    confirmSpy.mockRestore();
  });

  it('loads seller profile, stats, and listings', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getMyAuctions).toHaveBeenCalled());
    expect(screen.getByText(/Seller Ace/i)).toBeInTheDocument();
    expect(screen.getByText(/Signed Jersey/i)).toBeInTheDocument();
    expect(screen.getByText(/Collector Coin/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Earnings/i)).toBeInTheDocument();
  });

  it('filters to ended listings when Earnings shortcut clicked', async () => {
    renderPage();
    await screen.findByText(/Signed Jersey/i);

    fireEvent.click(screen.getByRole('button', { name: /Earnings/i }));
    await waitFor(() => expect(screen.getByText(/Ended Listings/i)).toBeInTheDocument());
    expect(screen.queryByText(/Signed Jersey/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Collector Coin/i)).toBeInTheDocument();
  });

  it('deletes an auction after confirmation', async () => {
    renderPage();
    await screen.findByText(/Signed Jersey/i);

    fireEvent.click(screen.getAllByRole('button', { name: /Delete/i })[0]);

    await waitFor(() => expect(apiMocks.deleteAuction).toHaveBeenCalledWith('a1'));
    expect(screen.queryByText(/Signed Jersey/i)).not.toBeInTheDocument();
  });
});
