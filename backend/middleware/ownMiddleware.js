import Auction from "../models/Auction.js";

//middleware to validate auction ownership
async function validateAuctionOwnership(req, res, next) {
  const { auctionId } = req.params;
  const userId = req.user?._id?.toString();

  if (!auctionId) {
    return res.status(400).json({ success: false, message: "auctionId is required" });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const auction = await Auction.findById(auctionId).lean();
    
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (auction.createdBy?.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: not the owner of this auction" 
      });
    }

    req.auction = auction;
    next();
  } catch (err) {
    console.error("validateAuctionOwnership error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

export { validateAuctionOwnership };