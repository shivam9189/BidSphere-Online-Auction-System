import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import SellerInfo from '../SellerInfo';

const apiMocks = vi.hoisted(() => ({
  getSellerRatings: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const toastMock = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: toastMock }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function renderWithRouter(sellerId = '64b8f27a5c12345678901234') {
  return render(
    <MemoryRouter initialEntries={[`/seller/${sellerId}`]}>
      <Routes>
        <Route path="/seller/:sellerId" element={<SellerInfo />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SellerInfo page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.getSellerRatings.mockResolvedValue({ data: [] });
    apiMocks.getUserById.mockResolvedValue({ user: { username: 'Seller' } });
  });

  it('shows loading state then seller header and empty reviews', async () => {
    renderWithRouter();

    expect(screen.getByText(/Loading seller information/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/Seller/i)).toBeInTheDocument());
    expect(screen.getByText(/No reviews yet for this seller/i)).toBeInTheDocument();
  });

  it('displays error when seller id invalid', async () => {
    renderWithRouter('bad-id');
    await waitFor(() => expect(screen.getByText(/Invalid seller ID/i)).toBeInTheDocument());
  });

  it('renders reviews list when data available', async () => {
    const reviews = [
      {
        _id: 'r1',
        rating: 4,
        review: 'Great seller',
        createdAt: '2024-01-01T00:00:00Z',
        raterId: { username: 'BuyerOne' },
      },
    ];

    apiMocks.getSellerRatings.mockResolvedValueOnce({ data: reviews });
    apiMocks.getUserById.mockResolvedValueOnce({ user: { username: 'Pro Seller' } });

    renderWithRouter();
    await waitFor(() => expect(screen.getByText(/pro seller/i)).toBeInTheDocument());
    expect(screen.getByText(/Great seller/i)).toBeInTheDocument();
    expect(screen.getByText(/BuyerOne/i)).toBeInTheDocument();
  });
});
