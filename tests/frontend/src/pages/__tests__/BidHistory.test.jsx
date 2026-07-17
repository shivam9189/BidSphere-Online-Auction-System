import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import BidHistory from '../BidHistory';

const apiMocks = vi.hoisted(() => ({
  getAuction: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/bid-history/a1']}>
      <Routes>
        <Route path="/bid-history/:id" element={<BidHistory />} />
        <Route path="/auction/:id" element={<div data-testid="auction-page">Auction page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BidHistory page', () => {
  beforeEach(() => {
    apiMocks.getAuction.mockReset();
  });

  it('renders bid table and summary stats after loading', async () => {
    apiMocks.getAuction.mockResolvedValue({
      auction: { _id: 'a1', title: 'Vintage Camera', item: { name: 'Camera' } },
      topBids: [
        {
          amount: 12000,
          userId: { username: 'alice' },
          createdAt: '2024-12-31T12:00:00Z',
        },
        {
          amount: 9500,
          userId: { username: 'bob' },
          createdAt: '2024-12-31T11:00:00Z',
        },
      ],
    });

    renderWithRoute();

    expect(
      await screen.findByRole('heading', { name: /Bid History/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/₹12,000/)[0]).toBeInTheDocument();
    expect(screen.getByText('Leading')).toBeInTheDocument();
    expect(screen.getByText('Outbid')).toBeInTheDocument();
    const highestStat = screen.getByText('Highest Bid').parentElement;
    expect(within(highestStat).getByText(/12,000/)).toBeInTheDocument();
  });

  it('navigates back to auction page when back button is clicked', async () => {
    apiMocks.getAuction.mockResolvedValue({
      auction: { _id: 'a1', title: 'Vintage Camera' },
      topBids: [],
    });

    renderWithRoute();
    await screen.findByRole('heading', { name: /Bid History/i });

    fireEvent.click(screen.getByRole('button', { name: /Back to Auction/i }));

    await waitFor(() => expect(screen.getByTestId('auction-page')).toBeInTheDocument());
  });
});
