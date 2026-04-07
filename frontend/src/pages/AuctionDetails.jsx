import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAuction,
  placeBid,
  listPayments,
  setAutoBid,
  editAutoBid,
  activateAutoBid,
  deactivateAutoBid,
  getUserAutoBid,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getUserById,
} from "../api";
import { useUser } from "../contexts/UserContext";
import { toast } from "react-toastify";
import SellerRating from "./SellerRating";
import SellerRatingSummary from "../components/SellerRatingSummary";
import RatingForm from "./RatingForm";

function pad(n) {
  return String(n).padStart(2, "0");
}

function AuctionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [auction, setAuction] = useState(null);
  const [topBids, setTopBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: "--", hours: "--", mins: "--", secs: "--" });
  const intervalRef = useRef(null);
  const [bidAmount, setBidAmount] = useState("");
  const [placingBid, setPlacingBid] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    // reset selected image when auction images change
    try {
      const len = (auction?.item?.images || []).length;
      setSelectedImageIndex(0);
    } catch (e) {
      // ignore
    }
  }, [auction?.item?.images?.length]);
  
  // Auto-bid
  const [autoBidEnabled, setAutoBidEnabled] = useState(false);
  const [autoBidAmount, setAutoBidAmount] = useState("");
  const [autoBidData, setAutoBidData] = useState(null);
  const [autoBidLoading, setAutoBidLoading] = useState(false);
  const [showAutoBidModal, setShowAutoBidModal] = useState(false);
  const [ratingRefreshKey, setRatingRefreshKey] = useState(0);
  // watchlist state
  const [watchlisted, setWatchlisted] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  
  // User & payment
  const [currentUser, setCurrentUser] = useState(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Seller info (normalized) - declared with other hooks to keep Hooks order stable
  const [sellerInfo, setSellerInfo] = useState(null);

  

  const { user: ctxUser, loading: userLoading } = useUser() || {};

  // Fetch auction
  useEffect(() => {
    let mounted = true;
    async function fetchAuction() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAuction(id);
        if (!mounted) return;
        const auctionData = res?.auction || res || null;
        setAuction(auctionData);
        setTopBids(res?.topBids || []);
        // if backend returns a flag for in-watchlist, use it
        if (res?.inWatchlist || auctionData?.inWatchlist) {
          setWatchlisted(true);
        }
      } catch (err) {
        console.debug("getAuction error (suppressed):", err?.message || err);
        if (mounted) setError(err.message || "Failed to load auction");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (id) fetchAuction();
    return () => (mounted = false);
  }, [id]);

  // Sync currentUser from centralized UserContext to avoid duplicate fetches
  useEffect(() => {
    setCurrentUser(ctxUser || null);
  }, [ctxUser]);

  // Load seller info (if auction.createdBy is an id) — unconditional hook to keep order stable
  useEffect(() => {
    let mounted = true;
    async function fetchSeller() {
      const s = auction?.createdBy;
      const sellerIdLocal = typeof s === 'string' ? s : (s?._id || s?.id || null);
      // if auction includes full seller object, use it
      if (s && typeof s === 'object' && (s.username || s.name || s.email)) {
        setSellerInfo(s);
        return;
      }
      if (!sellerIdLocal) {
        setSellerInfo(null);
        return;
      }
      try {
        const res = await getUserById(sellerIdLocal).catch(() => null);
        if (!mounted) return;
        const user = res?.user || res || null;
        setSellerInfo(user);
      } catch (e) {
        if (!mounted) return;
        setSellerInfo(null);
      }
    }
    fetchSeller();
    return () => (mounted = false);
  }, [auction?.createdBy]);

  // Check if auction is in user's watchlist
  useEffect(() => {
    let mounted = true;
    async function checkWatchlist() {
      const uid = ctxUser?._id || currentUser?._id;
      if (!id || !uid) return;
      try {
        const res = await getWatchlist();
        if (!mounted) return;
        const watchlist = res?.watchlist || [];
        const isWatchlisted = watchlist.some(
          (item) => String(item.auctionId?._id || item.auctionId) === String(id)
        );
        setWatchlisted(isWatchlisted);
      } catch (err) {
        // ignore - user might not be logged in
      }
    }
    checkWatchlist();
    return () => (mounted = false);
  }, [id, ctxUser?._id, currentUser?._id]);

  // fetch current user and check payment status for this auction
  useEffect(() => {
    let mounted = true;
    async function checkUserAndPayment() {
      if (!auction?._id) return;
      setPaymentCheckLoading(true);
      try {
        const user = ctxUser || currentUser || null;
        if (!mounted) return;
        setCurrentUser(user);

        if (!user) {
          setHasPaid(false);
          setPaymentStatus(null);
          return;
        }

        // If auction already has this user registered (admin-confirmed), treat as paid
        try {
          const regs = auction?.registrations || auction?.registeredUsers || [];
          const isRegistered = Array.isArray(regs) && regs.some((r) => String(r) === String(user._id));
          if (isRegistered) {
            setHasPaid(true);
            setPaymentStatus("REGISTERED");
            return;
          }
        } catch (e) {
          // ignore and continue to payment lookup
        }

        // call admin payments list (backend supports filtering)
        let payments = [];
        try {
          const res = await listPayments({ auctionId: auction._id, bidderId: user._id });
          // some endpoints can return HTML error pages (404) which will cause JSON parse errors
          // normalize response shape defensively
          if (!res) {
            payments = [];
          } else if (typeof res === 'string' && res.trim().startsWith('<')) {
            console.warn('listPayments returned HTML instead of JSON; treating as no payments');
            payments = [];
          } else {
            payments = res?.data || [];
          }
        } catch (payErr) {
          // backend may return an HTML error page (404) causing JSON parse error in the client wrapper
          // suppress noisy stack traces for expected 404/non-JSON responses
          try {
            const msg = payErr?.message || String(payErr || 'listPayments failed');
            if (msg.includes('<!DOCTYPE') || msg.toLowerCase().includes('html') || payErr instanceof SyntaxError) {
              console.debug('listPayments returned non-JSON; treating as empty payments');
            } else {
              console.debug('listPayments error (suppressed):', msg);
            }
          } catch (e) {
            // ignore logging errors
          }
          payments = [];
        }
        // consider multiple backend-paid statuses (admin sets 'SUCCESS')
        const paidStatuses = ["CAPTURED", "SUCCESS", "PAID", "COMPLETED"];
        const paid = payments.find((p) => paidStatuses.includes((p.status || "").toUpperCase()));
        if (paid) {
          setHasPaid(true);
          setPaymentStatus(paid.status || "SUCCESS");
        } else {
          const pending = payments.find((p) => (p.status || "").toUpperCase() === "PENDING");
          setHasPaid(false);
          setPaymentStatus(pending ? pending.status : null);
        }
      } catch (err) {
        console.debug("checkUserAndPayment error (suppressed):", err?.message || err);
        setHasPaid(false);
        setPaymentStatus(null);
      } finally {
        if (mounted) setPaymentCheckLoading(false);
      }
    }
    checkUserAndPayment();
    return () => (mounted = false);
  }, [auction?._id, ctxUser?._id, currentUser?._id]);

  // Fetch auto-bid status
  useEffect(() => {
    let mounted = true;
    async function fetchAutoBid() {
      const uid = ctxUser?._id || currentUser?._id;
      if (!auction?._id || !uid) return;
      try {
        const data = await getUserAutoBid(auction._id);
        if (!mounted) return;
        if (data?.autoBid) {
          setAutoBidData(data.autoBid);
          setAutoBidEnabled(data.autoBid.isActive);
          setAutoBidAmount(data.autoBid.maxLimit.toString());
        }
      } catch (err) {
        console.debug("fetchAutoBid error (suppressed):", err?.message || err);
      }
    }
    fetchAutoBid();
    return () => (mounted = false);
  }, [auction?._id, ctxUser?._id, currentUser?._id]);

  // Countdown timer
  useEffect(() => {
    function compute() {
      // if auction is UPCOMING, countdown to startTime; otherwise countdown to endTime
      const startTime = auction?.startTime || auction?.startsAt || auction?.start;
      const endTime = auction?.endTime || auction?.endsAt || auction?.end;
      const targetTime = (auction?.status === 'UPCOMING' && startTime) ? startTime : endTime;
      if (!targetTime) {
        setTimeLeft({ days: "--", hours: "--", mins: "--", secs: "--" });
        return;
      }
      const end = new Date(targetTime).getTime();
      if (isNaN(end)) {
        setTimeLeft({ days: "--", hours: "--", mins: "--", secs: "--" });
        return;
      }
      const now = Date.now();
      const diff = Math.max(0, end - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days: pad(days), hours: pad(hours), mins: pad(mins), secs: pad(secs) });
    }

    compute();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(compute, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auction]);

  // Handle manual bid
  const handlePlaceBid = async () => {
    const val = Number(bidAmount);
    if (!val || isNaN(val) || val <= 0) {
      toast.error("Please enter a valid bid amount");
      return;
    }

    const endTime = auction?.endTime || auction?.endsAt || auction?.end;
    if (endTime) {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      if (now >= end) {
        toast.error("This auction has ended and bidding is no longer allowed");
        return;
      }
    }

    const currentPrice = auction?.currentBid && auction.currentBid > 0 ? auction.currentBid : auction?.startingPrice;
    const minInc = Number(auction?.minIncrement || 1);
    const minRequired = Number(currentPrice) + minInc;
    
    if (val < minRequired) {
      toast.error(`Your bid must be at least ₹${minRequired} (current: ₹${currentPrice} + min increment: ₹${minInc})`);
      return;
    }

    try {
      setPlacingBid(true);
      await placeBid(auction._id, val);
      const res = await getAuction(auction._id);
      setAuction(res?.auction || res || auction);
      setTopBids(res?.topBids || []);
      setBidAmount("");
      toast.success("Bid placed successfully!");
    } catch (err) {
      console.debug("placeBid error (suppressed):", err?.message || err);
      toast.error(err?.message || "Failed to place bid");
    } finally {
      setPlacingBid(false);
    }
  };

  // Handle auto-bid setup/edit
  const handleSetupAutoBid = async () => {
    const val = Number(autoBidAmount);
    if (!val || isNaN(val) || val <= 0) {
      toast.error("Please enter a valid maximum bid amount");
      return;
    }

    // Check if auction has ended based on end time
    const endTime = auction?.endTime || auction?.endsAt || auction?.end;
    if (endTime) {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      if (now >= end) {
        toast.error("This auction has ended and auto-bidding is no longer allowed");
        return;
      }
    }

    const currentPrice = auction?.currentBid && auction.currentBid > 0 ? auction.currentBid : auction?.startingPrice;
    const minInc = Number(auction?.minIncrement || 1);
    const minRequired = Number(currentPrice) + minInc;
    
    if (val < minRequired) {
      toast.error(`Your maximum bid must be at least ₹${minRequired}`);
      return;
    }

    try {
      setAutoBidLoading(true);
      if (autoBidData?._id) {
        await editAutoBid(auction._id, autoBidData._id, val);
        toast.success("Auto-bid limit updated!");
        setAutoBidData({ ...autoBidData, maxLimit: val });
      } else {
        const result = await setAutoBid(auction._id, val);
        setAutoBidData(result);
        toast.success("Auto-bid created successfully!");
      }
      setShowAutoBidModal(false);
    } catch (err) {
      console.debug("handleSetupAutoBid error (suppressed):", err?.message || err);
      toast.error(err?.message || "Failed to set up auto-bid");
    } finally {
      setAutoBidLoading(false);
    }
  };

  // Handle auto-bid toggle
  const handleToggleAutoBid = async (enabled) => {
    if (!autoBidData?._id) {
      setShowAutoBidModal(true);
      return;
    }

    // Check if auction has ended based on end time when trying to activate
    if (enabled) {
      const endTime = auction?.endTime || auction?.endsAt || auction?.end;
      if (endTime) {
        const end = new Date(endTime).getTime();
        const now = Date.now();
        if (now >= end) {
          toast.error("This auction has ended and auto-bidding is no longer allowed");
          return;
        }
      }
    }

    try {
      setAutoBidLoading(true);
      if (enabled) {
        await activateAutoBid(auction._id, autoBidData._id);
        setAutoBidEnabled(true);
        toast.success("Auto-bid activated!");
      } else {
        await deactivateAutoBid(auction._id, autoBidData._id);
        setAutoBidEnabled(false);
        toast.success("Auto-bid deactivated");
      }
    } catch (err) {
      console.debug("handleToggleAutoBid error (suppressed):", err?.message || err);
      toast.error(err?.message || "Failed to toggle auto-bid");
      setAutoBidEnabled(!enabled);
    } finally {
      setAutoBidLoading(false);
    }
  };

  // Share auction: use Web Share API when available, else copy link to clipboard or open mailto as fallback
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: auction?.title || 'Auction', url });
        toast.success('Shared successfully');
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Auction link copied to clipboard');
        return;
      }

      // Fallback: open mail client with link
      window.open(`mailto:?subject=${encodeURIComponent('Check out this auction')}&body=${encodeURIComponent(url)}`);
      toast.info('Opened mail client to share link');
    } catch (err) {
      console.error('share error:', err);
      toast.error('Failed to share the auction');
    }
  };

  // Report auction: open mail client with a pre-filled report template
  const handleReport = () => {
    try {
      const subject = `Report: ${auction?.title || auction?._id || 'Auction'}`;
      const bodyLines = [
        'I would like to report the following auction on BidSphere.',
        '',
        `Auction ID: ${auction?._id || ''}`,
        `Title: ${auction?.title || ''}`,
        `Seller: ${displaySellerName || ''}`,
        `URL: ${window.location.href}`,
        '',
        'Reason (please describe):',
        '\n',
      ];
      const mailto = `mailto:report@bidsphere.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
      window.location.href = mailto;
      toast.info('Opening mail client to report the auction');
    } catch (err) {
      console.error('report mailto error:', err);
      toast.error('Unable to open mail client for reporting');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading auction...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
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

  const images = auction?.item?.images || [];
  const seller = auction?.createdBy;
  const sellerId = typeof seller === 'string' ? seller : (seller?._id || seller?.id || null);
  // Prefer fetched `sellerInfo` when available, else fall back to auction.createdBy
  const effectiveSeller = sellerInfo || (seller && typeof seller === 'object' ? seller : null);
  let displaySellerName = 'Unknown';
  if (!effectiveSeller && typeof seller === 'string') displaySellerName = seller;
  else if (effectiveSeller) {
    displaySellerName = effectiveSeller?.username || effectiveSeller?.name || effectiveSeller?.displayName || effectiveSeller?.fullName || (effectiveSeller?.email ? effectiveSeller.email.split("@")[0] : null) || `Seller${String(sellerId || '').slice(0,6)}`;
  }
  // Prefer common profile photo field names if available
  const sellerImage = effectiveSeller?.profilePhoto || effectiveSeller?.profilePhotoUrl || effectiveSeller?.avatar || effectiveSeller?.profilePicture || null;
  // Prefer topBids[0] amount when available (reflects highest bid), otherwise fall back to auction.currentBid or startingPrice
  const currentPrice = (topBids && topBids[0] && (topBids[0].amount || topBids[0].price))
    || (auction?.currentBid && auction.currentBid > 0 ? auction.currentBid : auction?.startingPrice);
  const displayCurrentPrice = currentPrice != null ? Number(currentPrice).toLocaleString() : '-';
  const isSeller = currentUser?._id && sellerId && currentUser._id.toString() === String(sellerId);
  const isAuctionLive = auction?.status === "LIVE";
  const isAuctionEnded = auction?.status === 'ENDED';
  const isUpcoming = auction?.status === 'UPCOMING';
  const countdownTitle = isUpcoming ? 'AUCTION STARTS IN' : 'AUCTION ENDS IN';
  const countdownDateLabel = isUpcoming ? 'Starts:' : 'Ends:';
  const countdownTargetDate = isUpcoming ? (auction?.startTime || auction?.startsAt || auction?.start) : (auction?.endTime || auction?.endsAt || auction?.end);
  // determine top bidder (may be stored in auction.auctionWinner or topBids[0])
  const topBidderId = (
    (auction && (auction.auctionWinner || auction.currentWinner)) ||
    (topBids && topBids[0] && (topBids[0].userId?._id || topBids[0].userId || topBids[0].bidderId?._id || topBids[0].bidderId)) ||
    null
  );
  const isTopBidder = currentUser?._id && topBidderId && String(currentUser._id) === String(topBidderId);

  // Highest/final bid to display when auction ended
  const highestBid = auction?.status === 'ENDED'
    ? (topBids && topBids[0] && (topBids[0].amount || topBids[0].price)) || auction?.currentBid || auction?.finalPrice || null
    : null;

  // If user has not paid registration fee and is not the seller, show pre-payment landing page
  // Ensure sellers never see the registration/pay UI
  if (!hasPaid && (!currentUser || !isSeller) && !(auction?.status === 'ENDED' && isTopBidder)) {
    return (
      <div className="p-6 bg-[#f7f5f0] min-h-screen">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">{auction?.title || auction?.item?.name}</h1>
                  <div className="text-sm text-gray-600 mt-1">{auction?.item?.category} • {auction?.item?.condition}</div>
                </div>
                <div>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    auction?.status === "LIVE" ? "bg-green-100 text-green-800" :
                    auction?.status === "UPCOMING" ? "bg-blue-100 text-blue-800" :
                    auction?.status === "ENDED" ? "bg-gray-100 text-gray-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>{auction?.status || "N/A"}</span>
                </div>
              </div>

              <div className="w-full h-96 bg-gray-100 rounded overflow-hidden mb-4">
                {images.length > 0 ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-white">
                      <img src={images[selectedImageIndex]} alt={auction?.item?.name || "Auction"} className="max-w-full max-h-full object-contain" />
                      {images.length > 1 && (
                        <>
                          <button
                            aria-label="Previous image"
                            onClick={() => setSelectedImageIndex((i) => (i - 1 + images.length) % images.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white px-2 py-2 rounded-full shadow"
                          >
                            ‹
                          </button>
                          <button
                            aria-label="Next image"
                            onClick={() => setSelectedImageIndex((i) => (i + 1) % images.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white px-2 py-2 rounded-full shadow"
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No image available</div>
                  )}
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto mb-2">
                  {images.slice(0,6).map((src,i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`thumb-${i}`}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`w-20 h-14 object-cover rounded border cursor-pointer ${i === selectedImageIndex ? 'ring-2 ring-yellow-400' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="sticky top-6 space-y-4">
                {/* Seller Info Card (visible even when user hasn't paid) - moved above countdown */}
                <div className="mt-0">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {sellerImage ? (
                        <img src={sellerImage} alt={displaySellerName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">{String(displaySellerName).slice(0,2).toUpperCase()}</div>
                      )}
                      <div>
                        <button 
                          onClick={() => {
                            if (sellerId && /^[0-9a-fA-F]{24}$/.test(String(sellerId))) {
                              navigate(`/seller/${sellerId}`);
                            } else {
                              toast.error("Invalid seller information");
                            }
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {displaySellerName}
                        </button>
                        <div className="text-xs text-gray-500">Verified Seller</div>
                      </div>
                    </div>
                    {isAuctionLive && sellerId && (
                       <SellerRatingSummary sellerId={sellerId} />
                    )}
                  </div>
                </div>

                <div className="bg-yellow-100 p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-700 font-semibold">{countdownTitle}</div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{timeLeft.days}</div>
                      <div className="text-xs">DAYS</div>
                    </div>
                    <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{timeLeft.hours}</div>
                      <div className="text-xs">HOURS</div>
                    </div>
                    <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{timeLeft.mins}</div>
                      <div className="text-xs">MINS</div>
                    </div>
                    <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{timeLeft.secs}</div>
                      <div className="text-xs">SECS</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">Ends: {auction?.endTime ? new Date(auction.endTime).toLocaleString() : "–"}</div>
                </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Starting Bid</div>
                    <div className="font-semibold">₹{auction?.startingPrice ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Current Bid</div>
                    <div className="font-semibold text-green-700">₹{displayCurrentPrice}</div>
                  </div>
                </div>

                <div className="mb-3 text-sm text-gray-600">
                  <div>Auction Starts: {auction?.startTime ? new Date(auction.startTime).toLocaleString() : '—'}</div>
                  <div>Auction Ends: {auction?.endTime ? new Date(auction.endTime).toLocaleString() : '—'}</div>
                </div>

                <button
                  onClick={() => navigate(`/registration-fee/${auction._id}`)}
                  className={`w-full mb-2 py-3 rounded font-semibold ${isAuctionEnded || isSeller ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
                  disabled={isAuctionEnded || isSeller}
                >
                  {isAuctionEnded ? 'Auction Ended' : `Pay Token Fee • ₹${Math.round((auction?.startingPrice || 0) * 0.01) || 0}`}
                </button>

                <button disabled className="w-full mb-2 bg-yellow-400 text-black py-3 rounded font-semibold opacity-60">
                  Place Bid • ₹{displayCurrentPrice}
                </button>

                
                <button
                  onClick={async () => {
                    if (watchlistLoading) return;
                    setWatchlistLoading(true);
                    try {
                      if (!watchlisted) {
                        await addToWatchlist(auction._id);
                        // optimistic update
                        setAuction((a) => ({ ...a, watching: (a?.watching || 0) + 1 }));
                        setWatchlisted(true);
                        toast.success("Added to watchlist");
                      } else {
                        await removeFromWatchlist(auction._id);
                        setAuction((a) => ({ ...a, watching: Math.max(0, (a?.watching || 1) - 1) }));
                        setWatchlisted(false);
                        toast.info("Removed from watchlist");
                      }
                      } catch (err) {
                      console.debug("watchlist error (suppressed):", err?.message || err);
                      toast.error(err?.message || "Failed to update watchlist");
                    } finally {
                      setWatchlistLoading(false);
                    }
                  }}
                  className={`w-full mb-2 py-2 rounded font-semibold ${watchlisted ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
                  disabled={watchlistLoading || isAuctionEnded}
                >
                  {watchlistLoading ? (watchlisted ? 'Removing...' : 'Adding...') : (watchlisted ? 'Remove from Watchlist' : 'Add to Watchlist')}
                </button>

                <div className="flex gap-2 mt-2">
                  <button onClick={handleShare} className="flex-1 py-2 border rounded">Share</button>
                  <button onClick={handleReport} className="flex-1 py-2 border rounded">Report</button>
                </div>
              </div>

              {/* If auction ended and current user is top bidder and hasn't paid, show Pay Fees button */}
              {auction?.status === 'ENDED' && isTopBidder && !hasPaid && (
                <div className="mt-4">
                  <button onClick={() => navigate(`/auction/${auction._id}/pay`)} className="w-full mb-2 bg-green-600 text-white py-3 rounded font-semibold">
                      Pay Fees Now {currentPrice ? <span className="font-medium">• ₹{displayCurrentPrice}</span> : null}
                  </button>
                </div>
              )}

              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-semibold mb-2">Live Auction Activity</h4>
                <div className="text-sm text-gray-500">{topBids.length === 0 ? 'No bids yet' : `Top bid: ₹${topBids[0]?.amount}`}</div>
                <div className="text-xs text-gray-600 mt-2">{countdownDateLabel} {countdownTargetDate ? new Date(countdownTargetDate).toLocaleString() : "–"}</div>
              </div>
            </div>
          </aside>
        </div>

        <div className="max-w-7xl mx-auto mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Item Details</h3>
          <p className="text-sm text-gray-700">{auction?.description || auction?.item?.description || 'No description provided.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f3f3f3] min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Images + Details */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow p-6">
            
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold">{auction?.title || auction?.item?.name}</h1>
                <div className="text-sm text-gray-600 mt-1">
                  {auction?.item?.category} • {auction?.item?.condition}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created: {new Date(auction.createdAt).toLocaleString()}
                </div>
                {auction?.status === 'ENDED' && highestBid != null && (
                  <div className="mt-2 text-lg font-semibold text-gray-800">Final Price: ₹{highestBid}</div>
                )}
              </div>
              <div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  auction?.status === "LIVE" ? "bg-green-100 text-green-800" :
                  auction?.status === "UPCOMING" ? "bg-blue-100 text-blue-800" :
                  auction?.status === "ENDED" ? "bg-gray-100 text-gray-800" :
                  auction?.status === "YET_TO_BE_VERIFIED" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {auction?.status || "N/A"}
                </span>
              </div>
            </div>

            {/* Main Image */}
            <div className="w-full h-96 bg-gray-100 rounded overflow-hidden mb-4">
              {images.length > 0 ? (
                <div className="w-full h-full relative flex items-center justify-center bg-white">
                  <img
                    src={images[selectedImageIndex]}
                    alt={auction?.item?.name || "Auction"}
                    className="max-w-full max-h-full object-contain"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        aria-label="Previous image"
                        onClick={() => setSelectedImageIndex((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white px-3 py-2 rounded-full shadow"
                      >
                        ‹
                      </button>
                      <button
                        aria-label="Next image"
                        onClick={() => setSelectedImageIndex((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white px-3 py-2 rounded-full shadow"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image available
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto mb-6">
                {images.slice(0, 6).map((src, i) => (
                  <img 
                    key={i} 
                    src={src} 
                    alt={`thumb-${i}`} 
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-20 h-14 object-cover rounded border cursor-pointer hover:border-blue-500 ${i === selectedImageIndex ? 'ring-2 ring-yellow-400' : ''}`}
                  />
                ))}
                {images.length > 6 && (
                  <div className="w-20 h-14 bg-gray-800 text-white flex items-center justify-center rounded text-sm">
                    +{images.length - 6}
                  </div>
                )}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded text-center">
                <div className="font-semibold text-xl">{auction?.totalBids ?? 0}</div>
                <div className="text-xs text-gray-600">Total Bids</div>
              </div>
              <div className="bg-gray-50 p-4 rounded text-center">
                <div className="font-semibold text-xl">{auction?.totalParticipants ?? 0}</div>
                <div className="text-xs text-gray-600">Bidders</div>
              </div>
              <div className="bg-gray-50 p-4 rounded text-center">
                <div className="font-semibold text-xl">{auction?.watching ?? 0}</div>
                <div className="text-xs text-gray-600">Watching</div>
              </div>
              <div className="bg-gray-50 p-4 rounded text-center">
                <div className="font-semibold text-xl">₹{auction?.startingPrice ?? "-"}</div>
                <div className="text-xs text-gray-600">Starting Bid</div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6 bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {auction?.description || auction?.item?.description || "No description provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Right sidebar: countdown, bid box, activity */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
              {/* Seller Info */}
            <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                {sellerImage ? (
                  <img src={sellerImage} alt={displaySellerName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">{String(displaySellerName).slice(0,2).toUpperCase()}</div>
                )}
                <div>
                  <button 
                    onClick={() => {
                      if (sellerId && /^[0-9a-fA-F]{24}$/.test(String(sellerId))) {
                        navigate(`/seller/${sellerId}`);
                      } else {
                        toast.error("Invalid seller information");
                      }
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {displaySellerName}
                  </button>
                  <div className="text-xs text-gray-500">Verified Seller</div>
                </div>
              </div>
              {isAuctionLive && sellerId && (
                 <SellerRatingSummary sellerId={sellerId} />
              )}
                {/* seller debug removed */}
              {/* Show rating form when auction ended and current user is winner and has paid */}
              {auction?.status === 'ENDED' && isTopBidder && hasPaid && currentUser?._id && sellerId && (
                <RatingForm
                  auctionId={auction._id}
                  sellerId={sellerId}
                  raterId={currentUser._id}
                  onSubmitted={async () => {
                    // refresh seller rating display
                    setRatingRefreshKey((k) => k + 1);
                  }}
                />
              )}
            </div>

            {/* Winner Info - Show when auction ended */}
            {auction?.status === 'ENDED' && topBidderId && topBids && topBids[0] && (
              <div className="bg-white p-4 rounded-lg border shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🏆</span>
                  <div className="text-sm font-semibold text-gray-700">AUCTION WINNER</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg overflow-hidden">
                    {topBids[0].userId?.profilePhoto ? (
                      <img 
                        src={topBids[0].userId.profilePhoto} 
                        alt={topBids[0].userId?.username || 'Winner'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(topBids[0].userId?.username || topBids[0].userId?.name || 'W').slice(0,2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {topBids[0].userId?.username || topBids[0].userId?.name || topBids[0].userId?.email?.split('@')[0] || 'Winner'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Winning Bid: ₹{(highestBid || topBids[0].amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Countdown Timer */}
            <div className="bg-yellow-100 p-4 rounded-lg shadow">
              <div className="text-sm text-gray-700 font-semibold">{countdownTitle}</div>
                {/* Show STARTS IN when upcoming */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{timeLeft.days}</div>
                  <div className="text-xs">DAYS</div>
                </div>
                <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{timeLeft.hours}</div>
                  <div className="text-xs">HOURS</div>
                </div>
                <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{timeLeft.mins}</div>
                  <div className="text-xs">MINS</div>
                </div>
                <div className="bg-yellow-400 text-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{timeLeft.secs}</div>
                  <div className="text-xs">SECS</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {countdownDateLabel} {countdownTargetDate ? new Date(countdownTargetDate).toLocaleString() : "–"}
              </div>
            </div>

            {/* Bidding Section - Only show if not seller */}
            {!isSeller && (
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Place Your Bid</h3>
                
                {/* Current Price */}
                <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Current Highest Bid</div>
                    <div className="text-xl font-bold text-gray-900">₹{displayCurrentPrice}</div>
                  </div>
                  <div className="text-xs text-green-600 font-medium">Reserve price met</div>
                </div>

                {/* Manual Bid Input */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-900">
                      Manual Bid Amount
                    </label>
                    <span className="text-xs text-gray-500">Min. bid increment - ₹{auction?.minIncrement || 200}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-lg font-semibold"
                      placeholder="Enter amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      disabled={!isAuctionLive || autoBidEnabled || isSeller}
                    />
                  </div>
                  <button
                    className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    onClick={handlePlaceBid}
                    disabled={!isAuctionLive || placingBid || autoBidEnabled || isSeller}
                  >
                    {placingBid ? "Placing..." : bidAmount ? `Place Bid - ₹${bidAmount}` : "Place Bid"}
                  </button>

                  {/* Watchlist Button */}
                  <button
                    onClick={async () => {
                      if (watchlistLoading) return;
                      setWatchlistLoading(true);
                      try {
                        if (!watchlisted) {
                          await addToWatchlist(auction._id);
                          setAuction((a) => ({ ...a, watching: (a?.watching || 0) + 1 }));
                          setWatchlisted(true);
                          toast.success("Added to watchlist");
                        } else {
                          await removeFromWatchlist(auction._id);
                          setAuction((a) => ({ ...a, watching: Math.max(0, (a?.watching || 1) - 1) }));
                          setWatchlisted(false);
                          toast.info("Removed from watchlist");
                        }
                      } catch (err) {
                        console.error("watchlist error:", err);
                        toast.error(err?.message || "Failed to update watchlist");
                      } finally {
                        setWatchlistLoading(false);
                      }
                    }}
                    className={`w-full mt-2 py-2 rounded font-semibold transition ${
                      watchlisted 
                        ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    disabled={watchlistLoading}
                  >
                    {watchlistLoading ? (
                      watchlisted ? 'Removing...' : 'Adding...'
                    ) : (
                      watchlisted ? '❤️ Remove from Watchlist' : '🤍 Add to Watchlist'
                    )}
                  </button>

                  {/* Status Messages */}
                  {!isAuctionLive && !isSeller && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      Bidding is only allowed when auction is LIVE
                    </div>
                  )}
                  {autoBidEnabled && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      Manual bidding disabled while auto-bid is active
                    </div>
                  )}
                </div>

                {/* Auto-Bid Section */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">Auto-Bid</span>
                        <button 
                          className="text-xs text-gray-500 hover:text-gray-700"
                          title="Set your maximum bid and let our system automatically bid for you up to that amount"
                        >
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Set your maximum bid and let our system automatically bid for you up to that amount
                      </div>
                      {autoBidData && (
                        <div className="text-xs text-gray-600 mt-1 font-medium">Max Limit: ₹{autoBidData.maxLimit}</div>
                      )}
                    </div>
                    
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer ml-3">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoBidEnabled}
                        onChange={(e) => handleToggleAutoBid(e.target.checked)}
                        disabled={autoBidLoading}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {autoBidData && (
                    <button
                      onClick={() => setShowAutoBidModal(true)}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 hover:underline mt-2 text-left"
                      disabled={autoBidLoading}
                    >
                      Edit Auto-Bid Settings
                    </button>
                  )}
                </div>

              </div>
            )}

            {isSeller && (
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-center text-gray-600 mb-3">
                  <p className="text-sm">You are the seller of this auction</p>
                </div>
                
                {/* Watchlist button for sellers viewing other auctions */}
                <button
                  onClick={async () => {
                    if (watchlistLoading) return;
                    setWatchlistLoading(true);
                    try {
                      if (!watchlisted) {
                        await addToWatchlist(auction._id);
                        setAuction((a) => ({ ...a, watching: (a?.watching || 0) + 1 }));
                        setWatchlisted(true);
                        toast.success("Added to watchlist");
                      } else {
                        await removeFromWatchlist(auction._id);
                        setAuction((a) => ({ ...a, watching: Math.max(0, (a?.watching || 1) - 1) }));
                        setWatchlisted(false);
                        toast.info("Removed from watchlist");
                      }
                    } catch (err) {
                      console.error("watchlist error:", err);
                      toast.error(err?.message || "Failed to update watchlist");
                    } finally {
                      setWatchlistLoading(false);
                    }
                  }}
                  className={`w-full py-2 rounded font-semibold transition ${
                    watchlisted 
                      ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  disabled={watchlistLoading}
                >
                  {watchlistLoading ? (
                    watchlisted ? 'Removing...' : 'Adding...'
                  ) : (
                    watchlisted ? '❤️ Remove from Watchlist' : '🤍 Add to Watchlist'
                  )}
                </button>
              </div>
            )}

            {/* Bid History */}
            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Live Auction Activity</h4>
              <div className="space-y-0 max-h-80 overflow-y-auto">
                {topBids.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-6">No bids yet</div>
                ) : (
                  <>
                    {topBids.slice(0, 5).map((bid, i) => {
                      const bidderData = bid?.userId || bid?.bidderId || bid?.user || bid?.bidder || null;
                      let bidderName;
                      if (!bidderData) {
                        bidderName = "Anonymous";
                      } else if (typeof bidderData === 'string') {
                        bidderName = bidderData;
                      } else {
                        bidderName = bidderData?.username || bidderData?.name || (bidderData?.email || "").split("@")[0] || "Anonymous";
                      }
                       const isLeading = i === 0;
                       
                      const getTimeAgo = (createdAt) => {
                        if (!createdAt) return "";
                        const now = Date.now();
                        const bidTime = new Date(createdAt).getTime();
                        const diffMs = now - bidTime;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffSecs = Math.floor(diffMs / 1000);
                        
                        if (diffSecs < 30) return "Just now";
                        if (diffMins < 1) return `${diffSecs} sec ago`;
                        if (diffMins < 60) return `${diffMins} min ago`;
                        const diffHours = Math.floor(diffMins / 60);
                        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                        const diffDays = Math.floor(diffHours / 24);
                        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                      };
                      
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 ${
                          isLeading ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                              <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                                {bidderName.slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-gray-900">{bidderName}</div>
                                  <div className="text-xs text-gray-700">
                                    Placed Bid: <span className="font-semibold">₹{bid?.amount?.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 text-right ml-2">
                                  {getTimeAgo(bid?.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {topBids.length > 0 && (
                      <button
                        onClick={() => navigate(`/auction/${id}/bid-history`)}
                        className="w-full py-3 mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                      >
                        View Full Bidding History
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </aside>
      </div>

      {/* Auto-Bid Modal */}
      {showAutoBidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              {autoBidData ? "Edit Auto-Bid" : "Set Up Auto-Bid"}
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Set your maximum bid limit. The system will automatically place bids on your behalf 
              when others bid, keeping you in the lead up to your maximum limit.
            </p>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Maximum Bid Amount
              </label>
              <input
                type="number"
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter maximum amount"
                value={autoBidAmount}
                onChange={(e) => setAutoBidAmount(e.target.value)}
              />
              <div className="text-xs text-gray-500 mt-2">
                Current: ₹{displayCurrentPrice} • Min increment: ₹{auction?.minIncrement || 1}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAutoBidModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
                disabled={autoBidLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSetupAutoBid}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                disabled={autoBidLoading}
              >
                {autoBidLoading ? "Saving..." : "Save Auto-Bid"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AuctionDetails;