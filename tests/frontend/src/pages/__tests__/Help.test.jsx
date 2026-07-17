import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Help from '../Help';

describe('Help centre page', () => {
  function setup() {
    render(
      <MemoryRouter>
        <Help />
      </MemoryRouter>
    );
  }

  it('exposes quick actions and support links', () => {
    setup();

    expect(screen.getByRole('heading', { name: /Help Centre/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Track Your Order/i })).toHaveAttribute('href', '/buyer-dashboard');
    const contactLinks = screen.getAllByRole('link', { name: /Contact Support/i });
    expect(contactLinks).toHaveLength(2);
    contactLinks.forEach((link) => expect(link).toHaveAttribute('href', '/contact'));
    expect(screen.getByRole('link', { name: /Send Feedback/i })).toHaveAttribute('href', '/feedback');
  });

  it('expands and collapses help categories on click', () => {
    setup();

    const categoryToggle = screen.getByRole('button', { name: /Getting Started/i });
    fireEvent.click(categoryToggle);
    expect(screen.getByRole('link', { name: /Create Account/i })).toBeInTheDocument();

    fireEvent.click(categoryToggle);
    expect(screen.queryByRole('link', { name: /Create Account/i })).not.toBeInTheDocument();
  });

  it('shows FAQ answer when a question is toggled', () => {
    setup();

    const faqToggle = screen.getByRole('button', { name: /How do I place a bid/i });
    fireEvent.click(faqToggle);

    expect(
      screen.getByText(/You\'ll receive a confirmation if your bid was successful/i)
    ).toBeInTheDocument();
  });
});
