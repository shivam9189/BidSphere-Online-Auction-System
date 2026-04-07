import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import PayFees from '../PayFees';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

vi.mock('react-qr-code', () => ({
  default: ({ value }) => <div data-testid="qr-code" data-value={value} />,
}));

const apiMocks = vi.hoisted(() => ({
  getAuction: vi.fn(),
  getCurrentUser: vi.fn(),
  createWinningUpiPayment: vi.fn(),
  createWinningCodPayment: vi.fn(),
  getPayment: vi.fn(),
  verifyAuctionPayment: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'auc123' }),
  };
});

describe('PayFees page', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
    mockNavigate.mockReset();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    apiMocks.getCurrentUser.mockResolvedValue({ user: { username: 'bidder1' } });
    apiMocks.getAuction.mockResolvedValue({ auction: { title: 'Rare Vase', winningPrice: 7500 } });
    apiMocks.getPayment.mockResolvedValue({ payment: { status: 'PENDING' } });
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <PayFees />
      </MemoryRouter>
    );
  }

  it('creates a UPI payment and submits verification details', async () => {
    apiMocks.createWinningUpiPayment.mockResolvedValue({ payment: { _id: 'pay-1', upiLink: 'upi://pay?v=1', amount: 7500 } });
    apiMocks.verifyAuctionPayment.mockResolvedValue({ success: true });

    renderPage();
    await screen.findByText(/Rare Vase/i);

    fireEvent.click(screen.getByRole('button', { name: /Pay with UPI/i }));
    await screen.findByTestId('qr-code');

    const [txnInput, payerInput] = screen.getAllByRole('textbox');
    fireEvent.change(txnInput, { target: { value: 'T123' } });
    fireEvent.change(payerInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Verification Request/i }));

    await waitFor(() =>
      expect(apiMocks.verifyAuctionPayment).toHaveBeenCalledWith('auc123', 'pay-1', {
        upiAccountName: 'Alice',
        upiTxnId: 'T123',
      })
    );
    expect(toastMock.info).toHaveBeenCalledWith('Verification requested — admin will verify shortly');
    expect(mockNavigate).toHaveBeenCalledWith('/auction/auc123');
  });

  it('records a COD payment path when selected', async () => {
    apiMocks.createWinningCodPayment.mockResolvedValue({ payment: { _id: 'cod-1', status: 'PENDING' } });

    renderPage();
    await screen.findByText(/Rare Vase/i);

    fireEvent.click(screen.getByRole('button', { name: /Pay on Delivery/i }));

    await waitFor(() => expect(apiMocks.createWinningCodPayment).toHaveBeenCalledWith('auc123'));
    expect(screen.getByText(/COD payment has been recorded/i)).toBeInTheDocument();
  });
});
