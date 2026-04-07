import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { listAuctions } from "../api";

function AuctionCard({ auction }) {
  const img = auction?.item?.images?.[0] || "";
  const imgSrc = img && (img.startsWith("http") || img.startsWith("/")) ? img : null;
  const title = auction?.title || auction?.item?.name || "Untitled Auction";
  const itemName = auction?.item?.name || "Item";
  const starting = auction?.startingPrice ?? null;
  const endTime = auction?.endTime ? new Date(auction.endTime).toLocaleString() : null;
  const rawCondition = auction?.item?.condition ?? "";
  // map and display only the four allowed conditions
  function mappedCondition(raw) {
    if (!raw) return null;
    const normalized = String(raw).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const map = {
      "new": "New",
      "like-new": "Like New",
      "good": "Good",
      "fair": "Fair",
    };
    return map[normalized] || null;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="relative">
        {imgSrc ? (
          <img src={imgSrc} alt={itemName} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-500">No image</div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800`}>{(auction && auction.status) || "N/A"}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm text-gray-500">{auction?.item?.category || "Category"}</div>
        <div className="font-semibold text-lg text-gray-800 mt-2">{title}</div>
        {mappedCondition(rawCondition) && (
          <div className="mt-2">
            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-900 border border-yellow-200">
              {mappedCondition(rawCondition)}
            </div>
          </div>
        )}
        <div className="text-sm text-gray-600 mt-1">{itemName}</div>
        {starting != null && <div className="text-sm text-gray-800 mt-2">Starting: ₹{starting}</div>}
        {endTime && <div className="text-xs text-gray-500 mt-1">Ends: {endTime}</div>}
      </div>
    </div>
  );
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Auctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Filter UI state
  const [filterOpen, setFilterOpen] = useState(false);
  const [conditionFilter, setConditionFilter] = useState(""); // applied filters
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  // draft UI state (only applied when user clicks Apply)
  const [draftCondition, setDraftCondition] = useState("");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const qs = useQuery();
  const search = qs.get("search")?.trim() || "";

  useEffect(() => {
    let mounted = true;
    async function fetch() {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        params.limit = 50;
        const res = await listAuctions(params);
        if (!mounted) return;
        // show only LIVE and UPCOMING auctions (backend returns status in uppercase)
        const all = res?.auctions || [];
        const visible = all.filter((a) => {
          const s = (a?.status || "").toString().toUpperCase();
          return s === "LIVE" || s === "UPCOMING";
        });
        setAuctions(visible);
      } catch (err) {
        console.error("listAuctions error:", err);
        if (mounted) setError(err.message || "Failed to load auctions");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetch();
    return () => { mounted = false; };
  }, [search]);

  // apply client-side filtering to the fetched auctions
  const normalizeCond = (s) => {
    if (!s && s !== "") return "";
    try {
      return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    } catch (e) {
      return "";
    }
  };

  const filteredAuctions = auctions.filter((a) => {
    try {
      // condition filter: compare normalized forms (handles 'like new' vs 'like-new' and capitalization)
      if (conditionFilter) {
        const rawCond = a?.item?.condition ?? "";
        const cond = normalizeCond(rawCond);
        const want = normalizeCond(conditionFilter);
        if (!cond) return false; // auction has no condition -> exclude when a filter is active
        if (cond != want) return false;
      }

      // price filter (use startingPrice or currentBid as a fallback)
      const price = Number(a?.startingPrice ?? a?.currentBid ?? 0);
      if (minPrice !== "" && !isNaN(Number(minPrice))) {
        if (price < Number(minPrice)) return false;
      }
      if (maxPrice !== "" && !isNaN(Number(maxPrice))) {
        if (price > Number(maxPrice)) return false;
      }

      return true;
    } catch (e) {
      return true;
    }
  });

  const clearFilters = () => {
    setConditionFilter("");
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold">Auctions{search ? ` — ${search}` : ""}</h1>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((s) => {
                const next = !s;
                if (!s) {
                  // opening: populate drafts from currently applied filters
                  setDraftCondition(conditionFilter);
                  setDraftMinPrice(minPrice);
                  setDraftMaxPrice(maxPrice);
                }
                return next;
              })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium"
            >
              Filters
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg z-40 p-4">
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Condition</label>
                  <select value={draftCondition} onChange={(e)=>setDraftCondition(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                    <option value="">Any</option>
                    <option value="new">New</option>
                    <option value="like new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Price range (₹)</label>
                  <div className="flex gap-2">
                    <input placeholder="Min" value={draftMinPrice} onChange={(e)=>setDraftMinPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                    <input placeholder="Max" value={draftMaxPrice} onChange={(e)=>setDraftMaxPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={()=>{ clearFilters(); setDraftCondition(""); setDraftMinPrice(""); setDraftMaxPrice(""); setFilterOpen(false); }} className="text-sm text-gray-600 hover:underline">Clear</button>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ /* Cancel - revert drafts to applied */ setDraftCondition(conditionFilter); setDraftMinPrice(minPrice); setDraftMaxPrice(maxPrice); setFilterOpen(false); }} className="px-3 py-1 bg-gray-100 rounded text-sm">Cancel</button>
                    <button onClick={()=>{ setConditionFilter(draftCondition); setMinPrice(draftMinPrice); setMaxPrice(draftMaxPrice); setFilterOpen(false); }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Apply</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && <div>Loading auctions...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <>
            {filteredAuctions.length === 0 ? (
              <div className="text-gray-700">No items match the selected filters</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAuctions.map((a) => (
                  <Link key={a._id} to={`/auction/${a._id}`} className="block hover:opacity-95">
                    <AuctionCard auction={a} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
