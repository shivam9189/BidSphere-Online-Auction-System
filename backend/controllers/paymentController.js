import Auction from '../models/Auction.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import AdminNotification from '../models/AdminNotification.js';
import { generateUpiLink } from '../services/payment.service.js';
import {  SendCODSelectedEmail, SendUPISelectedEmail, SendPaymentVerificationRequestSent} from '../services/email.sender.js';

// simple local paymentId generator to avoid null unique index collisions
function generatePaymentId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,9)}`;
}

export const handleRegistrationPayment = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(400).json({ success: false, message: "Auction not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
  
    // allow configuration whether registration during UPCOMING is open via env
    const isRegistrationOpen = process.env.REGISTRATION_OPEN === "true";

    if (auction.status === "LIVE" || (auction.status === "UPCOMING" && isRegistrationOpen)) {

      const registrationFees = Math.max(0.01 * auction.startingPrice, 1); // Minimum of 1% of startingPrice or 1 rupee

      const upiLink = await generateUpiLink(auctionId, registrationFees);
      
      const expireTime = 5 * 60 * 1000;

      // make payment object
      const payment = await Payment.create({ 
        paymentId: generatePaymentId(),
        provider: "upi",
        amount: registrationFees,
        auctionId: auctionId,
        userId: userId,
        status: "PENDING",
        type: "REGISTRATION FEES", 
        upiLink: upiLink,
        expiry: expireTime    
      })

      // admin-Notification
      await AdminNotification.create({
        auctionId,
        userId,
        type: "PAYMENT VERIFICATION",
        payment,
        status: "PENDING"
      })

      const backendUrl = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");
      const verifyLink = `${backendUrl}/bidsphere/auctions/${auctionId}/${payment._id}/verify`;

      return res.status(200).json({payment, verifyLink: verifyLink });
    }
    else {
      return res.status(400).json({ success: false, message: "Registration is not started yet" })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const handleWinningCodPayment = async (req, res) => {
  try {
    
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(400).json({ success: false, message: "Auction not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (!auction.auctionWinner || auction.auctionWinner.toString() !== userId.toString()) {
      return res.status(400).json({ success: false, message: "You are not the Winner" });
    }

    // take all the required credentials for delivery.

    // payment object
    const expireTime = 24 * 60 * 60 * 1000;

    const payment = await Payment.create({ 
      paymentId: generatePaymentId(),
      provider: "cod",
      amount: auction.winningPrice,
      auctionId: auctionId,
      userId: userId,
      status: "PENDING",
      type: "WINNING PAYMENT",
      expiry: expireTime    
    })

    // admin-notification object
    await AdminNotification.create({ 
      auctionId: auctionId,
      userId: userId,
      type: "WINNER CHOOSE COD",
      payment: payment,
      status: "PENDING"     
    })

    // send mail
    SendCODSelectedEmail(user.email, user.username, auction.title )

    return res.status(200).json(payment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const handleWinningUpiPayment = async (req, res) => {
  try { 
    
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(400).json({ success: false, message: "Auction not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (!auction.auctionWinner || auction.auctionWinner.toString() !== userId.toString()) {
      return res.status(400).json({ success: false, message: "You are not the Winner" });
    }

    // take all the required credentials for delivery. 

    // payment object
    const expireTime = 24 * 60 * 60 * 1000;

    const upiLink = await generateUpiLink(auctionId, auction.winningPrice);

    const payment = await Payment.create({ 
      paymentId: generatePaymentId(),
      provider: "upi",
      amount: auction.winningPrice,
      auctionId: auctionId,
      userId: userId,
      status: "PENDING",
      type: "WINNING PAYMENT",
      upiLink: upiLink,
      expiry: expireTime    
    })

    await AdminNotification.create({
      auctionId: auctionId,
      userId: userId,
      type: "WINNER CHOOSE UPI",
      payment: payment,
      status: "PENDING"     
    })
    
    // send mail to user
    SendUPISelectedEmail(user.email, user.username, upiLink, auction.winningPrice);
    
    return res.status(200).json(payment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { upiAccountName, upiTxnId } = req.body;
    const { paymentId, auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" })
    }
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(400).json({ success: false, message: "Payment object not found" })
    }

    if (payment.status === "SUCCESS") {
      return res.status(200).json({ success: true, message: "Payment already verified" });
    }

    payment.upiAccountName = upiAccountName;
    payment.upiTxnId = upiTxnId;

    await payment.save();

    await AdminNotification.create({ 
      auctionId,
      userId,
      type: "PAYMENT VERIFICATION",
      payment,
      status: "PENDING"
    })

    const reqFor = payment.type;

    // send mail
    SendPaymentVerificationRequestSent (user.email, user.username, auction.title, reqFor);

    return res.status(200).json({ success: true, message: "Your payment verification request sent"});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.status(200).json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, payments: [] });

    const payments = await Payment.find({ userId: userId, type: 'WINNING PAYMENT' }).lean();
    return res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error('getMyPayments error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};