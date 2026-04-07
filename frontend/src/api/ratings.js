import { getJSON, postJSON, putJSON, del } from './apiClient';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const getSellerRatings = (sellerId) => getJSON(`${API_BASE_URL}/bidsphere/ratings/seller/${sellerId}`);
export const rateSeller = (payload) => postJSON(`${API_BASE_URL}/bidsphere/ratings`, payload);
export const updateRating = (ratingId, payload) => putJSON(`${API_BASE_URL}/bidsphere/ratings/${ratingId}`, payload);
export const deleteRating = (ratingId) => del(`${API_BASE_URL}/bidsphere/ratings/${ratingId}`);
