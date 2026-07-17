import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../Register';
import { vi } from 'vitest';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

// Mock the api module
vi.mock('../../api', () => ({
  registerUser: vi.fn(),
}));

// Provide a mock navigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: actual.Link,
  };
});

import { registerUser } from '../../api';

describe('Register page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
    mockNavigate.mockClear();
  });

  it('renders form fields and submits data to registerUser', async () => {
    // Arrange
    registerUser.mockResolvedValue({ message: 'Verification OTP sent' });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    // Act
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    // Assert: registerUser called with expected payload
    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        username: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // alert called and navigate called to verifyemail
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Verification OTP sent');
      expect(mockNavigate).toHaveBeenCalledWith('/verifyemail', { state: { email: 'test@example.com' } });
    });
  });

  it('renders the register banner image', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    const img = screen.getByAltText('Register Banner');
    expect(img).toBeDefined();
  });

  it('validates required fields', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Please fill out all fields.'));
  });

  it('validates email format', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(nameInput, { target: { value: 'User' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Please enter a valid email address.'));
  });

  it('validates password length', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(nameInput, { target: { value: 'User' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Password must be at least 8 characters long.'));
  });

  it('shows alert on registerUser failure and resets form', async () => {
    registerUser.mockRejectedValue(new Error('Email already exists'));

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'testfail@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => expect(registerUser).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Email already exists'));
    // form should be reset in finally block
    expect(screen.getByPlaceholderText('Name').value).toBe('');
    expect(screen.getByPlaceholderText('Email ID').value).toBe('');
    expect(screen.getByPlaceholderText('Password').value).toBe('');
  });

  it('shows default alert message on success when no message is returned', async () => {
    registerUser.mockResolvedValue({}); // No message property

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Verification OTP sent to your email');
    });
  });

  it('shows default alert message on failure when no message is returned', async () => {
    registerUser.mockRejectedValue({}); // No message property

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Registration failed');
    });
  });

  it('resets form after successful registration', async () => {
    registerUser.mockResolvedValue({ message: 'Verification OTP sent' });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalled();
    });

    // Form should be reset in finally block
    expect(nameInput.value).toBe('');
    expect(emailInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  it('renders navigation links correctly', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log in/i })).toHaveAttribute('href', '/login');
  });

  it('handles form input changes correctly', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword' } });

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(passwordInput.value).toBe('securepassword');
  });

  it('has proper form structure and accessibility', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Create an account/i })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('')).toHaveLength(3); // Three empty inputs
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });
});
