import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import RatingForm from '../RatingForm';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  rateSeller: vi.fn(),
  getSellerRatings: vi.fn(),
  updateRating: vi.fn(),
  deleteRating: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const confirmSpy = vi.spyOn(window, 'confirm');

describe('RatingForm component', () => {
  const defaultProps = {
    auctionId: 'a1',
    sellerId: '64b8f27a5c12345678901234',
    raterId: 'user1',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    apiMocks.getSellerRatings.mockResolvedValue({ data: [] });
    apiMocks.rateSeller.mockResolvedValue({ success: true });
    apiMocks.updateRating.mockResolvedValue({ success: true });
    apiMocks.deleteRating.mockResolvedValue({ success: true });
    confirmSpy.mockReturnValue(true);
  });

  afterAll(() => {
    confirmSpy.mockRestore();
  });

  it('returns null if required ids missing', () => {
    const { container } = render(<RatingForm sellerId="" auctionId="" raterId="" />);
    expect(container.firstChild).toBeNull();
  });

  it('submits a brand new rating', async () => {
    const onSubmitted = vi.fn();
    render(<RatingForm {...defaultProps} onSubmitted={onSubmitted} />);

    fireEvent.change(screen.getByPlaceholderText(/Write a short review/i), { target: { value: 'Great seller' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Rating/i }));

    await waitFor(() =>
      expect(apiMocks.rateSeller).toHaveBeenCalledWith({ auctionId: 'a1', rating: 5, review: 'Great seller' })
    );
    expect(toastMock.success).toHaveBeenCalledWith('Thank you — your rating has been submitted');
    expect(onSubmitted).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Update Rating/i })).toBeInTheDocument();
  });

  it('updates an existing rating when already rated', async () => {
    const existing = {
      _id: 'r1',
      rating: 3,
      review: 'okay',
      auctionId: 'a1',
      raterId: 'user1',
    };
    apiMocks.getSellerRatings.mockResolvedValue({ data: [existing] });

    render(<RatingForm {...defaultProps} />);

    await waitFor(() => expect(screen.getByDisplayValue('okay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Update Rating/i }));

    await waitFor(() => expect(apiMocks.updateRating).toHaveBeenCalledWith('r1', { rating: 3, review: 'okay' }));
    expect(toastMock.success).toHaveBeenCalledWith('Your rating has been updated');
  });

  it('allows deleting an existing rating via summary card', async () => {
    const existing = {
      _id: 'r2',
      rating: 4,
      review: 'solid',
      auctionId: 'a1',
      raterId: 'user1',
    };
    apiMocks.getSellerRatings.mockResolvedValue({ data: [existing] });

    render(<RatingForm {...defaultProps} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Update Rating/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiMocks.deleteRating).toHaveBeenCalledWith('r2'));
    expect(toastMock.success).toHaveBeenCalledWith('Your rating has been deleted');
    expect(screen.getByText(/Rate the Seller/i)).toBeInTheDocument();
  });
});
