import mongoose from "mongoose";

const autoBidSchema = new mongoose.Schema({
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auction",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  // Autobid setup/config
  maxLimit: { 
    type: Number, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  activatedAt: { 
    type: Date, 
    default: Date.now 
  },

  // Trigger tracking
  lastBidAmount: { 
    type: Number, 
    default: 0 
  },
  totalAutoBidsPlaced: { 
    type: Number, 
    default: 0 
  },
  lastTriggeredAt: { type: Date },
});

autoBidSchema.index({ auctionId: 1, userId: 1 }, { unique: true });

const AutoBid = mongoose.model("autobid", autoBidSchema);

export default AutoBid;