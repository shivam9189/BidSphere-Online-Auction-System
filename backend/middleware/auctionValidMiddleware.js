import { isValidObjectId } from "mongoose";

//middleware to validate required fields while creation
function validateCreateAuction(req, res, next) {
  const { title, name, startingPrice, minIncrement, startTime, endTime } = req.body;

   if (!title || String(title).trim() === "") {
    return res.status(400).json({ success: false, message: "Auction title is required" });
  }

  if (!name || String(name).trim() === "") {
    return res.status(400).json({ success: false, message: "Item name is required" });
  }

  if (startingPrice === undefined || startingPrice === null || 
      isNaN(Number(startingPrice)) || Number(startingPrice) < 0) {
    return res.status(400).json({ 
      success: false,
      message: "startingPrice is required and must be a non-negative number" 
    });
  }

  if (minIncrement === undefined || minIncrement === null || 
      isNaN(Number(minIncrement)) || Number(minIncrement) <= 0) {
    return res.status(400).json({ 
      success: false,
      message: "minIncrement is required and must be a positive number" 
    });
  }

  if (!startTime || !endTime) {
    return res.status(400).json({ success: false, message: "startTime and endTime are required" });
  }

  const s = new Date(startTime);
  const e = new Date(endTime);
  
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid startTime or endTime" });
  }

  if (e <= s) {
    return res.status(400).json({ success: false, message: "endTime must be after startTime" });
  }

  if (req.body.buyItNowPrice !== undefined) {
    if (isNaN(Number(req.body.buyItNowPrice)) || Number(req.body.buyItNowPrice) <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "buyItNowPrice must be a positive number" 
      });
    }
    if (Number(req.body.buyItNowPrice) <= Number(startingPrice)) {
      return res.status(400).json({ 
        success: false,
        message: "buyItNowPrice must be greater than startingPrice" 
      });
    }
  }

  next();
}

//middleware to validate allowed fields while updating auction
function validateUpdateAuction(req, res, next) {
  const allowed = [
    "title",
    "name",
    "description",
    "category",
    "condition",
    "images",
    "metadata",
    "startingPrice",
    "minIncrement",
    "buyItNowPrice",
    "startTime",
    "endTime",
  ];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((u) => allowed.includes(u));
  
  if (!isValidOperation) {
    return res.status(400).json({ 
      success: false,
      message: "One or more entered fields are not allowed to be updated" 
    });
  }

  if (req.body.startTime && req.body.endTime) {
    const s = new Date(req.body.startTime);
    const e = new Date(req.body.endTime);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid startTime or endTime or endTime <= startTime" 
      });
    }
  } else if (req.body.startTime || req.body.endTime) {
    const t = req.body.startTime ? new Date(req.body.startTime) : new Date(req.body.endTime);
    if (isNaN(t.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date provided" });
    }
  }

  if (req.body.startingPrice !== undefined && 
      (isNaN(Number(req.body.startingPrice)) || Number(req.body.startingPrice) < 0)) {
    return res.status(400).json({ 
      success: false,
      message: "startingPrice must be a non-negative number" 
    });
  }

  if (req.body.minIncrement !== undefined && 
      (isNaN(Number(req.body.minIncrement)) || Number(req.body.minIncrement) <= 0)) {
    return res.status(400).json({ 
      success: false,
      message: "minIncrement must be a positive number" 
    });
  }

  if (req.body.buyItNowPrice !== undefined && 
      (isNaN(Number(req.body.buyItNowPrice)) || Number(req.body.buyItNowPrice) <= 0)) {
    return res.status(400).json({ 
      success: false,
      message: "buyItNowPrice must be a positive number" 
    });
  }

  if (req.body.images !== undefined && !Array.isArray(req.body.images)) {
    return res.status(400).json({ success: false, message: "Images must be an array" });
  }

  if (req.body.condition !== undefined) {
    const validConditions = ["new", "like new", "good", "fair"];
    if (!validConditions.includes(req.body.condition)) {
      return res.status(400).json({ 
        success: false,
        message: "condition must be one of: new, like new, good, fair" 
      });
    }
  }

  next();
}

//middleware to validate if a param is a valid ObjectId
function validateObjectIdParam(paramName) {
  return function (req, res, next) {
    const id = req.params[paramName];

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: `${paramName} is not a valid id` });
    }

    next();
  };
}

//middleware to ensure auction has not started yet
function ensureBeforeStart(daysRequired = 0) {
  return function (req, res, next) {
    const auction = req.auction;
    
    if (!auction) {
      return res.status(400).json({ success: false, message: "Auction not loaded" });
    }

    const now = new Date();
    const startTime = new Date(auction.startTime);
    
    if (now >= startTime) {
      return res.status(403).json({ 
        success: false,
        message: "Action not allowed: auction already started" 
      });
    }

    if (daysRequired > 0) {
      const timeDifference = startTime - now;
      const daysLeft = timeDifference / (1000 * 60 * 60 * 24);
      
      if (daysLeft < daysRequired) {
        return res.status(400).json({
          success: false,
          message: `You can only perform this action at least ${daysRequired} days before auction starts.`,
        });
      }
    }

    next();
  };
}

export { 
  validateCreateAuction, 
  validateUpdateAuction, 
  validateObjectIdParam, 
  ensureBeforeStart
};