import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auction',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payment'
  },
  buyerAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  sellerAddress: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'CAPTURED', 'FAILED'],
    default: 'PENDING'
  },
  deliveryStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  trackingNumber: {
    type: String
  },
  estimatedDelivery: {
    type: Date
  }
}, { timestamps: true });

deliverySchema.index({ auctionId: 1 });
deliverySchema.index({ buyerId: 1 });
deliverySchema.index({ sellerId: 1 });
deliverySchema.index({ auctionId: 1, buyerId: 1 }, { unique: true });

const Delivery = mongoose.model('delivery', deliverySchema);

export default Delivery;
