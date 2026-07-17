import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProvider, useUser } from '../UserContext';

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

function TestConsumer() {
  const { user, loading, setUser } = useUser();
  return (
    <div>
      <div data-testid="loading-state">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user-name">{user ? user.name : 'anonymous'}</div>
      <button type="button" onClick={() => setUser({ name: 'Manual User' })}>
        set user
      </button>
    </div>
  );
}

function BareConsumer() {
  const ctx = useUser();
  return <div data-testid="bare-consumer">{ctx === null ? 'no-provider' : 'has-provider'}</div>;
}

describe('UserContext', () => {
  beforeEach(() => {
    apiMocks.getCurrentUser.mockReset();
  });

  it('loads current user and exposes it via context', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ user: { name: 'Alice' } });

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    expect(screen.getByTestId('loading-state').textContent).toBe('loading');

    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('loaded');
      expect(screen.getByTestId('user-name').textContent).toBe('Alice');
    });

    expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('handles missing user response gracefully', async () => {
    apiMocks.getCurrentUser.mockResolvedValue(null);

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('loaded');
      expect(screen.getByTestId('user-name').textContent).toBe('anonymous');
    });
  });

  it('allows consumers to update the user via setUser', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ user: { name: 'Initial' } });

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Initial');
    });

    fireEvent.click(screen.getByRole('button', { name: /set user/i }));
    expect(screen.getByTestId('user-name').textContent).toBe('Manual User');
  });

  it('gracefully handles rejections from getCurrentUser and still resolves loading state', async () => {
    apiMocks.getCurrentUser.mockRejectedValue(new Error('boom'));

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('loaded');
      expect(screen.getByTestId('user-name').textContent).toBe('anonymous');
    });

    expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('logs an error when getCurrentUser throws synchronously', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.getCurrentUser.mockImplementation(() => {
      throw new Error('sync failure');
    });

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'UserProvider getCurrentUser error:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('supports API responses without nested user property', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ name: 'Solo' });

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Solo');
    });
  });

  it('returns null context when useUser is invoked outside the provider', () => {
    render(<BareConsumer />);
    expect(screen.getByTestId('bare-consumer').textContent).toBe('no-provider');
  });

  it('shares updated user state across multiple consumers', async () => {
    function SecondConsumer() {
      const { user } = useUser();
      return <div data-testid="second-consumer">{user ? user.name : 'anonymous'}</div>;
    }

    apiMocks.getCurrentUser.mockResolvedValue({ user: { name: 'Team' } });

    render(
      <UserProvider>
        <>
          <TestConsumer />
          <SecondConsumer />
        </>
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('second-consumer').textContent).toBe('Team');
    });

    fireEvent.click(screen.getByRole('button', { name: /set user/i }));
    expect(screen.getByTestId('second-consumer').textContent).toBe('Manual User');
  });

  it('skips user updates if the provider unmounts before getCurrentUser resolves', async () => {
    let resolveFn;
    apiMocks.getCurrentUser.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    const { unmount } = render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    unmount();
    resolveFn({ user: { name: 'Late User' } });

    await Promise.resolve();
    expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
