import React from 'react';
import { render, screen, act } from '@testing-library/react';
import SellerRatingSummary from '../../components/SellerRatingSummary';

const apiMocks = vi.hoisted(() => ({ getSellerRatings: vi.fn() }));
vi.mock('../../api', () => apiMocks);

describe('SellerRatingSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getSellerRatings.mockReset();
  });

  it('renders nothing when sellerId is missing', () => {
    const { container } = render(<SellerRatingSummary />);
    expect(container.firstChild).toBeNull();
  });

  it('skips API call when sellerId is not a Mongo ObjectId', async () => {
    render(<SellerRatingSummary sellerId="bad" />);
    expect(apiMocks.getSellerRatings).not.toHaveBeenCalled();
    expect(await screen.findByText(/Loading/)).toBeInTheDocument();
  });

  it('renders average rating and count when API resolves', async () => {
    apiMocks.getSellerRatings.mockResolvedValueOnce({ data: [{ rating: 4 }, { rating: 5 }] });
    render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    expect(await screen.findByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(2 reviews)')).toBeInTheDocument();
  });

  it('surfaces API errors to the user', async () => {
    apiMocks.getSellerRatings.mockRejectedValueOnce(new Error('Boom'));
    render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('falls back to ratings arrays, zero averages, and singular grammar', async () => {
    apiMocks.getSellerRatings.mockResolvedValueOnce({ ratings: [{ rating: 'oops' }] });
    render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    expect(await screen.findByText('—')).toBeInTheDocument();
    expect(screen.getByText('(1 review)')).toBeInTheDocument();
    expect(screen.getAllByText('☆').length).toBeGreaterThan(0);
  });

  it('defaults to empty ratings when API returns nothing useful', async () => {
    apiMocks.getSellerRatings.mockResolvedValueOnce(null);
    render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    expect(await screen.findByText('—')).toBeInTheDocument();
    expect(screen.getByText('(0 reviews)')).toBeInTheDocument();
  });

  it('falls back to default error message when API rejects without text', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.getSellerRatings.mockRejectedValueOnce({});
    render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    expect(await screen.findByText('Failed to load ratings')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('skips state updates once unmounted (resolve path)', async () => {
    let resolve;
    apiMocks.getSellerRatings.mockReturnValue(new Promise((res) => { resolve = res; }));
    const { unmount } = render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    unmount();
    await act(async () => {
      resolve({ data: [{ rating: 5 }] });
      await Promise.resolve();
    });
  });

  it('skips state updates once unmounted (reject path)', async () => {
    let reject;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.getSellerRatings.mockReturnValue(new Promise((_, rej) => { reject = rej; }));
    const { unmount } = render(<SellerRatingSummary sellerId="0123456789abcdef01234567" />);
    unmount();
    await act(async () => {
      reject(new Error('late failure'));
      await Promise.resolve();
    });
    errorSpy.mockRestore();
  });
});
