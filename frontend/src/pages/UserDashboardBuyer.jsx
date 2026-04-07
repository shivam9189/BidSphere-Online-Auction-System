import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWatchlist, getBiddingHistory, getMyDeliveries, getMyPayments } from "../api";
import DashboardSidebar from "../components/DashboardSidebar";
import { useUser } from "../contexts/UserContext";
/* eslint-disable react/prop-types */

function StatCard({ title, value, small }) {
  return (
    <div className="bg-white border rounded-lg p-4 flex flex-col justify-between">
      <div className="text-xs text-gray-500">{title}</div>
      <div
        className={`mt-2 ${
          small ? "text-xl" : "text-2xl"
        } font-semibold text-gray-800`}
      >
        {value}
      </div>
    </div>
  );
}

function WatchlistRow({
  title = "Auction Name",
  bid = "₹250",
  bids = 0,
  timeLeft = "—",
  auctionId,
  image = null,
}) {
  const imgSrc = image && (image.startsWith("http") || image.startsWith("/")) ? image : null;
  
  return (
    <Link to={auctionId ? `/auction/${auctionId}` : '#'} className="flex items-center gap-4 bg-white border rounded p-3 hover:shadow-md transition-shadow">
      <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
        {imgSrc ? (
          <img src={imgSrc} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium hover:text-blue-600">{title}</div>
        <div className="text-xs text-gray-500 mt-1">
          Current bid <span className="font-semibold text-gray-800">{bid}</span>{" "}
          • Bids {bids}
        </div>
      </div>
      <div className="text-right text-xs text-gray-500">
        <div className="text-sm text-red-600 font-semibold">{timeLeft}</div>
        <div className="mt-2">
          <span className="text-blue-600 text-xs hover:underline">
            View Auction
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function UserDashboardBuyer() {
  // top-level state (user comes from context)
  const { user, loading: loadingUser } = useUser() || {};

  const [watchlist, setWatchlist] = useState([]);
  const [biddingHistory, setBiddingHistory] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [deliveriesSet, setDeliveriesSet] = useState(new Set());
  const [paymentsSuccessSet, setPaymentsSuccessSet] = useState(new Set());
  const [allDeliveries, setAllDeliveries] = useState([]);

  

  // fetch lists (user is provided by context)
  useEffect(() => {
    let mounted = true;
    async function loadLists() {
      try {
        setLoadingLists(true);
        const [wlRes, bhRes, delRes, payRes] = await Promise.allSettled([
          getWatchlist(),
          getBiddingHistory(),
          getMyDeliveries(),
          getMyPayments(),
        ]);

        if (!mounted) return;

        const wl = wlRes.status === "fulfilled" ? (wlRes.value?.watchlist ?? wlRes.value ?? []) : [];
        setWatchlist(Array.isArray(wl) ? wl : []);

        const bh = bhRes.status === "fulfilled" ? (bhRes.value?.history ?? bhRes.value ?? []) : [];
        setBiddingHistory(Array.isArray(bh) ? bh : []);

        if (delRes.status === "fulfilled") {
          const deliveries = delRes.value?.deliveries ?? delRes.value ?? [];
          const arr = Array.isArray(deliveries) ? deliveries : [];
          setAllDeliveries(arr);
          setDeliveriesSet(new Set(arr.map((d) => String(d.auctionId?._id || d.auctionId))));
        }

        if (payRes.status === "fulfilled") {
          const payments = payRes.value?.payments ?? payRes.value ?? [];
          const arr = Array.isArray(payments) ? payments : [];
          const successIds = arr.filter((p) => String(p.status || "").toUpperCase() === "SUCCESS").map((p) => String(p.auctionId || p.auctionId?._id || p.auction));
          setPaymentsSuccessSet(new Set(successIds));
        }
      } catch (err) {
        console.error("list fetch error:", err);
      } finally {
        if (mounted) setLoadingLists(false);
      }
    }

    loadLists();
    return () => (mounted = false);
  }, []);

  const displayName = (user && (user.username || user.name || user.email || user.fullname)) || "First Last";
  const initials = String(displayName).split(" ").map((s) => s[0] || "").slice(0, 2).join("").toUpperCase();

  

  const navigate = useNavigate();
  function handleDownloadInvoice(biddingItem) {
    const auctionId = biddingItem.auctionId?._id || biddingItem._id;
    if (!auctionId) return;
    // navigate to invoice page where user can download or preview
    navigate(`/invoice/${auctionId}`);
  }

  const activeBids = (Array.isArray(biddingHistory) ? biddingHistory.filter((b) => b.current).length : 0) || 0;
  const totalSpending = (Array.isArray(biddingHistory) ? biddingHistory.reduce((s, b) => s + (b.amount || 0), 0) : 0) || 0;
  const watchlistCount = Array.isArray(watchlist) ? watchlist.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar role="buyer" active="dashboard" />

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Active Bids" value={<><span className="text-2xl text-green-600">{activeBids}</span><div className="text-xs text-gray-500">Currently bidding</div></>} />
            <StatCard title="Watchlist" value={<><span className="text-2xl text-green-600">{watchlistCount}</span><div className="text-xs text-gray-500">Items saved</div></>} />
            <StatCard title="Unpaid Wins" value={<><span className="text-2xl text-green-600">{(Array.isArray(biddingHistory) ? biddingHistory.filter(b => b.youWon && !paymentsSuccessSet.has(String(b.auctionId?._id || b._id))).length : 0)}</span><div className="text-xs text-gray-500">Awaiting payment</div></>} />
            <StatCard title="Deliveries" value={<><span className="text-2xl text-green-600">{deliveriesSet.size}</span><div className="text-xs text-gray-500">Saved addresses</div></>} />
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Watchlist</h2>
              <div className="text-sm text-blue-600"><Link to="/watchlist">View All</Link></div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {loadingLists ? (
                <div className="text-sm text-gray-500">Loading watchlist...</div>
              ) : !Array.isArray(watchlist) || watchlist.length === 0 ? (
                <div className="text-sm text-gray-500">You have no items in your watchlist.</div>
              ) : (
                watchlist.map((w, i) => {
                  const title = w.auctionId?.title || w.title || w.item?.name || w.name || "Untitled Auction";
                  const bid = w.auctionId?.currentBid || w.currentBid ? `₹${w.auctionId?.currentBid || w.currentBid}` : (w.auctionId?.startingPrice || w.startingPrice ? `₹${w.auctionId?.startingPrice || w.startingPrice}` : "—");
                  const image = w.auctionId?.item?.images?.[0] || w.auctionId?.images?.[0] || w.image || w.item?.images?.[0] || null;
                  return (
                    <WatchlistRow 
                      key={w._id || w.id || i} 
                      title={title} 
                      bid={bid} 
                      bids={w.totalBids || 0} 
                      timeLeft={w.timeLeft || "—"} 
                      auctionId={w.auctionId?._id || w._id || w.id}
                      image={image}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Bidding History</h2>
            <div className="space-y-3">
              {loadingLists ? (
                <div className="text-sm text-gray-500">Loading bidding history...</div>
              ) : !Array.isArray(biddingHistory) || biddingHistory.length === 0 ? (
                <div className="text-sm text-gray-500">You have no bidding history yet.</div>
              ) : (
                biddingHistory.map((b, idx) => {
                  const title = b.auctionId?.title || b.title || b.auctionTitle || b.item?.name || "Auction";
                  const image = b.auctionId?.item?.images?.[0] || b.auctionId?.images?.[0] || b.image || b.item?.images?.[0] || null;
                  const imgSrc = image && (image.startsWith("http") || image.startsWith("/")) ? image : null;
                  const auctionId = b.auctionId?._id || b.auctionId || b._id;
                  
                  return (
                    <div key={b._id || b.id || idx} className="bg-gray-50 p-3 rounded border flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { if (auctionId) navigate(`/auction/${auctionId}`); }}>
                      <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {imgSrc ? (
                          <img src={imgSrc} alt={title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium hover:text-blue-600">{title}</div>
                        <div className="text-xs text-gray-500">Your bid: <span className={b.youWon ? "text-green-600" : "text-gray-700"}>{b.amount ? `₹${b.amount}` : b.yourBid ? `₹${b.yourBid}` : "-"}</span>{b.current && <> • Current: ₹{b.current}</>}{b.final && <> • Final: ₹{b.final}</>}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                            <div>{b.createdAt ? new Date(b.createdAt).toLocaleString() : b.when || b.time || (b.endedAt ? new Date(b.endedAt).toLocaleString() : "")}</div>
                            <div className="mt-1"><span className="text-blue-600 text-xs hover:underline">View Auction</span></div>
                            {/* Actions for won items: pending payment and delivery management */}
                            {b.youWon && (
                              <div className="mt-3 flex flex-col gap-2">
                                {!paymentsSuccessSet.has(String(auctionId)) ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (auctionId) navigate(`/auction/${auctionId}/pay`); }}
                                    className="w-full py-2 bg-red-600 text-white rounded text-sm font-semibold"
                                  >
                                    Pay Now • ₹{b.final || b.amount || displayName}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Paid</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(b); }} className="text-xs text-blue-600 hover:underline">Download Invoice</button>
                                  </div>
                                )}

                                {/* Delivery actions: route to DeliveryCreate page */}
                                {deliveriesSet.has(String(auctionId)) ? (
                                  <button onClick={(e) => { e.stopPropagation(); navigate(`/delivery/create/${auctionId}`); }} className="w-full py-2 border rounded text-sm">Manage Delivery</button>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); navigate(`/delivery/create/${auctionId}`); }} className="w-full py-2 border rounded text-sm">Add Delivery Address</button>
                                )}
                              </div>
                            )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 text-center"><Link to="/my-bids" className="text-blue-600">View All History</Link></div>
          </div>

        </div>
      </div>
    </div>
  );
}
