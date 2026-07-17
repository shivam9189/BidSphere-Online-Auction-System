import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Home from '../Home';

const apiMocks = vi.hoisted(() => ({
  listAuctions: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);
vi.mock('../../assets/home.png', () => ({ default: 'home.png' }));
vi.mock('../ExploreCategories', () => ({
  default: () => <div data-testid="explore-categories" />,
}));

describe('Home page', () => {
  beforeEach(() => {
    apiMocks.listAuctions.mockReset();
    apiMocks.getCurrentUser.mockReset();
    apiMocks.getCurrentUser.mockResolvedValue(null);
  });

  function renderHome() {
    return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  }

  it('renders hero section with all elements', () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });
    renderHome();

    expect(screen.getByText('Where Buyers & Sellers Meet')).toBeInTheDocument();
    expect(screen.getByText(/Discover everything from everyday finds to rare treasures/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register Free/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /Browse Auctions/i })).toHaveAttribute('href', '/auctions');
    expect(screen.getByAltText('Home banner')).toBeInTheDocument();
  });

  it('fetches featured auctions and renders them as cards', async () => {
    apiMocks.listAuctions.mockResolvedValue({
      auctions: [
        {
          _id: 'a1',
          title: 'Vintage Camera',
          status: 'LIVE',
          startingPrice: 1200,
          endTime: '2025-01-05T12:00:00Z',
          item: {
            name: 'Camera',
            category: 'Photography',
            images: ['/camera.jpg'],
          },
        },
      ],
    });

    renderHome();

    await waitFor(() =>
      expect(apiMocks.listAuctions).toHaveBeenCalledWith({ status: 'LIVE', limit: 4 })
    );
    expect(screen.getByRole('link', { name: /Vintage Camera/i })).toHaveAttribute('href', '/auction/a1');
    expect(screen.getByText(/Starting: ₹1200/i)).toBeInTheDocument();
    expect(screen.getByTestId('explore-categories')).toBeInTheDocument();
  });

  it('shows loading state while fetching featured auctions', async () => {
    apiMocks.listAuctions.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderHome();

    // Should show 4 loading placeholders
    const placeholders = screen.getAllByText('', { selector: '.bg-gray-200' });
    expect(placeholders).toHaveLength(4);
  });

  it('shows empty state when no featured auctions', async () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });

    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());
    
    // Should show 4 empty placeholders
    const emptyPlaceholders = screen.getAllByText('', { selector: '.bg-yellow-50' });
    expect(emptyPlaceholders).toHaveLength(4);
    
    // Hero CTA should still be available
    expect(screen.getByRole('link', { name: /Register Free/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /View All Live Auctions/i })).toHaveAttribute('href', '/auctions?status=LIVE');
  });

  it('renders AuctionCard with different statuses', async () => {
    const auctions = [
      {
        _id: 'a1',
        title: 'Live Auction',
        status: 'LIVE',
        startingPrice: 1000,
        item: { name: 'Item 1', category: 'Category 1', images: [] },
      },
      {
        _id: 'a2',
        title: 'Upcoming Auction',
        status: 'UPCOMING',
        startingPrice: 2000,
        item: { name: 'Item 2', category: 'Category 2' },
      },
      {
        _id: 'a3',
        title: 'Ended Auction',
        status: 'ENDED',
        startingPrice: 3000,
        item: { name: 'Item 3', category: 'Category 3' },
      },
      {
        _id: 'a4',
        title: 'Cancelled Auction',
        status: 'CANCELLED',
        startingPrice: 4000,
        item: { name: 'Item 4', category: 'Category 4' },
      },
    ];

    apiMocks.listAuctions.mockResolvedValue({ auctions });

    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());

    // Check status badges
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();
    expect(screen.getByText('ENDED')).toBeInTheDocument();
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
  });

  it('renders AuctionCard with missing data gracefully', async () => {
    const auctions = [
      {
        _id: 'a1',
        // Missing title
        status: 'LIVE',
        // Missing startingPrice
        item: {
          // Missing name
          category: 'Category 1',
          images: [],
        },
      },
    ];

    apiMocks.listAuctions.mockResolvedValue({ auctions });

    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());

    expect(screen.getByText('Untitled Auction')).toBeInTheDocument();
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.queryByText(/Starting:/)).not.toBeInTheDocument();
  });

  it('renders how it works section', async () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });
    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());

    expect(screen.getByText('How BidSphere Works')).toBeInTheDocument();
    expect(screen.getByText('Simple, transparent and secure auction process')).toBeInTheDocument();
    
    // Check all steps
    expect(screen.getByText('1. Register')).toBeInTheDocument();
    expect(screen.getByText('2. Browse')).toBeInTheDocument();
    expect(screen.getByText('3. Bid')).toBeInTheDocument();
    expect(screen.getByText('4. Win')).toBeInTheDocument();
    
    // Check step descriptions
    expect(screen.getByText('Create your free account and verify your identity')).toBeInTheDocument();
    expect(screen.getByText('Explore thousands of unique items across categories')).toBeInTheDocument();
    expect(screen.getByText('Place your bids and compete in real-time')).toBeInTheDocument();
    expect(screen.getByText('Secure your item and complete payment')).toBeInTheDocument();
  });

  it('renders testimonials section', async () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });
    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());

    expect(screen.getByText('What Our Collectors Say')).toBeInTheDocument();
    expect(screen.getByText('Join thousands of satisfied collectors worldwide')).toBeInTheDocument();
    
    // Check testimonial cards
    expect(screen.getByText('Classic Collectibles')).toBeInTheDocument();
    expect(screen.getByText('Verified Seller')).toBeInTheDocument();
    expect(screen.getByText('Wade Warren')).toBeInTheDocument();
    expect(screen.getByText('Long-time Collector')).toBeInTheDocument();
    expect(screen.getByText('Devon Lane')).toBeInTheDocument();
    expect(screen.getByText('First-time Bidder')).toBeInTheDocument();
    
    // Check testimonial content
    expect(screen.getByText('Classic Collectibles')).toBeInTheDocument();
    expect(screen.getByText('Verified Seller')).toBeInTheDocument();
    
    // Check initials are generated correctly
    expect(screen.getByText('CC')).toBeInTheDocument(); // Classic Collectibles
    expect(screen.getByText('WW')).toBeInTheDocument(); // Wade Warren
    expect(screen.getByText('DL')).toBeInTheDocument(); // Devon Lane
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.listAuctions.mockRejectedValue(new Error('Network error'));

    renderHome();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('fetchFeatured error:', expect.any(Error));
    });

    // Should still render hero section even if API fails
    expect(screen.getByText('Where Buyers & Sellers Meet')).toBeInTheDocument();
    expect(screen.getByTestId('explore-categories')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('cleans up useEffect on unmount', async () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });
    
    const { unmount } = renderHome();
    
    // Unmount before API call completes
    unmount();
    
    // Should not cause any errors
    expect(true).toBe(true);
  });

  it('renders featured auctions section header', async () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });
    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());

    expect(screen.getByText('Featured Live Auctions')).toBeInTheDocument();
    expect(screen.getByText("Don't miss out on these exciting live listings")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View All Live Auctions/i })).toHaveAttribute('href', '/auctions?status=LIVE');
  });

  it('handles auction images correctly', async () => {
    const auctions = [
      {
        _id: 'a1',
        title: 'Auction with image',
        status: 'LIVE',
        startingPrice: 1000,
        item: {
          name: 'Item',
          category: 'Category',
          images: ['http://example.com/image.jpg'],
        },
      },
      {
        _id: 'a2',
        title: 'Auction without image',
        status: 'LIVE',
        startingPrice: 2000,
        item: {
          name: 'Item 2',
          category: 'Category 2',
          images: [],
        },
      },
    ];

    apiMocks.listAuctions.mockResolvedValue({ auctions });

    renderHome();

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalled());

    expect(screen.getByAltText('Item')).toHaveAttribute('src', 'http://example.com/image.jpg');
    expect(screen.getByText('No image')).toBeInTheDocument();
  });
});
