import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/dom';
import { generateInvoicePDF } from '../../utils/invoicePDF';

const invoiceMocks = vi.hoisted(() => {
  const addImage = vi.fn();
  const save = vi.fn();
  const canvas = {
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    width: 400,
    height: 200,
  };
  const MockPDF = function () {
    return { addImage, save };
  };

  const jsPDF = vi.fn().mockImplementation(MockPDF);
  const html2canvas = vi.fn(() => Promise.resolve(canvas));

  return { addImage, save, canvas, jsPDF, html2canvas };
});

vi.mock('jspdf', () => ({ default: invoiceMocks.jsPDF }));
vi.mock('html2canvas', () => ({ default: invoiceMocks.html2canvas }));

const sampleAuction = {
  _id: 'abc',
  title: 'Vintage Clock',
  item: { images: ['https://img'], category: 'Antiques', condition: 'Mint' },
  sellerId: { fullname: 'Seller Sam', email: 's@example.com' },
  final: 500,
  endTime: '2025-01-01T00:00:00.000Z',
};

const sampleUser = { fullname: 'Buyer Bob' };
const sampleDelivery = { street: '123 St', city: 'NYC', state: 'NY', postalCode: '10001', country: 'USA', phone: '123' };

describe('generateInvoicePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoiceMocks.addImage.mockClear();
    invoiceMocks.save.mockClear();
    invoiceMocks.canvas.toDataURL.mockClear();
    invoiceMocks.jsPDF.mockClear();
    invoiceMocks.html2canvas.mockClear();
    invoiceMocks.canvas.width = 400;
    invoiceMocks.canvas.height = 200;
  });

  it('renders html to canvas, adds image to pdf, and cleans up DOM', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    generateInvoicePDF(sampleAuction, sampleUser, sampleDelivery);
    await waitFor(() => {
      expect(invoiceMocks.jsPDF).toHaveBeenCalled();
      expect(invoiceMocks.html2canvas).toHaveBeenCalled();
      expect(invoiceMocks.canvas.toDataURL).toHaveBeenCalled();
      expect(invoiceMocks.addImage).toHaveBeenCalled();
      expect(invoiceMocks.save).toHaveBeenCalled();
    });
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(appendSpy.mock.calls[0][0]);
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('logs an error and still removes the node when rendering fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    invoiceMocks.html2canvas.mockRejectedValueOnce(new Error('render failed'));
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    generateInvoicePDF(sampleAuction, sampleUser, sampleDelivery);
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Error generating PDF:', expect.any(Error)));
    expect(removeSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('clamps tall screenshots to the printable area', async () => {
    invoiceMocks.canvas.height = 4000;
    invoiceMocks.canvas.width = 400;
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    generateInvoicePDF(sampleAuction, sampleUser, sampleDelivery);
    await waitFor(() => {
      expect(invoiceMocks.addImage).toHaveBeenCalled();
      const lastCall = invoiceMocks.addImage.mock.calls.at(-1);
      expect(lastCall[5]).toBe(277);
    });

    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('renders fallback placeholders when optional data is missing', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const sparseAuction = {
      item: {},
      sellerId: {},
      currentBid: 250,
    };

    generateInvoicePDF(sparseAuction, {}, {});
    await waitFor(() => expect(invoiceMocks.addImage).toHaveBeenCalled());

    const html = appendSpy.mock.calls[0][0].innerHTML;
    expect(html).toContain('No Image Available');
    expect(html).toContain('Auction Item');
    expect(html).toContain('₹250');

    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('falls back to zeroed totals when no sale price exists', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    generateInvoicePDF({ item: {} }, {}, {});
    await waitFor(() => expect(invoiceMocks.addImage).toHaveBeenCalled());

    const html = appendSpy.mock.calls[0][0].innerHTML;
    expect(html).toContain('₹0');

    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
