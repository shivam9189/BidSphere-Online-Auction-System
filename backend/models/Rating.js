import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
    auctionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    raterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        trim: true
    }
}, { timestamps: true });

ratingSchema.index({ auctionId: 1, raterId: 1 }, { unique: true });

export default mongoose.model("Rating", ratingSchema);
