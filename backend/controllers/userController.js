import Bid from "../models/Bids.js";
import Auction from "../models/Auction.js";
import User from "../models/User.js";
import Watchlist from "../models/Watchlist.js";
import mongoose from "mongoose";

/**
 * GET /bidsphere/user/bidding-history
 * Returns latest bid by this user per auction along with auction metadata.
 * Supports optional ?page=1&limit=10
 */
export async function getBiddingHistory(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized", history: [], total: 0 });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    // count distinct auctions user has bidded on
    const countAgg = await Bid.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$auctionId" } },
      { $count: "total" },
    ]);
    const total = (countAgg && countAgg[0] && countAgg[0].total) ? countAgg[0].total : 0;

    // aggregate latest bid per auction with auction metadata
    const agg = await Bid.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$auctionId",
          bidId: { $first: "$_id" },
          amount: { $first: "$amount" },
          createdAt: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "auctions",
          localField: "_id",
          foreignField: "_id",
          as: "auction",
        },
      },
      { $unwind: { path: "$auction", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          auction: 1,
          auctionId: "$_id",
          bidId: 1,
          amount: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const history = agg.map((it) => {
      const auction = it.auction || {};
      return {
        _id: it.bidId,
        auctionId: {
          _id: auction._id,
          title: auction.title,
          item: auction.item,
          images: auction.item?.images || auction.images || [],
          currentBid: auction.currentBid ?? auction.current ?? 0,
          startingPrice: auction.startingPrice ?? 0,
          totalBids: auction.totalBids ?? auction.bids ?? 0,
          endTime: auction.endTime,
          status: auction.status,
          auctionWinner: auction.auctionWinner,
        },
        amount: it.amount,
        createdAt: it.createdAt,
        youWon: String(auction.auctionWinner) === String(userId),
        current: auction.currentBid ?? auction.current ?? 0,
      };
    });

    return res.status(200).json({ history, total, page, limit });
  } catch (err) {
    console.error("getBiddingHistory error:", err);
    return res.status(500).json({ message: err.message, history: [], total: 0 });
  }
}

// GET /bidsphere/user/watchlist
export async function getWatchlist(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized", watchlist: [] });

    const items = await Watchlist.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate({
        path: "auctionId",
        // Avoid selecting both `item` and `item.images` together (causes projection collision in MongoDB)
        // Select the auction fields we need; `item` includes `images` so no need to list both.
        select: "title item currentBid startingPrice totalBids endTime status",
      })
      .lean();

    const watchlist = items.map((it) => ({
      _id: it._id,
      auctionId: it.auctionId
        ? {
            _id: it.auctionId._id,
            title: it.auctionId.title,
            item: it.auctionId.item,
            images: it.auctionId.item?.images || it.auctionId.images || [],
            currentBid: it.auctionId.currentBid ?? it.auctionId.current ?? 0,
            startingPrice: it.auctionId.startingPrice ?? 0,
            totalBids: it.auctionId.totalBids ?? it.auctionId.bids ?? 0,
            endTime: it.auctionId.endTime,
            status: it.auctionId.status,
          }
        : null,
      createdAt: it.createdAt,
    }));

    return res.status(200).json({ watchlist });
  } catch (err) {
    console.error("getWatchlist error:", err);
    return res.status(500).json({ message: err.message, watchlist: [] });
  }
}

// POST /bidsphere/user/watchlist
export async function addToWatchlist(req, res) {
  try {
    const userId = req.user?._id;
    const { auctionId } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!auctionId) return res.status(400).json({ message: "auctionId required" });

    const auction = await Auction.findById(auctionId).lean();
    if (!auction) return res.status(400).json({ message: "Auction not found" });

    const existing = await Watchlist.findOne({ userId: new mongoose.Types.ObjectId(userId), auctionId: new mongoose.Types.ObjectId(auctionId) });
    if (existing) return res.status(200).json({ success: true, watchlistId: existing._id });

    const created = await Watchlist.create({ userId, auctionId });
    return res.status(201).json({ success: true, watchlistId: created._id });
  } catch (err) {
    console.error("addToWatchlist error:", err);
    return res.status(500).json({ message: err.message });
  }
}

// DELETE /bidsphere/user/watchlist/:auctionId
export async function removeFromWatchlist(req, res) {
  try {
    const userId = req.user?._id;
    const { auctionId } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!auctionId) return res.status(400).json({ message: "auctionId required" });

    await Watchlist.deleteOne({ userId: new mongoose.Types.ObjectId(userId), auctionId: new mongoose.Types.ObjectId(auctionId) });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("removeFromWatchlist error:", err);
    return res.status(500).json({ message: err.message });
  }
}
export async function updateUserProfile(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { fullname, bio, address, profilePhoto } = req.body;
    const updateData = {};

    if (fullname !== undefined) updateData.fullname = fullname;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    
    // Handle nested address update
    if (address) {
      updateData.address = {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        postalCode: address.postalCode || '',
        country: address.country || ''
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -verificationCode -resetToken -resetTokenExpiry');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully"
    });
  } catch (err) {
    console.error("updateUserProfile error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update profile"
    });
  }
}