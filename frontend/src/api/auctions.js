import { getJSON, patchJSON, putFormData, putJSON, postJSON, del, postFormData } from './apiClient';
import { BASE_AUCTION, BASE_ADMIN } from './apiClient';

export const getAuction = (id) => getJSON(`${BASE_AUCTION}/${id}`);
export const saveAuctionDraft = (id, payload) => patchJSON(`${BASE_AUCTION}/${id}/draft`, payload);
export const updateAuction = (id, body) => {
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return putFormData(`${BASE_AUCTION}/${id}`, body);
  }
  return putJSON(`${BASE_AUCTION}/${id}`, body);
};
export const deleteAuction = (id) => del(`${BASE_AUCTION}/${id}`);
export const createAuction = (payload) => postJSON(`${BASE_AUCTION}/create`, payload);
export const getMyAuctions = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return getJSON(`${BASE_AUCTION}/mine${qs ? `?${qs}` : ''}`);
};
export const listAuctions = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return getJSON(`${BASE_AUCTION}${qs ? `?${qs}` : ''}`);
};

export const uploadImagesBase64 = (imagesPayload) => postJSON(`${BASE_AUCTION}/upload-base64`, imagesPayload);
export async function uploadImagesFormData(formData) {
  // backend expects POST for multipart upload
  return postFormData(`${BASE_AUCTION}/upload`, formData);
}

// Admin auction helpers
export const getAllAuctionsAdmin = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return getJSON(`${BASE_ADMIN}/auctions${qs ? `?${qs}` : ''}`);
};
export const getAuctionDetailsAdmin = (auctionId) => getJSON(`${BASE_ADMIN}/auctions/${auctionId}`);
export const verifyAuction = (auctionId) => postJSON(`${BASE_ADMIN}/auctions/${auctionId}/verify`, {});
export const removeAuctionAdmin = (auctionId) => postJSON(`${BASE_ADMIN}/auctions/${auctionId}/remove`, {});

// derive categories from auctions when backend has no dedicated endpoint
export const getCategories = async (opts = {}) => {
  const limit = typeof opts.limit === 'number' ? opts.limit : 200;
  const res = await listAuctions({ limit });
  const auctions = res?.auctions || [];
  const map = new Map();
  for (const a of auctions) {
    const name = (a?.item?.category || 'Uncategorized').trim();
    if (!map.has(name)) {
      const img = a?.item?.images?.[0] || null;
      map.set(name, { name, image: img });
    }
  }
  return Array.from(map.values());
};
