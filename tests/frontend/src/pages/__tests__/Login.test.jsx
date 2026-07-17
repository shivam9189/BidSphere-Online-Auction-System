import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
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
  loginUser: vi.fn(),
  getCurrentUser: vi.fn(),
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

import { loginUser, getCurrentUser } from '../../api';

describe('Login page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('renders and performs successful login (res.user present, getCurrentUser overwrites)', async () => {
    // loginUser returns a user and a message
    loginUser.mockResolvedValue({ message: 'Welcome', user: { id: 1, name: 'A' } });
    // getCurrentUser returns a different user to overwrite
    getCurrentUser.mockResolvedValue({ user: { id: 2, name: 'B' } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'me@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(loginUser).toHaveBeenCalledWith({ email: 'me@example.com', password: 'password123' }));
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());

    // localStorage should contain the overwritten user (id:2)
    const stored = JSON.parse(localStorage.getItem('bidsphere_user'));
    expect(stored).toBeDefined();
    expect(stored.id).toBe(2);

    expect(toastMock.success).toHaveBeenCalledWith('Welcome');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('successful login without res.user and getCurrentUser fails (no localStorage), resets form', async () => {
    loginUser.mockResolvedValue({ message: 'Hi' });
    getCurrentUser.mockRejectedValue(new Error('nope'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email ID');
    const passwordInput = screen.getByPlaceholderText('Password');

    fireEvent.change(emailInput, { target: { value: 'x@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(loginUser).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Hi'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));

    // since neither res.user nor me.user were stored, localStorage should be empty
    expect(localStorage.getItem('bidsphere_user')).toBeNull();

    // form reset
    expect(screen.getByPlaceholderText('Email ID').value).toBe('');
    expect(screen.getByPlaceholderText('Password').value).toBe('');
  });

  it('validates required fields', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Please fill in all fields.'));
  });

  it('validates email format', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'bad-email' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Please enter a valid email address.'));
  });

  it('validates password length', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'ok@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Password must be at least 8 characters long.'));
  });

  it('shows error message on login failure and resets form', async () => {
    loginUser.mockRejectedValue(new Error('Invalid creds'));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(loginUser).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Invalid creds'));

    // form reset
    expect(screen.getByPlaceholderText('Email ID').value).toBe('');
    expect(screen.getByPlaceholderText('Password').value).toBe('');
  });

  it('shows default failure message when rejection has no message', async () => {
    loginUser.mockRejectedValue({}); // no message
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Login failed'));
  });

  it('toggles remember checkbox and resets it after submit', async () => {
    loginUser.mockResolvedValue({ message: 'ok' });
    getCurrentUser.mockRejectedValue(new Error('nope'));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const remember = screen.getByRole('checkbox');
    expect(remember.checked).toBe(false);
    // toggle it
    fireEvent.click(remember);
    expect(remember.checked).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'x@y.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(loginUser).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('ok'));
    // after finally, form resets including remember
    expect(screen.getByRole('checkbox').checked).toBe(false);
  });
  
  it('shows default success message when no message returned', async () => {
    loginUser.mockResolvedValue({}); // no message
    getCurrentUser.mockRejectedValue(new Error('nope'));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'ok@ok.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Logged in successfully'));
  });
    it('successful login where getCurrentUser returns valid response but no user (branch coverage)', async () => {
    // loginUser sets the initial user
    loginUser.mockResolvedValue({ message: 'Success', user: { id: 1, name: 'FirstUser' } });
    
    // getCurrentUser returns a success object but WITHOUT a 'user' property
    // This forces the 'if (me && me.user)' check on line 56 to be FALSE
    getCurrentUser.mockResolvedValue({ status: 'ok' }); 

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(loginUser).toHaveBeenCalled());
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());

    // The localStorage should still contain the user from loginUser (id: 1)
    // proving that line 57 (overwrite) was skipped
    const stored = JSON.parse(localStorage.getItem('bidsphere_user'));
    expect(stored).toBeDefined();
    expect(stored.id).toBe(1);
    expect(stored.name).toBe('FirstUser');

    expect(mockNavigate).toHaveBeenCalledWith('/');
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Success'));
  });
  it('successful login where getCurrentUser fails (triggers catch block), falls back to loginUser data', async () => {
    // 1. loginUser succeeds and returns a user (id: 100)
    loginUser.mockResolvedValue({ message: 'Login Success', user: { id: 100, name: 'LegacyUser' } });
    
    // 2. getCurrentUser fails (throws error)
    // This forces the execution into the catch block at line 58-60
    getCurrentUser.mockRejectedValue(new Error('Fetch failed'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email ID'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Wait for loginUser to be called
    await waitFor(() => expect(loginUser).toHaveBeenCalled());
    
    // Wait for getCurrentUser to be called (it will reject)
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());

    // Ensure the flow continued to the success alert despite the internal error
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Login Success'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));

    // Verify the fallback: LocalStorage should still contain the user from step 1
    // This proves the catch block successfully ignored the error and preserved the state
    const stored = JSON.parse(localStorage.getItem('bidsphere_user'));
    expect(stored).toBeDefined();
    expect(stored.id).toBe(100);
  });
});
