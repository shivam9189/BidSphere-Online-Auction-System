import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../api";

export default function DashboardSidebar({ role = "seller", active = "dashboard" }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const me = await getCurrentUser().catch(() => null);
        if (!mounted) return;
        setUser(me?.user || me || null);
      } catch (err) {
        // ignore
      }
    }
    fetchUser();
    return () => (mounted = false);
  }, []);

  const localStored = typeof window !== "undefined" ? localStorage.getItem("bidsphere_user") : null;
  let storedUser = null;
  try {
    storedUser = localStored ? JSON.parse(localStored) : null;
  } catch (e) {
    storedUser = null;
  }

  const displayName = (user && (user.name || user.username || user.email)) || (storedUser && (storedUser.name || storedUser.username || storedUser.email)) || "User";
  const initials = String(displayName)
    .split(" ")
    .map((s) => s[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // prefer profile image fields from either fetched user or stored user
  const userImage = (user && (user.profilePhoto || user.profilePhotoUrl || user.avatar || user.profilePicture))
    || (storedUser && (storedUser.profilePhoto || storedUser.profilePhotoUrl || storedUser.avatar || storedUser.profilePicture))
    || null;

  const isSeller = role === "seller";
  const accentBg = isSeller ? "bg-blue-50" : "bg-green-50";
  const accentText = isSeller ? "text-blue-600" : "text-green-600";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-12 h-12 rounded-full overflow-hidden ${isSeller ? 'bg-blue-600' : 'bg-green-600'} text-white flex items-center justify-center font-semibold`}>
          {userImage ? (
            <img src={userImage} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            (initials || (isSeller ? "S" : "U"))
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-900">{displayName || "Loading..."}</div>
          <div className="text-xs text-gray-500">{isSeller ? "Active seller" : "Active bidder"}</div>
        </div>
      </div>

      <nav className="space-y-2">
        <ul className="space-y-2 text-sm">
          {isSeller ? (
            <>
              <li>
                <Link to="/seller-dashboard" className={`block py-2 px-3 rounded ${active === 'dashboard' ? accentBg + ' ' + accentText : 'hover:bg-gray-50 text-gray-700'}`}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/my-listings" className={`block py-2 px-3 rounded ${active === 'my-listings' ? accentBg + ' ' + accentText : 'hover:bg-gray-50 text-gray-700'}`}>
                  My Listings
                </Link>
              </li>
              <li>
                <Link to="/create-auction" className="block py-2 px-3 rounded hover:bg-gray-50 text-gray-700">Create Auction</Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/buyer-dashboard" className={`block py-2 px-3 rounded ${active === 'dashboard' ? accentBg + ' ' + accentText : 'hover:bg-gray-50 text-gray-700'}`}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/my-bids" className={`block py-2 px-3 rounded ${active === 'my-bids' ? accentBg + ' ' + accentText : 'hover:bg-gray-50 text-gray-700'}`}>
                  My Bids
                </Link>
              </li>
              <li>
                <Link to="/watchlist" className={`block py-2 px-3 rounded ${active === 'watchlist' ? accentBg + ' ' + accentText : 'hover:bg-gray-50 text-gray-700'}`}>
                  Watchlist
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}
