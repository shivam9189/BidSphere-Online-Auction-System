import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CookiePolicy from '../CookiePolicy';

describe('CookiePolicy page', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all content for 100% code coverage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-15T00:00:00Z'));

    render(
      <MemoryRouter>
        <CookiePolicy />
      </MemoryRouter>
    );

    // Hero section
    expect(screen.getByRole('heading', { name: /Cookie Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Learn how BidSphere uses cookies/)).toBeInTheDocument();
    const updatedText = screen.getAllByText(/Last updated/)[0];
    expect(updatedText.textContent).toContain('2025');

    // All main sections
    expect(screen.getByText('What Are Cookies?')).toBeInTheDocument();
    expect(screen.getByText('Types of Cookies We Use')).toBeInTheDocument();
    expect(screen.getByText('Cookie Duration')).toBeInTheDocument();
    expect(screen.getByText('Managing Your Cookie Preferences')).toBeInTheDocument();
    expect(screen.getByText('Third-Party Cookies')).toBeInTheDocument();
    expect(screen.getByText('Your Cookie Rights')).toBeInTheDocument();
    expect(screen.getByText('Updates to This Policy')).toBeInTheDocument();
    expect(screen.getByText('Questions About Cookies?')).toBeInTheDocument();

    // Cookie types
    expect(screen.getByText('Essential Cookies')).toBeInTheDocument();
    expect(screen.getByText('Performance Cookies')).toBeInTheDocument();
    expect(screen.getByText('Personalization Cookies')).toBeInTheDocument();
    expect(screen.getByText('Marketing Cookies')).toBeInTheDocument();
    expect(screen.getByText(/User authentication and session management/)).toBeInTheDocument();
    expect(screen.getByText(/Analytics and usage statistics/)).toBeInTheDocument();
    expect(screen.getByText(/Language and currency preferences/)).toBeInTheDocument();
    expect(screen.getByText(/Ad campaign performance tracking/)).toBeInTheDocument();

    // Cookie duration
    expect(screen.getByText('Session Cookies')).toBeInTheDocument();
    expect(screen.getByText('Persistent Cookies')).toBeInTheDocument();
    expect(screen.getByText(/Deleted when you close your browser/)).toBeInTheDocument();
    expect(screen.getByText(/Remain on your device for a set period/)).toBeInTheDocument();

    // Managing cookies
    expect(screen.getByText('You Have Control')).toBeInTheDocument();
    expect(screen.getByText('Browser Settings')).toBeInTheDocument();
    expect(screen.getByText('Our Cookie Center')).toBeInTheDocument();
    expect(screen.getByText(/Block all cookies or just third-party cookies/)).toBeInTheDocument();
    expect(screen.getByText(/Customize cookie preferences anytime/)).toBeInTheDocument();
    expect(screen.getByText(/Blocking essential cookies may prevent you/)).toBeInTheDocument();

    // Third-party cookies
    expect(screen.getByText('Payment Processors')).toBeInTheDocument();
    expect(screen.getByText('Analytics Services')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Advertising Partners')).toBeInTheDocument();
    expect(screen.getByText(/Secure payment processing/)).toBeInTheDocument();
    expect(screen.getByText(/Google Analytics for website improvement/)).toBeInTheDocument();

    // Cookie rights
    expect(screen.getByText('Right to Information')).toBeInTheDocument();
    expect(screen.getByText('Right to Consent')).toBeInTheDocument();
    expect(screen.getByText('Right to Withdraw')).toBeInTheDocument();
    expect(screen.getByText(/Know exactly what cookies we use/)).toBeInTheDocument();
    expect(screen.getByText(/Choose which optional cookies/)).toBeInTheDocument();

    // Updates
    expect(screen.getByText(/We may update this cookie policy/)).toBeInTheDocument();

    // Contact links
    expect(screen.getByRole('link', { name: /Contact Support/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /Cookie Settings/i })).toHaveAttribute('href', '/help');

    // Cookie explanation
    expect(screen.getByText(/Cookies are small text files/)).toBeInTheDocument();
    expect(screen.getByText(/Think of cookies as memory cards/)).toBeInTheDocument();

    // Badges
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getAllByText('Optional')).toHaveLength(3);
  });
});
