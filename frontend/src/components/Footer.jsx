import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/bidsphere.svg";
export default function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <img src={logo} alt="BidSphere" className="h-8" />          <p className="text-sm text-gray-600 mt-2">The trusted marketplace for rare finds and everyday deals. Buy, sell, and bid with confidence — all in one place.</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">For Bidders</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><Link to="/auctions" className="hover:underline">Live & Upcoming</Link></li>
            <li><Link to="/watchlist" className="hover:underline">Watchlist Items</Link></li>
            <li><Link to="/my-bids" className="hover:underline">Bid Activity</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">For Sellers</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><Link to="/create-auction" className="hover:underline">Start Selling</Link></li>
            <li><Link to="/my-listings" className="hover:underline">My Listings</Link></li>
            <li><Link to="/" className="hover:underline">Payment Info</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Community</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><Link to="/about" className="hover:underline">About Us</Link></li>
            <li><Link to="/help" className="hover:underline">Help Centre</Link></li>
            <li><Link to="/feedback" className="hover:underline">Feedback</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-500">
          <div>© {new Date().getFullYear()} BidSphere. All rights reserved.</div>
          <div className="space-x-4">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            <Link to="/cookies" className="hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
