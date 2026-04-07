import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import DeliveryCreate from '../DeliveryCreate';

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
  getAuction: vi.fn(),
  createDelivery: vi.fn(),
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

describe('DeliveryCreate page', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    apiMocks.getCurrentUser.mockReset();
    apiMocks.getAuction.mockReset();
    apiMocks.createDelivery.mockReset();
    mockNavigate.mockReset();
  });

  function renderPage(initialPath = '/delivery/a123?paymentId=pay999') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/delivery/:auctionId" element={<DeliveryCreate />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('prefills address fields from current user and shows auction title', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      user: {
        fullname: 'Jordan Doe',
        address: {
          street: 'Main St',
          city: 'NYC',
          state: 'NY',
          postalCode: '12345',
          country: 'USA',
        },
      },
    });
    apiMocks.getAuction.mockResolvedValue({ auction: { title: 'Rare Watch' } });

    renderPage();

    const auctionText = await screen.findByText(/For:/i);
    expect(auctionText.textContent).toContain('Rare Watch');
    expect(screen.getByDisplayValue('Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('NYC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('NY')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('USA')).toBeInTheDocument();
  });

  it('submits delivery details and navigates to buyer dashboard', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ user: {} });
    apiMocks.getAuction.mockResolvedValue({ auction: { title: 'Rare Watch' } });
    apiMocks.createDelivery.mockResolvedValue({ success: true, message: 'Saved' });

    renderPage('/delivery/a777?paymentId=pay123');

    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Alex Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Phone'), { target: { value: '9999999999' } });
    fireEvent.change(screen.getByPlaceholderText('Street address'), { target: { value: '221B Baker St' } });
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'London' } });
    fireEvent.change(screen.getByPlaceholderText('State'), { target: { value: 'LDN' } });
    fireEvent.change(screen.getByPlaceholderText('Postal code'), { target: { value: 'NW16XE' } });
    fireEvent.change(screen.getByPlaceholderText('Country'), { target: { value: 'UK' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Delivery/i }));

    await waitFor(() => expect(apiMocks.createDelivery).toHaveBeenCalledTimes(1));
    expect(apiMocks.createDelivery).toHaveBeenCalledWith({
      auctionId: 'a777',
      paymentId: 'pay123',
      buyerAddress: {
        name: 'Alex Doe',
        phone: '9999999999',
        street: '221B Baker St',
        city: 'London',
        state: 'LDN',
        postalCode: 'NW16XE',
        country: 'UK',
      },
    });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Saved'));
    expect(mockNavigate).toHaveBeenCalledWith('/buyer-dashboard');
  });
});
