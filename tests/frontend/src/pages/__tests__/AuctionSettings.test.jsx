import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Settings from '../AuctionSettings';
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
  getCurrentUser: vi.fn(),
  updateUserProfile: vi.fn(),
  uploadImagesFormData: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('AuctionSettings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();

    apiMocks.getCurrentUser.mockResolvedValue({
      user: {
        fullname: 'Jordan Doe',
        email: 'jordan@example.com',
        bio: 'Collector',
        profilePhoto: '',
        address: {
          street: 'Main St',
          city: 'NYC',
          state: 'NY',
          postalCode: '12345',
          country: 'USA',
        },
      },
    });

    apiMocks.updateUserProfile.mockResolvedValue({
      user: {
        fullname: 'Jordan Updated',
        email: 'jordan@example.com',
        bio: 'Collector',
        address: {
          street: 'River Rd',
          city: 'NYC',
          state: 'NY',
          postalCode: '99999',
          country: 'USA',
        },
      },
    });
  });

  it('loads user data and submits updates', async () => {
    render(<Settings />);

    const nameInput = await screen.findByDisplayValue('Jordan Doe');
    const streetInput = screen.getByDisplayValue('Main St');

    fireEvent.change(nameInput, { target: { value: 'Jordan Updated' } });
    fireEvent.change(streetInput, { target: { value: 'River Rd' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() =>
      expect(apiMocks.updateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          fullname: 'Jordan Updated',
          address: expect.objectContaining({ street: 'River Rd' }),
        })
      )
    );
    expect(apiMocks.uploadImagesFormData).not.toHaveBeenCalled();
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Profile updated successfully!'));
  });
});
