import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CreateAuction from '../CreateAuction';

vi.mock('../../constants/categories', () => ({
  default: [
    { value: '', label: 'Select Category' },
    { value: 'art', label: 'Art' },
  ],
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const apiMocks = vi.hoisted(() => ({
  createAuction: vi.fn(),
  uploadImagesFormData: vi.fn(),
}));

vi.mock('../../api', () => apiMocks);

describe('CreateAuction page', () => {
  beforeEach(() => {
    toastMock.error.mockReset();
    toastMock.success.mockReset();
    apiMocks.createAuction.mockReset();
    apiMocks.uploadImagesFormData.mockReset();
  });

  it('enforces required field validation before submit', async () => {
    const { container } = render(<CreateAuction />);

    const form = container.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Please enter auction name.'));
    expect(apiMocks.createAuction).not.toHaveBeenCalled();
  });

  it('submits form with valid payload and shows success modal', async () => {
    apiMocks.createAuction.mockResolvedValue({ auction: { _id: 'new-1' } });

    const { container } = render(<CreateAuction />);

    fireEvent.change(screen.getByLabelText(/Auction Name/i), { target: { value: 'Rare Artifacts' } });
    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Ancient Vase' } });
    fireEvent.change(screen.getByLabelText(/Item Description/i), { target: { value: 'Detailed description' } });
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'art' } });
    expect(categorySelect).toHaveValue('art');
    fireEvent.change(screen.getByLabelText(/Starting Bid Price/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Bid Increment/i), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('radio', { name: /Schedule for later/i }));
    const startDateInput = container.querySelector('input[name="scheduleStartDate"]');
    const startTimeInput = container.querySelector('input[name="scheduleStartTime"]');
    fireEvent.change(startDateInput, { target: { value: '2025-01-01' } });
    fireEvent.change(startTimeInput, { target: { value: '09:00' } });
    expect(startDateInput).toHaveValue('2025-01-01');
    expect(startTimeInput).toHaveValue('09:00');

    const endDateInput = container.querySelector('input[name="scheduleEndDate"]');
    const endTimeInput = container.querySelector('input[name="scheduleEndTime"]');
    fireEvent.change(endDateInput, { target: { value: '2025-01-05' } });
    fireEvent.change(endTimeInput, { target: { value: '12:00' } });
    expect(endDateInput).toHaveValue('2025-01-05');
    expect(endTimeInput).toHaveValue('12:00');

    const form = container.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      if (toastMock.error.mock.calls.length) {
        throw new Error(`Validation blocked submit: ${toastMock.error.mock.calls.map((call) => call[0]).join(', ')}`);
      }
      expect(apiMocks.createAuction).toHaveBeenCalledTimes(1);
    });
    const payload = apiMocks.createAuction.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: 'Rare Artifacts',
      name: 'Ancient Vase',
      category: 'art',
      startingPrice: 100,
      minIncrement: 10,
      images: [],
    });
    const expectedEnd = new Date('2025-01-05T12:00').toISOString();
    expect(payload.endTime).toBe(expectedEnd);

    expect(await screen.findByText(/Auction created successfully/i)).toBeInTheDocument();
  });
});
