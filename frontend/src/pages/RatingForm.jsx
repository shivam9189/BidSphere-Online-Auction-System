import React, { useEffect, useState } from "react";
import { rateSeller, getSellerRatings, updateRating, deleteRating } from "../api";
import { toast } from "react-toastify";

export default function RatingForm({ auctionId, sellerId, raterId, onSubmitted, existingRating }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [existingRatingId, setExistingRatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function checkIfRated() {
      if (!sellerId || !auctionId || !raterId) return;
      try {
        const res = await getSellerRatings(sellerId);
        if (!mounted) return;
        const data = res?.data || res?.ratings || [];
        const found = (data || []).find((r) => {
          const aid = r.auctionId?._id || r.auctionId;
          const rid = r.raterId?._id || r.raterId;
          return String(aid) === String(auctionId) && String(rid) === String(raterId);
        });
        
        if (found) {
          setAlreadyRated(true);
          setRating(found.rating || 5);
          setReview(found.review || "");
          setIsEditing(true);
          setExistingRatingId(found._id);
        }
      } catch (err) {
        // ignore - we'll allow submit and surface errors on submit
      }
    }
    checkIfRated();
    return () => (mounted = false);
  }, [sellerId, auctionId, raterId]);

  if (!sellerId || !auctionId || !raterId) return null;

  const handleDeleteRating = async () => {
    if (!window.confirm("Are you sure you want to delete your rating?")) {
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteRating(existingRatingId);
      toast.success("Your rating has been deleted");
      setAlreadyRated(false);
      setIsEditing(false);
      setRating(5);
      setReview("");
      setExistingRatingId(null);
      if (typeof onSubmitted === "function") onSubmitted();
    } catch (err) {
      console.error("deleteRating error:", err);
      const msg = err?.message || "Failed to delete rating";
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };
  if (alreadyRated && !isEditing) return (
    <div className="mt-3 p-3 bg-white rounded border text-sm text-gray-700">
      <div className="flex items-center justify-between">
        <span>You have already rated this seller for this auction.</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Rating
          </button>
          <button
            onClick={handleDeleteRating}
            disabled={deleteLoading}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5");
      return;
    }
    setLoading(true);
    try {
      if (isEditing) {
        // Find the existing rating ID
        const res = await getSellerRatings(sellerId);
        const data = res?.data || [];
        const existingRatingData = data.find((r) => {
          const aid = r.auctionId?._id || r.auctionId;
          const rid = r.raterId?._id || r.raterId;
          return String(aid) === String(auctionId) && String(rid) === String(raterId);
        });
        
        if (existingRatingData) {
          await updateRating(existingRatingData._id, { rating, review });
          toast.success("Your rating has been updated");
        }
      } else {
        const payload = { auctionId, rating, review };
        await rateSeller(payload);
        toast.success("Thank you — your rating has been submitted");
        setAlreadyRated(true);
        setIsEditing(true);
      }
      if (typeof onSubmitted === "function") onSubmitted();
    } catch (err) {
      console.error(isEditing ? "updateRating error:" : "rateSeller error:", err);
      const msg = err?.message || (err?.message && typeof err.message === 'string' ? err.message : `Failed to ${isEditing ? 'update' : 'submit'} rating`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-white p-4 rounded border">
      <div className="text-sm font-semibold mb-2">{isEditing ? 'Update Your Rating' : 'Rate the Seller'}</div>
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setRating(val)}
              className={`text-2xl ${val <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
              aria-label={`Rate ${val}`}
            >
              {val <= rating ? '★' : '☆'}
            </button>
          );
        })}
      </div>
      <textarea
        className="w-full p-2 border rounded mb-3"
        rows={3}
        placeholder="Write a short review (optional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Rating' : 'Submit Rating')}
        </button>
        <button
          onClick={() => { 
            if (isEditing) {
              setIsEditing(false);
            } else {
              setRating(5); 
              setReview("");
            }
          }}
          type="button"
          className="px-4 py-2 border rounded"
        >
          {isEditing ? 'Cancel' : 'Reset'}
        </button>
      </div>
    </div>
  );
}
