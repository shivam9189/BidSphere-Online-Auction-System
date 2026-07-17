import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import EditAuctionDraft from '../EditAuctionDraft';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  getAuction: vi.fn(),
  updateAuction: vi.fn(),
  deleteAuction: vi.fn(),
  uploadImagesFormData: vi.fn(),
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

describe('EditAuctionDraft page', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    apiMocks.getAuction.mockReset();
    apiMocks.updateAuction.mockReset();
    apiMocks.deleteAuction.mockReset();
    apiMocks.uploadImagesFormData.mockReset();
    mockNavigate.mockReset();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/edit/auction/a55']}>
        <Routes>
          <Route path="/edit/auction/:id" element={<EditAuctionDraft />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('loads existing auction data and submits an update', async () => {
    apiMocks.getAuction.mockResolvedValue({
      auction: {
        _id: 'a55',
        title: 'Antique Vase',
        startingPrice: 100,
        minIncrement: 5,
        startTime: '2025-01-02T10:00:00.000Z',
        endTime: '2025-01-05T10:00:00.000Z',
        item: {
          name: 'Antique Vase',
          description: 'Detailed desc',
          category: 'art',
          condition: 'like new',
          images: ['https://example.com/vase.jpg'],
          metadata: { conditionNotes: 'Pristine' },
        },
      },
    });
    apiMocks.updateAuction.mockResolvedValue({ message: 'Updated' });

    renderPage();

    await screen.findByLabelText(/Auction Name/i);

    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Updated Vase' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Auction/i }));

    await waitFor(() => expect(apiMocks.updateAuction).toHaveBeenCalledTimes(1));
    const payload = apiMocks.updateAuction.mock.calls[0][1];
    expect(payload.name).toBe('Updated Vase');
    expect(payload.images).toEqual(['https://example.com/vase.jpg']);
    expect(toastMock.success).toHaveBeenCalledWith('Auction updated successfully.');
  });
});
