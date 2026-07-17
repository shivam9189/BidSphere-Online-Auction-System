import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPassword from '../ResetPassword';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const mockNavigate = vi.fn();
const mockLocation = { search: '?token=test-token&email=demo%40example.com' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    mockNavigate.mockReset();
    apiMocks.resetPassword.mockResolvedValue({ message: 'Password reset successful' });
  });

  function setup() {
    return render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );
  }

  it('prefills email from URL param and requires all fields', async () => {
    setup();
    expect(screen.getByDisplayValue('demo@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('All fields are required'));
  });

  it('validates matching passwords and length', async () => {
    setup();
    const newPasswordInput = screen.getByPlaceholderText('New Password');
    const confirmInput = screen.getByPlaceholderText('Confirm New Password');

    fireEvent.change(newPasswordInput, { target: { value: '12345678' } });
    fireEvent.change(confirmInput, { target: { value: '12345679' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Passwords do not match'));

    toastMock.error.mockReset();
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Password must be at least 8 characters'));
  });

  it('calls resetPassword and navigates on success', async () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('New Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    await waitFor(() =>
      expect(apiMocks.resetPassword).toHaveBeenCalledWith({
        token: 'test-token',
        email: 'demo@example.com',
        newPassword: 'password123',
        confirmNewPassword: 'password123',
      })
    );
    expect(toastMock.success).toHaveBeenCalledWith('Password reset successful');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows default error when API rejects without message', async () => {
    apiMocks.resetPassword.mockRejectedValue({});
    setup();
    fireEvent.change(screen.getByPlaceholderText('New Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('{}'));
  });
});
