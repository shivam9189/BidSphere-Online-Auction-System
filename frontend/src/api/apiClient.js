// shared API client helpers and base URLs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const BASE_USER = `${API_BASE_URL}/bidsphere/user`;
export const BASE_ADMIN = `${API_BASE_URL}/bidsphere/admin`;
export const BASE_AUCTION = `${API_BASE_URL}/bidsphere/auctions`;
export const BASE_UPI = `${API_BASE_URL}/bidsphere/upi`;
export const BASE_PAYMENTS = `${API_BASE_URL}/bidsphere/admin/payments`;

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

async function patchJSON(path, body) {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export async function getJSON(path) {
  const res = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

async function putFormData(path, formData) {
  const res = await fetch(path, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// POST form-data helper (used for multipart uploads where server expects POST)
async function postFormData(path, formData) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

async function putJSON(path, body) {
  const res = await fetch(path, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

async function del(path) {
  const res = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export { postJSON, patchJSON, putFormData, postFormData, putJSON, del };
