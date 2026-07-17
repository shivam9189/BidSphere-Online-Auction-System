import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OtpPage from '../Auth';
import { vi } from 'vitest';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

// mock react-router navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: actual.Link,
  };
});

describe('OtpPage (Auth.jsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
  });

  it('renders input and buttons', () => {
    render(<OtpPage />);
    expect(screen.getByPlaceholderText('Enter OTP')).toBeDefined();
    expect(screen.getByRole('button', { name: /Verify OTP/i })).toBeDefined();
    expect(screen.getByText(/Resend OTP/i)).toBeDefined();
  });

  it('shows success toast and navigates when OTP is correct', async () => {
    render(<OtpPage />);

    const input = screen.getByPlaceholderText('Enter OTP');
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify OTP/i }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('✅ OTP Verified Successfully!'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows invalid OTP message when OTP is incorrect', async () => {
    render(<OtpPage />);

    const input = screen.getByPlaceholderText('Enter OTP');
    fireEvent.change(input, { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify OTP/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Invalid OTP! Please try again.'));
  });

  it('resend button triggers info toast', async () => {
    render(<OtpPage />);

    fireEvent.click(screen.getByText(/Resend OTP/i));

    await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith('OTP Resent!'));
  });
});
