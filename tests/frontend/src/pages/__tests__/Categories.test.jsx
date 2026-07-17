import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Categories from '../Categories';
import { vi } from 'vitest';

vi.mock('../../constants/categories', () => ({
  default: [
    { value: 'electronics', label: 'Electronics', image: '/electronics.jpg' },
    { value: 'art', label: 'Art', image: '/art.jpg' },
    { value: 'fashion', label: 'Fashion', image: '/fashion.jpg' },
  ],
}));

const apiMocks = vi.hoisted(() => ({
  listAuctions: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('Categories page', () => {
  beforeEach(() => {
    apiMocks.listAuctions.mockReset();
  });

  function renderPage(initialPath = '/categories') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
          <Route path="/auction/:id" element={<div data-testid="auction-link" />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('filters categories by search query', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/search categories/i), { target: { value: 'art' } });

    expect(screen.getByRole('button', { name: /art/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /electronics/i })).not.toBeInTheDocument();
  });

  it('loads auctions for selected category', async () => {
    apiMocks.listAuctions.mockResolvedValue({
      auctions: [
        {
          _id: 'auc1',
          title: 'Abstract Painting',
          status: 'LIVE',
          startingPrice: 5000,
          endTime: '2025-01-02T10:00:00Z',
          item: { name: 'Abstract Painting', category: 'Art', condition: 'New', images: [] },
        },
      ],
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /art/i }));

    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalledWith({ category: 'art', limit: 50 }));
    const cards = await screen.findAllByText('Abstract Painting');
    expect(cards.length).toBeGreaterThan(0);
  });
});
