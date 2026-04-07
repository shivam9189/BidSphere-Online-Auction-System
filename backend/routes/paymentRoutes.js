import express from "express";
import { handleRegistrationPayment, verifyPayment, handleWinningCodPayment, handleWinningUpiPayment,getPaymentById } from "../controllers/paymentController.js"
import { restrictToLoggedinUserOnly } from "../middleware/authMiddleware.js";   
const router = express.Router();

router.post("/:auctionId/au-registration/pay", restrictToLoggedinUserOnly, handleRegistrationPayment);

router.post("/:auctionId/:paymentId/verify", restrictToLoggedinUserOnly, verifyPayment);

router.get('/:auctionId/payment/:paymentId', restrictToLoggedinUserOnly, getPaymentById);

router.post("/:auctionId/finalpay/cod", restrictToLoggedinUserOnly, handleWinningCodPayment);

router.post("/:auctionId/finalpay/upi", restrictToLoggedinUserOnly, handleWinningUpiPayment);

export default router;

