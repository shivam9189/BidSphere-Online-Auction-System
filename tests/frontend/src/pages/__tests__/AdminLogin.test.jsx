import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLogin from '../AdminLogin';
import { vi } from 'vitest';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  loginAdmin: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: actual.Link,
  };
});

describe('AdminLogin page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
    mockNavigate.mockReset();
    localStorage.clear();
  });

  function setup() {
    return render(
      <MemoryRouter>
        <AdminLogin />
      </MemoryRouter>
    );
  }

  it('renders all content for 100% code coverage', async () => {
    apiMocks.loginAdmin.mockResolvedValue({
      message: 'Welcome admin',
      admin: { id: 'admin-1' },
    });

    setup();

    // Check main heading
    expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();

    // Check form elements
    expect(screen.getByPlaceholderText('Email ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Remember Me')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();

    // Check links
    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    expect(screen.getByText('Need a user account?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login as User/i })).toHaveAttribute('href', '/login');

    // Test remember checkbox
    const rememberCheckbox = screen.getByRole('checkbox', { name: '' });
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();

    // Test successful login
    fireEvent.change(screen.getByPlaceholderText('Email ID'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(apiMocks.loginAdmin).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'password123',
      })
    );

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Welcome admin'));
    expect(JSON.parse(localStorage.getItem('bidsphere_admin'))).toEqual({ id: 'admin-1' });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('validates empty fields', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Please fill in all fields.'));
  });

  
  it('validates password length', async () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('Email ID'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Password must be at least 8 characters long.'));
  });

  it('handles failed login and form reset', async () => {
    apiMocks.loginAdmin.mockRejectedValue(new Error('Bad credentials'));

    setup();

    const email = screen.getByPlaceholderText('Email ID');
    const password = screen.getByPlaceholderText('Password');

    fireEvent.change(email, { target: { value: 'fail@example.com' } });
    fireEvent.change(password, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(apiMocks.loginAdmin).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Bad credentials'));
    expect(email).toHaveValue('');
    expect(password).toHaveValue('');
  });
});
