import Auction from "../../models/Auction.js";
import AutoBid from "../../models/AutoBid.js";
import Bid from "../../models/Bids.js";
import { handleAutoBids } from "../../services/autoBid.service.js";
import { logAuctionEvent } from "../../services/logger.service.js";
import User from "../../models/User.js";
import { placeBid } from "../../controllers/bidController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../models/AutoBid.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../models/Bids.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../services/autoBid.service.js", () => ({
  handleAutoBids: jest.fn(),
}));

jest.mock("../../services/logger.service.js", () => ({
  logAuctionEvent: jest.fn(),
}));

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockAuctionModel = Auction;
const mockAutoBidModel = AutoBid;
const mockBidModel = Bid;
const mockUserModel = User;

describe("bidController placeBid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when auction missing", async () => {
    mockAuctionModel.findById.mockResolvedValue(null);
    const req = createMockReq({ params: { auctionId: "a" }, body: { amount: 100 }, user: { _id: "u" } });
    const res = createMockRes();

    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("blocks manual bids when autobid active", async () => {
    mockAuctionModel.findById.mockResolvedValue({ _id: "a" });
    mockAutoBidModel.findOne.mockResolvedValue({ isActive: true });
    const req = createMockReq({ params: { auctionId: "a" }, body: { amount: 100 }, user: { _id: "u" } });
    const res = createMockRes();

    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates new bid and extends auction", async () => {
    const now = new Date();
    const auction = {
      _id: "a",
      endTime: new Date(now.getTime() + 60_000),
      save: jest.fn().mockResolvedValue(null),
      totalBids: 0,
    };
    mockAuctionModel.findById.mockResolvedValue(auction);
    mockAutoBidModel.findOne.mockResolvedValue(null);
    mockBidModel.findOne.mockResolvedValue(null);
    mockBidModel.create.mockResolvedValue({ _id: "bid" });
    mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user" });
    jest.spyOn(Date, "now").mockReturnValue(now.getTime());
    const req = createMockReq({ params: { auctionId: "a" }, body: { amount: 200 }, user: { _id: "u" } });
    const res = createMockRes();

    await placeBid(req, res);

    expect(mockBidModel.create).toHaveBeenCalled();
    expect(auction.currentBid).toBe(200);
    expect(handleAutoBids).toHaveBeenCalledWith("a");
    expect(res.status).toHaveBeenCalledWith(200);
    Date.now.mockRestore();
  });

  it("updates existing bid without extension", async () => {
    const auction = {
      _id: "a",
      endTime: new Date(Date.now() + 10 * 60 * 1000),
      save: jest.fn().mockResolvedValue(null),
      totalBids: 5,
    };
    const bid = { amount: 150, save: jest.fn().mockResolvedValue(null) };
    mockAuctionModel.findById.mockResolvedValue(auction);
    mockAutoBidModel.findOne.mockResolvedValue(null);
    mockBidModel.findOne.mockResolvedValue(bid);
    mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user" });
    const req = createMockReq({ params: { auctionId: "a" }, body: { amount: 250 }, user: { _id: "u" } });
    const res = createMockRes();

    await placeBid(req, res);

    expect(bid.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("handles unexpected errors", async () => {
    mockAuctionModel.findById.mockRejectedValue(new Error("db"));
    const req = createMockReq({ params: { auctionId: "a" }, body: { amount: 100 }, user: { _id: "u" } });
    const res = createMockRes();

    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
