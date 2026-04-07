    import Auction from "../models/Auction.js";
import Bid from "../models/Bids.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import { logAuctionEvent } from "../services/logger.service.js";
import fs from "fs";
import path from "path";

// helper: save base64 images to uploads/ and return public paths
async function uploadBase64Images(req, res) {
  try {
    const images = req.body?.images;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const saved = [];
    for (const img of images) {
      // expected { name, data } where data is dataURL or base64
      const name = img.name ? String(img.name).replace(/[^a-zA-Z0-9.\-_]/g, "_") : `img_${Date.now()}`;
      let data = img.data || "";
      // strip data URL prefix if present
      const match = data.match(/^data:(.+);base64,(.+)$/);
      let base64;
      if (match) base64 = match[2];
      else base64 = data;

      if (!base64) continue;
      const buffer = Buffer.from(base64, "base64");
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${name}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, buffer);
      // return the public path (served from /uploads) — include full absolute URL so frontend can use it directly
      const host = req.get("host");
      const proto = req.protocol || "http";
      saved.push(`${proto}://${host}/uploads/${filename}`);
    }

    return res.status(201).json({ success: true, files: saved });
  } catch (err) {
    console.error("uploadBase64Images error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

//helper func to determine status i.e. upcoming/live/completed auction
function determineStatus(startTime, endTime) {
  const now=new Date();
  const s=new Date(startTime);
  const e=new Date(endTime);
  if(now < s) return "UPCOMING";
  if(now >= s && now < e) return "LIVE";
  return "ENDED";
}

//POST /bidsphere/auctions/create
async function createAuction(req, res) {
  try {
    const {
      title,
      name,
      description,
      images=[],
      category,
      condition,
      metadata = {},
      startingPrice,
      minIncrement,
      buyItNowPrice,
      startTime,
      endTime,
    }=req.body;

    const userId=req.user._id;
    const start=new Date(startTime);
    const end=new Date(endTime);
    // New auctions start as "YET_TO_BE_VERIFIED" until admin verifies them
    const status = "YET_TO_BE_VERIFIED";

    const auction = await Auction.create({
      title: String(title).trim(),
      item: {
        name: String(name).trim(),
        description: description || undefined,
        category: category || undefined,
        condition: condition || undefined,
        images: Array.isArray(images) ? images : [],
        metadata: metadata || {},
      },
      createdBy: userId,
      status,
      verified: false,
      startingPrice: Number(startingPrice),
      minIncrement: Number(minIncrement),
      currentBid: 0,
      buyItNowPrice: buyItNowPrice !== undefined ? Number(buyItNowPrice) : undefined,
      startTime: start,
      endTime: end,
      autoBidders: [],
      totalBids: 0,
      totalParticipants: 0,
    });

    const auctionOwner = await User.findById(userId);
    await logAuctionEvent({
      auctionId: auction._id,
      userId: auctionOwner._id,
      userName: auctionOwner.username,
      type: "AUCTION_CREATED",
      details: {
        itemName: name,
        startingPrice,
        minIncrement,
        startTime,
        endTime,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Auction created successfully",
      auction,
    });
  } catch (err) {
    console.error("createAuction error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

//GET /bidsphere/auctions/mine
async function getMyAuctions(req, res) {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { createdBy: userId };
    if (status) filter.status = status.toUpperCase();

    const skip=(Number(page) - 1) * Number(limit);

    const auctions=await Auction.find(filter)
      .sort({createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("title item.name item.images startTime endTime currentBid status startingPrice totalBids")
      .lean();

    const total = await Auction.countDocuments(filter);

    return res.status(200).json({
      success: true,
      auctions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("getMyAuctions error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

//GET /bidsphere/auctions/:auctionId
async function getAuctionById(req, res) {
  try {
    const {auctionId }=req.params;

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid auction id",
      });
    }

    const auction=await Auction.findById(auctionId)
      .populate("createdBy", "username email")
      .populate("currentWinner", "username email")
      .lean();

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    // Only allow viewing verified auctions (unless it's the owner)
    const isOwner = req.user && auction.createdBy && (
      (typeof auction.createdBy === 'object' && auction.createdBy._id) 
        ? auction.createdBy._id.toString() === req.user._id.toString()
        : auction.createdBy.toString() === req.user._id.toString()
    );
    
    if (!auction.verified && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "This auction is pending verification",
      });
    }

    const topBids=await Bid.find({auctionId: auction._id })
      .sort({amount: -1 })
      .limit(10)// top 10 bids fetched rn
      .select("userId amount createdAt")
      .populate("userId", "username email")
      .lean();

    const allBids = await Bid.find({auctionId: auction._id}).select("userId").lean();
    const uniqueBidders = new Set(allBids.map(bid => bid.userId.toString()));
    const totalParticipants = uniqueBidders.size;
    
    auction.totalBids = allBids.length;
    auction.totalParticipants = totalParticipants;

    return res.status(200).json({
      success: true,
      auction,
      topBids,
    });
  }
  catch (err) {
    console.error("getAuctionById error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

//GET /bidsphere/auctions
async function listAuctions(req, res) {
  try {
    // 1. Added 'condition' to the parameters
    const { status, category, search, condition, page = 1, limit = 20, sort = "-createdAt" } = req.query;

    const filter = { verified: true }; 
    if (status) filter.status = status.toUpperCase();
    if (category) filter["item.category"] = category;

    // 2. Added Condition Filter Logic
    // This handles "Like New", "Like-New", or "like new" (case insensitive)
    if (condition) {
      const safeCond = String(condition).trim().replace(/-/g, "[ -]");
      filter["item.condition"] = new RegExp(`^${safeCond}$`, "i");
    }

    if (search && String(search).trim()) {
      const esc = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc, "i");
      filter.$or = [
        { title: re },
        { "item.name": re },
        { "item.description": re },
        { "item.category": re },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const auctions = await Auction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      // 3. Added "item.condition" here so your frontend receives the data
      .select("title item.name item.condition item.images startTime endTime currentBid status startingPrice totalBids")
      .populate("createdBy", "username")
      .lean();

    const total = await Auction.countDocuments(filter);

    return res.status(200).json({
      success: true,
      auctions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("listAuctions error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

//PUT /bidsphere/auctions/:auctionId
async function editAuction(req, res) {
  try {
    const {auctionId }=req.params;
    // user performing the update
    const userId = req.user && req.user._id;

    const existing = req.auction;
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    const updates = {};
    
    if (req.body.title || req.body.name || req.body.description || req.body.category || req.body.condition || req.body.images || req.body.metadata) {
      updates.item = { ...existing.item };
      if (req.body.title !== undefined) { updates.title = String(req.body.title).trim();}
      if (req.body.name) updates.item.name = String(req.body.name).trim();
      if (req.body.description !== undefined) updates.item.description = String(req.body.description);
      if (req.body.category !== undefined) updates.item.category = String(req.body.category);
      if (req.body.condition !== undefined) updates.item.condition = String(req.body.condition);
      if (req.body.images !== undefined) updates.item.images = Array.isArray(req.body.images) ? req.body.images : [];
      if (req.body.metadata !== undefined) updates.item.metadata = req.body.metadata;
    }

    if (req.body.startingPrice !== undefined) {
      updates.startingPrice = Number(req.body.startingPrice);
    }
    if (req.body.minIncrement !== undefined) {
      updates.minIncrement = Number(req.body.minIncrement);
    }
    if (req.body.buyItNowPrice !== undefined) {
      const newBuyItNow = Number(req.body.buyItNowPrice);
      if (newBuyItNow <= existing.currentBid) {
        return res.status(400).json({ 
          success: false,
          message: "buyItNowPrice must be greater than current bid" 
        });
      }
      updates.buyItNowPrice = newBuyItNow;
    }
    if (req.body.startTime !== undefined) {
      updates.startTime = new Date(req.body.startTime);
    }
    if (req.body.endTime !== undefined) {
      updates.endTime = new Date(req.body.endTime);
    }

    if (updates.startTime || updates.endTime) {
      const newStart = updates.startTime || existing.startTime;
      const newEnd = updates.endTime || existing.endTime;
      updates.status = determineStatus(newStart, newEnd);
    }

    const updatedAuction=await Auction.findByIdAndUpdate(
      auctionId,
      {$set: updates},
      {new: true, runValidators: true }
    );

    const auctionOwner = await User.findById(userId);
    await logAuctionEvent({
      auctionId: updatedAuction._id,
      userId: auctionOwner._id,
      userName: auctionOwner.username,
      type: "AUCTION_UPDATED",
      details: {
        updatedFields: Object.keys(updates),
        newValues: updates,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Auction updated successfully",
      auction: updatedAuction,
    });
  } catch (err) {
    console.error("editAuction error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

//DELETE /bidsphere/auctions/:auctionId
async function deleteAuction(req, res) {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findByIdAndUpdate(
      auctionId,
      { $set: { status: "CANCELLED" } },
      { new: true }
    );

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    const auctionOwner = await User.findById(userId);
    await logAuctionEvent({
      auctionId: auction._id,
      userId: auctionOwner._id,
      userName: auctionOwner.username,
      type: "AUCTION_DELETED",
      details: {
        deletedAt: new Date(),
        auctionData: auction, 
      },
    });

    return res.status(200).json({
      success: true,
      message: "Auction cancelled successfully",
      auction,
    });
  }
  catch (err) {
    console.error("deleteAuction error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

const handleRegisterInAuction = async (req, res) => {
  try {
    const { email } = req.body;
    const {auctionId} = req.params;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(400).json({ success: false, message: "Auction not found" });
    } 

    const user = await User.findOne({ email });
    if (!user) {
      // redirect to login page
      return res.status(400).json({ success: false, message: "User not found" });
    }
    
    if(user._id === auction.createdBy){
      return res.status(400).json({ success: false, message: "You are seller"});
    }

    return res.json({
      success: true,
      redirectUrl: `/bidsphere/auctions/${auctionId}/au-registration/pay`
    });

  }
  catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export {
  createAuction,
  getMyAuctions,
  getAuctionById,
  listAuctions,
  editAuction,
  deleteAuction,
  uploadBase64Images,
  handleRegisterInAuction
};