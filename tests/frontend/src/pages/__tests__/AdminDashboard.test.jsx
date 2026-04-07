import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminDashboard from '../AdminDashboard';
import { vi } from 'vitest';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  getAllAuctionsAdmin: vi.fn(),
  getAuctionDetailsAdmin: vi.fn(),
  verifyAuction: vi.fn(),
  removeAuctionAdmin: vi.fn(),
  getAdminNotifications: vi.fn(),
  confirmAdminNotification: vi.fn(),
  rejectAdminNotification: vi.fn(),
  getAllDeliveries: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('AdminDashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
  });

  const baseAuction = {
    _id: 'a1',
    title: 'Sample Auction',
    item: { name: 'Vintage Camera', category: 'Collectibles', images: [] },
    status: 'YET_TO_BE_VERIFIED',
    startingPrice: 1000,
    totalBids: 0,
    totalParticipants: 0,
    createdBy: { username: 'seller' },
  };

  function mockDefaultApis() {
    apiMocks.getAllAuctionsAdmin.mockResolvedValue({ auctions: [baseAuction] });
    apiMocks.getAdminNotifications.mockResolvedValue({ notifications: [] });
    apiMocks.getAllDeliveries.mockResolvedValue({ deliveries: [] });
  }

  it('renders all content for 100% code coverage', async () => {
    mockDefaultApis();
    apiMocks.getAuctionDetailsAdmin.mockResolvedValue({
      auction: {
        ...baseAuction,
        item: { ...baseAuction.item, description: 'Details', condition: 'New' },
        verified: false,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        currentWinner: { username: 'winner', email: 'winner@test.com' },
        buyItNowPrice: 2000,
      },
    });
    apiMocks.verifyAuction.mockResolvedValue({
      auction: { ...baseAuction, status: 'UPCOMING', verified: true },
      message: 'Verified!'
    });
    apiMocks.removeAuctionAdmin.mockResolvedValue({
      auction: { ...baseAuction, status: 'REMOVED' },
      message: 'Removed!'
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminDashboard />);

    // Check main heading
    expect(screen.getByRole('heading', { name: /Admin Dashboard/i })).toBeInTheDocument();

    // Check filter dropdown
    expect(screen.getByDisplayValue('All Auctions')).toBeInTheDocument();
    expect(screen.getByText('Filter by Status:')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText(/Payment Verifications/)).toBeInTheDocument();
    expect(screen.getByText('Deliveries')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Sample Auction')).toBeInTheDocument());

    // Check auction table
    expect(screen.getByText('Total Auctions:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // Click on auction row to open details
    fireEvent.click(screen.getByText('Sample Auction').closest('tr'));

    await waitFor(() => expect(apiMocks.getAuctionDetailsAdmin).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Auction Details/i })).toBeInTheDocument());

    // Check auction details modal
    expect(screen.getAllByText('Title').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Item Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Category').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Condition').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Description').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Starting Price').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Current Top Bid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Buy It Now Price').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Start Time').length).toBeGreaterThan(0);
    expect(screen.getAllByText('End Time').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Created By').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Total Bids').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Participants').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Current Winner').length).toBeGreaterThan(0);

    // Test verify auction
    fireEvent.click(screen.getByRole('button', { name: /Verify Auction/i }));
    await waitFor(() => expect(apiMocks.verifyAuction).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Verified!'));

    // Test remove auction
    fireEvent.click(screen.getByRole('button', { name: /Remove Auction/i }));
    await waitFor(() => expect(apiMocks.removeAuctionAdmin).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Removed!'));

    // Close modal
    fireEvent.click(screen.getByText('×'));

    // Test status filter
    const statusSelect = screen.getByDisplayValue('All Auctions');
    fireEvent.change(statusSelect, { target: { value: 'LIVE' } });
    await waitFor(() => expect(apiMocks.getAllAuctionsAdmin).toHaveBeenCalledWith({ status: 'LIVE' }));

    // Test payment verifications modal
    apiMocks.getAdminNotifications.mockResolvedValue({
      notifications: [{
        _id: 'notif1',
        payment: { _id: 'pay1', amount: 1000 },
        auctionId: { title: 'Test Auction' },
        userId: { username: 'testuser', email: 'test@test.com' },
        createdAt: new Date().toISOString(),
      }]
    });

    fireEvent.click(screen.getByText(/Payment Verifications/));
    await waitFor(() => expect(screen.getByText('Payment Verifications')).toBeInTheDocument());
    expect(screen.getByText('No pending payment verifications.')).toBeInTheDocument();

    // Close notifications modal (click the close button in the payment verifications modal)
    const paymentModalClose = screen.getByText('Payment Verifications').closest('div').querySelector('button');
    fireEvent.click(paymentModalClose);

    // Wait for modal to close before opening deliveries
    await waitFor(() => expect(screen.queryByText('Payment Verifications')).not.toBeInTheDocument());

    // Test deliveries modal
    apiMocks.getAllDeliveries.mockResolvedValue({
      deliveries: [{
        _id: 'del1',
        auctionId: { title: 'Test Auction', item: { name: 'Test Item' } },
        sellerId: { username: 'seller', email: 'seller@test.com' },
        buyerId: { username: 'buyer', email: 'buyer@test.com' },
        buyerAddress: {
          name: 'Test Buyer',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country'
        },
        sellerAddress: {
          street: '456 Seller St',
          city: 'Seller City',
          state: 'SS',
          postalCode: '67890',
          country: 'Seller Country'
        },
        paymentStatus: 'PAID',
        deliveryStatus: 'PENDING',
      }]
    });

    fireEvent.click(screen.getAllByText('Deliveries')[0]); // Click the button, not the modal heading
    await waitFor(() => expect(screen.getByRole('heading', { name: /Deliveries/i })).toBeInTheDocument());
    expect(screen.getAllByText('Auction').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Seller').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Buyer (Winner)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Buyer Address').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Seller Address').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);

    // Close deliveries modal
    fireEvent.click(screen.getByText('×'));

    confirmSpy.mockRestore();
  });

  it('handles error states', async () => {
    apiMocks.getAllAuctionsAdmin.mockRejectedValue(new Error('Failed to load'));
    apiMocks.getAdminNotifications.mockResolvedValue({ notifications: [] });
    apiMocks.getAllDeliveries.mockResolvedValue({ deliveries: [] });

    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Failed to load')).toBeInTheDocument());
  });

  it('handles empty states', async () => {
    apiMocks.getAllAuctionsAdmin.mockResolvedValue({ auctions: [] });
    apiMocks.getAdminNotifications.mockResolvedValue({ notifications: [] });
    apiMocks.getAllDeliveries.mockResolvedValue({ deliveries: [] });

    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('No auctions found.')).toBeInTheDocument());

    // Test empty notifications
    fireEvent.click(screen.getByText(/Payment Verifications/));
    await waitFor(() => expect(screen.getByText('No pending payment verifications.')).toBeInTheDocument());
    fireEvent.click(screen.getByText('×'));

    // Test empty deliveries
    fireEvent.click(screen.getByText('Deliveries'));
    await waitFor(() => expect(screen.getByText('No deliveries found.')).toBeInTheDocument());
  });
});
