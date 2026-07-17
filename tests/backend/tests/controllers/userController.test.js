import Bid from "../../models/Bids.js";
import Auction from "../../models/Auction.js";
import User from "../../models/User.js";
import Watchlist from "../../models/Watchlist.js";
import {
  getBiddingHistory,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  updateUserProfile,
} from "../../controllers/userController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Bids.js", () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../models/Watchlist.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

const mockBidModel = Bid;
const mockAuctionModel = Auction;
const mockUserModel = User;
const mockWatchlistModel = Watchlist;

const validUserId = "507f1f77bcf86cd799439011";
const validAuctionId = "507f1f77bcf86cd799439012";

const createLeanQuery = (value, shouldReject = false) => ({
  lean: shouldReject ? jest.fn().mockRejectedValue(value) : jest.fn().mockResolvedValue(value),
});

const createSelectQuery = (value, shouldReject = false) => ({
  select: shouldReject ? jest.fn().mockRejectedValue(value) : jest.fn().mockResolvedValue(value),
});

describe("userController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getBiddingHistory", () => {
    it("requires authentication", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await getBiddingHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns aggregated history", async () => {
      mockBidModel.aggregate
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([
          {
            _id: "auction",
            bidId: "bid1",
            amount: 100,
            createdAt: new Date().toISOString(),
            auction: {
              _id: "auction",
              title: "Auction",
              item: { images: [] },
              currentBid: 150,
              startingPrice: 50,
              totalBids: 3,
              endTime: new Date().toISOString(),
              status: "LIVE",
              auctionWinner: validUserId,
            },
          },
        ]);
      const req = createMockReq({ user: { _id: validUserId }, query: { page: 1, limit: 5 } });
      const res = createMockRes();

      await getBiddingHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].history).toHaveLength(1);
    });

    it("falls back to zero total and default auction fields", async () => {
      const createdAt = new Date().toISOString();
      mockBidModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            _id: "auction",
            bidId: "bid2",
            amount: 50,
            createdAt,
            auction: null,
          },
        ]);
      const req = createMockReq({ user: { _id: validUserId }, query: {} });
      const res = createMockRes();

      await getBiddingHistory(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(payload.total).toBe(0);
      expect(payload.history[0].auctionId.images).toEqual([]);
      expect(payload.history[0].youWon).toBe(false);
      expect(payload.history[0].current).toBe(0);
    });

    it("handles errors", async () => {
      mockBidModel.aggregate.mockRejectedValue(new Error("db"));
      const req = createMockReq({ user: { _id: validUserId } });
      const res = createMockRes();

      await getBiddingHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getWatchlist", () => {
    it("requires authentication", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await getWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns watchlist items", async () => {
      mockWatchlistModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: "w", auctionId: { _id: "a", title: "Auction", item: { images: [] } }, createdAt: new Date() },
        ]),
      });
      const req = createMockReq({ user: { _id: validUserId } });
      const res = createMockRes();

      await getWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles entries missing populated auction data", async () => {
      mockWatchlistModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: "w", auctionId: null, createdAt: new Date() },
        ]),
      });
      const req = createMockReq({ user: { _id: validUserId } });
      const res = createMockRes();

      await getWatchlist(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(payload.watchlist[0].auctionId).toBeNull();
    });

    it("falls back to top-level auction images when item missing", async () => {
      mockWatchlistModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: "w",
            auctionId: { _id: "a", title: "Auction", images: ["img.png"], item: null },
            createdAt: new Date(),
          },
        ]),
      });
      const req = createMockReq({ user: { _id: validUserId } });
      const res = createMockRes();

      await getWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].watchlist[0].auctionId.images).toEqual(["img.png"]);
    });

    it("defaults images to empty array when auction data lacks images", async () => {
      mockWatchlistModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: "w",
            auctionId: { _id: "a", title: "Auction", item: {}, currentBid: 0 },
            createdAt: new Date(),
          },
        ]),
      });
      const req = createMockReq({ user: { _id: validUserId } });
      const res = createMockRes();

      await getWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].watchlist[0].auctionId.images).toEqual([]);
    });

    it("handles errors", async () => {
      mockWatchlistModel.find.mockImplementation(() => {
        throw new Error("db");
      });
      const req = createMockReq({ user: { _id: validUserId } });
      const res = createMockRes();

      await getWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("addToWatchlist", () => {
    it("validates auth and payload", async () => {
      const req = createMockReq({ user: null, body: {} });
      const res = createMockRes();
      await addToWatchlist(req, res);
      expect(res.status).toHaveBeenCalledWith(401);

      const authedReq = createMockReq({ user: { _id: validUserId }, body: {} });
      const authedRes = createMockRes();
      await addToWatchlist(authedReq, authedRes);
      expect(authedRes.status).toHaveBeenCalledWith(400);
    });

    it("requires auction existence", async () => {
      mockAuctionModel.findById.mockReturnValue(createLeanQuery(null));
      const req = createMockReq({ user: { _id: validUserId }, body: { auctionId: validAuctionId } });
      const res = createMockRes();

      await addToWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns existing watchlist id", async () => {
      mockAuctionModel.findById.mockReturnValue(createLeanQuery({ _id: validAuctionId }));
      mockWatchlistModel.findOne.mockResolvedValue({ _id: "w" });
      const req = createMockReq({ user: { _id: validUserId }, body: { auctionId: validAuctionId } });
      const res = createMockRes();

      await addToWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("creates new watchlist entry", async () => {
      mockAuctionModel.findById.mockReturnValue(createLeanQuery({ _id: validAuctionId }));
      mockWatchlistModel.findOne.mockResolvedValue(null);
      mockWatchlistModel.create.mockResolvedValue({ _id: "new" });
      const req = createMockReq({ user: { _id: validUserId }, body: { auctionId: validAuctionId } });
      const res = createMockRes();

      await addToWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles creation failures", async () => {
      mockAuctionModel.findById.mockReturnValue(createLeanQuery({ _id: validAuctionId }));
      mockWatchlistModel.findOne.mockResolvedValue(null);
      mockWatchlistModel.create.mockRejectedValue(new Error("db"));
      const req = createMockReq({ user: { _id: validUserId }, body: { auctionId: validAuctionId } });
      const res = createMockRes();

      await addToWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("removeFromWatchlist", () => {
    it("validates auth and params", async () => {
      const req = createMockReq({ user: null, params: {} });
      const res = createMockRes();
      await removeFromWatchlist(req, res);
      expect(res.status).toHaveBeenCalledWith(401);

      const req2 = createMockReq({ user: { _id: validUserId }, params: {} });
      const res2 = createMockRes();
      await removeFromWatchlist(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it("deletes watchlist entry", async () => {
      mockWatchlistModel.deleteOne.mockResolvedValue({});
      const req = createMockReq({ user: { _id: validUserId }, params: { auctionId: validAuctionId } });
      const res = createMockRes();

      await removeFromWatchlist(req, res);

      expect(mockWatchlistModel.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles deletion failures", async () => {
      mockWatchlistModel.deleteOne.mockRejectedValue(new Error("db"));
      const req = createMockReq({ user: { _id: validUserId }, params: { auctionId: validAuctionId } });
      const res = createMockRes();

      await removeFromWatchlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateUserProfile", () => {
    it("requires authentication", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when user missing", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(createSelectQuery(null));
      const req = createMockReq({ user: { _id: validUserId }, body: {} });
      const res = createMockRes();

      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates profile with optional fields", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        createSelectQuery({ _id: validUserId, username: "user" })
      );
      const req = createMockReq({
        user: { _id: validUserId },
        body: {
          fullname: "name",
          bio: "about",
          profilePhoto: "avatar.png",
          address: {},
        },
      });
      const res = createMockRes();

      await updateUserProfile(req, res);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validUserId,
        {
          $set: {
            fullname: "name",
            bio: "about",
            profilePhoto: "avatar.png",
            address: {
              street: "",
              city: "",
              state: "",
              postalCode: "",
              country: "",
            },
          },
        },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles update errors", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(createSelectQuery({}, true));
      const req = createMockReq({ user: { _id: validUserId }, body: {} });
      const res = createMockRes();

      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0].message).toBe("Failed to update profile");
    });
  });
});
