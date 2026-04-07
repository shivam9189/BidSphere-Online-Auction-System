import express from "express";
const router = express.Router();
import {
  createAuction,
  getMyAuctions,
  getAuctionById,
  listAuctions,
  editAuction,
  deleteAuction,
  uploadBase64Images,
  handleRegisterInAuction
} from "../controllers/auctionController.js";
import multer from "multer";
import {
  uploadBufferToCloudinary,
} from "../services/cloudinary.service.js";

// multer setup - use memory storage (files will be uploaded to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

import { restrictToLoggedinUserOnly as auth } from "../middleware/authMiddleware.js";
import {
  validateCreateAuction as vCreate,
  validateUpdateAuction as vUpdate,
  validateObjectIdParam as vId,
  ensureBeforeStart,
} from "../middleware/auctionValidMiddleware.js";
import { validateAuctionOwnership as owner } from "../middleware/ownMiddleware.js";

router.post("/create", auth, vCreate, createAuction);
router.post("/upload-base64", auth, uploadBase64Images);

// multipart upload (FormData) -> uploads to Cloudinary and returns { success: true, files: [<urls>] }
router.post("/upload", auth, upload.array("images", 5), async (req, res) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "No files provided" });
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file.buffer, {
          filename: file.originalname,
          resourceType: "image",
        });
        return result.url;
      })
    );

    return res.status(201).json({ success: true, files: uploadResults });
  } catch (err) {
    console.error("multipart upload error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/mine", auth, getMyAuctions);
router.get("/", listAuctions);
router.get("/:auctionId", vId("auctionId"), getAuctionById);
router.put(
  "/:auctionId",
  auth,
  vId("auctionId"),
  owner,
  ensureBeforeStart(2),
  vUpdate,
  editAuction
);
router.delete(
  "/:auctionId",
  auth,
  vId("auctionId"),
  owner,
  ensureBeforeStart(2),
  deleteAuction
);
router.post("/:auctionId/au-registration", auth, handleRegisterInAuction)

export default router;