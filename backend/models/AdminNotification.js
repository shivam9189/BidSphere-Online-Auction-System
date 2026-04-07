import mongoose from "mongoose";

const AdminNotificationSchema = new mongoose.Schema({

    auctionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "auction"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    
    type: { 
        type: String, 
        required: true,
        enum: [
                "PAYMENT VERIFICATION",
                "WINNER CHOOSE COD",
                "WINNER CHOOSE UPI",
                "PAYMENT_SUCCESS_DELIVERY_PENDING"
        ]
    },                 
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'payment'
    },
    status: {
        type: String,
        default: "PENDING",
        enum: ["PENDING", "CONFIRM", "REJECT"]
    }
}, { timestamps: true });

const AdminNotification = mongoose.model("adminNotification", AdminNotificationSchema);

export default AdminNotification;