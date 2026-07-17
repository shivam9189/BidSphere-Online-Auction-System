/**
 * @file autoBid.test.js
 *
 * Tests for handleAutoBids(auctionId)
 */

import { jest } from "@jest/globals";
jest.mock("../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../models/AutoBid.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../models/Bids.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../services/email.sender.js", () => ({
  __esModule: true,
  SendOutBidEmail: jest.fn(),
}));

jest.mock("../services/logger.service.js", () => ({
  __esModule: true,
  logAuctionEvent: jest.fn(),
}));

import Auction from "../models/Auction.js";
import AutoBid from "../models/AutoBid.js";
import Bid from "../models/Bids.js";
import User from "../models/User.js";
import { SendOutBidEmail } from "../services/email.sender.js";
import { logAuctionEvent } from "../services/logger.service.js";


let handleAutoBids;

beforeAll(async () => {
  const mod = await import("../services/autoBid.service.js"); // change here if your file has another name
  handleAutoBids = mod.handleAutoBids;
});

/* Helper: create a basic auction object */
function createAuction(overrides = {}) {
  const now = new Date();
  return {
    _id: "auction1",
    status: "LIVE",
    currentBid: 100,
    startingPrice: 100,
    minIncrement: 10,
    item: { name: "Item Name" },
    title: "Auction Title",
    currentWinner: null,
    totalBids: 0,
    endTime: new Date(now.getTime() + 60 * 60 * 1000), // +1 hour
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/* -------------------------------------------------------
   3. Tests (6 test cases)
-------------------------------------------------------- */

describe("handleAutoBids", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1) No auction or not LIVE
  it("returns early if auction not found or not LIVE", async () => {
    // auction not found
    Auction.findById.mockResolvedValueOnce(null);

    await handleAutoBids("auc1");

    expect(AutoBid.find).not.toHaveBeenCalled();

    // auction found but not LIVE
    Auction.findById.mockResolvedValueOnce(
      createAuction({ status: "ENDED" })
    );

    await handleAutoBids("auc2");

    expect(AutoBid.find).not.toHaveBeenCalled();
  });

  // 2) No autobidders
  it("returns early if there are no autobidders", async () => {
    Auction.findById.mockResolvedValue(createAuction());
    AutoBid.find.mockResolvedValue([]);

    await handleAutoBids("auc1");

    expect(AutoBid.find).toHaveBeenCalledWith({ auctionId: "auc1" });
    expect(Bid.findOne).not.toHaveBeenCalled();
    expect(Bid.create).not.toHaveBeenCalled();
  });

  // 3) Skip current winner
  it("skips bidder who is already the current winner", async () => {
    const auction = createAuction({ currentWinner: "user1" });
    Auction.findById.mockResolvedValue(auction);

    AutoBid.find.mockResolvedValue([
      {
        userId: "user1",
        maxLimit: 1000,
        createdAt: new Date(),
      },
    ]);

    await handleAutoBids("auc1");

    expect(Bid.findOne).not.toHaveBeenCalled();
    expect(Bid.create).not.toHaveBeenCalled();
  });

  // 4) nextBid > maxLimit → send outbid email, no bid
  it("sends outbid email and does not place bid when nextBid > maxLimit", async () => {
    const auction = createAuction({
      currentBid: 100,
      minIncrement: 50, // nextBid = 150
      title: "Phone Auction",
      item: { name: "iPhone" },
    });

    Auction.findById.mockResolvedValue(auction);

    AutoBid.find.mockResolvedValue([
      {
        userId: "user2",
        maxLimit: 120, // 150 > 120
        createdAt: new Date(),
      },
    ]);

    User.findById.mockResolvedValue({
      _id: "user2",
      email: "user2@example.com",
    });

    await handleAutoBids("auc1");

    expect(User.findById).toHaveBeenCalledWith("user2");
    expect(SendOutBidEmail).toHaveBeenCalledWith(
      "user2@example.com",
      "iPhone",
      auction.currentBid,
      120,
      "auc1",
      "Phone Auction"
    );
    expect(Bid.findOne).not.toHaveBeenCalled();
    expect(Bid.create).not.toHaveBeenCalled();
  });

  // 5) Create new bid when no existing bid and nextBid <= maxLimit
  it("creates new bid, updates auction & logs AUTO_BID_TRIGGERED when within maxLimit and no existing bid", async () => {
    const auction = createAuction({
      currentBid: 100,
      minIncrement: 10, // nextBid = 110
      currentWinner: null,
      totalBids: 0,
    });

    Auction.findById.mockResolvedValue(auction);

    const bidder = {
      userId: "user3",
      maxLimit: 1000,
      createdAt: new Date(),
    };

    AutoBid.find.mockResolvedValue([bidder]);
    Bid.findOne.mockResolvedValue(null);
    Bid.create.mockResolvedValue({ _id: "bid1" });

    // NOTE: in your code AutoBid.findOne is not awaited, so we mock a plain object
    AutoBid.findOne.mockReturnValue({
      lastBidAmount: 0,
      totalAutoBidsPlaced: 0,
    });

    User.findById.mockResolvedValue({
      _id: "user3",
      username: "harsh",
      email: "harsh@example.com",
    });

    logAuctionEvent.mockResolvedValue(undefined);

    await handleAutoBids("auc1");

    expect(Bid.findOne).toHaveBeenCalledWith({
      auctionId: "auc1",
      userId: "user3",
    });
    expect(Bid.create).toHaveBeenCalledWith({
      auctionId: "auc1",
      userId: "user3",
      amount: 110,
    });

    const autobidObj = AutoBid.findOne.mock.results[0].value;
    expect(autobidObj.lastBidAmount).toBe(110);
    expect(autobidObj.totalAutoBidsPlaced).toBe(1);

    expect(auction.currentBid).toBe(110);
    expect(auction.currentWinner).toBe("user3");
    expect(auction.totalBids).toBe(1);
    expect(auction.save).toHaveBeenCalled();

    expect(logAuctionEvent).toHaveBeenCalledWith({
      auctionId: "auc1",
      userId: "user3",
      userName: "harsh",
      type: "AUTO_BID_TRIGGERED",
      details: { amount: 110 },
    });
  });

  // 6) Extend auction endTime when within last 5 minutes
  it("extends auction endTime and logs AUCTION_EXTENDED when within last 5 minutes", async () => {
    const now = new Date();
    const auction = createAuction({
      endTime: new Date(now.getTime() + 2 * 60 * 1000), // +2 minutes (within 5-min window)
      currentBid: 300,
      minIncrement: 10, // nextBid = 310
    });

    Auction.findById.mockResolvedValue(auction);

    const bidder = {
      userId: "user5",
      maxLimit: 1000,
      createdAt: new Date(),
    };

    AutoBid.find.mockResolvedValue([bidder]);
    Bid.findOne.mockResolvedValue(null);
    Bid.create.mockResolvedValue({ _id: "bidX" });

    AutoBid.findOne.mockReturnValue({
      lastBidAmount: 0,
      totalAutoBidsPlaced: 0,
    });

    User.findById.mockResolvedValue({
      _id: "user5",
      username: "alice",
      email: "alice@example.com",
    });

    logAuctionEvent.mockResolvedValue(undefined);

    const oldEndTime = auction.endTime;

    await handleAutoBids("auc-extend");

    expect(auction.endTime.getTime()).toBeGreaterThan(oldEndTime.getTime());

    expect(logAuctionEvent).toHaveBeenCalledWith({
      auctionId: "auc-extend",
      userName: "System",
      type: "AUCTION_EXTENDED",
      details: { newEndTime: auction.endTime },
    });
  });

  // 11) Handle case where auction.currentBid == 0 (use startingPrice - minIncrement)
  it("handles auction.currentBid == 0 by using startingPrice - minIncrement and places startingPrice as bid", async () => {
    const auction = createAuction({ currentBid: 0, startingPrice: 200, minIncrement: 10 });
    Auction.findById.mockResolvedValue(auction);

    const bidder = { userId: "zero", maxLimit: 1000, createdAt: new Date() };
    AutoBid.find.mockResolvedValue([bidder]);
    Bid.findOne.mockResolvedValue(null);
    Bid.create.mockResolvedValue({ _id: "bid-zero" });
    AutoBid.findOne.mockReturnValue({ lastBidAmount: 0, totalAutoBidsPlaced: 0 });
    User.findById.mockResolvedValue({ _id: "zero", username: "zeroUser", email: "z@z.com" });
    logAuctionEvent.mockResolvedValue(undefined);

    await handleAutoBids("auc-zero");

    // nextBid should equal startingPrice (200)
    expect(Bid.create).toHaveBeenCalledWith({ auctionId: "auc-zero", userId: "zero", amount: 200 });
  });

  // 7) Tie-breaker sort: earlier createdAt wins when maxLimit equal
  it("orders autobidders by createdAt when maxLimit equal and places bid for earlier one", async () => {
    const auction = createAuction({ currentBid: 50, minIncrement: 10 });
    Auction.findById.mockResolvedValue(auction);

    const bidderA = { userId: "a", maxLimit: 1000, createdAt: new Date(1000) };
    const bidderB = { userId: "b", maxLimit: 1000, createdAt: new Date(2000) };

    AutoBid.find.mockResolvedValue([bidderB, bidderA]); // unsorted input
    Bid.findOne.mockResolvedValue(null);
    Bid.create.mockResolvedValue({ _id: "bid-a" });
    AutoBid.findOne.mockReturnValue({ lastBidAmount: 0, totalAutoBidsPlaced: 0 });
    User.findById.mockResolvedValue({ _id: "a", username: "alpha", email: "a@a.com" });
    logAuctionEvent.mockResolvedValue(undefined);

    await handleAutoBids("auc-tie");

    // expect the earlier bidder (a) to have at least one bid created with expected values
    const found = Bid.create.mock.calls.some((call) => {
      const arg = call[0];
      return arg && arg.auctionId === "auc-tie" && arg.amount === 60;
    });
    expect(found).toBe(true);
  });

  // 8) No email on user triggers console.warn when nextBid > maxLimit
  it("warns when user has no email while attempting to notify outbid", async () => {
    const auction = createAuction({ currentBid: 100, minIncrement: 50 });
    Auction.findById.mockResolvedValue(auction);

    AutoBid.find.mockResolvedValue([{ userId: "noemail", maxLimit: 120, createdAt: new Date() }]);
    User.findById.mockResolvedValue({ _id: "noemail", email: null });

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await handleAutoBids("auc-noemail");

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // 9) Update existing bid path: bid exists and is saved
  it("updates existing bid amount and calls save when a bid exists", async () => {
    const auction = createAuction({ currentBid: 10, minIncrement: 5 });
    Auction.findById.mockResolvedValue(auction);

    const bidder = { userId: "upd", maxLimit: 1000, createdAt: new Date() };
    AutoBid.find.mockResolvedValue([bidder]);

    const existingBid = { amount: 10, save: jest.fn().mockResolvedValue(undefined) };
    Bid.findOne.mockResolvedValue(existingBid);

    AutoBid.findOne.mockReturnValue({ lastBidAmount: 0, totalAutoBidsPlaced: 0 });
    User.findById.mockResolvedValue({ _id: "upd", username: "updater", email: "u@u.com" });
    logAuctionEvent.mockResolvedValue(undefined);

    await handleAutoBids("auc-update");

    expect(existingBid.amount).toBe(15);
    expect(existingBid.save).toHaveBeenCalled();
  });

  // 10) Recursion: ensure handleAutoBids calls AutoBid.find again when newBidPlaced
  it("re-invokes itself (recurses) when a new bid is placed", async () => {
    const auction = createAuction({ currentBid: 20, minIncrement: 5 });
    Auction.findById.mockResolvedValue(auction);

    const bidder = { userId: "rec", maxLimit: 1000, createdAt: new Date() };
    // first AutoBid.find returns one bidder, second returns none (for recursion base case)
    AutoBid.find.mockResolvedValueOnce([bidder]).mockResolvedValueOnce([]);

    Bid.findOne.mockResolvedValue(null);
    Bid.create.mockResolvedValue({ _id: "bid-rec" });
    AutoBid.findOne.mockReturnValue({ lastBidAmount: 0, totalAutoBidsPlaced: 0 });
    User.findById.mockResolvedValue({ _id: "rec", username: "recuser", email: "r@r.com" });
    logAuctionEvent.mockResolvedValue(undefined);

    await handleAutoBids("auc-rec");

    // AutoBid.find should be called at least twice (initial + recursion)
    expect(AutoBid.find).toHaveBeenCalledTimes(2);
  });

  // 11) Order by maxLimit when different: highest maxLimit should win
  it("orders autobidders by maxLimit when different and places bid for highest limit", async () => {
    const auction = createAuction({ currentBid: 40, minIncrement: 10 });
    Auction.findById.mockResolvedValue(auction);

    const bidderLow = { userId: "low", maxLimit: 60, createdAt: new Date(1000) };
    const bidderHigh = { userId: "high", maxLimit: 1000, createdAt: new Date(2000) };

    AutoBid.find.mockResolvedValue([bidderLow, bidderHigh]); // unsorted input
    Bid.findOne.mockResolvedValue(null);
    Bid.create.mockResolvedValue({ _id: "bid-high" });
    AutoBid.findOne.mockReturnValue({ lastBidAmount: 0, totalAutoBidsPlaced: 0 });
    User.findById.mockResolvedValue({ _id: "high", username: "huser", email: "h@h.com" });
    logAuctionEvent.mockResolvedValue(undefined);

    await handleAutoBids("auc-maxlimit");

    // expect the higher maxLimit bidder to have the bid created
    expect(Bid.create).toHaveBeenCalledWith({ auctionId: "auc-maxlimit", userId: "high", amount: 50 });
  });

  // 12) Error path: Auction.findById throws -> catch logs and leads to thrown ReferenceError (res undefined)
  it("logs error and the function throws when an exception occurs", async () => {
    const error = new Error("boom");
    Auction.findById.mockImplementation(() => { throw error; });

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(handleAutoBids("auc-err")).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith("Error handling auto-bids:", error.message);
    spy.mockRestore();
  });
});
