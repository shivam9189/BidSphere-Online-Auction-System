import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as api from '../../api/index';

const originalFetch = global.fetch;
const makeResponse = (overrides = {}) => ({
  ok: overrides.ok ?? true,
  json: async () => overrides.json ?? {}
});

describe('API helper layer', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('invokes fetch for all exported wrappers', async () => {
    const calls = [
      () => api.registerUser({}),
      () => api.loginUser({}),
      () => api.logoutUser(),
      () => api.verifyEmail({}),
      () => api.loginAdmin({}),
      () => api.logoutAdmin(),
      () => api.getAllAuctionsAdmin({ page: 1 }),
      () => api.getAllAuctionsAdmin(),
      () => api.getAuctionDetailsAdmin('a1'),
      () => api.verifyAuction('a1'),
      () => api.removeAuctionAdmin('a1'),
      () => api.getAuction('a1'),
      () => api.saveAuctionDraft('a1', { title: 'x' }),
      () => api.updateAuction('a1', { title: 'x' }),
      () => api.deleteAuction('a1'),
      () => api.createAuction({}),
      () => api.getMyAuctions({ status: 'live' }),
      () => api.getMyAuctions(),
      () => api.listAuctions({ search: 'a' }),
      () => api.listAuctions(),
      () => api.getCurrentUser(),
      () => api.getUserById('u1'),
      () => api.getWatchlist({}),
      () => api.getWatchlist({ cursor: 'next' }),
      () => api.getWatchlist(),
      () => api.addToWatchlist('a1'),
      () => api.removeFromWatchlist('a1'),
      () => api.getBiddingHistory({}),
      () => api.getBiddingHistory({ page: 2 }),
      () => api.getBiddingHistory(),
      () => api.uploadImagesBase64({}),
      () => api.placeBid('a1', 10),
      () => api.setAutoBid('a1', 50),
      () => api.editAutoBid('a1', 'auto1', 60),
      () => api.activateAutoBid('a1', 'auto1'),
      () => api.deactivateAutoBid('a1', 'auto1'),
      () => api.getUserAutoBid('a1'),
      () => api.getAdminNotifications(),
      () => api.confirmAdminNotification('n1'),
      () => api.rejectAdminNotification('n1'),
      () => api.createRegistrationPayment('a1'),
      () => api.verifyAuctionPayment('a1', 'p1', {}),
      () => api.createWinningCodPayment('a1'),
      () => api.createWinningUpiPayment('a1'),
      () => api.createDelivery({}),
      () => api.getMyDeliveries(),
      () => api.getAllDeliveries({ status: 'pending' }),
      () => api.getAllDeliveries(),
      () => api.getMyPayments(),
      () => api.getPayment('a1', 'p1'),
      () => api.listPayments({ page: 1 }),
      () => api.listPayments(),
      () => api.requestPasswordReset({ email: 'e' }),
      () => api.resetPassword({ token: 't' }),
      () => api.uploadImagesFormData(new FormData()),
      () => api.updateUserProfile({ username: 'me' }),
      () => api.getSellerRatings('s1'),
      () => api.rateSeller({}),
      () => api.updateRating('r1', {}),
      () => api.deleteRating('r1'),
    ];

    for (const call of calls) {
      await call();
    }

    expect(global.fetch).toHaveBeenCalledTimes(calls.length);
  });

  it('deduplicates categories from listAuctions data', async () => {
    const auctions = [{ item: { category: 'Art', images: ['img-art'] } }, { item: { category: 'Art', images: [] } }, { item: {} }];
    global.fetch.mockResolvedValueOnce(makeResponse({ json: { auctions } }));
    const categories = await api.getCategories();
    expect(categories).toEqual([
      { name: 'Art', image: 'img-art' },
      { name: 'Uncategorized', image: null },
    ]);
  });

  it('respects custom limits and handles empty auction payloads', async () => {
    global.fetch.mockResolvedValueOnce(makeResponse({ json: {} }));
    const cats = await api.getCategories({ limit: 5 });
    expect(cats).toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/limit=5/), expect.any(Object));
  });

  it('handles FormData branch inside updateAuction', async () => {
    const form = new FormData();
    form.append('title', 'X');
    await api.updateAuction('a1', form);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/bidsphere/auctions/a1'), expect.objectContaining({ method: 'PUT', body: form }));
  });

  it('surfaces errors from helper utilities', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Bad post' }) });
    await expect(api.registerUser({})).rejects.toEqual({ message: 'Bad post' });

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Bad patch' }) });
    await expect(api.saveAuctionDraft('a1', {})).rejects.toThrow('Bad patch');

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Not found' }) });
    await expect(api.getAuction('a1')).rejects.toEqual({ message: 'Not found' });

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'put fail' }) });
    await expect(api.updateRating('r1', {})).rejects.toThrow('put fail');

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'delete fail' }) });
    await expect(api.deleteAuction('a1')).rejects.toEqual({ message: 'delete fail' });
  });

  it('handles uploadImagesFormData and updateUserProfile failures', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'upload fail' }) });
    await expect(api.uploadImagesFormData(new FormData())).rejects.toThrow('upload fail');

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'profile fail' }) });
    await expect(api.updateUserProfile({})).rejects.toThrow('profile fail');
  });

  it('tolerates invalid JSON bodies for patch/put/upload flows', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('no json'); } });
    await expect(api.saveAuctionDraft('a1', {})).resolves.toBeNull();

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('no json'); } });
    await expect(api.updateRating('r1', {})).resolves.toBeNull();

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('broken'); } });
    await expect(api.uploadImagesFormData(new FormData())).rejects.toThrow('Request failed');
  });

  it('falls back to a default profile error when the response body cannot be parsed', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('bad json'); } });
    await expect(api.updateUserProfile({})).rejects.toThrow('Request failed');
  });

  it('uses default error messages when servers omit them', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(api.saveAuctionDraft('a1', {})).rejects.toThrow('Request failed');

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(api.updateRating('r1', {})).rejects.toThrow('Request failed');

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(api.uploadImagesFormData(new FormData())).rejects.toThrow('Request failed');

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(api.updateUserProfile({})).rejects.toThrow('Failed to update profile');
  });

  it('propagates getJSON failures directly', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'denied' }) });
    await expect(api.getCurrentUser()).rejects.toEqual({ message: 'denied' });
  });

  it('propagates putFormData failures used by updateAuction', async () => {
    const form = new FormData();
    form.append('title', 'x');
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'oops' }) });
    await expect(api.updateAuction('a1', form)).rejects.toEqual({ message: 'oops' });
  });
});
