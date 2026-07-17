import { postJSON, getJSON } from './apiClient';
import { BASE_AUCTION } from './apiClient';

// Auction-scoped payment endpoints
export const createRegistrationPayment = (auctionId) => postJSON(`${BASE_AUCTION}/${auctionId}/au-registration/pay`, {});
export const verifyAuctionPayment = (auctionId, paymentId, payload) => postJSON(`${BASE_AUCTION}/${auctionId}/${paymentId}/verify`, payload);
export const createWinningCodPayment = (auctionId) => postJSON(`${BASE_AUCTION}/${auctionId}/finalpay/cod`, {});
export const createWinningUpiPayment = (auctionId) => postJSON(`${BASE_AUCTION}/${auctionId}/finalpay/upi`, {});

// Get payment status (used by frontend to detect admin confirmation)
export const getPayment = (auctionId, paymentId) => getJSON(`${BASE_AUCTION}/${auctionId}/payment/${paymentId}`);

// User-scoped payments
export const getMyPayments = () => getJSON(`${BASE_AUCTION.replace('/auctions','/user')}/payments`);
