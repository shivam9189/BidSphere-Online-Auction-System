import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  getAllAuctionsAdmin,
  getAuctionDetailsAdmin,
  verifyAuction,
  removeAuctionAdmin,
  getAdminNotifications,
  confirmAdminNotification,
  rejectAdminNotification,
  getAllDeliveries,
} from "../api";

function AdminDashboard() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverError, setDeliverError] = useState(null);
  const [showDeliveries, setShowDeliveries] = useState(false);
  // store the processing payment id (not notification id) to avoid duplicate actions for same payment
  const [notifProcessingPaymentId, setNotifProcessingPaymentId] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchAuctions() {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        const res = await getAllAuctionsAdmin(params);
        if (!mounted) return;
        setAuctions(res?.auctions || []);
      } catch (err) {
        console.error("getAllAuctionsAdmin error:", err);
        if (mounted) setError(err.message || "Failed to load auctions");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchAuctions();
    return () => {
      mounted = false;
    };
  }, [statusFilter]);

  // load admin notifications (payment verification requests)
  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      setNotifLoading(true);
      try {
        const res = await getAdminNotifications();
        if (!mounted) return;
        const raw = res?.notifications || res || [];
        // filter out notifications whose payment is in a terminal state
        const terminalStates = new Set(["SUCCESS", "FAILED", "REJECTED", "CANCELLED", "REMOVED", "DECLINED"]);
        const active = (raw || []).filter((n) => {
          const st = (n?.payment?.status || n?.status || "").toString().toUpperCase();
          if (!st) return true;
          return !terminalStates.has(st);
        });
        // dedupe by payment id (or fallback to notification id)
        const seen = new Set();
        const dedup = [];
        for (const n of active) {
          const pid = n?.payment?._id || n?.paymentId || n?._id;
          if (seen.has(pid)) continue;
          seen.add(pid);
          dedup.push(n);
        }
        setNotifications(dedup);
      } catch (err) {
        console.error("loadNotifications error:", err);
      } finally {
        if (mounted) setNotifLoading(false);
      }
    }
    // fetch once on mount
    loadNotifications();
    return () => { mounted = false; };
  }, []);

  const handleVerify = async (auctionId) => {
    if (!window.confirm("Are you sure you want to verify this auction? The status will change to UPCOMING/LIVE.")) return;
    
    setVerifyingId(auctionId);
    try {
      const res = await verifyAuction(auctionId);
      // Update the auction in the list with the verified status
      setAuctions((prev) =>
        prev.map((a) => (a._id === auctionId ? { ...a, ...res.auction } : a))
      );

      if (selectedAuction && selectedAuction._id === auctionId) {
        setSelectedAuction(res.auction);
      }

      toast.success(res.message || "Auction verified successfully. Status changed to UPCOMING/LIVE.");
    } catch (err) {
      toast.error(err.message || "Failed to verify auction");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleViewDetails = async (auctionId) => {
    setDetailLoading(true);
    setSelectedAuction({ _id: auctionId });
    try {
      const res = await getAuctionDetailsAdmin(auctionId);
      const auc = res.auction;
      setSelectedAuction((prev) => (prev && prev._id === auctionId ? auc : prev));
    } catch (err) {
      toast.error(err.message || "Failed to load auction details");
      setSelectedAuction((prev) => (prev && prev._id === auctionId ? null : prev));
    } finally {
      setDetailLoading(false);
    }
  };

  

  const handleRemove = async (auctionId) => {
    if (!window.confirm("Are you sure you want to remove this auction? This will hide it from all users.")) return;

    setRemovingId(auctionId);
    try {
      const res = await removeAuctionAdmin(auctionId);
      setAuctions((prev) =>
        prev.map((a) => (a._id === auctionId ? { ...a, ...res.auction } : a))
      );

      if (selectedAuction && selectedAuction._id === auctionId) {
        setSelectedAuction(res.auction);
      }

      toast.success(res.message || "Auction removed successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to remove auction");
    } finally {
      setRemovingId(null);
    }
  };

  // notification handlers
  const handleConfirmNotification = async (notifId) => {
    if (!window.confirm("Confirm this payment and register the bidder?")) return;
    const notif = notifications.find((n) => n._id === notifId);
    const pid = notif?.payment?._id || notif?.paymentId || notifId;
    setNotifProcessingPaymentId(pid);
    try {
      await confirmAdminNotification(notifId);
      // remove any notifications that reference the same payment id
      setNotifications((prev) => prev.filter((n) => (n?.payment?._id || n?.paymentId || n?._id) !== pid));
      toast.success("Payment confirmed and bidder registered.");
    } catch (err) {
      console.error("confirm notification error:", err);
      toast.error(err?.message || "Failed to confirm notification");
    } finally {
      setNotifProcessingPaymentId(null);
    }
  };

  const handleRejectNotification = async (notifId) => {
    if (!window.confirm("Reject this payment verification request?")) return;
    const notif = notifications.find((n) => n._id === notifId);
    const pid = notif?.payment?._id || notif?.paymentId || notifId;
    setNotifProcessingPaymentId(pid);
    try {
      await rejectAdminNotification(notifId);
      // remove any notifications that reference the same payment id
      setNotifications((prev) => prev.filter((n) => (n?.payment?._id || n?.paymentId || n?._id) !== pid));
      toast.info("Payment verification rejected.");
    } catch (err) {
      console.error("reject notification error:", err);
      toast.error(err?.message || "Failed to reject notification");
    } finally {
      setNotifProcessingPaymentId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "YET_TO_BE_VERIFIED":
        return "bg-yellow-100 text-yellow-800";
      case "LIVE":
        return "bg-green-100 text-green-800";
      case "UPCOMING":
        return "bg-blue-100 text-blue-800";
      case "ENDED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
      case "REMOVED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "YET_TO_BE_VERIFIED":
        return "Yet to be Verified";
      case "REMOVED":
        return "Removed";
      default:
        return status || "N/A";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // get the top bid amount from several possible fields used across the backend
  const getTopBid = (a) => {
    if (!a) return 0;
    const v = a.currentBid ?? a.current ?? a.final ?? a.winningPrice ?? a.finalPrice ?? a.amount ?? a.startingPrice ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>

        {/* Filter Section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-700">
              Filter by Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Auctions</option>
              <option value="YET_TO_BE_VERIFIED">Yet to be Verified</option>
              <option value="LIVE">Live</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ENDED">Ended</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REMOVED">Removed</option>
            </select>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifs(true)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                Payment Verifications ({notifications.length})
              </button>
              <button
                onClick={async () => {
                  setShowDeliveries(true);
                  // load deliveries when opening
                  try {
                    setDeliverLoading(true);
                    setDeliverError(null);
                    const res = await getAllDeliveries();
                    setDeliveries(res?.deliveries || []);
                  } catch (err) {
                    console.error('load deliveries error:', err);
                    setDeliverError(err?.message || 'Failed to load deliveries');
                  } finally {
                    setDeliverLoading(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Deliveries
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading auctions...</div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Total Auctions: <span className="font-semibold">{auctions.length}</span>
            </div>

            

            {auctions.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
                No auctions found.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Auction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Starting Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Bid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bids
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auctions.map((auction) => (
                        <tr
                          key={auction._id}
                          className="group hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewDetails(auction._id)}
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              {auction.item?.images?.[0] ? (
                                <img
                                  src={auction.item.images[0]}
                                  alt={auction.item.name}
                                  className="h-12 w-12 rounded object-cover mr-3"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded bg-gray-200 mr-3 flex items-center justify-center text-xs text-gray-400">
                                  No img
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {auction.title || "Untitled"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {auction.item?.name || "N/A"}
                                </div>
                                {auction.item?.category && (
                                  <div className="text-xs text-gray-400">
                                    {auction.item.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {auction.createdBy?.username || auction.createdBy?.email || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {auction.createdBy?.email || ""}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                auction.status
                              )}`}
                            >
                              {getStatusLabel(auction.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{auction.startingPrice?.toLocaleString() || "0"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            ₹{getTopBid(auction).toLocaleString()}
                            {auction.currentWinner && (
                              <div className="text-xs text-gray-500">
                                Winner: {auction.currentWinner?.username || auction.currentWinner?.email || "N/A"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(auction.startTime)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(auction.endTime)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {auction.totalBids || 0}
                            {auction.totalParticipants > 0 && (
                              <div className="text-xs text-gray-500">
                                {auction.totalParticipants} participants
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {/* Row click opens details modal; no separate View button */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auction Detail Modal */}
      {/* Payment Verifications Modal */}
      {showNotifs && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setShowNotifs(false)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Payment Verifications</h2>
                <button onClick={() => setShowNotifs(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>

              {notifLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No pending payment verifications.</div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((n) => (
                    <div key={n._id} className="border rounded p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-gray-600">Payment ID: <span className="font-mono text-xs">{n.payment?._id || n._id}</span></div>
                          <div className="text-lg font-semibold text-gray-900">Amount: ₹{(n.payment?.amount != null) ? Number(n.payment.amount).toLocaleString() : (n.payment?.amount || 'N/A')}</div>
                          <div className="text-sm text-gray-600">Auction: {n.auctionId?.title || n.auctionId || 'N/A'}</div>
                          <div className="text-sm text-gray-600">Bidder: {n.userId?.username || n.userId?.email || n.userId || 'N/A'}</div>
                          <div className="text-xs text-gray-500">Requested: {new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => handleConfirmNotification(n._id)}
                            disabled={notifProcessingPaymentId === (n.payment?._id || n.paymentId || n._id)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                          >
                            {notifProcessingPaymentId === (n.payment?._id || n.paymentId || n._id) ? 'Processing...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => handleRejectNotification(n._id)}
                            disabled={notifProcessingPaymentId === (n.payment?._id || n.paymentId || n._id)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                          >
                            {notifProcessingPaymentId === (n.payment?._id || n.paymentId || n._id) ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showDeliveries && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setShowDeliveries(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Deliveries</h2>
                <button onClick={() => setShowDeliveries(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>

              {deliverLoading ? (
                <div className="text-center py-8">Loading deliveries...</div>
              ) : deliverError ? (
                <div className="text-center py-8 text-red-600">{deliverError}</div>
              ) : deliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No deliveries found.</div>
              ) : (
                <div className="space-y-4">
                  {deliveries.map((d) => (
                    <div key={d._id} className="border rounded p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Auction</div>
                          <div className="font-semibold">{d.auctionId?.title || d.auctionId?._id || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{d.auctionId?.item?.name || ''}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Seller</div>
                          <div className="font-semibold">{d.sellerId?.username || d.sellerId?.email || d.sellerId?._id || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{d.sellerId?.email || ''}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Buyer (Winner)</div>
                          <div className="font-semibold">{d.buyerId?.username || d.buyerId?.email || d.buyerId?._id || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{d.buyerId?.email || ''}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Buyer Address</div>
                          <div className="text-sm text-gray-900">
                            {d.buyerAddress ? (
                              <div>
                                <div>{d.buyerAddress.name}</div>
                                <div>{d.buyerAddress.street}, {d.buyerAddress.city}</div>
                                <div>{d.buyerAddress.state} - {d.buyerAddress.postalCode}</div>
                                <div>{d.buyerAddress.country}</div>
                              </div>
                            ) : <div className="text-gray-500">Not provided</div>}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Seller Address</div>
                          <div className="text-sm text-gray-900">
                            {d.sellerAddress ? (
                              <div>
                                <div>{d.sellerAddress.street}, {d.sellerAddress.city}</div>
                                <div>{d.sellerAddress.state} - {d.sellerAddress.postalCode}</div>
                                <div>{d.sellerAddress.country}</div>
                              </div>
                            ) : <div className="text-gray-500">Not provided</div>}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Status</div>
                          <div className="text-sm text-gray-900">Payment: {d.paymentStatus || 'N/A'}</div>
                          <div className="text-sm text-gray-900">Delivery: {d.deliveryStatus || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedAuction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAuction(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Auction Details</h2>
                <button
                  onClick={() => setSelectedAuction(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="text-center py-8">Loading details...</div>
              ) : (
                <div className="space-y-6">
                  {/* Images */}
                  {selectedAuction.item?.images && selectedAuction.item.images.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Images</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedAuction.item.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`${selectedAuction.item.name} ${idx + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Title</h3>
                      <p className="text-lg font-semibold text-gray-900">{selectedAuction.title || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Item Name</h3>
                      <p className="text-lg font-semibold text-gray-900">{selectedAuction.item?.name || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Category</h3>
                      <p className="text-gray-900">{selectedAuction.item?.category || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Condition</h3>
                      <p className="text-gray-900">{selectedAuction.item?.condition || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedAuction.status)}`}>
                        {getStatusLabel(selectedAuction.status)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Verified</h3>
                      <p className="text-gray-900">{selectedAuction.verified ? "Yes" : "No"}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedAuction.item?.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedAuction.item.description}</p>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Starting Price</h3>
                      <p className="text-xl font-semibold text-gray-900">₹{selectedAuction.startingPrice?.toLocaleString() || "0"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Current Top Bid</h3>
                      <p className="text-xl font-semibold text-gray-900">₹{getTopBid(selectedAuction).toLocaleString()}</p>
                      {selectedAuction.currentWinner && (
                        <div className="mt-2 text-sm text-gray-600">Top bidder: {selectedAuction.currentWinner?.username || selectedAuction.currentWinner?.email || 'N/A'}</div>
                      )}
                    </div>
                    {selectedAuction.buyItNowPrice && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Buy It Now Price</h3>
                        <p className="text-xl font-semibold text-gray-900">₹{selectedAuction.buyItNowPrice?.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
                      <p className="text-gray-900">{formatDate(selectedAuction.startTime)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">End Time</h3>
                      <p className="text-gray-900">{formatDate(selectedAuction.endTime)}</p>
                    </div>
                  </div>

                  {/* Creator Info */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Created By</h3>
                    <p className="text-gray-900">
                      {selectedAuction.createdBy?.username || selectedAuction.createdBy?.email || "N/A"}
                      {selectedAuction.createdBy?.email && (
                        <span className="text-gray-500 ml-2">({selectedAuction.createdBy.email})</span>
                      )}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Total Bids</h3>
                      <p className="text-lg font-semibold text-gray-900">{selectedAuction.totalBids || 0}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Participants</h3>
                      <p className="text-lg font-semibold text-gray-900">{selectedAuction.totalParticipants || 0}</p>
                    </div>
                    {selectedAuction.currentWinner && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Current Winner</h3>
                        <p className="text-gray-900">
                          {selectedAuction.currentWinner?.username || selectedAuction.currentWinner?.email || "N/A"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t flex flex-wrap gap-3">
                    {selectedAuction.status === "YET_TO_BE_VERIFIED" && !selectedAuction.verified && (
                      <button
                        onClick={() => handleVerify(selectedAuction._id)}
                        disabled={verifyingId === selectedAuction._id}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {verifyingId === selectedAuction._id ? "Verifying..." : "Verify Auction"}
                      </button>
                    )}

                    {selectedAuction.status !== "REMOVED" ? (
                      <button
                        onClick={() => handleRemove(selectedAuction._id)}
                        disabled={removingId === selectedAuction._id}
                        className="px-6 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                      >
                        {removingId === selectedAuction._id ? "Removing..." : "Remove Auction"}
                      </button>
                    ) : (
                      <span className="text-sm text-red-600 font-medium self-center">This auction has been removed.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;