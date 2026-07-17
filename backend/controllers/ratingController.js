import Rating from '../models/Rating.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import mongoose from 'mongoose';

/* POST /bidsphere/ratings */
export const rateSeller = async (req, res) => {
    try {
        const { auctionId, rating, review } = req.body;
        const raterId = req.user.id; // Get from authenticated user

        if (!auctionId || !rating) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        // Validate auction exists and get seller info
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction not found" });
        }

        const sellerId = auction.createdBy; // Get seller from auction

        // Validate user is the auction winner and auction is ended
        if (auction.status !== "ENDED") {
            return res.status(400).json({ success: false, message: "Rating is only allowed for ended auctions" });
        }

        if (!auction.auctionWinner || auction.auctionWinner.toString() !== raterId) {
            return res.status(403).json({ success: false, message: "Only auction winners can rate the seller" });
        }

        // Prevent rating yourself
        if (sellerId.toString() === raterId) {
            return res.status(403).json({ success: false, message: "You cannot rate yourself" });
        }

        const existingRating = await Rating.findOne({ auctionId, raterId });
        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'You have already rated this seller for this auction'
            });
        }

        const newRating = await Rating.create({
            auctionId,
            sellerId,
            raterId,
            rating,
            review: review || ""
        });

        const agg = await Rating.aggregate([
            { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
        ]);

        await User.findByIdAndUpdate(sellerId, {
            sellerRating: {
                average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
                count: agg[0]?.count || 0
            }
        });

        return res.status(201).json({
            success: true,
            message: "Rating submitted successfully",
            rating: newRating
        });

    } catch (error) {
        console.error("Error in rateSeller:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/* GET /bidsphere/ratings/seller/:sellerId */
export const getSellerRatings = async (req, res) => {
    try {
        const { sellerId } = req.params;

        const query = mongoose.Types.ObjectId.isValid(sellerId)
            ? { sellerId: new mongoose.Types.ObjectId(sellerId) }
            : { sellerId };

        const ratings = await Rating.find(query)
            .populate("raterId", "username profilePhoto")
            .populate("auctionId", "title")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: ratings
        });

    } catch (error) {
        console.error("Error in getSellerRatings:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching ratings"
        });
    }
};

/* PUT /bidsphere/ratings/:id */
export const updateRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid rating ID" });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        const existingRating = await Rating.findById(id);
        if (!existingRating) {
            return res.status(404).json({ success: false, message: "Rating not found" });
        }

        // Only allow the rater to update their own rating
        if (existingRating.raterId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "You can only update your own rating" });
        }

        const updateData = {};
        if (rating !== undefined) updateData.rating = rating;
        if (review !== undefined) updateData.review = review;

        const updatedRating = await Rating.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        // Update seller's average rating
        const agg = await Rating.aggregate([
            { $match: { sellerId: existingRating.sellerId } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
        ]);

        await User.findByIdAndUpdate(existingRating.sellerId, {
            sellerRating: {
                average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
                count: agg[0]?.count || 0
            }
        });

        return res.status(200).json({
            success: true,
            message: "Rating updated successfully",
            rating: updatedRating
        });

    } catch (error) {
        console.error("Error in updateRating:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/* DELETE /bidsphere/ratings/:id */
export const deleteRating = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid rating ID" });
        }

        const existingRating = await Rating.findById(id);
        if (!existingRating) {
            return res.status(404).json({ success: false, message: "Rating not found" });
        }

        // Only allow the rater to delete their own rating
        if (existingRating.raterId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "You can only delete your own rating" });
        }

        await Rating.findByIdAndDelete(id);

        // Update seller's average rating
        const agg = await Rating.aggregate([
            { $match: { sellerId: existingRating.sellerId } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
        ]);

        await User.findByIdAndUpdate(existingRating.sellerId, {
            sellerRating: {
                average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
                count: agg[0]?.count || 0
            }
        });

        return res.status(200).json({
            success: true,
            message: "Rating deleted successfully"
        });

    } catch (error) {
        console.error("Error in deleteRating:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
