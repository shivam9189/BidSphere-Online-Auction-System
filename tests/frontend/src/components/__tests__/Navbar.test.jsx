import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const apiMock = vi.hoisted(() => ({
  logoutUser: vi.fn(),
  logoutAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../../api', () => apiMock);
vi.mock('../../api/index', () => apiMock);

describe('Navbar', () => {
  const renderNavbar = (path = '/') => {
    const locationRef = { current: null };

    function LocationCapture() {
      const location = useLocation();
      React.useEffect(() => {
        locationRef.current = `${location.pathname}${location.search}`;
      }, [location]);
      return null;
    }

    const view = render(
      <MemoryRouter initialEntries={[path]}>
        <LocationCapture />
        <Navbar />
      </MemoryRouter>
    );
    return { ...view, locationRef };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    apiMock.logoutUser.mockResolvedValue({ ok: true });
    apiMock.logoutAdmin.mockResolvedValue({ ok: true });
    apiMock.getCurrentUser.mockResolvedValue({});
  });

  it('renders login/register when no auth is present', async () => {
    renderNavbar();
    await waitFor(() => expect(apiMock.getCurrentUser).toHaveBeenCalled());
    expect(screen.getByText(/Login/)).toBeInTheDocument();
    expect(screen.getByText(/Register/)).toBeInTheDocument();
  });

  it('uses backend user when available and mirrors it to storage', async () => {
    apiMock.getCurrentUser.mockResolvedValueOnce({ user: { username: 'RemoteUser' } });
    renderNavbar();
    expect(await screen.findByText(/RemoteUser/)).toBeInTheDocument();
    expect(localStorage.getItem('bidsphere_user')).toContain('RemoteUser');
  });

  it('navigates using search input for both query and empty states', async () => {
    const { locationRef } = renderNavbar();
    const search = screen.getByLabelText(/Search auctions/);
    await waitFor(() => expect(locationRef.current).toBe('/'));

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(locationRef.current).toBe('/');

    fireEvent.change(search, { target: { value: ' vintage lamp ' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(locationRef.current).toBe('/auctions?search=vintage%20lamp'));

    const button = screen.getByRole('button', { name: /Search/i });
    fireEvent.change(search, { target: { value: '   ' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(locationRef.current).toBe('/auctions'));

    fireEvent.click(button);
    await waitFor(() => expect(locationRef.current).toBe('/auctions'));

    fireEvent.change(search, { target: { value: 'camera bag' } });
    fireEvent.click(button);
    await waitFor(() => expect(locationRef.current).toBe('/auctions?search=camera%20bag'));
  });

  it('opens the account menu, logs out users, and reacts to outside clicks', async () => {
    localStorage.setItem('bidsphere_user', JSON.stringify({ username: 'Pat' }));
    apiMock.getCurrentUser.mockRejectedValueOnce(new Error('network'));
    const { locationRef } = renderNavbar();
    const trigger = await screen.findByRole('button', { name: /Pat/i });
    fireEvent.click(trigger);
    expect(screen.getByText(/SELLER Dashboard/)).toBeInTheDocument();

    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByText(/Account Settings/)).not.toBeInTheDocument());

    fireEvent.click(trigger);
    apiMock.logoutUser.mockRejectedValueOnce(new Error('fail'));
    fireEvent.click(screen.getByText('Log Out'));
    await waitFor(() => expect(apiMock.logoutUser).toHaveBeenCalled());
    expect(localStorage.getItem('bidsphere_user')).toBeNull();
    await waitFor(() => expect(locationRef.current).toBe('/login'));
  });

  it('responds to storage events and parses malformed JSON safely', async () => {
    localStorage.setItem('bidsphere_user', 'not-json');
    renderNavbar();
    await waitFor(() => expect(apiMock.getCurrentUser).toHaveBeenCalled());

    const eventUser = { username: 'TabUpdate' };
    localStorage.setItem('bidsphere_user', JSON.stringify(eventUser));
    const storageEvent = typeof StorageEvent === 'function'
      ? new StorageEvent('storage', { key: 'bidsphere_user', newValue: JSON.stringify(eventUser), storageArea: localStorage })
      : Object.assign(new Event('storage'), { key: 'bidsphere_user', newValue: JSON.stringify(eventUser), storageArea: localStorage });
    act(() => {
      window.dispatchEvent(storageEvent);
    });
    expect(await screen.findByText('TabUpdate')).toBeInTheDocument();

    const noopEvent = typeof StorageEvent === 'function'
      ? new StorageEvent('storage', { key: 'other_key', newValue: null, storageArea: localStorage })
      : Object.assign(new Event('storage'), { key: 'other_key', newValue: null, storageArea: localStorage });
    act(() => {
      window.dispatchEvent(noopEvent);
    });
  });

  it('treats missing sessionStorage data as logged out when localStorage errors', async () => {
    const originalGetItem = Storage.prototype.getItem;
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(function (key) {
        if (this === window.localStorage) {
          throw new Error('nope');
        }
        return originalGetItem.call(this, key);
      });

    try {
      renderNavbar();
      await waitFor(() => expect(apiMock.getCurrentUser).toHaveBeenCalled());
      expect(screen.getByText(/Login/)).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it('gracefully handles storage APIs throwing outright', async () => {
    const originalGetItem = Storage.prototype.getItem;
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(function (...args) {
        if (this === window.localStorage || this === window.sessionStorage) {
          throw new Error('boom');
        }
        return originalGetItem.call(this, ...args);
      });

    try {
      renderNavbar();
      await waitFor(() => expect(apiMock.getCurrentUser).toHaveBeenCalled());
      expect(screen.getByText(/Register/)).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it('falls back to sessionStorage when localStorage errors', async () => {
    const originalGetItem = Storage.prototype.getItem;
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(function (key) {
        if (this === window.localStorage) {
          throw new Error('fail');
        }
        return originalGetItem.call(this, key);
      });

    sessionStorage.setItem('bidsphere_user', JSON.stringify({ username: 'Sessiony' }));

    try {
      renderNavbar();
      await waitFor(() => expect(apiMock.getCurrentUser).toHaveBeenCalled());
      expect(await screen.findByText('Sessiony')).toBeInTheDocument();
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it('uses email fallback when username is missing', async () => {
    const stored = { email: 'fallback@example.com' };
    localStorage.setItem('bidsphere_user', JSON.stringify(stored));
    apiMock.getCurrentUser.mockRejectedValueOnce(new Error('skip backend'));
    renderNavbar();
    const trigger = await screen.findByRole('button', { name: /fallback/i });
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getAllByText('fallback').length).toBeGreaterThan(1));
  });

  it('ignores backend responses that resolve after unmount', async () => {
    let resolve;
    apiMock.getCurrentUser.mockReturnValue(new Promise((res) => { resolve = res; }));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const view = renderNavbar();

    try {
      await waitFor(() => expect(apiMock.getCurrentUser).toHaveBeenCalled());
      view.unmount();

      await act(async () => {
        resolve({ user: { username: 'LateUser' } });
        await Promise.resolve();
      });

      expect(setItemSpy).not.toHaveBeenCalledWith('bidsphere_user', expect.stringContaining('LateUser'));
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('handles admin logout flow', async () => {
    localStorage.setItem('bidsphere_admin', JSON.stringify({ role: 'admin' }));
    const { locationRef } = renderNavbar('/admin/dashboard');
    fireEvent.click(await screen.findByRole('button', { name: /Logout/i }));
    await waitFor(() => expect(apiMock.logoutAdmin).toHaveBeenCalled());
    expect(localStorage.getItem('bidsphere_admin')).toBeNull();
    await waitFor(() => expect(locationRef.current).toBe('/admin/login'));
  });

  it('warns and still redirects when admin logout fails', async () => {
    localStorage.setItem('bidsphere_admin', JSON.stringify({ role: 'admin' }));
    apiMock.logoutAdmin.mockRejectedValueOnce(new Error('fail'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { locationRef } = renderNavbar('/admin/dashboard');
    fireEvent.click(await screen.findByRole('button', { name: /Logout/i }));
    await waitFor(() => expect(apiMock.logoutAdmin).toHaveBeenCalled());
    expect(warnSpy).toHaveBeenCalledWith('Admin logout API failed', expect.any(Error));
    await waitFor(() => expect(locationRef.current).toBe('/admin/login'));
    warnSpy.mockRestore();
  });
});
