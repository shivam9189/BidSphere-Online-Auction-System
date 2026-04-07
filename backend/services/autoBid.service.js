import Auction from "../models/Auction.js";
import AutoBid from "../models/AutoBid.js";
import Bid from "../models/Bids.js";
import User from "../models/User.js";
import { SendOutBidEmail } from "./email.sender.js";
import { logAuctionEvent } from "./logger.service.js"
/**
 * Auto-bid trigger logic:
 * Called every time a new bid is placed manually
 */
export const handleAutoBids = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status !== "LIVE") return;

    const currentBid = (auction.currentBid == 0) ? auction.startingPrice - auction.minIncrement : auction.currentBid;
    const minIncrement = auction.minIncrement;

    // Find all active autobidders for this auction
    const autoBidders = await AutoBid.find({ auctionId });

    if (!autoBidders.length) return;

    // Sort bidders by remaining balance (descending) //need modification
    autoBidders.sort((a, b) => {
    if (b.maxLimit === a.maxLimit) {
      return a.createdAt - b.createdAt; // earlier autobid created first
    }
      return b.maxLimit - a.maxLimit;
    });


    let newBidPlaced = false;

    for (const bidder of autoBidders) {

      if (String(bidder.userId) === String(auction.currentWinner)) continue; // skip current winner

      const nextBid = currentBid + minIncrement;

      // Stop if exceeds user's limit
      if (nextBid > bidder.maxLimit) {
        const user = await User.findById(bidder.userId);
        if (user && user.email) {
          await SendOutBidEmail(
            user.email,
            auction.item.name,
            auction.currentBid,
            bidder.maxLimit,
            auctionId,
            auction.title
          );
        } else {
          console.warn(`No email found for user ${bidder.userId}`);
        }
        continue;
      }

      const userId = bidder.userId;
      // Place the bid
      const bid = await Bid.findOne({ auctionId, userId });
      if (!bid) {
        await Bid.create({
          auctionId,
          userId: bidder.userId,
          amount: nextBid,
        });
      }
      else {
        bid.amount = nextBid;
        await bid.save();
      }

      // Update autobid
      const autobid = AutoBid.findOne({ auctionId, userId })
      autobid.lastBidAmount = nextBid;
      autobid.totalAutoBidsPlaced += 1;

      const user = await User.findById(bidder.userId);
      await logAuctionEvent({
        auctionId,
        userId: user._id,
        userName: user.username,
        type: "AUTO_BID_TRIGGERED",
        details: { amount: nextBid },
      });

      const now = new Date();
      // Extend auction if within last 5 minutes
      const timeDiff = auction.endTime - now;
      if (timeDiff <= 5 * 60 * 1000) {
        auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
        await logAuctionEvent({
          auctionId,                                                                                  
          userName: "System",
          type: "AUCTION_EXTENDED",
          details: { newEndTime: auction.endTime },
        });
      }
      // Update further auction details
      auction.currentBid = nextBid;
      auction.currentWinner = bidder.userId;
      auction.totalBids += 1;
      await auction.save();

      newBidPlaced = true;
      break; // only one auto-bid triggers at a time
    }

    // If a new bid was placed, re-check recursively — maybe other autobidders want to respond
    if (newBidPlaced) {
      await handleAutoBids(auctionId);
    }
  } catch (err) {
    console.error("Error handling auto-bids:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};