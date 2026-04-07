import fs from "fs";
import Auction from "../../models/Auction.js";
import Bid from "../../models/Bids.js";
import User from "../../models/User.js";
import { logAuctionEvent } from "../../services/logger.service.js";
import {
  createAuction,
  getMyAuctions,
  getAuctionById,
  listAuctions,
  editAuction,
  deleteAuction,
  uploadBase64Images,
  handleRegisterInAuction,
} from "../../controllers/auctionController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";
import { createQueryChain } from "../utils/mongooseMocks.js";

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../models/Bids.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../../services/logger.service.js", () => ({
  logAuctionEvent: jest.fn(),
}));

const mockAuctionModel = Auction;
const mockBidModel = Bid;
const mockUserModel = User;

const flushPromises = () => new Promise(process.nextTick);

describe("auctionController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadBase64Images", () => {
    it("returns 400 when no images provided", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await uploadBase64Images(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "No images provided" });
    });

    it("saves images and responds with URLs", async () => {
      const req = createMockReq({
        body: {
          images: [
            { name: "photo.png", data: "data:image/png;base64,aGVsbG8=" },
            { name: "plain.txt", data: "aGVsbG8=" },
            { name: "skip.bin", data: "" },
          ],
        },
        headers: { host: "localhost:5000" },
        protocol: "https",
      });
      const res = createMockRes();
      jest.spyOn(Date, "now").mockReturnValue(1111);
      fs.existsSync.mockReturnValue(false);

      await uploadBase64Images(req, res);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].files).toHaveLength(2);
      Date.now.mockRestore();
    });

    it("reuses existing upload directory and falls back to http protocol", async () => {
      fs.existsSync.mockReturnValue(true);
      const req = createMockReq({
        body: {
          images: [{ data: "aGVsbG8=" }],
        },
        headers: { host: "example.com" },
        protocol: "",
      });
      const res = createMockRes();

      await uploadBase64Images(req, res);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].files[0]).toMatch(/^http:\/\/example.com\/uploads\//);
    });

    it("handles unexpected failures", async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error("disk error");
      });
      const req = createMockReq({
        body: { images: [{ name: "file", data: "data:image/png;base64,aA==" }] },
        headers: { host: "x" },
      });
      const res = createMockRes();

      await uploadBase64Images(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      fs.writeFileSync.mockReset();
    });
  });

  describe("createAuction", () => {
    it("creates auction and logs event", async () => {
      const req = createMockReq({
        body: {
          title: " Test ",
          name: " Item ",
          description: "desc",
          images: ["img"],
          category: "cat",
          condition: "new",
          metadata: { color: "red" },
          startingPrice: 100,
          minIncrement: 10,
          buyItNowPrice: 500,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 1000).toISOString(),
        },
        user: { _id: "user1" },
      });
      const res = createMockRes();
      mockAuctionModel.create.mockResolvedValue({ _id: "a1" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      await createAuction(req, res);

      expect(mockAuctionModel.create).toHaveBeenCalled();
      expect(logAuctionEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "AUCTION_CREATED" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("normalizes images and metadata when payloads are invalid", async () => {
      const req = createMockReq({
        body: {
          title: "Title",
          name: "Name",
          images: "not-an-array",
          metadata: null,
          startingPrice: 10,
          minIncrement: 1,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 1000).toISOString(),
        },
        user: { _id: "user1" },
      });
      const res = createMockRes();
      const savedAuction = { _id: "a2" };
      mockAuctionModel.create.mockResolvedValue(savedAuction);
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      await createAuction(req, res);

      expect(mockAuctionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({ images: [], metadata: {} }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles creation errors", async () => {
      const req = createMockReq({ body: {}, user: { _id: "user" } });
      const res = createMockRes();
      mockAuctionModel.create.mockRejectedValue(new Error("boom"));

      await createAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getMyAuctions", () => {
    it("returns paginated auctions", async () => {
      const req = createMockReq({ user: { _id: "user1" }, query: { page: 1, limit: 10 } });
      const res = createMockRes();
      mockAuctionModel.find.mockReturnValue(createQueryChain([{ title: "A" }]));
      mockAuctionModel.countDocuments.mockResolvedValue(1);

      await getMyAuctions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].pagination.total).toBe(1);
    });

    it("handles errors", async () => {
      const req = createMockReq({ user: { _id: "user1" } });
      const res = createMockRes();
      mockAuctionModel.find.mockImplementation(() => {
        throw new Error("fail");
      });

      await getMyAuctions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("applies status filters when provided", async () => {
      const req = createMockReq({ user: { _id: "user1" }, query: { status: "live" } });
      const res = createMockRes();
      mockAuctionModel.find.mockReturnValue(createQueryChain([{ title: "Live" }]));
      mockAuctionModel.countDocuments.mockResolvedValue(1);

      await getMyAuctions(req, res);

      expect(mockAuctionModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: "LIVE" }));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getAuctionById", () => {
    it("rejects invalid id", async () => {
      const req = createMockReq({ params: { auctionId: "123" }, user: { _id: "x" } });
      const res = createMockRes();

      await getAuctionById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when missing", async () => {
      mockAuctionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" }, user: { _id: "u" } });
      const res = createMockRes();

      await getAuctionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("blocks unverified auctions for non-owners", async () => {
      const auction = { _id: "a", verified: false, createdBy: { _id: "owner" } };
      mockAuctionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(auction),
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" }, user: { _id: "notOwner" } });
      const res = createMockRes();

      await getAuctionById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns auction with top bids", async () => {
      const auction = { _id: "a", verified: true, createdBy: { _id: "owner" } };
      mockAuctionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(auction),
      });
      mockBidModel.find
        .mockReturnValueOnce(createQueryChain([{ amount: 10, userId: "bidder1" }]))
        .mockReturnValueOnce(createQueryChain([
          { userId: "bidder1" },
          { userId: "bidder2" },
        ]));
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" }, user: { _id: "owner" } });
      const res = createMockRes();

      await getAuctionById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].topBids).toHaveLength(1);
    });

    it("handles datastore errors", async () => {
      mockAuctionModel.findById.mockImplementationOnce(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" }, user: { _id: "u" } });
      const res = createMockRes();

      await getAuctionById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("allows owners to view unverified auctions when createdBy is primitive", async () => {
      const auction = { _id: "a", verified: false, createdBy: "owner" };
      mockAuctionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(auction),
      });
      mockBidModel.find.mockReturnValue(createQueryChain([]));
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" }, user: { _id: "owner" } });
      const res = createMockRes();

      await getAuctionById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("listAuctions", () => {
    it("lists verified auctions with filters", async () => {
      const req = createMockReq({
        query: { status: "live", category: "art", search: "chair", page: 2, limit: 5 },
      });
      const res = createMockRes();
      mockAuctionModel.find.mockReturnValue(createQueryChain([{ title: "chair" }]));
      mockAuctionModel.countDocuments.mockResolvedValue(5);

      await listAuctions(req, res);

      expect(mockAuctionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ verified: true, status: "LIVE" })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("normalizes condition filter strings", async () => {
      const req = createMockReq({
        query: { condition: "Like-New", page: 1, limit: 5 },
      });
      const res = createMockRes();
      mockAuctionModel.find.mockReturnValue(createQueryChain([]));
      mockAuctionModel.countDocuments.mockResolvedValue(0);

      await listAuctions(req, res);

      const filterArg = mockAuctionModel.find.mock.calls[0][0];
      expect(filterArg["item.condition"]).toBeInstanceOf(RegExp);
      expect(filterArg["item.condition"].test("Like New")).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors while listing", async () => {
      mockAuctionModel.find.mockImplementation(() => {
        throw new Error("db");
      });
      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await listAuctions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("editAuction", () => {
    it("updates auction and logs event", async () => {
      const existing = {
        _id: "a",
        item: { name: "old", metadata: {} },
        currentBid: 50,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000).toISOString(),
      };
      const req = createMockReq({
        params: { auctionId: "a" },
        body: { title: "New", buyItNowPrice: 200, startingPrice: 150 },
        user: { _id: "user1" },
        auction: existing,
      });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      await editAuction(req, res);

      expect(mockAuctionModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(logAuctionEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "AUCTION_UPDATED" })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects invalid buy it now price", async () => {
      const req = createMockReq({
        params: { auctionId: "a" },
        body: { buyItNowPrice: 10 },
        user: { _id: "u" },
        auction: { currentBid: 20, item: {} },
      });
      const res = createMockRes();

      await editAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when auction missing on request", async () => {
      const req = createMockReq({ params: { auctionId: "a" }, auction: null, user: { _id: "u" } });
      const res = createMockRes();

      await editAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("recomputes status when schedule changes", async () => {
      const existing = {
        _id: "a",
        item: { name: "old", metadata: {} },
        currentBid: 10,
        startTime: new Date(Date.now() - 10_000).toISOString(),
        endTime: new Date(Date.now() + 10_000).toISOString(),
      };
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "user1" }, auction: existing });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      const callWithTimes = async (startOffset, endOffset) => {
        req.body = {
          startTime: new Date(Date.now() + startOffset).toISOString(),
          endTime: new Date(Date.now() + endOffset).toISOString(),
        };
        await editAuction(req, res);
      };

      await callWithTimes(60_000, 120_000);
      await callWithTimes(-60_000, 60_000);
      await callWithTimes(-120_000, -60_000);

      const statuses = mockAuctionModel.findByIdAndUpdate.mock.calls.map((call) => call[1].$set.status);
      expect(statuses).toEqual(expect.arrayContaining(["UPCOMING", "LIVE", "ENDED"]));
    });

    it("updates numeric increments when provided", async () => {
      const existing = {
        _id: "a",
        item: { name: "old", metadata: {} },
        currentBid: 10,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 10_000).toISOString(),
      };
      const req = createMockReq({
        params: { auctionId: "a" },
        user: { _id: "user1" },
        auction: existing,
        body: { minIncrement: 25 },
      });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      await editAuction(req, res);

      expect(mockAuctionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "a",
        expect.objectContaining({ $set: expect.objectContaining({ minIncrement: 25 }) }),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("updates nested item fields even without title changes", async () => {
      const existing = {
        _id: "a",
        item: { name: "old", description: "old", category: "old", condition: "old", images: [], metadata: {} },
        currentBid: 0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000).toISOString(),
      };
      const req = createMockReq({
        params: { auctionId: "a" },
        user: { _id: "user1" },
        auction: existing,
        body: {
          name: "Updated",
          description: "Desc",
          category: "Cat",
          condition: "Mint",
          images: ["img"],
          metadata: { color: "red" },
        },
      });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      await editAuction(req, res);

      expect(mockAuctionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "a",
        expect.objectContaining({
          $set: expect.objectContaining({
            item: expect.objectContaining({
              name: "Updated",
              description: "Desc",
              category: "Cat",
              condition: "Mint",
              images: ["img"],
              metadata: { color: "red" },
            }),
          }),
        }),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("defaults invalid images payloads to an empty array", async () => {
      const existing = {
        _id: "a",
        item: { name: "Item", images: ["old"] },
        currentBid: 0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000).toISOString(),
      };
      const req = createMockReq({
        params: { auctionId: "a" },
        user: { _id: "user1" },
        auction: existing,
        body: { images: "not-an-array" },
      });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      await editAuction(req, res);

      const payload = mockAuctionModel.findByIdAndUpdate.mock.calls[0][1].$set.item.images;
      expect(payload).toEqual([]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("reuses existing schedule boundaries when only one side is provided", async () => {
      const existing = {
        _id: "a",
        item: { name: "old", metadata: {} },
        currentBid: 0,
        startTime: new Date(Date.now() + 60_000).toISOString(),
        endTime: new Date(Date.now() + 120_000).toISOString(),
      };
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "user1" }, auction: existing });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "user1", username: "seller" });

      req.body = { endTime: new Date(Date.now() + 240_000).toISOString() };
      await editAuction(req, res);

      req.body = { startTime: new Date(Date.now() + 300_000).toISOString() };
      await editAuction(req, res);

      expect(mockAuctionModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });

    it("handles update failures", async () => {
      const existing = { _id: "a", item: {}, currentBid: 0 };
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "user" }, auction: existing, body: { title: "x" } });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockRejectedValue(new Error("db"));

      await editAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("deleteAuction", () => {
    it("marks auction as cancelled", async () => {
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "owner" });

      await deleteAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(logAuctionEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "AUCTION_DELETED" })
      );
    });

    it("returns 404 when auction not found", async () => {
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await deleteAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles delete errors", async () => {
      mockAuctionModel.findByIdAndUpdate.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await deleteAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handleRegisterInAuction", () => {
    it("rejects when auction missing", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, body: { email: "a@b.com" } });
      const res = createMockRes();

      await handleRegisterInAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects when user missing", async () => {
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", createdBy: "seller" });
      mockUserModel.findOne.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, body: { email: "a@b.com" } });
      const res = createMockRes();

      await handleRegisterInAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("prevents seller from registering", async () => {
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", createdBy: "user" });
      mockUserModel.findOne.mockResolvedValue({ _id: "user" });
      const req = createMockReq({ params: { auctionId: "a" }, body: { email: "a@b.com" } });
      const res = createMockRes();

      await handleRegisterInAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns success and redirect URL", async () => {
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", createdBy: "seller" });
      mockUserModel.findOne.mockResolvedValue({ _id: "user" });
      const req = createMockReq({ params: { auctionId: "a" }, body: { email: "a@b.com" } });
      const res = createMockRes();

      await handleRegisterInAuction(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        redirectUrl: "/bidsphere/auctions/a/au-registration/pay",
      });
    });

    it("handles unexpected registration errors", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a" }, body: { email: "a@b.com" } });
      const res = createMockRes();

      await handleRegisterInAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
