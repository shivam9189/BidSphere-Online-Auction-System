import Delivery from "../../models/Delivery.js";
import Auction from "../../models/Auction.js";
import User from "../../models/User.js";
import Payment from "../../models/Payment.js";
import {
  createDelivery,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  updateUserAddress,
} from "../../controllers/deliveryController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Delivery.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
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
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../models/Payment.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockDeliveryModel = Delivery;
const mockAuctionModel = Auction;
const mockUserModel = User;
const mockPaymentModel = Payment;

const createPopulateQuery = (value) => ({
  populate: jest.fn().mockResolvedValue(value),
});

describe("deliveryController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createDelivery", () => {
    it("validates body", async () => {
      const req = createMockReq({ body: {}, user: { _id: "buyer" } });
      const res = createMockRes();

      await createDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires auction and winner", async () => {
      mockAuctionModel.findById.mockReturnValue(createPopulateQuery(null));
      const req = createMockReq({ body: { auctionId: "a", buyerAddress: {} }, user: { _id: "buyer" } });
      const res = createMockRes();
      await createDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(404);

      mockAuctionModel.findById.mockReturnValue(
        createPopulateQuery({
          _id: "a",
          createdBy: { _id: "seller" },
          auctionWinner: "someone",
        })
      );
      await createDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("prevents duplicate delivery", async () => {
      const auction = {
        _id: "a",
        createdBy: { _id: "seller" },
        auctionWinner: "buyer",
      };
      mockAuctionModel.findById.mockReturnValue(createPopulateQuery(auction));
      mockDeliveryModel.findOne.mockResolvedValue({ _id: "existing" });
      const req = createMockReq({ body: { auctionId: "a", buyerAddress: {} }, user: { _id: "buyer" } });
      const res = createMockRes();

      await createDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires seller and valid payment", async () => {
      const auction = {
        _id: "a",
        createdBy: { _id: "seller" },
        auctionWinner: "buyer",
      };
      mockAuctionModel.findById.mockReturnValue(createPopulateQuery(auction));
      mockDeliveryModel.findOne.mockResolvedValue(null);
      mockUserModel.findById.mockResolvedValue(null);
      const req = createMockReq({ body: { auctionId: "a", buyerAddress: {}, paymentId: "p" }, user: { _id: "buyer" } });
      const res = createMockRes();
      await createDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(404);

      mockUserModel.findById.mockResolvedValue({ _id: "seller", address: null });
      mockPaymentModel.findById.mockResolvedValue(null);
      await createDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(404);

      mockPaymentModel.findById.mockResolvedValue({ type: "REGISTRATION FEES" });
      await createDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("uses default seller address and null payment id when paymentId missing", async () => {
      const auction = {
        _id: "a",
        createdBy: { _id: "seller" },
        auctionWinner: "buyer",
      };
      mockAuctionModel.findById.mockReturnValue(createPopulateQuery(auction));
      mockDeliveryModel.findOne.mockResolvedValue(null);
      mockUserModel.findById.mockResolvedValue({ _id: "seller", address: undefined });
      mockDeliveryModel.create.mockResolvedValue({ _id: "d" });
      const req = createMockReq({ body: { auctionId: "a", buyerAddress: { city: "c" } }, user: { _id: "buyer" } });
      const res = createMockRes();

      await createDelivery(req, res);

      expect(mockDeliveryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: null,
          sellerAddress: expect.objectContaining({ city: "Not provided" }),
          paymentStatus: "PENDING",
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

      it("validates payment ownership and auction match", async () => {
        const auction = {
          _id: "a",
          createdBy: { _id: "seller" },
          auctionWinner: "buyer",
        };
        mockAuctionModel.findById.mockReturnValue(createPopulateQuery(auction));
        mockDeliveryModel.findOne.mockResolvedValue(null);
        mockUserModel.findById.mockResolvedValue({ _id: "seller", address: { city: "x" } });
        mockPaymentModel.findById.mockResolvedValue({
          type: "WINNING PAYMENT",
          status: "PENDING",
          userId: "other",
          auctionId: "different",
        });
        const req = createMockReq({ body: { auctionId: "a", buyerAddress: {}, paymentId: "p" }, user: { _id: "buyer" } });
        const res = createMockRes();

        await createDelivery(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      it("handles unexpected creation errors", async () => {
        const failingQuery = { populate: jest.fn().mockRejectedValue({}) };
        mockAuctionModel.findById.mockReturnValue(failingQuery);
        const req = createMockReq({ body: { auctionId: "a", buyerAddress: {} }, user: { _id: "buyer" } });
        const res = createMockRes();

        await createDelivery(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Failed to create delivery' })
        );
      });

    it("creates delivery record", async () => {
      const auction = {
        _id: "a",
        createdBy: { _id: "seller" },
        auctionWinner: "buyer",
      };
      mockAuctionModel.findById.mockReturnValue(createPopulateQuery(auction));
      mockDeliveryModel.findOne.mockResolvedValue(null);
      mockUserModel.findById.mockResolvedValue({ _id: "seller", address: { city: "X" } });
      mockPaymentModel.findById.mockResolvedValue({
        _id: "p",
        type: "WINNING PAYMENT",
        status: "SUCCESS",
        userId: "buyer",
        auctionId: "a",
      });
      mockDeliveryModel.create.mockResolvedValue({ _id: "d" });
      const req = createMockReq({ body: { auctionId: "a", buyerAddress: {}, paymentId: "p" }, user: { _id: "buyer" } });
      const res = createMockRes();

      await createDelivery(req, res);

      expect(mockDeliveryModel.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("keeps payment status pending when payment capture has not succeeded", async () => {
      const auction = {
        _id: "a",
        createdBy: { _id: "seller" },
        auctionWinner: "buyer",
      };
      mockAuctionModel.findById.mockReturnValue(createPopulateQuery(auction));
      mockDeliveryModel.findOne.mockResolvedValue(null);
      mockUserModel.findById.mockResolvedValue({ _id: "seller", address: { city: "X" } });
      mockPaymentModel.findById.mockResolvedValue({
        _id: "p",
        type: "WINNING PAYMENT",
        status: "PENDING",
        userId: "buyer",
        auctionId: "a",
      });
      mockDeliveryModel.create.mockResolvedValue({ _id: "d" });
      const req = createMockReq({ body: { auctionId: "a", buyerAddress: {}, paymentId: "p" }, user: { _id: "buyer" } });
      const res = createMockRes();

      await createDelivery(req, res);

      expect(mockDeliveryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: "PENDING" })
      );
    });
  });

  describe("getMyDeliveries", () => {
    it("returns deliveries for buyer or seller", async () => {
      mockDeliveryModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "d" }]),
      });
      const req = createMockReq({ user: { _id: "user" } });
      const res = createMockRes();

      await getMyDeliveries(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors", async () => {
      const err = new Error("");
      err.message = "";
      mockDeliveryModel.find.mockImplementation(() => {
        throw err;
      });
      const req = createMockReq({ user: { _id: "user" } });
      const res = createMockRes();

      await getMyDeliveries(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to fetch deliveries' })
      );
    });
  });

  describe("getAllDeliveries", () => {
    it("returns aggregated deliveries", async () => {
      mockDeliveryModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "d" }]),
      });
      const req = createMockReq();
      const res = createMockRes();

      await getAllDeliveries(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors", async () => {
      const err = new Error("");
      err.message = "";
      mockDeliveryModel.find.mockImplementation(() => {
        throw err;
      });
      const req = createMockReq();
      const res = createMockRes();

      await getAllDeliveries(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to fetch all deliveries' })
      );
    });
  });

  describe("updateDeliveryStatus", () => {
    it("requires delivery", async () => {
      mockDeliveryModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { deliveryId: "d" }, body: {} });
      const res = createMockRes();

      await updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("requires seller authorization", async () => {
      mockDeliveryModel.findById.mockResolvedValue({ sellerId: "seller", save: jest.fn() });
      const req = createMockReq({ params: { deliveryId: "d" }, body: {}, user: { _id: "other" } });
      const res = createMockRes();

      await updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("updates status fields", async () => {
      const save = jest.fn().mockResolvedValue(null);
      mockDeliveryModel.findById.mockResolvedValue({ sellerId: "seller", save });
      const req = createMockReq({
        params: { deliveryId: "d" },
        body: { deliveryStatus: "SHIPPED", trackingNumber: "TN", estimatedDelivery: "soon" },
        user: { _id: "seller" },
      });
      const res = createMockRes();

      await updateDeliveryStatus(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("saves even when optional fields are omitted", async () => {
      const save = jest.fn().mockResolvedValue(null);
      mockDeliveryModel.findById.mockResolvedValue({ sellerId: "seller", save });
      const req = createMockReq({ params: { deliveryId: "d" }, body: {}, user: { _id: "seller" } });
      const res = createMockRes();

      await updateDeliveryStatus(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors", async () => {
      mockDeliveryModel.findById.mockRejectedValue({});
      const req = createMockReq({ params: { deliveryId: "d" }, body: {}, user: { _id: "seller" } });
      const res = createMockRes();

      await updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to update delivery status' })
      );
    });
  });

  describe("updateUserAddress", () => {
    it("validates fields", async () => {
      const req = createMockReq({ body: {}, user: { _id: "u" } });
      const res = createMockRes();

      await updateUserAddress(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updates address", async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue({ _id: "u" });
      const req = createMockReq({
        user: { _id: "u" },
        body: { street: "s", city: "c", state: "st", postalCode: "p", country: "co" },
      });
      const res = createMockRes();

      await updateUserAddress(req, res);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

      it("handles address update failures", async () => {
        mockUserModel.findByIdAndUpdate.mockRejectedValue({});
        const req = createMockReq({
          user: { _id: "u" },
          body: { street: "s", city: "c", state: "st", postalCode: "p", country: "co" },
        });
        const res = createMockRes();

        await updateUserAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Failed to update address' })
        );
      });
  });
});
