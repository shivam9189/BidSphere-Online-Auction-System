import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    // internal payment id (human-friendly/short)
    paymentId: {
        type: String,
        unique: true,
        default: function() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,9)}` }
    },
    // payment id - by default id provided by MongoDB
    provider: { 
        type: String, 
        enum: ['upi', 'cod'], 
        default: 'upi' 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    auctionId: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['PENDING', 'SUCCESS', 'FAILED'], 
        default: 'PENDING' 
    },
    type: {
        type: String,
        enum: ['REGISTRATION FEES', 'WINNING PAYMENT']
    },  
    upiLink: {
        type: String,
        required: true
    },

    expiry: { 
        type: Date, 
        required: true
    },
    metadata: { 
        type: Object 
    },

    // for admin to verify
    txnId: {
        type: String
    },
    upiAccountName: {
        type: String
    }

}, { timestamps: true });

const Payment = mongoose.model('payment', PaymentSchema);

export default Payment;