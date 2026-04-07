import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SellerRating from '../SellerRating';

const apiMocks = vi.hoisted(() => ({
  getSellerRatings: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const toastMock = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: toastMock }));

describe('SellerRating component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.getSellerRatings.mockResolvedValue({ data: [] });
  });

  it('returns null when no sellerId provided', () => {
    const { container } = render(<SellerRating sellerId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('loads ratings and shows averages', async () => {
    apiMocks.getSellerRatings.mockResolvedValueOnce({
      data: [
        { _id: '1', rating: 5, review: 'Amazing', createdAt: '2024-01-01T00:00:00Z', raterId: { username: 'BuyerA' } },
        { _id: '2', rating: 3, review: 'okay', createdAt: '2024-01-02T00:00:00Z', raterId: { username: 'BuyerB' } },
      ],
    });

    render(<SellerRating sellerId="64b8f27a5c12345678901234" />);

    await waitFor(() => expect(apiMocks.getSellerRatings).toHaveBeenCalled());
    expect(screen.getByText('4.00')).toBeInTheDocument();
    expect(screen.getByText(/2 reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazing/i)).toBeInTheDocument();
    expect(screen.getByText(/okay/i)).toBeInTheDocument();
  });

  it('shows no ratings when API returns empty', async () => {
    render(<SellerRating sellerId="64b8f27a5c12345678901234" />);
    await waitFor(() => expect(screen.getByText(/No ratings yet/i)).toBeInTheDocument());
  });

  it('shows error message if API fails', async () => {
    apiMocks.getSellerRatings.mockRejectedValueOnce(new Error('Boom'));
    render(<SellerRating sellerId="64b8f27a5c12345678901234" />);

    await waitFor(() => expect(screen.getByText('Boom')).toBeInTheDocument());
  });
});
