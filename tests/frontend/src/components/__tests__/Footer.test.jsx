import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../../components/Footer';

describe('Footer', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T00:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const renderFooter = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

  it('shows bidder and seller link groups', () => {
    renderFooter();
    expect(screen.getByText('For Bidders')).toBeInTheDocument();
    expect(screen.getByText('For Sellers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Discover Auctions/i })).toHaveAttribute('href', '/auctions');
    expect(screen.getByRole('link', { name: /Start Selling/i })).toHaveAttribute('href', '/create-auction');
  });

  it('renders current year and policy links', () => {
    renderFooter();
    expect(screen.getByText(/© 2025 BidSphere/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('href', '/cookies');
  });
});
