import Auction from "../models/Auction.js";

async function validateRegistration(req, res, next) {
  try {
    const { auctionId} = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const isRegistered = auction.registrations.some(
      (u) => u._id.toString() === userId.toString()
    );

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message: "Payment not successful. User not registered for this auction.",
      });
    }

    return next();
  } catch (err) {
    console.error("validateRegistration error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export {validateRegistration};
