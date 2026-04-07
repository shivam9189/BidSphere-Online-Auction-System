import { postJSON, getJSON } from './apiClient';
import { BASE_ADMIN, BASE_USER } from './apiClient';

export const loginAdmin = (payload) => postJSON(`${BASE_ADMIN}/login`, payload);
export const logoutAdmin = () => postJSON(`${BASE_ADMIN}/logout`, {});

export const getAdminNotifications = () => getJSON(`${BASE_ADMIN}/notifications`);
export const confirmAdminNotification = (id) => postJSON(`${BASE_ADMIN}/notifications/${id}/confirm`, {});
export const rejectAdminNotification = (id) => postJSON(`${BASE_ADMIN}/notifications/${id}/reject`, {});

export const listPayments = (queryParams = {}) => {
  const params = new URLSearchParams(queryParams).toString();
  return getJSON(`${BASE_USER}/payments${params ? `?${params}` : ''}`);
};
