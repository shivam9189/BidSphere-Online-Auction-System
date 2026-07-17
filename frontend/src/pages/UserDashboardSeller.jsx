import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyAuctions, deleteAuction, getSellerRatings } from "../api";
import { useUser } from "../contexts/UserContext";
import { toast } from "react-toastify";
import DashboardSidebar from "../components/DashboardSidebar";

function StatCard({ title, value, small, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg p-4 flex flex-col justify-between ${onClick ? 'cursor-pointer hover:shadow' : ''}`}
    >
      <div className="text-xs text-gray-500">{title}</div>
      <div className={`mt-2 ${small ? "text-xl" : "text-2xl"} font-semibold text-gray-800`}>{value}</div>
    </div>
  );
}

import { getStatusColor, getStatusLabel } from "../utils/statusHelpers";

function ListingCard({ id, title = "Auction Name", starting = "₹250", status = "Live", bidders = 0, endsIn = "2h 15m", onDelete, deleting, image = null }) {
  const navigate = useNavigate();
  const handleEdit = () => {
    const path = id ? `/edit-auction-draft/${id}` : "/create-auction";
    navigate(path);
  };

  return (
    <div className="bg-white border rounded-md p-4 flex items-center gap-4">
      {id ? (
        <Link to={`/auction/${id}`} className="flex-1 flex items-center gap-4 no-underline text-inherit">
          <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-medium">{title}</div>
              <div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                  {getStatusLabel(status)}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">Starting bid <span className="font-semibold text-gray-800">{starting}</span></div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <div>Bidders: <span className="font-medium text-gray-700">{bidders}</span></div>
              <div>Ends in: <span className="font-medium text-gray-700">{endsIn}</span></div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex-1 flex items-center gap-4">
          <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-medium">{title}</div>
              <div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                  {getStatusLabel(status)}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">Starting bid <span className="font-semibold text-gray-800">{starting}</span></div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <div>Bidders: <span className="font-medium text-gray-700">{bidders}</span></div>
              <div>Ends in: <span className="font-medium text-gray-700">{endsIn}</span></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleEdit}
          className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete && onDelete(id)}
          disabled={deleting}
          className="px-3 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function UserDashboardSeller() {
  const { user, loading: loadingUser } = useUser() || {};
  const [deletingId, setDeletingId] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // user is provided by UserContext; no local fetch needed

  const [auctions, setAuctions] = useState([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const listingsRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchMyAuctions() {
      setLoadingAuctions(true);
      try {
        const res = await getMyAuctions({ limit: 50 });
        if (!mounted) return;
        // backend returns { success, auctions, pagination }
        setAuctions(res?.auctions || []);
      } catch (err) {
        console.error("getMyAuctions error:", err);
      } finally {
        if (mounted) setLoadingAuctions(false);
      }
    }
    fetchMyAuctions();
    return () => (mounted = false);
  }, []);

  // Fetch ratings data
  useEffect(() => {
    let mounted = true;
    async function fetchRatings() {
      setLoadingRatings(true);
      try {
        if (user?._id) {
          const res = await getSellerRatings(user._id);
          if (!mounted) return;
          // backend returns { success: true, data: [...] }
          setRatings(res?.data || res?.ratings || res || []);
        }
      } catch (err) {
        console.error("getSellerRatings error:", err);
        setRatings([]);
      } finally {
        if (mounted) setLoadingRatings(false);
      }
    }
    fetchRatings();
    return () => (mounted = false);
  }, [user]);

  // derive a friendly display name with multiple fallbacks
  const localStored = typeof window !== "undefined" ? localStorage.getItem("bidsphere_user") : null;
  let storedUser = null;
  try {
    storedUser = localStored ? JSON.parse(localStored) : null;
  } catch (e) {
    storedUser = null;
  }
  const displayName = (user && (user.name || user.username || user.email)) || (storedUser && (storedUser.name || storedUser.username || storedUser.email)) || "First Last";
  const initials = String(displayName)
    .split(" ")
    .map((s) => s[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // compute stats from auctions
  const totalListings = auctions.length;
  const activeListingCount = auctions.filter(a => a.status === "LIVE").length;
  const totalEarnings = auctions.reduce((sum, a) => {
    // treat ended auctions' currentBid as earnings if present
    if (a.status === "ENDED" && a.currentBid) return sum + Number(a.currentBid || 0);
    return sum;
  }, 0);
  const activeBidders = auctions.reduce((sum, a) => sum + (Number(a.totalParticipants || 0)), 0);
  const endedCount = auctions.filter(a => a.status === "ENDED").length;
  const successfulEnded = auctions.filter(a => a.status === "ENDED" && (a.currentBid && a.currentBid > 0)).length;
  const successRate = endedCount > 0 ? Math.round((successfulEnded / endedCount) * 100) : 0;

  // Calculate rating stats from real data
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
    : "0.0";
  
  const positiveReviews = ratings.filter(r => (r.rating || 0) >= 4).length;
  const positivePercentage = ratings.length > 0 
    ? Math.round((positiveReviews / ratings.length) * 100)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => (r.rating || 0) === star).length,
    percentage: ratings.length > 0 
      ? Math.round((ratings.filter(r => (r.rating || 0) === star).length / ratings.length) * 100)
      : 0
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar role="seller" active="dashboard" />

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Listings"
              value={
                <>
                  <span className="text-2xl text-blue-600">{auctions.filter(a => a.status === 'LIVE').length}</span>
                  <div className="text-xs text-gray-500">Currently live</div>
                </>
              }
            />
            <StatCard
              title="Total Bids"
              value={
                <>
                  <span className="text-2xl text-blue-600">{auctions.reduce((sum, a) => sum + (a.totalBids || 0), 0)}</span>
                  <div className="text-xs text-gray-500">Across all listings</div>
                </>
              }
            />
            <StatCard
              title="Success Rate"
              value={
                <>
                  <span className="text-2xl text-blue-600">{successRate}%</span>
                  <div className="text-xs text-gray-500">Auctions completed</div>
                </>
              }
            />
            <StatCard
              title="Total Revenue"
              value={
                <>
                  <span className="text-2xl text-blue-600">₹{totalEarnings}</span>
                  <div className="text-xs text-gray-500">From completed sales</div>
                </>
              }
            />
          </div>

          {/* My Listings - Top 5 Only */}
          <div className="bg-white border rounded-lg p-6" ref={listingsRef}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Listings</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-blue-600"><Link to="/my-listings">View All Listings</Link></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {loadingAuctions ? (
                <div>Loading your listings...</div>
              ) : auctions.length > 0 ? (
                auctions.slice(0, 5).map((a) => {
                  const image = a.item?.images?.[0] || null;
                  return (
                    <ListingCard
                      key={a._id}
                      id={a._id}
                      title={a.title || a.item?.name}
                      starting={`₹${a.startingPrice ?? "-"}`}
                      status={a.status}
                      bidders={a.totalBids ?? 0}
                      endsIn={a.endTime ? new Date(a.endTime).toLocaleString() : "-"}
                      image={image}
                      onDelete={async (id) => {
                        if (!window.confirm("Are you sure you want to delete this auction? This cannot be undone.")) return;
                        try {
                          setDeletingId(id);
                          await deleteAuction(id);
                          setAuctions((prev) => prev.filter((x) => x._id !== id));
                          toast.success("Auction deleted");
                        } catch (err) {
                          console.error("deleteAuction error:", err);
                          toast.error(err?.message || "Failed to delete auction");
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      deleting={deletingId === a._id}
                    />
                  );
                })
              ) : (
                <div className="text-sm text-gray-500">You have no listings yet.</div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Reviews */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
              <div className="space-y-4">
                {loadingRatings ? (
                  <div className="text-sm text-gray-500">Loading reviews...</div>
                ) : ratings.length > 0 ? (
                  ratings.slice(0, 3).map((rating, index) => (
                    <div key={rating._id || index} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                              {(rating.userId?.username || rating.userId?.email || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {rating.userId?.username || rating.userId?.email?.split('@')[0] || 'Anonymous User'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : 'Recently'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg key={star} className={`w-4 h-4 ${star <= (rating.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                              </svg>
                            ))}
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-gray-600">{rating.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 text-center py-8">No reviews yet. Start selling to get reviews!</div>
                )}
              </div>
            </div>

            {/* Rating Stats */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Rating Stats</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{averageRating}</div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`w-6 h-6 ${star <= Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">Based on {ratings.length} reviews</div>
                </div>

                <div className="space-y-2">
                  {ratingDistribution.map(({ star, count, percentage }) => (
                    <div key={star} className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 w-3">{star}</div>
                      <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-500 w-10 text-right">
                        {count}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{positivePercentage}%</div>
                    <div className="text-xs text-gray-500">Positive reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{ratings.length}</div>
                    <div className="text-xs text-gray-500">Total reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
