import AutoBid from "../../models/AutoBid.js";
import Auction from "../../models/Auction.js";
import User from "../../models/User.js";
import { logAuctionEvent } from "../../services/logger.service.js";
import { handleAutoBids } from "../../services/autoBid.service.js";
import {
  setAutoBid,
  editAutoBid,
  activateAutoBid,
  deactivateAutoBid,
} from "../../controllers/autoBidController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/AutoBid.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../services/logger.service.js", () => ({
  logAuctionEvent: jest.fn(),
}));

jest.mock("../../services/autoBid.service.js", () => ({
  handleAutoBids: jest.fn(),
}));

global.SendOutBidEmail = jest.fn();

const mockAutoBidModel = AutoBid;
const mockAuctionModel = Auction;
const mockUserModel = User;

describe("autoBidController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setAutoBid", () => {
    it("rejects missing auction", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, body: { maxLimit: 100 }, user: { _id: "u" } });
      const res = createMockRes();

      await setAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("prevents duplicate auto bid", async () => {
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", autoBidders: [] });
      mockAutoBidModel.findOne.mockResolvedValue({ _id: "existing" });
      const req = createMockReq({ params: { auctionId: "a" }, body: { maxLimit: 100 }, user: { _id: "u" } });
      const res = createMockRes();

      await setAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates auto bid entry", async () => {
      const auction = { _id: "a", autoBidders: [], save: jest.fn().mockResolvedValue(null) };
      mockAuctionModel.findById.mockResolvedValue(auction);
      mockAutoBidModel.findOne.mockResolvedValue(null);
      mockAutoBidModel.create.mockResolvedValue({ _id: "ab" });
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user" });
      const req = createMockReq({ params: { auctionId: "a" }, body: { maxLimit: 200 }, user: { _id: "u" } });
      const res = createMockRes();

      await setAutoBid(req, res);

      expect(mockAutoBidModel.create).toHaveBeenCalled();
      expect(auction.autoBidders).toContain("u");
      expect(handleAutoBids).toHaveBeenCalledWith("a");
      expect(res.status).toHaveBeenCalledWith(200);
    });

      it("avoids pushing duplicate auto bidders", async () => {
        const auction = { _id: "a", autoBidders: ["u"], save: jest.fn().mockResolvedValue(null) };
        mockAuctionModel.findById.mockResolvedValue(auction);
        mockAutoBidModel.findOne.mockResolvedValue(null);
        mockAutoBidModel.create.mockResolvedValue({ _id: "ab" });
        mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user" });
        const req = createMockReq({ params: { auctionId: "a" }, body: { maxLimit: 300 }, user: { _id: "u" } });
        const res = createMockRes();

        await setAutoBid(req, res);

        expect(auction.autoBidders).toEqual(["u"]);
        expect(handleAutoBids).toHaveBeenCalledWith("a");
        expect(res.status).toHaveBeenCalledWith(200);
      });

    it("handles unexpected failures", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a" }, body: { maxLimit: 200 }, user: { _id: "u" } });
      const res = createMockRes();

      await setAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("editAutoBid", () => {
    it("requires autobid id", async () => {
      const req = createMockReq({ params: {}, user: { _id: "u" } });
      const res = createMockRes();

      await editAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires autobid record", async () => {
      mockAutoBidModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { autobidId: "ab", auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await editAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("requires auction and active status", async () => {
      mockAutoBidModel.findById.mockResolvedValue({ _id: "ab" });
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { autobidId: "ab", auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();
      await editAutoBid(req, res);
      expect(res.status).toHaveBeenCalledWith(404);

      mockAuctionModel.findById.mockResolvedValue({ status: "ENDED" });
      await editAutoBid(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates max limit and logs event", async () => {
      const autobid = { _id: "ab", save: jest.fn().mockResolvedValue(null) };
      mockAutoBidModel.findById.mockResolvedValue(autobid);
      mockAuctionModel.findById.mockResolvedValue({ status: "LIVE" });
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user" });
      const req = createMockReq({
        params: { autobidId: "ab", auctionId: "a" },
        body: { maxLimit: 500 },
        user: { _id: "u" },
      });
      const res = createMockRes();

      await editAutoBid(req, res);

      expect(autobid.save).toHaveBeenCalled();
      expect(logAuctionEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "AUTO_BID_UPDATED" })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 500 when datastore fails", async () => {
      mockAutoBidModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({
        params: { autobidId: "ab", auctionId: "a" },
        body: { maxLimit: 500 },
        user: { _id: "u" },
      });
      const res = createMockRes();

      await editAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("activateAutoBid", () => {
    it("requires valid auction", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires autobid", async () => {
      mockAuctionModel.findById.mockResolvedValue({ status: "LIVE" });
      mockAutoBidModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns early if already active", async () => {
      mockAuctionModel.findById.mockResolvedValue({ status: "LIVE" });
      mockAutoBidModel.findById.mockResolvedValue({ isActive: true });
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].message).toMatch(/already active/);
    });

    it("rejects when max limit invalid", async () => {
      mockAuctionModel.findById.mockResolvedValue({ status: "LIVE", startingPrice: 100, currentBid: 80, minIncrement: 10 });
      const autobid = { isActive: false, save: jest.fn().mockResolvedValue(null), maxLimit: "abc" };
      mockAutoBidModel.findById.mockResolvedValue(autobid);
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user", email: "test" });
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("sends outbid email if limit too low", async () => {
      mockAuctionModel.findById.mockResolvedValue({
        status: "LIVE",
        startingPrice: 100,
        currentBid: 150,
        minIncrement: 10,
        item: { name: "Item" },
        _id: "a",
        title: "Auction",
      });
      const autobid = { isActive: false, save: jest.fn().mockResolvedValue(null), maxLimit: 100 };
      mockAutoBidModel.findById.mockResolvedValue(autobid);
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user", email: "e" });
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(global.SendOutBidEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("activates auto bid and triggers handler", async () => {
      mockAuctionModel.findById.mockResolvedValue({
        status: "LIVE",
        startingPrice: 100,
        currentBid: 100,
        minIncrement: 10,
        item: { name: "Item" },
      });
      const autobid = { isActive: false, save: jest.fn().mockResolvedValue(null), maxLimit: 200 };
      mockAutoBidModel.findById.mockResolvedValue(autobid);
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user", email: "e" });
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(autobid.isActive).toBe(true);
      expect(handleAutoBids).toHaveBeenCalledWith("a");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles activation exceptions", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await activateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("deactivateAutoBid", () => {
    it("requires autobid", async () => {
      mockAutoBidModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await deactivateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles already inactive autobid", async () => {
      mockAutoBidModel.findById.mockResolvedValue({ isActive: false });
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await deactivateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].message).toMatch(/already deactivated/);
    });

    it("deactivates autobid and updates auction", async () => {
      const autobid = { isActive: true, save: jest.fn().mockResolvedValue(null) };
      mockAutoBidModel.findById.mockResolvedValue(autobid);
      mockAuctionModel.findByIdAndUpdate.mockResolvedValue({});
      mockUserModel.findById.mockResolvedValue({ _id: "u", username: "user" });
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await deactivateAutoBid(req, res);

      expect(autobid.isActive).toBe(false);
      expect(mockAuctionModel.findByIdAndUpdate).toHaveBeenCalledWith("a", { $pull: { autoBidders: "u" } });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles deactivation failures", async () => {
      mockAutoBidModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a", autobidId: "ab" }, user: { _id: "u" } });
      const res = createMockRes();

      await deactivateAutoBid(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
