import { postJSON, getJSON, putJSON } from './apiClient';
import { BASE_USER } from './apiClient';

export const registerUser = (payload) => postJSON(`${BASE_USER}/register`, payload);
export const loginUser = (payload) => postJSON(`${BASE_USER}/login`, payload);
export const logoutUser = () => postJSON(`${BASE_USER}/logout`, {});
export const verifyEmail = (payload) => postJSON(`${BASE_USER}/verifyemail`, payload);

export const getCurrentUser = () => getJSON(`${BASE_USER}/me`);
export const getUserById = (userId) => getJSON(`${BASE_USER}/${userId}`);

export const requestPasswordReset = (payload) => postJSON(`${BASE_USER}/forgetpwd`, payload);
export const resetPassword = (payload) => postJSON(`${BASE_USER}/resetpwd`, payload);

export async function updateUserProfile(profileData) {
  return putJSON(`${BASE_USER}/profile`, profileData);
}
