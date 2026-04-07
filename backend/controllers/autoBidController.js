import AutoBid from "../models/AutoBid.js"
import Auction from "../models/Auction.js";
import User from "../models/User.js";
import { logAuctionEvent } from "../services/logger.service.js";
import { handleAutoBids } from "../services/autoBid.service.js";

export const setAutoBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { maxLimit } = req.body;
    const userId = req.user._id;      

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }
      
    //Check if user already has an autobid for this auction
    const existingAutoBid = await AutoBid.findOne({ auctionId, userId });
    if (existingAutoBid) {
      return res.status(400).json({
      success: false,
      message: "Auto-bid already set for this auction" });
    }

    const autobid = await AutoBid.create({
      auctionId: auctionId,
      userId: userId,
      maxLimit: maxLimit,
    });

    const bidder = await User.findById(userId);
    await logAuctionEvent({
      auctionId,
      userId: bidder._id,
      userName: bidder.username,
      type: "AUTO_BID_SET",
      details: { maxLimit, setAt: new Date() },
    });

    // push autobidder
    if (!auction.autoBidders.some(id => String(id) === String(userId))) {
      auction.autoBidders.push(userId);
      await auction.save();
    }
    
    handleAutoBids(auctionId);

    return res.status(200).json(autobid);
  }
  catch (err) {
    console.error("Error setting auto-bid:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const editAutoBid = async (req, res) => {
  try {
    const { maxLimit : newMaxLimit } = req.body; 
    const { autobidId } = req.params;
    const userId = req.user._id; 

    if (!autobidId) {
      return res.status(400).json({
        success: false,
        message: "This Autobid is not in DB",
      });
    }

    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
      return res.status(404).json({
        success: false,
        message: "Auto-bid not found for this user and auction",
      });
    }

    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    if (auction.status === "ENDED" || auction.status === "CANCELLED") {
      return res.status(404).json({
        success: false,
        message: "No updatation allowed for Autobid in this Auction",
      });
    }

    autobid.maxLimit = newMaxLimit;
    await autobid.save();

    const bidder = await User.findById(userId);
    await logAuctionEvent({
      auctionId,
      userId: bidder._id,
      userName: bidder.username,
      type: "AUTO_BID_UPDATED",
      details: { newLimit: newMaxLimit }, 
    });

    handleAutoBids(auctionId);

    return res.status(200).json({
      success: true,
      message: "Auto-bid max limit updated successfully",
      data: autobid,
    });
  } 
  catch (err) {
    console.error("Error editing auto-bid:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const activateAutoBid = async (req, res) => {
  
  try {
    const { auctionId, autobidId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status === "ENDED" || auction.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Auction not found" });
    }

    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
      return res.status(404).json({
        success: false,
        message: "Auto-bid record not found for this user and auction",
      });
    }
 
    if (autobid.isActive) {
      return res.status(200).json({
        success: true,
        message: "Auto-bid is already active",
      });
    }

    autobid.isActive = true;
    await autobid.save();

    const bidder = await User.findById(userId);
    await logAuctionEvent({
      auctionId,
      userId: bidder._id,
      userName: bidder.username,
      type: "AUTO_BID_ACTIVATED",
      details: { activatedAt: new Date(), maxLimit: autobid.maxLimit },
    });

    const maxLimit = autobid.maxLimit;
    if (typeof maxLimit !== "number") {
      return res.status(400).json({ success: false, message: "Numeric amount are required" });
    }

    if (maxLimit < auction.startingPrice || maxLimit < auction.currentBid + auction.minIncrement) {
      SendOutBidEmail(bidder.email, auction.item.name, auction.currentBid, maxLimit, auction._id, auction.title);
      return res.status(400).json({ success: false, message: "Your maxLimit is too low, OutBid mail sent" }); 
    }

    handleAutoBids(auctionId);
    
    return res.status(200).json({
      success: true,
      message: "Auto-bid activated successfully",
    });
  } 
  catch (err) {
    console.error("Error activating auto-bid:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const deactivateAutoBid = async (req, res) => {
  try {
    const { auctionId, autobidId } = req.params;
    const userId = req.user._id; 

    const existingAutoBid = await AutoBid.findById(autobidId);
    if (!existingAutoBid) {
      return res.status(404).json({
        success: false,
        message: "Auto-bid not found for this user and auction",
      });
    }

    if (existingAutoBid.isActive === false) {
      return res.status(200).json({
        success: true,
        message: "Auto-bid is already deactivated",
      });
    }

    existingAutoBid.isActive = false;
    await existingAutoBid.save();

    await Auction.findByIdAndUpdate(auctionId, {
      $pull: { autoBidders: userId },
    });

    const bidder = await User.findById(userId);
    await logAuctionEvent({
      auctionId,
      userId: bidder._id,
      userName: bidder.username,
      type: "AUTO_BID_DEACTIVATED",
      details: { deactivatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: "Auto-bid cancelled successfully",
    });
  } 
  catch (err) {
    console.error("Error cancelling auto-bid:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};