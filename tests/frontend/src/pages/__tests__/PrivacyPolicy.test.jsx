import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import PrivacyPolicy from '../PrivacyPolicy';

describe('PrivacyPolicy page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all content for 100% code coverage', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );

    // Hero section
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Your privacy is our priority/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated/).textContent).toContain('2025');

    // All main sections
    expect(screen.getByText('Our Commitment to Privacy')).toBeInTheDocument();
    expect(screen.getByText('Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('Data Protection Measures')).toBeInTheDocument();
    expect(screen.getByText('Your Rights')).toBeInTheDocument();
    expect(screen.getByText('Questions About Privacy?')).toBeInTheDocument();

    // Information collection
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Usage Information')).toBeInTheDocument();
    expect(screen.getByText(/Name, email address, phone number/)).toBeInTheDocument();
    expect(screen.getByText(/Bidding history and auction participation/)).toBeInTheDocument();

    // How we use information
    expect(screen.getByText('Service Provision')).toBeInTheDocument();
    expect(screen.getByText('Platform Improvement')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Security & Trust')).toBeInTheDocument();
    expect(screen.getByText(/To facilitate auctions, process payments/)).toBeInTheDocument();
    expect(screen.getByText(/To enhance user experience/)).toBeInTheDocument();

    // Data protection
    expect(screen.getByText('Encryption')).toBeInTheDocument();
    expect(screen.getByText('Secure Storage')).toBeInTheDocument();
    expect(screen.getByText('Limited Access')).toBeInTheDocument();
    expect(screen.getByText(/All data is encrypted/)).toBeInTheDocument();
    expect(screen.getByText(/Your information is stored/)).toBeInTheDocument();

    // User rights
    expect(screen.getByText('Access')).toBeInTheDocument();
    expect(screen.getByText('Correction')).toBeInTheDocument();
    expect(screen.getByText('Deletion')).toBeInTheDocument();
    expect(screen.getByText('Portability')).toBeInTheDocument();
    expect(screen.getByText(/Request access to your personal information/)).toBeInTheDocument();
    expect(screen.getByText(/Update or correct inaccurate information/)).toBeInTheDocument();

    // Contact links
    expect(screen.getByRole('link', { name: /Contact Us/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /Help Center/i })).toHaveAttribute('href', '/help');
  });
});
