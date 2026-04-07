import React, { useEffect, useState } from "react";
import { getSellerRatings } from "../api";
import { toast } from "react-toastify";

// Simple star renderer
function Stars({ value = 0, max = 5 }) {
  const full = Math.round(value);
  return (
    <div className="text-yellow-500 font-bold" aria-hidden>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}>{i < full ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export default function SellerRating({ sellerId, limit = 5, currentUserId }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchRatings() {
      if (!sellerId) return;
      // basic validation: expect a 24-char hex string ID
      const idStr = String(sellerId || "");
      const looksLikeObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
      if (!looksLikeObjectId) {
        setRatings([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await getSellerRatings(sellerId);
        if (!mounted) return;
        // backend returns { success: true, data: [...] }
        const data = res?.data || res?.ratings || [];
        setRatings(data || []);
      } catch (err) {
        console.error("getSellerRatings error:", err);
        if (!mounted) return;
        const msg = err?.message || (err && typeof err === 'object' && err.message) || "Failed to load ratings";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchRatings();
    return () => (mounted = false);
  }, [sellerId, refreshKey]);

  if (!sellerId) return null;

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / ratings.length)
    : 0;

  return (
    <div className="mt-3 bg-white p-3 rounded border">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Seller Rating</div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">{avg ? avg.toFixed(2) : "—"}</div>
            <div className="text-xs text-gray-500">{ratings.length} review{ratings.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div>
          <Stars value={avg} />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading reviews...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : ratings.length === 0 ? (
          <div className="text-sm text-gray-500">No ratings yet</div>
        ) : (
          ratings.slice(0, limit).map((r) => {
            return (
              <div key={r._id || (r.raterId && r.raterId._id) || Math.random()} className="mt-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{r.raterId?.username || r.raterId?.name || (r.raterId?.email || "").split("@")[0] || "Anonymous"}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-yellow-500">{Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < Math.round(r.rating) ? "★" : "☆"}</span>
                  ))}</div>
                  <div className="text-sm text-gray-700">{r.review || "(no review text)"}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
