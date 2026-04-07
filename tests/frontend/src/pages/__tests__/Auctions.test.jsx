import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Auctions from '../Auctions';
import { vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  listAuctions: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('Auctions page', () => {
  const auctions = [
    {
      _id: 'one',
      title: 'New Gadget',
      status: 'LIVE',
      startingPrice: 500,
      endTime: new Date().toISOString(),
      item: { name: 'Phone', category: 'Electronics', condition: 'New', images: [] },
    },
    {
      _id: 'two',
      title: 'Good Laptop',
      status: 'LIVE',
      startingPrice: 1500,
      endTime: new Date().toISOString(),
      item: { name: 'Laptop', category: 'Computers', condition: 'Good', images: [] },
    },
    {
      _id: 'three',
      title: 'Like New Camera',
      status: 'UPCOMING',
      startingPrice: 800,
      endTime: new Date().toISOString(),
      item: { name: 'Camera', category: 'Electronics', condition: 'Like New', images: ['http://example.com/camera.jpg'] },
    },
    {
      _id: 'four',
      title: 'Fair Book',
      status: 'ENDED',
      startingPrice: 100,
      endTime: new Date().toISOString(),
      item: { name: 'Book', category: 'Books', condition: 'Fair', images: [] },
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.listAuctions.mockResolvedValue({ auctions });
  });

  function renderWithRouter(initialPath = '/auctions?search=tech') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/auctions" element={<Auctions />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders all content for 100% code coverage', async () => {
    renderWithRouter('/auctions');

    await waitFor(() =>
      expect(apiMocks.listAuctions).toHaveBeenCalledWith({ limit: 50 })
    );

    // Check main heading
    expect(screen.getByRole('heading', { name: /Auctions/i })).toBeInTheDocument();

    // Check all auction cards
    expect(screen.getByText('New Gadget')).toBeInTheDocument();
    expect(screen.getByText('Good Laptop')).toBeInTheDocument();
    expect(screen.getByText('Like New Camera')).toBeInTheDocument();
    expect(screen.getByText('Fair Book')).toBeInTheDocument();

    // Check auction details
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();

    // Check categories (use getAllByText since there are duplicates)
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getByText('Computers')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();

    // Check conditions
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Like New')).toBeInTheDocument();
    expect(screen.getByText('Fair')).toBeInTheDocument();

    // Check prices
    expect(screen.getByText('Starting: ₹500')).toBeInTheDocument();
    expect(screen.getByText('Starting: ₹1500')).toBeInTheDocument();
    expect(screen.getByText('Starting: ₹800')).toBeInTheDocument();
    expect(screen.getByText('Starting: ₹100')).toBeInTheDocument();

    // Check status badges (use getAllByText since there are duplicates)
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();
    expect(screen.getByText('ENDED')).toBeInTheDocument();

    // Check links
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute('href', '/auction/one');
    expect(links[1]).toHaveAttribute('href', '/auction/two');
    expect(links[2]).toHaveAttribute('href', '/auction/three');
    expect(links[3]).toHaveAttribute('href', '/auction/four');
  });

  it('handles search query in URL', async () => {
    renderWithRouter('/auctions?search=phones');

    await waitFor(() =>
      expect(apiMocks.listAuctions).toHaveBeenCalledWith({ search: 'phones', limit: 50 })
    );

    expect(screen.getByRole('heading', { name: /Auctions — phones/i })).toBeInTheDocument();
  });

  it('applies filters correctly', async () => {
    renderWithRouter('/auctions');

    await screen.findByText('New Gadget');

    // Open filter dropdown and apply condition filter
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'good' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(screen.getByText('Good Laptop')).toBeInTheDocument());

    // Test clear filters
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => expect(screen.getByText('New Gadget')).toBeInTheDocument());
  });

  it('handles loading and error states', async () => {
    // Test loading state
    apiMocks.listAuctions.mockImplementation(() => new Promise(() => {}));
    renderWithRouter('/auctions');
    expect(screen.getByText('Loading auctions...')).toBeInTheDocument();

    // Test error state
    apiMocks.listAuctions.mockRejectedValue(new Error('Failed to load'));
    renderWithRouter('/auctions');
    await waitFor(() => expect(screen.getByText('Failed to load')).toBeInTheDocument());
  });

  it('handles empty results', async () => {
    apiMocks.listAuctions.mockResolvedValue({ auctions: [] });
    renderWithRouter('/auctions');

    await waitFor(() => expect(screen.getByText('No items match the selected filters')).toBeInTheDocument());
  });

  it('handles auctions without images', async () => {
    const auctionsNoImages = [
      {
        _id: 'no-img',
        title: 'No Image Item',
        status: 'LIVE',
        startingPrice: 200,
        endTime: new Date().toISOString(),
        item: { name: 'Item', category: 'Other', condition: 'New' },
      },
    ];
    apiMocks.listAuctions.mockResolvedValue({ auctions: auctionsNoImages });
    renderWithRouter('/auctions');

    await waitFor(() => expect(screen.getByText('No image')).toBeInTheDocument());
  });

  it('handles auctions with missing data', async () => {
    const auctionsMissingData = [
      {
        _id: 'missing',
        item: {},
      },
    ];
    apiMocks.listAuctions.mockResolvedValue({ auctions: auctionsMissingData });
    renderWithRouter('/auctions');

    await waitFor(() => expect(screen.getByText('Untitled Auction')).toBeInTheDocument());
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });
});
