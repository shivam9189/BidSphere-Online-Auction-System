import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Feedback from '../Feedback';

const originalFetch = global.fetch;

describe('Feedback page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  function typeMessage(name = 'Ava', email = 'ava@example.com', message = 'Great platform!') {
    const textboxes = screen.getAllByRole('textbox');
    const [nameInput, emailInput, messageInput] = textboxes;
    fireEvent.change(nameInput, { target: { value: name } });
    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(messageInput, { target: { value: message } });
  }

  it('sends feedback and clears the form on success', async () => {
    global.fetch.mockResolvedValue({ ok: true });

    render(<Feedback />);

    typeMessage();
    fireEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/bidsphere/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ava', email: 'ava@example.com', message: 'Great platform!' }),
      })
    );

    expect(await screen.findByText(/feedback was sent/i)).toBeInTheDocument();
    const [nameInput, emailInput, messageInput] = screen.getAllByRole('textbox');
    expect(nameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(messageInput).toHaveValue('');
  });

  it('shows an error hint when the request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    render(<Feedback />);

    typeMessage();
    fireEvent.submit(screen.getByRole('button', { name: /Send Feedback/i }).closest('form'));

    expect(await screen.findByText(/Error sending feedback/i)).toBeInTheDocument();
  });
});
