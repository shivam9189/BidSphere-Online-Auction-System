import Rating from "../../models/Rating.js";
import User from "../../models/User.js";
import Auction from "../../models/Auction.js";
import {
  rateSeller,
  getSellerRatings,
  updateRating,
  deleteRating,
} from "../../controllers/ratingController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Rating.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockRatingModel = Rating;
const mockUserModel = User;
const mockAuctionModel = Auction;

const validAuctionId = "507f1f77bcf86cd799439021";
const validSellerId = "507f1f77bcf86cd799439022";
const validRaterId = "507f1f77bcf86cd799439023";
const validRatingId = "507f1f77bcf86cd799439024";

const defaultAuction = {
  _id: validAuctionId,
  createdBy: validSellerId,
  status: "ENDED",
  auctionWinner: validRaterId,
};

const buildReq = (overrides = {}) =>
  createMockReq({
    user: { id: validRaterId },
    ...overrides,
  });

describe("ratingController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuctionModel.findById.mockResolvedValue({ ...defaultAuction });
  });

  describe("rateSeller", () => {
    it("validates required fields", async () => {
      const req = buildReq({ body: {} });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("validates rating range", async () => {
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 6 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when auction missing", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 5 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("rejects ratings for non-ended auctions", async () => {
      mockAuctionModel.findById.mockResolvedValue({
        ...defaultAuction,
        status: "LIVE",
      });
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 5 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires the auction winner to rate", async () => {
      mockAuctionModel.findById.mockResolvedValue({
        ...defaultAuction,
        auctionWinner: "other",
      });
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 5 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("prevents rating yourself", async () => {
      mockAuctionModel.findById.mockResolvedValue({
        ...defaultAuction,
        createdBy: validRaterId,
      });
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 5 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("prevents duplicate rating", async () => {
      mockRatingModel.findOne.mockResolvedValue({ _id: "r" });
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 4 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates rating and updates seller stats", async () => {
      mockRatingModel.findOne.mockResolvedValue(null);
      mockRatingModel.create.mockResolvedValue({ _id: "rating" });
      mockRatingModel.aggregate.mockResolvedValue([{ avg: 4.5, count: 2 }]);
      mockUserModel.findByIdAndUpdate.mockResolvedValue({});
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 5 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(mockRatingModel.create).toHaveBeenCalled();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(validSellerId, expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("defaults to zeroed stats when aggregate empty", async () => {
      mockRatingModel.findOne.mockResolvedValue(null);
      mockRatingModel.create.mockResolvedValue({ _id: "rating" });
      mockRatingModel.aggregate.mockResolvedValue([]);
      mockUserModel.findByIdAndUpdate.mockResolvedValue({});
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 4 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        expect.objectContaining({
          sellerRating: { average: 0, count: 0 },
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles errors", async () => {
      mockRatingModel.findOne.mockRejectedValue(new Error("db"));
      const req = buildReq({ body: { auctionId: validAuctionId, rating: 3 } });
      const res = createMockRes();

      await rateSeller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getSellerRatings", () => {
    it("returns ratings list", async () => {
      mockRatingModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "r" }]),
      });
      const req = createMockReq({ params: { sellerId: validSellerId } });
      const res = createMockRes();

      await getSellerRatings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const calledQuery = mockRatingModel.find.mock.calls[0][0];
      expect(calledQuery.sellerId.toString()).toBe(validSellerId);
    });

    it("supports non-objectId seller filters", async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockRatingModel.find.mockReturnValue(chain);
      const req = createMockReq({ params: { sellerId: "custom-seller" } });
      const res = createMockRes();

      await getSellerRatings(req, res);

      expect(mockRatingModel.find).toHaveBeenCalledWith({ sellerId: "custom-seller" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors", async () => {
      mockRatingModel.find.mockImplementation(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { sellerId: validSellerId } });
      const res = createMockRes();

      await getSellerRatings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateRating", () => {
    it("validates rating id", async () => {
      const req = buildReq({ params: { id: "bad" }, body: { rating: 4 } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("validates rating range", async () => {
      const req = buildReq({ params: { id: validRatingId }, body: { rating: 6 } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when rating missing", async () => {
      mockRatingModel.findById.mockResolvedValue(null);
      const req = buildReq({ params: { id: validRatingId }, body: { rating: 4 } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("enforces owner", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: "other",
        sellerId: validSellerId,
      });
      const req = buildReq({ params: { id: validRatingId }, body: { rating: 4 } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("updates rating and seller stats", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: validRaterId,
        sellerId: validSellerId,
      });
      mockRatingModel.findByIdAndUpdate.mockResolvedValue({ _id: validRatingId, rating: 4 });
      mockRatingModel.aggregate.mockResolvedValue([{ avg: 3.5, count: 4 }]);
      const req = buildReq({ params: { id: validRatingId }, body: { rating: 4, review: "nice" } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(mockRatingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validRatingId,
        expect.objectContaining({ rating: 4, review: "nice" }),
        expect.objectContaining({ new: true })
      );
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        expect.objectContaining({ sellerRating: expect.any(Object) })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("updates rating alone when no review is provided", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: validRaterId,
        sellerId: validSellerId,
      });
      mockRatingModel.findByIdAndUpdate.mockResolvedValue({ _id: validRatingId, rating: 5 });
      mockRatingModel.aggregate.mockResolvedValue([{ avg: 4.2, count: 6 }]);
      const req = buildReq({ params: { id: validRatingId }, body: { rating: 5 } });
      const res = createMockRes();

      await updateRating(req, res);

      const updateArg = mockRatingModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg).toEqual({ rating: 5 });
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        { sellerRating: { average: 4.2, count: 6 } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("updates review only and handles empty aggregates", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: validRaterId,
        sellerId: validSellerId,
      });
      mockRatingModel.findByIdAndUpdate.mockResolvedValue({ _id: validRatingId, review: "updated" });
      mockRatingModel.aggregate.mockResolvedValue([]);
      const req = buildReq({ params: { id: validRatingId }, body: { review: "updated" } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(mockRatingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validRatingId,
        { review: "updated" },
        expect.objectContaining({ new: true })
      );
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        { sellerRating: { average: 0, count: 0 } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("retains review updates even when clearing the text", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: validRaterId,
        sellerId: validSellerId,
      });
      mockRatingModel.findByIdAndUpdate.mockResolvedValue({ _id: validRatingId, review: "" });
      mockRatingModel.aggregate.mockResolvedValue([{ avg: 4, count: 1 }]);
      const req = buildReq({ params: { id: validRatingId }, body: { review: "" } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(mockRatingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validRatingId,
        { review: "" },
        expect.objectContaining({ new: true })
      );
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        { sellerRating: { average: 4, count: 1 } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles update errors", async () => {
      mockRatingModel.findById.mockRejectedValue(new Error("db"));
      const req = buildReq({ params: { id: validRatingId }, body: { rating: 4 } });
      const res = createMockRes();

      await updateRating(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("deleteRating", () => {
    it("validates rating id", async () => {
      const req = buildReq({ params: { id: "bad" } });
      const res = createMockRes();

      await deleteRating(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 for missing rating", async () => {
      mockRatingModel.findById.mockResolvedValue(null);
      const req = buildReq({ params: { id: validRatingId } });
      const res = createMockRes();

      await deleteRating(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("enforces owner on delete", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: "other",
        sellerId: validSellerId,
      });
      const req = buildReq({ params: { id: validRatingId } });
      const res = createMockRes();

      await deleteRating(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deletes rating and refreshes seller stats", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: validRaterId,
        sellerId: validSellerId,
      });
      mockRatingModel.findByIdAndDelete.mockResolvedValue({});
      mockRatingModel.aggregate.mockResolvedValue([]);
      const req = buildReq({ params: { id: validRatingId } });
      const res = createMockRes();

      await deleteRating(req, res);

      expect(mockRatingModel.findByIdAndDelete).toHaveBeenCalledWith(validRatingId);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        expect.objectContaining({ sellerRating: { average: 0, count: 0 } })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("recomputes seller stats with aggregate data", async () => {
      mockRatingModel.findById.mockResolvedValue({
        _id: validRatingId,
        raterId: validRaterId,
        sellerId: validSellerId,
      });
      mockRatingModel.findByIdAndDelete.mockResolvedValue({});
      mockRatingModel.aggregate.mockResolvedValue([{ avg: 4.25, count: 8 }]);
      const req = buildReq({ params: { id: validRatingId } });
      const res = createMockRes();

      await deleteRating(req, res);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validSellerId,
        { sellerRating: { average: 4.25, count: 8 } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles delete errors", async () => {
      mockRatingModel.findById.mockRejectedValue(new Error("db"));
      const req = buildReq({ params: { id: validRatingId } });
      const res = createMockRes();

      await deleteRating(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
