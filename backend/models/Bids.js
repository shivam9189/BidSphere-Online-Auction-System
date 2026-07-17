import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
    auctionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'auction', 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true, 
        min: 0 
    },
}, { timestamps: true });

bidSchema.index({ auctionId: 1, amount: -1 });

const Bid = mongoose.model('bid', bidSchema);

export default Bid;