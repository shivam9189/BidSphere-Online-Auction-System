import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import MyListings from '../MyListings';

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  getMyAuctions: vi.fn(),
  deleteAuction: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('MyListings page', () => {
  const sampleAuctions = [
    {
      _id: 'a-1',
      title: 'Signed Jersey',
      status: 'LIVE',
      startingPrice: 2500,
      endTime: '2025-01-05T10:00:00Z',
      totalBids: 3,
      item: { images: [] },
    },
  ];

  beforeEach(() => {
    apiMocks.getMyAuctions.mockResolvedValue({ auctions: sampleAuctions });
    apiMocks.deleteAuction.mockResolvedValue({ success: true });
    toastMock.error.mockReset();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <MyListings />
      </MemoryRouter>
    );
  }

  it('loads the seller listings and shows listing rows', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getMyAuctions).toHaveBeenCalledWith({ limit: 100 }));
    expect(screen.getByText(/My Listings/i)).toBeInTheDocument();
    expect(screen.getByText(/Signed Jersey/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Auction/i })).toHaveAttribute('href', '/create-auction');
  });

  it('removes a listing when the seller confirms deletion', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    await screen.findByText(/Signed Jersey/i);

    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));

    await waitFor(() => expect(apiMocks.deleteAuction).toHaveBeenCalledWith('a-1'));
    expect(screen.getByText(/You have no listings yet/i)).toBeInTheDocument();

    confirmSpy.mockRestore();
  });
});
