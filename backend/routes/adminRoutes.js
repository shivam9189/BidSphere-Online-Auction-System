import express from "express";
const router = express.Router();
import { adminLogin, adminLogout, getAllAuctions, getAuctionDetails, verifyAuction, removeAuction, getNotifications, confirmNotification, rejectNotification } from "../controllers/adminController.js";
import { requireAdminAuth } from "../middleware/adminMiddleware.js";

router.post("/login", adminLogin);
router.post("/logout", adminLogout);

router.get("/auctions", requireAdminAuth, getAllAuctions);
router.get("/auctions/:auctionId", requireAdminAuth, getAuctionDetails);
router.post("/auctions/:auctionId/verify", requireAdminAuth, verifyAuction);
router.post("/auctions/:auctionId/remove", requireAdminAuth, removeAuction);

router.get("/notifications", requireAdminAuth, getNotifications);
router.post("/notifications/:id/confirm", requireAdminAuth, confirmNotification);
router.post("/notifications/:id/reject", requireAdminAuth, rejectNotification);


export default router;