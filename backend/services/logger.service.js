// utils/auctionLogger.js
import AuctionLog from "../models/AuctionLog.js";

export const logAuctionEvent = async ({
  auctionId,
  userId,
  userName,
  type,
  details = {},
}) => {
  try {
    await AuctionLog.findOneAndUpdate(
      { auctionId },
      {
        $push: {
          logs: { userId, userName, type, details },
        },
      },
      { upsert: true } // create if not exists
    );
  } catch (err) {
    console.error("Error logging auction event:", err.message);
  }
};