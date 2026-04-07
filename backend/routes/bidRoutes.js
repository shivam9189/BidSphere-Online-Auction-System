import express from "express";
import { placeBid } from "../controllers/bidController.js";
import { 
  setAutoBid, 
  deactivateAutoBid, 
  activateAutoBid, 
  editAutoBid 
} from "../controllers/autoBidController.js";
import { restrictToLoggedinUserOnly } from "../middleware/authMiddleware.js";
import { validateBid, validateAutoBid } from "../middleware/bidValidMiddleware.js";
import { validateRegistration } from  "../middleware/tokenValidMiddleware.js" 

const router = express.Router({ mergeParams: true });

//bid
router.post("/place", restrictToLoggedinUserOnly,validateRegistration, validateBid, placeBid);

//autobid
router.post("/setauto", restrictToLoggedinUserOnly, validateRegistration, validateAutoBid, setAutoBid);

router.post("/editauto/:autobidId", restrictToLoggedinUserOnly, validateRegistration, validateAutoBid, editAutoBid);

router.post("/deactivateauto/:autobidId", restrictToLoggedinUserOnly, validateRegistration, deactivateAutoBid);

router.post("/activateauto/:autobidId", restrictToLoggedinUserOnly, validateRegistration, activateAutoBid);

// get my autobid for an auction
router.get("/myautobid", restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const { auctionId } = req.params; 
    const userId = req.user._id;
    
    const AutoBid = (await import("../models/AutoBid.js")).default;
    const autoBid = await AutoBid.findOne({ auctionId, userId });
    
    return res.status(200).json({ 
      success: true, 
      autoBid: autoBid || null 
    });
  } catch (err) {
    console.error("Error fetching auto-bid:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: err.message 
    });
  }
});

export default router;