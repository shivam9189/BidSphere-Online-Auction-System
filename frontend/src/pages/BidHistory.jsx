import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuction } from "../api";

function BidHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [allBids, setAllBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("bid-history");

  useEffect(() => {
    async function fetchAuctionData() {
      setLoading(true);
      try {
        const res = await getAuction(id);
        const auctionData = res?.auction || res || null;
        setAuction(auctionData);
        setAllBids(res?.topBids || []);
      } catch (err) {
        console.error("getAuction error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchAuctionData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Auction not found</div>
      </div>
    );
  }

  const totalBids = allBids.length;
  const totalBidders = new Set(allBids.map(b => b?.userId?._id || b?.userId)).size;
  const highestBid = allBids.length > 0 ? allBids[0]?.amount : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/auction/${id}`)}
          className="mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
        >
          ← Back to Auction
        </button>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => navigate(`/auction/${id}`)}
              className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Item Details
            </button>
            <button
              onClick={() => navigate(`/auction/${id}`)}
              className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Seller Info
            </button>
            <button
              className="px-6 py-3 text-sm font-semibold text-gray-900 border-b-2 border-yellow-400"
            >
              Bid History
            </button>
            <button
              onClick={() => navigate(`/auction/${id}`)}
              className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Shipping & Returns
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Bid History</h2>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
              <span className="text-sm text-blue-800">
                All bid amounts are displayed in INR. Times shown in IST (Indian Standard Time).
              </span>
            </div>

            {/* Bids Table */}
            {allBids.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No bids yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Bidder</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Bid Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Date & Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBids.map((bid, i) => {
                      const bidderData = bid?.userId || bid?.bidderId;
                      const bidderName = bidderData?.username || 
                                        bidderData?.name || 
                                        (bidderData?.email || "").split("@")[0] || 
                                        "Anonymous";
                      
                      const maskName = (name) => {
                        if (name.length <= 2) return name;
                        return name.slice(0, 1) + "***" + name.slice(-1);
                      };

                      const bidderRating = bidderData?.rating || (4.5 + Math.random() * 0.5).toFixed(1);
                      // add bidder rating later here
                      const isLeading = i === 0;
                      const bidTime = bid?.createdAt;
                      const formattedDate = bidTime ? new Date(bidTime).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : "";
                      const formattedTime = bidTime ? new Date(bidTime).toLocaleTimeString('en-IN', { 
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                      }) + ' IST' : "";

                      return (
                        <tr key={i} className={`border-b border-gray-100 ${isLeading ? 'bg-green-50' : ''}`}>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                                  {bidderName.slice(0, 2).toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{maskName(bidderName)}</div>
                                <div className="text-xs text-gray-500">Rating: {bidderRating}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className={`text-base font-bold ${isLeading ? 'text-yellow-600' : 'text-gray-900'}`}>
                              ₹{bid?.amount?.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-900">{formattedDate}</div>
                            <div className="text-xs text-gray-500">{formattedTime}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                              isLeading ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isLeading ? 'Leading' : 'Outbid'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stats Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{totalBids}</div>
                <div className="text-sm text-gray-600 mt-1">Total Bids</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{totalBidders}</div>
                <div className="text-sm text-gray-600 mt-1">Total Bidders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">₹{highestBid?.toLocaleString()}</div>
                <div className="text-sm text-gray-600 mt-1">Highest Bid</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BidHistory;
