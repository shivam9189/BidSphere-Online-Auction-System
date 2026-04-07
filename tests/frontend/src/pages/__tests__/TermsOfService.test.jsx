import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import TermsOfService from '../TermsOfService';

describe('TermsOfService page', () => {
  const mockDate = new Date('2025-01-01T00:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    );
  }

  it('renders all content for 100% code coverage', () => {
    renderPage();

    // Hero section
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument();
    expect(screen.getByText(/Welcome to BidSphere!/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated/).textContent).toContain('2025');

    // All main sections
    expect(screen.getByText('Agreement to Terms')).toBeInTheDocument();
    expect(screen.getByText('User Responsibilities')).toBeInTheDocument();
    expect(screen.getByText('Auction Rules & Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Prohibited Activities')).toBeInTheDocument();
    expect(screen.getByText('Service Availability & Modifications')).toBeInTheDocument();
    expect(screen.getByText('Questions About Our Terms?')).toBeInTheDocument();

    // Agreement content
    expect(screen.getByText(/By accessing and using BidSphere/)).toBeInTheDocument();

    // User responsibilities content
    expect(screen.getByText('Account Security')).toBeInTheDocument();
    expect(screen.getByText('Conduct Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Maintain accurate and up-to-date information')).toBeInTheDocument();
    expect(screen.getByText('Act honestly and in good faith')).toBeInTheDocument();

    // Auction rules content
    expect(screen.getByText('Bidding Rules')).toBeInTheDocument();
    expect(screen.getByText('Payment Requirements')).toBeInTheDocument();
    expect(screen.getByText('Seller Guidelines')).toBeInTheDocument();
    expect(screen.getByText(/All bids are binding/)).toBeInTheDocument();
    expect(screen.getByText(/Winners must complete payment/)).toBeInTheDocument();
    expect(screen.getByText(/Items must be accurately described/)).toBeInTheDocument();

    // Prohibited activities
    expect(screen.getByText(/Shill bidding/)).toBeInTheDocument();
    expect(screen.getByText(/Listing prohibited or illegal items/)).toBeInTheDocument();
    expect(screen.getByText(/Manipulating auction prices/)).toBeInTheDocument();
    expect(screen.getByText(/Using false or misleading information/)).toBeInTheDocument();
    expect(screen.getByText(/Interfering with other users/)).toBeInTheDocument();
    expect(screen.getByText(/Circumventing platform fees/)).toBeInTheDocument();

    // Service availability
    expect(screen.getByText(/We strive to maintain 99.9% uptime/)).toBeInTheDocument();
    expect(screen.getByText(/We reserve the right to modify/)).toBeInTheDocument();
    expect(screen.getByText(/Users will be notified/)).toBeInTheDocument();
    expect(screen.getByText(/Platform features and pricing/)).toBeInTheDocument();

    // Contact links
    expect(screen.getByRole('link', { name: /Contact Support/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /Help Center/i })).toHaveAttribute('href', '/help');
    expect(screen.getByText(/If you need clarification/)).toBeInTheDocument();
  });
});
