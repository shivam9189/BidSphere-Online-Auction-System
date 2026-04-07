import { postJSON, getJSON, del, BASE_USER } from './apiClient';
import { BASE_AUCTION } from './apiClient';

export const placeBid = (auctionId, amount) => postJSON(`${BASE_AUCTION}/${auctionId}/bid/place`, { amount });

export const setAutoBid = (auctionId, maxLimit) => postJSON(`${BASE_AUCTION}/${auctionId}/bid/setauto`, { maxLimit });

export const editAutoBid = (auctionId, autobidId, maxLimit) => postJSON(`${BASE_AUCTION}/${auctionId}/bid/editauto/${autobidId}`, { maxLimit });

export const activateAutoBid = (auctionId, autobidId) => postJSON(`${BASE_AUCTION}/${auctionId}/bid/activateauto/${autobidId}`, {});

export const deactivateAutoBid = (auctionId, autobidId) => postJSON(`${BASE_AUCTION}/${auctionId}/bid/deactivateauto/${autobidId}`, {});

export const getUserAutoBid = (auctionId) => getJSON(`${BASE_AUCTION}/${auctionId}/bid/myautobid`);

export const getBiddingHistory = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return getJSON(`${BASE_USER}/bidding-history${qs ? `?${qs}` : ''}`);
};

// watchlist endpoints (user area)
export const getWatchlist = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return getJSON(`${BASE_USER}/watchlist${qs ? `?${qs}` : ''}`);
};
export const addToWatchlist = (auctionId) => postJSON(`${BASE_USER}/watchlist`, { auctionId });
export const removeFromWatchlist = (auctionId) => del(`${BASE_USER}/watchlist/${auctionId}`);
