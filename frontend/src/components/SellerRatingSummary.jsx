import React, { useEffect, useState } from "react";
import { getSellerRatings } from "../api";

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

export default function SellerRatingSummary({ sellerId }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchRatings() {
      if (!sellerId) return;
      
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
        const data = res?.data || res?.ratings || [];
        setRatings(data || []);
      } catch (err) {
        console.error("getSellerRatings error:", err);
        if (!mounted) return;
        const msg = err?.message || "Failed to load ratings";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchRatings();
    return () => (mounted = false);
  }, [sellerId]);

  if (!sellerId) return null;

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / ratings.length)
    : 0;

  return (
    <div className="mt-2">
      {loading ? (
        <div className="text-sm text-gray-500">Loading rating...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">{avg ? avg.toFixed(1) : "—"}</div>
          <Stars value={avg} />
          <div className="text-sm text-gray-500">({ratings.length} review{ratings.length !== 1 ? "s" : ""})</div>
        </div>
      )}
    </div>
  );
}
