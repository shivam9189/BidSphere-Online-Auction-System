import Auction from "../models/Auction.js";
import AutoBid from "../models/AutoBid.js";
import Bid from "../models/Bids.js";
import { handleAutoBids } from "../services/autoBid.service.js";
import { logAuctionEvent } from "../services/logger.service.js";
import User from "../models/User.js";

export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }
    // check if user have activated autobid
    const autobid = await AutoBid.findOne({ auctionId, userId });
    if (autobid && autobid.isActive) {
      return res.status(400).json({
        success: false,
        message: "You have already activated auto-bid for this auction. Deactivate it first to place manual bids."
      });
    }

    let bid = await Bid.findOne({ auctionId, userId });
    if (!bid) {
      bid = await Bid.create({
        auctionId: auctionId,
        userId: userId,
        amount: amount
      });
    }
    else {
      bid.amount = amount;
      await bid.save();
    }

    const now = new Date();
    // Extend auction if within last 5 minutes and hasn't been extended before
    const timeDiff = auction.endTime - now;
    if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000 && !auction.hasBeenExtended) {
      auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
      auction.hasBeenExtended = true;
      await logAuctionEvent({
        auctionId,
        userName: "System",
        type: "AUCTION_EXTENDED",
        details: { newEndTime: auction.endTime },
      });
    }
    
    // Update further auction details
    auction.currentBid = amount;
    auction.currentWinner = userId;
    auction.totalBids += 1;
    await auction.save();

    const bidder = await User.findById(userId);
    await logAuctionEvent({
      auctionId,
      userId: bidder._id,
      userName: bidder.username,
      type: "BID_PLACED",
      details: { amount: amount, method: "manual" }
    });

    handleAutoBids(auctionId);

    return res.status(200).json({
      success: true,
      message: "Bid placed successfully",
      data: {
        bid,
        auction: {
          currentBid: auction.currentBid,
          totalBids: auction.totalBids,
          endTime: auction.endTime
        }
      }
    });
  }
  catch (err) {
    console.error("Error placing bid:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};