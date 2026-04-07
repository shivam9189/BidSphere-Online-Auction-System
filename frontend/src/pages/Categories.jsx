import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import CATEGORIES from "../constants/categories";
// Preload all category images so Vite includes them in the build
const categoryImages = import.meta.glob('../assets/categories/*.{png,jpg,jpeg,svg}', { eager: true, as: 'url' });
import { listAuctions } from "../api";

function CategoryCard({ cat, onSelect }) {
  const img = cat?.image || null;
  const label = cat?.label || "Unknown";
  const value = cat?.value || "";
  const resolveCategoryImage = (imgVal) => {
    if (!imgVal) return null;
    const v = String(imgVal).trim();
    if (v.startsWith("http") || v.startsWith("/")) return v;

    // Try to find a preloaded image by filename (case-insensitive)
    const keys = Object.keys(categoryImages || {});
    // exact filename match (with or without path)
    const filename = v.split(/[\\/]/).pop();
    const nameNoExt = filename.replace(/\.[^.]+$/, "").toLowerCase();

    let match = keys.find((k) => k.toLowerCase().endsWith(`/${filename.toLowerCase()}`));
    if (!match) {
      match = keys.find((k) => k.toLowerCase().includes(`/${nameNoExt}.`));
    }
    if (match) return categoryImages[match];

    // Fallback: if v looks like a relative path that points to assets, try to resolve it
    try {
      if (v.startsWith("assets/") || v.startsWith("src/") || v.startsWith("./") || v.startsWith("../") || v.includes("/assets/")) {
        return new URL(v, import.meta.url).href;
      }
    } catch (e) {
      // ignore
    }

    return null;
  };
  const imgSrc = resolveCategoryImage(img);

  const makePlaceholder = (text) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23e9ecef'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23808080' font-size='28' font-family='Arial, Helvetica, sans-serif'>${text}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const bg = imgSrc || makePlaceholder(label);
  return (
    <button onClick={() => onSelect && onSelect(value)} className="group block rounded-lg bg-white shadow-sm overflow-hidden text-left">
      <div className="relative w-full h-40 sm:h-44 md:h-48 bg-gray-200 overflow-hidden" aria-label={label}>
        <img src={bg} alt={label} className="w-full h-full object-cover" />
        <div className="absolute left-3 bottom-3 bg-black/40 text-white px-2 py-1 rounded">
          <div className="text-sm font-medium">{label}</div>
        </div>
      </div>
    </button>
  );
}

export default function Categories() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionsError, setAuctionsError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const cats = CATEGORIES.filter((c) => c.value !== "");
  const filtered = cats.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const qcat = qs.get("category");
    if (qcat) setSelected(qcat);
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!selected) {
        setAuctions([]);
        return;
      }
      setAuctionsLoading(true);
      try {
        const res = await listAuctions({ category: selected, limit: 50 });
        if (!mounted) return;
        const list = res?.auctions || [];
        const visible = list.filter((a) => {
          const s = (a && a.status) || "";
          const up = String(s).toUpperCase();
          return up === "LIVE" || up === "UPCOMING";
        });
        setAuctions(visible);
        setAuctionsError(null);
      } catch (err) {
        console.error("listAuctions error:", err);
        if (mounted) setAuctionsError(err.message || String(err));
      } finally {
        if (mounted) setAuctionsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selected]);

  function onSelectCategory(value) {
    setSelected(value);
    navigate(`/categories?category=${encodeURIComponent(value)}`);
  }

  function clearSelected() {
    setSelected(null);
    setAuctions([]);
    navigate(`/categories`);
  }

  function AuctionCard({ auction }) {
    const img = auction?.item?.images?.[0] || "";
    const imgSrc = img && (img.startsWith("http") || img.startsWith("/")) ? img : null;
    const title = auction?.title || auction?.item?.name || "Untitled Auction";
    const itemName = auction?.item?.name || "Item";
    const starting = auction?.startingPrice ?? null;
    const endTime = auction?.endTime ? new Date(auction.endTime).toLocaleString() : null;
    return (
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="relative">
          {imgSrc ? (
            <img src={imgSrc} alt={itemName} className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-500">No image</div>
          )}
          <div className="absolute top-2 right-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${(() => {
              const s = (auction && auction.status) || "";
              switch (String(s).toUpperCase()) {
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
            })()}`}>{(auction && auction.status) || "N/A"}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-500">{auction?.item?.category || "Category"}</div>
          <div className="font-semibold text-lg text-gray-800">{title}</div>
          <div className="text-sm text-gray-600 mt-1">{itemName}</div>
          {starting != null && <div className="text-sm text-gray-800 mt-2">Starting: ₹{starting}</div>}
          {endTime && <div className="text-xs text-gray-500 mt-1">Ends: {endTime}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold">Explore by Category</h2>
        <p className="text-sm text-gray-600 mt-2">Discover unique items across diverse collections</p>
      </div>

      <div className="max-w-lg mx-auto mb-8">
        <input
          aria-label="Search categories"
          placeholder="Search categories"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      {!selected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
          {filtered.length === 0 ? (
            <div className="col-span-2 sm:col-span-4 text-center text-gray-500">No categories found</div>
          ) : (
            filtered.map((c) => <CategoryCard key={c.value} cat={c} onSelect={onSelectCategory} />)
          )}
        </div>
      )}

      {selected && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-medium">Showing category: <span className="font-semibold">{selected}</span></div>
            <div>
              <button
                onClick={clearSelected}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Clear
              </button>
            </div>
          </div>

          {auctionsLoading && <div>Loading auctions...</div>}
          {!auctionsLoading && auctionsError && <div className="text-red-600">{auctionsError}</div>}
          {!auctionsLoading && !auctionsError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.length > 0 ? (
                auctions.map((a) => (
                  <Link key={a._id} to={`/auction/${a._id}`} className="block hover:opacity-95">
                    <AuctionCard auction={a} />
                  </Link>
                ))
              ) : (
                <div className="text-gray-600">No items found in this category.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
