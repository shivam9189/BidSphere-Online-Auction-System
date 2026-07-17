import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPassword from '../ForgotPassword';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ForgotPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    mockNavigate.mockReset();
  });

  function setup() {
    return render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
  }

  it('requires an email before submitting', async () => {
    setup();

    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Enter your registered email'));
    expect(apiMocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('sends reset request and navigates back to login on success', async () => {
    apiMocks.requestPasswordReset.mockResolvedValue({ message: 'Reset sent' });

    setup();

    fireEvent.change(screen.getByPlaceholderText(/registered email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Send Reset Link/i }).closest('form'));

    await waitFor(() => expect(apiMocks.requestPasswordReset).toHaveBeenCalledWith({ email: 'jane@example.com' }));
    expect(toastMock.success).toHaveBeenCalledWith('Reset sent');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows an error toast when the API call fails', async () => {
    apiMocks.requestPasswordReset.mockRejectedValue(new Error('Network error'));

    setup();

    fireEvent.change(screen.getByPlaceholderText(/registered email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Network error'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
