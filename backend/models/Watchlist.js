import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    // Model name for Auction is registered as "auction" (lowercase), keep ref consistent
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "auction", required: true },
  },
  { timestamps: true }
);

const Watchlist = mongoose.model("Watchlist", WatchlistSchema);

export default Watchlist;