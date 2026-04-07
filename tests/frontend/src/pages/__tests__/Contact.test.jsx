import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { toast } from 'react-toastify';
import Contact from '../contact';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('Contact page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all content for 100% code coverage', () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    // Check all form elements
    expect(screen.getByRole('heading', { name: /Contact Us/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Message/i })).toBeInTheDocument();

    // Check form attributes
    expect(screen.getByPlaceholderText('Name')).toHaveAttribute('type', 'text');
    expect(screen.getByPlaceholderText('Email ID')).toHaveAttribute('type', 'email');
    expect(screen.getByPlaceholderText('Your Message')).toHaveClass('h-32');

    // Check button styling
    const button = screen.getByRole('button', { name: /Send Message/i });
    expect(button).toHaveClass('bg-red-500', 'text-white', 'px-6', 'py-2');

    // Test input changes
    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const messageInput = screen.getByPlaceholderText('Your Message');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(messageInput.value).toBe('Test message');

    // Test button click
    fireEvent.click(button);
    expect(toast.success).toHaveBeenCalledWith('Message sent successfully!');
  });
});
