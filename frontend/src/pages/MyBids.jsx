import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBiddingHistory } from "../api";
import DashboardSidebar from "../components/DashboardSidebar";

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

function StatusBadge({ state }) {
  const cls =
    state === "leading"
      ? "bg-green-100 text-green-800"
      : state === "outbid"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded ${cls}`}>
      {state}
    </span>
  );
}

export default function MyBids() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  // server-side paging
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // UI state
  const [tab, setTab] = useState("active"); // active | won | lost
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Sidebar handles fetching current user; only load bidding history here
        const res = await getBiddingHistory({ page, limit });
        if (!mounted) return;
        const data = res?.history || res?.bids || [];
        setHistory(Array.isArray(data) ? data : []);
        setTotal(Number(res?.total || 0));
      } catch (err) {
        console.error("MyBids load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [page, limit]);

  // derived counts & filters (client-side over page result)
  const now = Date.now();
  const normalized = history.map((b) => {
    const auction = b.auctionId || b.auction || {};
    const endTime = auction.endTime
      ? new Date(auction.endTime).getTime()
      : b.endedAt
      ? new Date(b.endedAt).getTime()
      : null;
    const yourBid = Number(b.amount ?? b.yourBid ?? 0);
    const current = Number(
      auction.currentBid ?? auction.current ?? b.current ?? 0
    );
    const isLeading = yourBid > 0 && yourBid >= current;
    const isEnded = endTime != null && endTime <= now;
    return { raw: b, auction, endTime, yourBid, current, isLeading, isEnded };
  });

  const counts = useMemo(() => {
    return {
      total: total,
      active: normalized.filter((x) => !x.isEnded).length,
      won: normalized.filter((x) => x.raw.youWon || (x.isEnded && x.isLeading))
        .length,
      lost: normalized.filter((x) => x.isEnded && !x.raw.youWon && !x.isLeading)
        .length,
    };
  }, [normalized, total]);

  const filtered = normalized.filter((x) => {
    if (tab === "active" && x.isEnded) return false;
    if (tab === "won" && !(x.raw.youWon || (x.isEnded && x.isLeading)))
      return false;
    if (tab === "lost" && !(x.isEnded && !x.raw.youWon && !x.isLeading))
      return false;
    if (!q) return true;
    const term = q.trim().toLowerCase();
    const title = (
      x.auction?.title ||
      x.raw.title ||
      x.auction?.item?.name ||
      ""
    ).toLowerCase();
    return title.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageItems = filtered; // using server page; search/tab filters apply on server page results

  const formatTimeLeft = (endTime) => {
    if (!endTime) return "—";
    const ms = endTime - Date.now();
    if (ms <= 0) return "Ended";
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar role="buyer" active="my-bids" />

      {/* Main */}
      <main className="flex-1 p-8 space-y-6">
          {/* Top stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Bids"
              value={
                <>
                  <span className="text-2xl">{counts.active}</span>
                  <div className="text-xs text-gray-500">Across auctions</div>
                </>
              }
            />
            <StatCard
              title="Leading"
              value={
                <>
                  <span className="text-2xl">
                    {counts.total - counts.lost - counts.won}
                  </span>
                  <div className="text-xs text-gray-500">Currently leading</div>
                </>
              }
              small
            />
            <StatCard
              title="Won"
              value={
                <>
                  <span className="text-2xl">{counts.won}</span>
                  <div className="text-xs text-gray-500">Completed wins</div>
                </>
              }
              small
            />
            <StatCard
              title="Lost"
              value={
                <>
                  <span className="text-2xl">{counts.lost}</span>
                  <div className="text-xs text-gray-500">Lost auctions</div>
                </>
              }
              small
            />
          </div>

          {/* Tabs and search */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`px-3 py-1 rounded cursor-pointer ${
                    tab === "active"
                      ? "bg-yellow-100 font-semibold"
                      : "bg-transparent"
                  }`}
                  onClick={() => {
                    setTab("active");
                    setPage(1);
                  }}
                >
                  Active ({counts.active})
                </div>
                <div
                  className={`px-3 py-1 rounded cursor-pointer ${
                    tab === "won"
                      ? "bg-yellow-100 font-semibold"
                      : "bg-transparent"
                  }`}
                  onClick={() => {
                    setTab("won");
                    setPage(1);
                  }}
                >
                  Won ({counts.won})
                </div>
                <div
                  className={`px-3 py-1 rounded cursor-pointer ${
                    tab === "lost"
                      ? "bg-yellow-100 font-semibold"
                      : "bg-transparent"
                  }`}
                  onClick={() => {
                    setTab("lost");
                    setPage(1);
                  }}
                >
                  Lost ({counts.lost})
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  aria-label="Search auctions by name"
                  placeholder="Search auction by name..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-md px-3 py-2 text-sm"
                />
                <div className="text-sm text-gray-600">
                  Showing {total} items
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-10 text-gray-600">
                Loading your bids...
              </div>
            ) : total === 0 ? (
              <div className="text-center py-10 text-gray-600">
                No bids found.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {pageItems.map((x, idx) => {
                    const b = x.raw;
                    const auction = x.auction || {};
                    const title =
                      auction.title ||
                      b.title ||
                      auction.item?.name ||
                      "Untitled Auction";
                    const itemName = auction.item?.name || "";
                    const badgeState =
                      x.isLeading && !x.isEnded
                        ? "leading"
                        : !x.isLeading && !x.isEnded
                        ? "outbid"
                        : x.raw.youWon || x.isLeading
                        ? "won"
                        : "lost";

                    return (
                      <div
                        key={b._id || b.id || idx}
                        className="border rounded-lg p-3 flex items-center gap-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/auction/${
                              auction._id || auction.id || b.auctionId
                            }`
                          )
                        }
                      >
                        <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden">
                          {auction.item?.images?.[0] ? (
                            <img
                              src={auction.item.images[0]}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold text-lg">
                                {title}{" "}
                                <span className="ml-2">
                                  <StatusBadge state={badgeState} />
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {itemName}
                              </div>
                            </div>

                            <div className="text-xs text-gray-500 text-right">
                              <div>
                                Bidders:{" "}
                                <span className="font-medium text-gray-900">
                                  {auction.totalBids ??
                                    auction.bids ??
                                    b.totalBids ??
                                    0}
                                </span>
                              </div>
                              <div className="text-red-600">
                                {x.isEnded
                                  ? "Ended"
                                  : formatTimeLeft(x.endTime)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-gray-500">
                                Your Bid
                              </div>
                              <div className="font-semibold text-blue-700">
                                ₹{x.yourBid || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">
                                Current Bid
                              </div>
                              <div className="font-semibold text-green-600">
                                ₹{x.current || "-"}
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                              {(
                                x.raw.youWon || (x.isEnded && x.isLeading)
                              ) ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const auctionId = auction._id || auction.id || b.auctionId;
                                    if (auctionId) navigate(`/invoice/${auctionId}`);
                                  }}
                                  className="px-3 py-2 bg-blue-600 text-sm rounded font-medium hover:bg-blue-700 text-white"
                                >
                                  Invoice
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/auction/${
                                        auction._id || auction.id || b.auctionId
                                      }`
                                    );
                                  }}
                                  className="px-3 py-2 bg-yellow-400 text-sm rounded font-medium hover:bg-yellow-500"
                                >
                                  Place Bid
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} -{" "}
                    {Math.min(page * limit, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <div className="text-sm">
                      {page} / {totalPages}
                    </div>
                    <button
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
    </div>
  );
}
