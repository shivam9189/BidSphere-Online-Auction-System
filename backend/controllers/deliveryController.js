import Delivery from '../models/Delivery.js';
import Auction from '../models/Auction.js';
import User from '../models/User.js';

export const createDelivery = async (req, res) => {
  try {
    const { auctionId, buyerAddress, paymentId } = req.body;
    const buyerId = req.user._id;

    if (!auctionId || !buyerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Auction ID and buyer address are required'
      });
    }

    const auction = await Auction.findById(auctionId).populate('createdBy');
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (!auction.auctionWinner || auction.auctionWinner.toString() !== buyerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the auction winner can create a delivery'
      });
    }

    const existing = await Delivery.findOne({ auctionId, buyerId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Delivery already exists for this auction and buyer'
      });
    }

    const seller = await User.findById(auction.createdBy._id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    let paymentStatus = 'PENDING'; 
    if (paymentId) {
      const Payment = (await import('../models/Payment.js')).default;
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      if (payment.type !== 'WINNING PAYMENT') {
        return res.status(400).json({
          success: false,
          message: 'Only WINNING PAYMENT type is allowed for delivery'
        });
      }
      if (payment.userId.toString() !== buyerId.toString() || payment.auctionId.toString() !== auctionId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Payment does not match this auction or user'
        });
      }
      paymentStatus = payment.status === 'SUCCESS' ? 'CAPTURED' : 'PENDING';
    }

    const sellerAddress = seller.address || {
      street: 'Not provided',
      city: 'Not provided',
      state: 'Not provided',
      postalCode: 'Not provided',
      country: 'Not provided'
    };

    const delivery = await Delivery.create({
      auctionId,
      buyerId,
      sellerId: auction.createdBy._id,
      paymentId: paymentId || null,
      buyerAddress,
      sellerAddress,
      paymentStatus
    });

    return res.status(201).json({
      success: true,
      delivery,
      message: 'Delivery information saved successfully'
    });
  } catch (err) {
    console.error('createDelivery error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create delivery'
    });
  }
};

export const getMyDeliveries = async (req, res) => {
  try {
    const userId = req.user._id;

    const deliveries = await Delivery.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    })
      .populate('auctionId', 'title item')
      .populate('buyerId', 'username email')
      .populate('sellerId', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      deliveries
    });
  } catch (err) {
    console.error('getMyDeliveries error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch deliveries'
    });
  }
};

export const getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('auctionId', 'title item')
      .populate('buyerId', 'username email address')
      .populate('sellerId', 'username email address')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      deliveries
    });
  } catch (err) {
    console.error('getAllDeliveries error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch all deliveries'
    });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { deliveryStatus, trackingNumber, estimatedDelivery } = req.body;
    const userId = req.user?._id;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    if (userId && delivery.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can update delivery status'
      });
    }

    if (deliveryStatus) delivery.deliveryStatus = deliveryStatus;
    if (trackingNumber) delivery.trackingNumber = trackingNumber;
    if (estimatedDelivery) delivery.estimatedDelivery = estimatedDelivery;

    await delivery.save();

    return res.status(200).json({
      success: true,
      delivery,
      message: 'Delivery status updated successfully'
    });
  } catch (err) {
    console.error('updateDeliveryStatus error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update delivery status'
    });
  }
};

export const updateUserAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { street, city, state, postalCode, country } = req.body;

    if (!street || !city || !state || !postalCode || !country) {
      return res.status(400).json({
        success: false,
        message: 'All address fields are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        address: { street, city, state, postalCode, country }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      user,
      message: 'Address updated successfully'
    });
  } catch (err) {
    console.error('updateUserAddress error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update address'
    });
  }
};
