import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import UserDashboardBuyer from '../UserDashboardBuyer';

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getWatchlist: vi.fn(),
  getBiddingHistory: vi.fn(),
  getMyDeliveries: vi.fn(),
  getMyPayments: vi.fn(),
  createDelivery: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const pdfMock = vi.hoisted(() => vi.fn());
vi.mock('../../utils/invoicePDF', () => ({
  generateInvoicePDF: pdfMock,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <UserDashboardBuyer />
    </MemoryRouter>
  );
}

const sampleUser = {
  _id: 'user1',
  username: 'Buyer Hero',
  address: {
    street: '1 Main St',
    city: 'Metro',
    state: 'CA',
    postalCode: '90000',
    country: 'USA',
  },
  phone: '1234567890',
};

const sampleWatchlist = [
  {
    _id: 'w1',
    auctionId: {
      _id: 'a1',
      title: 'Vintage Camera',
      currentBid: 2000,
      startingPrice: 1000,
      endTime: '2025-01-01T00:00:00Z',
      totalBids: 5,
      item: { name: 'Camera', category: 'Electronics', condition: 'Used' },
    },
  },
];

const baseHistory = [
  {
    _id: 'hist1',
    auctionId: { _id: 'a2', title: 'Rare Comic', status: 'ENDED', endTime: '2025-01-02T00:00:00Z' },
    youWon: true,
    final: 7500,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    _id: 'hist2',
    auctionId: { _id: 'a3', title: 'Vintage Bike', status: 'ENDED', endTime: '2025-01-05T00:00:00Z' },
    youWon: true,
    final: 9000,
    createdAt: '2025-01-03T00:00:00Z',
  },
];

describe('UserDashboardBuyer page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.getCurrentUser.mockResolvedValue({ user: sampleUser });
    apiMocks.getWatchlist.mockResolvedValue({ watchlist: sampleWatchlist });
    apiMocks.getBiddingHistory.mockResolvedValue({ history: baseHistory });
    apiMocks.getMyDeliveries.mockResolvedValue({
      deliveries: [
        { auctionId: { _id: 'a2' }, buyerAddress: { street: '1 Main St' } },
      ],
    });
    apiMocks.getMyPayments.mockResolvedValue({
      payments: [
        { auctionId: 'a2', status: 'SUCCESS' },
      ],
    });
    apiMocks.createDelivery.mockResolvedValue({ success: true });
    pdfMock.mockReset();
  });

  it('loads dashboard data and displays watchlist, unpaid wins, and deliveries', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getWatchlist).toHaveBeenCalled());

    expect(screen.getByText(/Vintage Camera/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rare Comic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vintage Bike/i).length).toBeGreaterThan(0);

    expect(screen.getByRole('link', { name: /Pay Now/i })).toBeInTheDocument();
    expect(screen.getByText(/Delivery Saved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Invoice/i })).toBeInTheDocument();
  });

  it('submits delivery address for a paid auction without saved delivery', async () => {
    apiMocks.getMyDeliveries
      .mockResolvedValueOnce({ deliveries: [] })
      .mockResolvedValueOnce({
        deliveries: [
          { auctionId: { _id: 'a2' }, buyerAddress: { street: 'Updated' } },
        ],
      });

    renderPage();
    await screen.findByText(/Vintage Camera/i);

    fireEvent.click(screen.getByRole('button', { name: /Add Delivery Address/i }));

    fireEvent.change(screen.getByPlaceholderText(/Full name/i), { target: { value: 'Buyer Hero' } });
    fireEvent.change(screen.getByPlaceholderText(/Phone/i), { target: { value: '9999999999' } });
    fireEvent.change(screen.getByPlaceholderText(/Street address/i), { target: { value: '42 Test St' } });
    fireEvent.change(screen.getByPlaceholderText(/City/i), { target: { value: 'Test City' } });
    fireEvent.change(screen.getByPlaceholderText(/State/i), { target: { value: 'TS' } });
    fireEvent.change(screen.getByPlaceholderText(/Postal code/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText(/Country/i), { target: { value: 'Wonderland' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Delivery Address/i }));

    await waitFor(() => expect(apiMocks.createDelivery).toHaveBeenCalled());
    expect(apiMocks.createDelivery.mock.calls[0][0]).toMatchObject({
      auctionId: 'a2',
      buyerAddress: expect.objectContaining({ city: 'Test City' }),
    });
  });

  it('downloads invoice when delivery exists', async () => {
    renderPage();
    await screen.findByRole('button', { name: /Invoice/i });

    fireEvent.click(screen.getByRole('button', { name: /Invoice/i }));
    expect(pdfMock).toHaveBeenCalledTimes(1);
  });
});
