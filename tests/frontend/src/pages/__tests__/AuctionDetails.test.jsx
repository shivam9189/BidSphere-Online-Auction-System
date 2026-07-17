import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuctionDetails from '../AuctionDetails';
import { vi } from 'vitest';

// Mock react-router-dom with a mockNavigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'auction-1' }),
  };
});

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

vi.mock('../SellerRating', () => ({ default: () => <div data-testid="seller-rating" /> }));
vi.mock('../../components/SellerRatingSummary', () => ({ default: () => <div data-testid="seller-rating-summary" /> }));
vi.mock('../RatingForm', () => ({ default: () => <div data-testid="rating-form" /> }));

const apiMocks = vi.hoisted(() => ({
  getAuction: vi.fn(),
  placeBid: vi.fn(),
  getCurrentUser: vi.fn(),
  listPayments: vi.fn(),
  setAutoBid: vi.fn(),
  editAutoBid: vi.fn(),
  activateAutoBid: vi.fn(),
  deactivateAutoBid: vi.fn(),
  getUserAutoBid: vi.fn(),
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
  getWatchlist: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('AuctionDetails page', () => {
  const baseAuction = {
    _id: 'auction-1',
    title: 'Vintage Camera',
    status: 'LIVE',
    startingPrice: 1000,
    minIncrement: 50,
    currentBid: 1500,
    createdBy: { _id: 'seller-1', username: 'seller' },
    item: {
      name: 'Camera',
      category: 'Collectibles',
      condition: 'Good',
      images: [],
    },
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();

    apiMocks.getAuction.mockResolvedValue({ auction: baseAuction, topBids: [] });
    apiMocks.getCurrentUser.mockResolvedValue({ user: null });
    apiMocks.listPayments.mockResolvedValue({ data: [] });
    apiMocks.addToWatchlist.mockResolvedValue({});
    apiMocks.removeFromWatchlist.mockResolvedValue({});
    apiMocks.getWatchlist.mockResolvedValue({ watchlist: [] });
    apiMocks.getUserAutoBid.mockResolvedValue({});
  });

  function renderWithRouter() {
    return render(
      <MemoryRouter initialEntries={[`/auction/${baseAuction._id}`]}>
        <Routes>
          <Route path="/auction/:id" element={<AuctionDetails />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders basic auction details for unpaid users', async () => {
    renderWithRouter();

    await waitFor(() =>
      expect(screen.getByText('Vintage Camera')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /Pay Token Fee/i })).toBeInTheDocument();
  });

  it('allows adding to watchlist from unpaid view', async () => {
    renderWithRouter();

    const watchlistButton = await screen.findByRole('button', { name: /Add to Watchlist/i });
    fireEvent.click(watchlistButton);

    await waitFor(() => expect(apiMocks.addToWatchlist).toHaveBeenCalledWith('auction-1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Added to watchlist'));
  });

  it('allows removing from watchlist', async () => {
    const mockUser = { _id: 'user-1', username: 'viewer' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.getWatchlist.mockResolvedValue({ 
      watchlist: [{ auctionId: 'auction-1' }] 
    });

    renderWithRouter();

    const watchlistButton = await screen.findByRole('button', { name: /Remove from Watchlist/i });
    fireEvent.click(watchlistButton);

    await waitFor(() => expect(apiMocks.removeFromWatchlist).toHaveBeenCalledWith('auction-1'));
    await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith('Removed from watchlist'));
  });

  it('shows loading state while fetching auction', () => {
    apiMocks.getAuction.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    renderWithRouter();
    expect(screen.getByText(/Loading auction.../i)).toBeInTheDocument();
  });

  it('shows error message when auction fetch fails', async () => {
    const errorMessage = 'Failed to load auction';
    apiMocks.getAuction.mockRejectedValue(new Error(errorMessage));
    
    renderWithRouter();
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('shows auction not found when no auction data', async () => {
    apiMocks.getAuction.mockResolvedValue(null);
    
    renderWithRouter();
    expect(await screen.findByText('Auction not found')).toBeInTheDocument();
  });

  it('allows placing a bid when user is logged in and has paid', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: 'user-1' }]
    });
    apiMocks.placeBid.mockResolvedValue({ success: true });
    
    renderWithRouter();
    
    // Wait for auction to load and payment check to complete
    await waitFor(() => expect(screen.getByText('Vintage Camera')).toBeInTheDocument());
    
    // Wait for bid form to be visible (paid view)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
    });
    
    const bidInput = screen.getByPlaceholderText('Enter amount');
    const placeBidButton = screen.getByRole('button', { name: /Place Bid/i });
    
    fireEvent.change(bidInput, { target: { value: '1600' } });
    fireEvent.click(placeBidButton);
    
    await waitFor(() => {
      expect(apiMocks.placeBid).toHaveBeenCalledWith('auction-1', 1600);
      expect(toastMock.success).toHaveBeenCalledWith('Bid placed successfully!');
    });
  });

  it('shows error when bid is too low', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: 'user-1' }]
    });
    
    renderWithRouter();
    
    await waitFor(() => expect(screen.getByText('Vintage Camera')).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
    });
    
    const bidInput = screen.getByPlaceholderText('Enter amount');
    const placeBidButton = screen.getByRole('button', { name: /Place Bid/i });
    
    fireEvent.change(bidInput, { target: { value: '100' } });
    fireEvent.click(placeBidButton);
    
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Your bid must be at least ₹1550 (current: ₹1500 + min increment: ₹50)');
    });
  });

  it('validates bid amount before submission', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: 'user-1' }]
    });
    
    renderWithRouter();
    
    await waitFor(() => expect(screen.getByText('Vintage Camera')).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
    });
    
    const bidInput = screen.getByPlaceholderText('Enter amount');
    const placeBidButton = screen.getByRole('button', { name: /Place Bid/i });
    
    // Test empty bid
    fireEvent.change(bidInput, { target: { value: '' } });
    fireEvent.click(placeBidButton);
    expect(apiMocks.placeBid).not.toHaveBeenCalled();
    
    // Test bid lower than current
    fireEvent.change(bidInput, { target: { value: '1000' } });
    fireEvent.click(placeBidButton);
    expect(apiMocks.placeBid).not.toHaveBeenCalled();
    
    // Test valid bid
    fireEvent.change(bidInput, { target: { value: '1600' } });
    fireEvent.click(placeBidButton);
    await waitFor(() => {
      expect(apiMocks.placeBid).toHaveBeenCalled();
    });
  });

  it('toggles auto-bid functionality', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: 'user-1' }]
    });
    apiMocks.setAutoBid.mockResolvedValue({ _id: 'autoBid-1', maxLimit: 2000 });
    
    renderWithRouter();
    
    await screen.findByPlaceholderText('Enter amount');
    
    // Click on auto-bid toggle (should show modal since no auto-bid exists)
    const autoBidToggle = screen.getByRole('checkbox', { hidden: true });
    fireEvent.click(autoBidToggle);
    
    // Should show auto-bid modal
    const autoBidInput = await screen.findByPlaceholderText('Enter maximum amount');
    const saveAutoBidButton = screen.getByRole('button', { name: /Save Auto-Bid/i });
    
    // Set auto-bid amount and save
    fireEvent.change(autoBidInput, { target: { value: '2000' } });
    fireEvent.click(saveAutoBidButton);
    
    await waitFor(() => {
      expect(apiMocks.setAutoBid).toHaveBeenCalledWith('auction-1', 2000);
      expect(toastMock.success).toHaveBeenCalledWith('Auto-bid created successfully!');
    });
  });

  it('shows payment status for paid users', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: 'user-1' }]
    });
    
    renderWithRouter();
    
    // Should show bid form instead of payment button
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pay Token Fee/i })).not.toBeInTheDocument();
    });
  });

  it('displays seller rating component', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByTestId('seller-rating-summary')).toBeInTheDocument();
    });
  });

  it('displays countdown timer for live auction', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24); // 24 hours from now
    
    apiMocks.getAuction.mockResolvedValue({
      auction: {
        ...baseAuction,
        endTime: futureDate.toISOString(),
      },
      topBids: []
    });
    
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText(/AUCTION ENDS IN/i)).toBeInTheDocument();
    });
  });

  it('shows ended message when auction has ended', async () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago
    
    const mockUser = { _id: 'user-1', username: 'viewer' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: mockUser._id }]
    });
    apiMocks.getAuction.mockResolvedValue({
      auction: {
        ...baseAuction,
        status: 'ENDED',
        endTime: pastDate.toISOString(),
      },
      topBids: []
    });
    
    renderWithRouter();
    
    const bidInput = await screen.findByPlaceholderText('Enter amount');
    expect(bidInput).toBeDisabled();
    expect(screen.getByText('Final Price: ₹1500')).toBeInTheDocument();
    expect(screen.getByText(/Bidding is only allowed when auction is LIVE/i)).toBeInTheDocument();
  });

  it('shows bid history when available', async () => {
    const mockBids = [
      { _id: 'bid-1', userId: { username: 'bidder1' }, amount: 1200, createdAt: new Date() },
      { _id: 'bid-2', userId: { username: 'bidder2' }, amount: 1500, createdAt: new Date() },
    ];
    
    const mockUser = { _id: 'user-1', username: 'viewer' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: mockUser._id }]
    });
    apiMocks.getAuction.mockResolvedValue({
      auction: baseAuction,
      topBids: mockBids
    });
    
    renderWithRouter();

    await screen.findByPlaceholderText('Enter amount');
    expect(screen.getByText(/Live Auction Activity/i)).toBeInTheDocument();
    expect(screen.getByText('bidder1')).toBeInTheDocument();
    expect(screen.getByText('bidder2')).toBeInTheDocument();
  });

  it('handles share functionality', async () => {
    const mockShare = vi.fn();
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
    });

    renderWithRouter();
    
    const shareButton = await screen.findByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Vintage Camera',
        url: window.location.href,
      });
    });
  });

  it('handles report functionality', async () => {
    const mockLocation = { href: window.location.href };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    renderWithRouter();
    
    const reportButton = await screen.findByRole('button', { name: /Report/i });
    fireEvent.click(reportButton);
    
    await waitFor(() => {
      expect(toastMock.info).toHaveBeenCalledWith('Opening mail client to report the auction');
    });
  });

  it('shows seller view for seller users', async () => {
    const mockSeller = { _id: 'seller-1', username: 'seller' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockSeller });
    
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText(/You are the seller of this auction/i)).toBeInTheDocument();
    });
  });

  it('handles different auction statuses', async () => {
    const statuses = ['UPCOMING', 'YET_TO_BE_VERIFIED', 'CANCELLED'];
    
    for (const status of statuses) {
      vi.clearAllMocks();
      apiMocks.getAuction.mockResolvedValue({
        auction: { ...baseAuction, status },
        topBids: []
      });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(status)).toBeInTheDocument();
      });
    }
  });

  it('covers edge cases for image handling', async () => {
    const auctionWithImages = {
      ...baseAuction,
      item: {
        ...baseAuction.item,
        images: ['/test-image.jpg', '/test-image2.jpg', '/test-image3.jpg', '/test-image4.jpg', '/test-image5.jpg', '/test-image6.jpg', '/test-image7.jpg']
      }
    };
    
    const mockUser = { _id: 'user-1', username: 'viewer' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: mockUser._id }]
    });
    apiMocks.getAuction.mockResolvedValue({
      auction: auctionWithImages,
      topBids: []
    });
    
    renderWithRouter();

    await screen.findByPlaceholderText('Enter amount');
    expect(screen.getByAltText('Camera')).toBeInTheDocument();
    expect(screen.getByText(/\+1/)).toBeInTheDocument(); // Should show "+1" for 7th image
  });

  it('handles auto-bid edit scenario', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'SUCCESS', auctionId: 'auction-1', bidderId: 'user-1' }]
    });
    apiMocks.getUserAutoBid.mockResolvedValue({ 
      autoBid: { _id: 'autoBid-1', maxLimit: 2000, isActive: false }
    });
    apiMocks.editAutoBid.mockResolvedValue({ maxLimit: 2500 });
    
    renderWithRouter();
    
    await screen.findByPlaceholderText('Enter amount');
    
    // Click on auto-bid toggle (should activate existing auto-bid)
    const autoBidToggle = screen.getByRole('checkbox', { hidden: true });
    fireEvent.click(autoBidToggle);
    
    await waitFor(() => {
      expect(apiMocks.activateAutoBid).toHaveBeenCalledWith('auction-1', 'autoBid-1');
    });
  });

  it('covers timer edge cases', async () => {
    const auctionWithInvalidDate = {
      ...baseAuction,
      endTime: 'invalid-date',
    };
    
    // Mock a logged-in user who has paid
    const mockUser = { _id: 'user-1', username: 'testuser' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'CAPTURED', auctionId: auctionWithInvalidDate._id, bidderId: mockUser._id }] 
    });
    
    apiMocks.getAuction.mockResolvedValue({
      auction: auctionWithInvalidDate,
      topBids: []
    });
    
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getAllByText('--')).toHaveLength(4); // Should show dashes for all time units
    });
  });

  it('handles auction ended with winner info', async () => {
    const mockWinner = {
      _id: 'winner-1',
      username: 'auctionwinner',
      profilePhoto: '/winner.jpg'
    };
    
    const mockBids = [
      { _id: 'bid-1', userId: mockWinner, amount: 2000, createdAt: new Date() }
    ];
    
    // Mock a logged-in user who has paid
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockWinner });
    apiMocks.listPayments.mockResolvedValue({ 
      data: [{ status: 'CAPTURED', auctionId: baseAuction._id, bidderId: mockWinner._id }] 
    });
    
    apiMocks.getAuction.mockResolvedValue({
      auction: {
        ...baseAuction,
        status: 'ENDED',
        endTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        auctionWinner: mockWinner._id,
        currentBid: 2000
      },
      topBids: mockBids
    });
    
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Final Price: ₹2000')).toBeInTheDocument();
    });
  });

  it('handles registered user payment status', async () => {
    const mockUser = { _id: 'user-1', username: 'bidder' };
    apiMocks.getCurrentUser.mockResolvedValue({ user: mockUser });
    apiMocks.getAuction.mockResolvedValue({
      auction: {
        ...baseAuction,
        registrations: ['user-1'] // User is registered
      },
      topBids: []
    });
    
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
    });
  });

  it('handles clipboard fallback for share', async () => {
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
    });
    
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue()
    };
    Object.defineProperty(global.navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
    });

    renderWithRouter();
    
    const shareButton = await screen.findByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(window.location.href);
      expect(toastMock.success).toHaveBeenCalledWith('Auction link copied to clipboard');
    });
  });

  it('handles mailto fallback for share', async () => {
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
    });
    
    Object.defineProperty(global.navigator, 'clipboard', {
      value: undefined,
      writable: true,
    });

    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    renderWithRouter();
    
    const shareButton = await screen.findByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
      expect(toastMock.info).toHaveBeenCalledWith('Opened mail client to share link');
    });
  });
});
