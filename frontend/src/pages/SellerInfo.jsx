import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSellerRatings, getUserById } from "../api";
import { toast } from "react-toastify";

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

export default function SellerInfo() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchSellerData() {
      if (!sellerId) return;
      
      const idStr = String(sellerId || "");
      const looksLikeObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
      if (!looksLikeObjectId) {
        setError("Invalid seller ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch both seller info and ratings in parallel
        const [ratingsRes, sellerRes] = await Promise.all([
          getSellerRatings(sellerId),
          getUserById(sellerId).catch(() => null)
        ]);
        
        if (!mounted) return;
        
        const data = ratingsRes?.data || ratingsRes?.ratings || [];
        setRatings(data || []);
        
        // Set seller info from user data
        if (sellerRes?.user) {
          setSellerInfo(sellerRes.user);
        }
      } catch (err) {
        console.error("fetchSellerData error:", err);
        if (!mounted) return;
        setError(err?.message || "Failed to load seller information");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchSellerData();
    return () => (mounted = false);
  }, [sellerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading seller information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / ratings.length)
    : 0;

  const sellerName = sellerInfo?.username || sellerInfo?.name || (sellerInfo?.email ? sellerInfo.email.split("@")[0] : "Unknown Seller");

  return (
    <div className="p-6 bg-[#f7f5f0] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          ← Back
        </button>

        {/* Seller Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl">
              {sellerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{sellerName}</h1>
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  VERIFIED
                </span>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{avg ? avg.toFixed(1) : "—"}</div>
                  <Stars value={avg} />
                  <div className="text-gray-600">{ratings.length} reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Reviews</h2>
          
          {ratings.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No reviews yet for this seller.
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((r) => (
                <div key={r._id || (r.raterId && r.raterId._id) || Math.random()} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold">
                        {r.raterId?.username || r.raterId?.name || (r.raterId?.email || "").split("@")[0] || "Anonymous"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>{i < Math.round(r.rating) ? "★" : "☆"}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-gray-700">
                    {r.review || "(no review text)"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
