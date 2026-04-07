import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    item: {
      name: { type: String, required: true },
      description: { type: String },
      category: { type: String },
      images: [{ type: String }],
      metadata: { type: Object },
      condition: { type: String, enum: ["new", "like new", "good", "fair"] },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "YET_TO_BE_VERIFIED",
        "UPCOMING",
        "LIVE",
        "ENDED",
        "CANCELLED",
        "REMOVED",
      ],
      default: "YET_TO_BE_VERIFIED",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    startingPrice: {
      type: Number,
      required: true,
    },
    minIncrement: {
      type: Number,
      required: true,
    },
    currentBid: {
      type: Number,
      default: 0,
    },
    buyItNowPrice: {
      type: Number,
    },

    currentWinner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },

    autoBidders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    isRegistrationOpen: {
      type: Boolean,
      default: false,
    },
    registrations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    auctionWinner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    winningPrice: {
      type: Number,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "upi"],
    },

    totalBids: { type: Number, default: 0 },
    totalParticipants: { type: Number, default: 0 },

    sellerRating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    hasBeenExtended: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ createdBy: 1 });
auctionSchema.index({ startTime: 1 });

const Auction = mongoose.model("auction", auctionSchema);

try {
  mongoose.model("Auction");
} catch {
  mongoose.model("Auction", auctionSchema);
}

export default Auction;
