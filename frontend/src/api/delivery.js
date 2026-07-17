import { postJSON, getJSON } from './apiClient';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const createDelivery = (payload) => postJSON(`${API_BASE_URL}/bidsphere/delivery/create`, payload);
export const getMyDeliveries = () => getJSON(`${API_BASE_URL}/bidsphere/delivery/my-deliveries`);
export const getAllDeliveries = (queryParams = {}) => {
  const qs = new URLSearchParams(queryParams).toString();
  return getJSON(`${API_BASE_URL}/bidsphere/delivery/all${qs ? `?${qs}` : ''}`);
};
