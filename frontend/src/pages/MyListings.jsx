import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyAuctions, deleteAuction } from "../api";
import DashboardSidebar from "../components/DashboardSidebar";
import { toast } from "react-toastify";

function ListingRow({ a, onDelete, deleting }) {
  const title = a.title || a.item?.name || "Untitled";
  const starts = a.startingPrice ? `₹${a.startingPrice}` : "-";
  const ends = a.endTime ? new Date(a.endTime).toLocaleString() : "-";
  return (
    <div className="bg-white border rounded-md p-4 flex items-center gap-4">
      <div className="w-28 h-20 bg-gray-100 rounded overflow-hidden">
        {a.item?.images?.[0] ? (
          <img src={a.item.images[0]} alt={title} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-gray-500">{a.status}</div>
        </div>
        <div className="text-sm text-gray-500 mt-1">Starting bid <span className="font-semibold text-gray-800">{starts}</span></div>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
          <div>Bidders: <span className="font-medium text-gray-700">{a.totalBids ?? 0}</span></div>
          <div>Ends: <span className="font-medium text-gray-700">{ends}</span></div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Link to={`/edit-auction-draft/${a._id}`} className="text-xs text-blue-600">Edit</Link>
        <Link to={`/auction/${a._id}`} className="text-xs text-gray-600">View</Link>
        <button onClick={() => onDelete(a._id)} disabled={deleting} className="text-xs text-red-600">
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function MyListings() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetch() {
      setLoading(true);
      try {
        const res = await getMyAuctions({ limit: 100 });
        if (!mounted) return;
        setAuctions(res?.auctions || []);
      } catch (err) {
        console.error("getMyAuctions error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetch();
    return () => (mounted = false);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this auction? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      await deleteAuction(id);
      setAuctions((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("deleteAuction error:", err);
      toast.error(err?.message || "Failed to delete auction");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar role="seller" active="my-listings" />

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">My Listings</h1>
            <Link to="/create-auction" className="bg-yellow-400 px-4 py-2 rounded font-medium">Create Auction</Link>
          </div>

          <div className="bg-white border rounded-lg p-6">
            {loading ? (
              <div>Loading your listings...</div>
            ) : auctions.length === 0 ? (
              <div className="text-sm text-gray-500">You have no listings yet.</div>
            ) : (
              <div className="space-y-4">
                {auctions.map((a) => (
                  <ListingRow key={a._id} a={a} onDelete={handleDelete} deleting={deletingId === a._id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
