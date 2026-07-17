import Auction from "../models/Auction.js";

async function validateBid (req, res, next) {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // auction id is required and amount must be a number
    if (!auctionId || typeof amount !== "number") {
      return res.status(400).json({ success: false, message: "auctionId and numeric amount are required" });
    }
    
    // amount must be greater then zero and last highest-bid
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be greater than zero" });
    }

    if (amount <= auction.currentBid || amount < auction.startingPrice) {
      return res.status(400).json({ success: false, message: "amount must be greater than Highest-Bid or starting-Price" });
    }
    
    if (amount < auction.currentBid + auction.minIncrement) {
      return res.status(400).json({ 
        success: false, 
        message: `amount must be at least ${auction.minIncrement} higher than the current highest bid` 
      });
    }

    // Unrealistic Bids
    // Set high limit to prevent spam while allowing realistic bidding
    //const maxAllowedBid = auction.currentBid + Math.max(20 * auction.minIncrement, auction.currentBid * 0.5);
    const maxAllowedBid = 10000000; // ₹1 crore maximum
    if (amount > maxAllowedBid) {
      return res.status(400).json({ 
        success: false, 
        message: `Bid amount is unrealistically high. Maximum allowed bid is ₹${maxAllowedBid.toLocaleString()}` 
      });
    }
    
    // seller can not bid 
    if (auction.createdBy.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "You are seller, you can't bid in your auction" });
    }
    
    next();
  }
  catch (err) {
    console.error("Bid validation error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

async function validateAutoBid (req, res, next) {
  try {
    const { auctionId } = req.params;
    const { maxLimit } = req.body;

    // auction id is required and maxLimit must be a number
    if (typeof maxLimit !== "number") {
      return res.status(400).json({ success: false, message: "Numeric amount are required" });
    }

    // seller can not set auto-bid
    const auction = await Auction.findById(auctionId)
    if (!auction) {
      return res.status(400).json({ success: false, message: "Auction not found" });
    }

    // const { userId } = req.body;
    const userId = req.user._id; 

    if (auction.createdBy.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are seller, you can't set auto-bid in your auction"
      });
    }

    if (maxLimit < auction.startingPrice || maxLimit < auction.currentBid + auction.minIncrement) {
      return res.status(400).json({ success: false, message: "Your maxLimit is too low" }); 
    }

    // Unrealistic Bids
    const maxAllowedLimit = 10000000; 
    if (maxLimit > maxAllowedLimit) {
      return res.status(400).json({ 
        success: false, 
        message: `Auto-bid limit is unrealistically high. Maximum allowed limit is ₹${maxAllowedLimit.toLocaleString()}` 
      });
    }
    
    next();
  }
  catch (err) {
    console.error("Auto-Bid validation error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

export{ validateBid, validateAutoBid };