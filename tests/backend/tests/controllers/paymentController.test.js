import Auction from "../../models/Auction.js";
import Payment from "../../models/Payment.js";
import User from "../../models/User.js";
import AdminNotification from "../../models/AdminNotification.js";
import { generateUpiLink } from "../../services/payment.service.js";
import {
  SendCODSelectedEmail,
  SendUPISelectedEmail,
  SendPaymentVerificationRequestSent,
} from "../../services/email.sender.js";
import {
  handleRegistrationPayment,
  handleWinningCodPayment,
  handleWinningUpiPayment,
  verifyPayment,
  getPaymentById,
  getMyPayments,
} from "../../controllers/paymentController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../models/Payment.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../models/AdminNotification.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock("../../services/payment.service.js", () => ({
  generateUpiLink: jest.fn(),
}));

jest.mock("../../services/email.sender.js", () => ({
  SendCODSelectedEmail: jest.fn(),
  SendUPISelectedEmail: jest.fn(),
  SendPaymentVerificationRequestSent: jest.fn(),
}));

const mockAuctionModel = Auction;
const mockPaymentModel = Payment;
const mockUserModel = User;
const mockAdminNotifModel = AdminNotification;

const createLeanQuery = (value, shouldReject = false) => ({
  lean: shouldReject ? jest.fn().mockRejectedValue(value) : jest.fn().mockResolvedValue(value),
});

describe("paymentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BACKEND_URL = "http://localhost:5000";
    process.env.REGISTRATION_OPEN = "false";
  });

  describe("handleRegistrationPayment", () => {
    it("validates auction and user", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();
      await handleRegistrationPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      mockAuctionModel.findById.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue(null);
      await handleRegistrationPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects when registration closed", async () => {
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", status: "UPCOMING" });
      mockUserModel.findById.mockResolvedValue({ _id: "u" });
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleRegistrationPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates payment when live", async () => {
      process.env.REGISTRATION_OPEN = "true";
      delete process.env.BACKEND_URL;
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", status: "LIVE", startingPrice: 100 });
      mockUserModel.findById.mockResolvedValue({ _id: "u" });
      generateUpiLink.mockResolvedValue("upi://pay");
      mockPaymentModel.create.mockResolvedValue({ _id: "p" });
      mockAdminNotifModel.create.mockResolvedValue({});
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleRegistrationPayment(req, res);

      expect(mockPaymentModel.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("trims backend URL when generating verification link", async () => {
      process.env.REGISTRATION_OPEN = "true";
      process.env.BACKEND_URL = "https://api.example.com///";
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", status: "UPCOMING", startingPrice: 100 });
      mockUserModel.findById.mockResolvedValue({ _id: "u" });
      generateUpiLink.mockResolvedValue("upi://pay");
      mockPaymentModel.create.mockResolvedValue({ _id: "pid" });
      mockAdminNotifModel.create.mockResolvedValue({});
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleRegistrationPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].verifyLink).toBe(
        "https://api.example.com/bidsphere/auctions/a/pid/verify"
      );
    });

    it("handles unexpected registration errors", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleRegistrationPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("handleWinningCodPayment", () => {
    it("requires auction, user, and winner", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();
      await handleWinningCodPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      mockAuctionModel.findById.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue(null);
      await handleWinningCodPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      mockUserModel.findById.mockResolvedValue({ _id: "u" });
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", auctionWinner: "other" });
      await handleWinningCodPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates COD payment and notification", async () => {
      const auction = { _id: "a", auctionWinner: "u", winningPrice: 500 };
      mockAuctionModel.findById.mockResolvedValue(auction);
      mockUserModel.findById.mockResolvedValue({ _id: "u", email: "e", username: "user" });
      mockPaymentModel.create.mockResolvedValue({ _id: "p" });
      mockAdminNotifModel.create.mockResolvedValue({});
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleWinningCodPayment(req, res);

      expect(mockPaymentModel.create).toHaveBeenCalled();
      expect(SendCODSelectedEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles COD flow failures", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleWinningCodPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("handleWinningUpiPayment", () => {
    it("validates inputs similarly to COD", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();
      await handleWinningUpiPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      mockAuctionModel.findById.mockResolvedValue({ _id: "a" });
      mockUserModel.findById.mockResolvedValue(null);
      await handleWinningUpiPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      mockUserModel.findById.mockResolvedValue({ _id: "u" });
      mockAuctionModel.findById.mockResolvedValue({ _id: "a", auctionWinner: "other" });
      await handleWinningUpiPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates UPI payment", async () => {
      const auction = { _id: "a", auctionWinner: "u", winningPrice: 500 };
      mockAuctionModel.findById.mockResolvedValue(auction);
      mockUserModel.findById.mockResolvedValue({ _id: "u", email: "e", username: "user" });
      generateUpiLink.mockResolvedValue("upi://pay");
      mockPaymentModel.create.mockResolvedValue({ _id: "p" });
      mockAdminNotifModel.create.mockResolvedValue({});
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleWinningUpiPayment(req, res);

      expect(SendUPISelectedEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles UPI flow failures", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a" }, user: { _id: "u" } });
      const res = createMockRes();

      await handleWinningUpiPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("verifyPayment", () => {
    it("validates user and payment", async () => {
      mockAuctionModel.findById.mockResolvedValue({ title: "Auction" });
      mockUserModel.findById.mockResolvedValue(null);
      const req = createMockReq({
        params: { auctionId: "a", paymentId: "p" },
        user: { _id: "u" },
        body: { upiAccountName: "name", upiTxnId: "txn" },
      });
      const res = createMockRes();
      await verifyPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      mockUserModel.findById.mockResolvedValue({ _id: "u", email: "e", username: "user" });
      mockPaymentModel.findById.mockResolvedValue(null);
      await verifyPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("skips already verified payments", async () => {
      mockAuctionModel.findById.mockResolvedValue({ title: "Auction" });
      mockUserModel.findById.mockResolvedValue({ _id: "u", email: "e", username: "user" });
      mockPaymentModel.findById.mockResolvedValue({ status: "SUCCESS" });
      const req = createMockReq({ params: { auctionId: "a", paymentId: "p" }, body: {}, user: { _id: "u" } });
      const res = createMockRes();

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("submits verification request", async () => {
      mockAuctionModel.findById.mockResolvedValue({ title: "Auction" });
      mockUserModel.findById.mockResolvedValue({ _id: "u", email: "e", username: "user" });
      const payment = { status: "PENDING", save: jest.fn().mockResolvedValue(null), type: "WINNING PAYMENT" };
      mockPaymentModel.findById.mockResolvedValue(payment);
      const req = createMockReq({
        params: { auctionId: "a", paymentId: "p" },
        body: { upiAccountName: "name", upiTxnId: "txn" },
        user: { _id: "u" },
      });
      const res = createMockRes();

      await verifyPayment(req, res);

      expect(payment.save).toHaveBeenCalled();
      expect(mockAdminNotifModel.create).toHaveBeenCalled();
      expect(SendPaymentVerificationRequestSent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles verification errors", async () => {
      mockAuctionModel.findById.mockRejectedValue(new Error("db"));
      const req = createMockReq({ params: { auctionId: "a", paymentId: "p" }, body: {}, user: { _id: "u" } });
      const res = createMockRes();

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getPaymentById", () => {
    it("handles missing payment", async () => {
      mockPaymentModel.findById.mockReturnValue(createLeanQuery(null));
      const req = createMockReq({ params: { paymentId: "p" } });
      const res = createMockRes();

      await getPaymentById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns payment data", async () => {
      mockPaymentModel.findById.mockReturnValue(createLeanQuery({ _id: "p" }));
      const req = createMockReq({ params: { paymentId: "p" } });
      const res = createMockRes();

      await getPaymentById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles payment lookup errors", async () => {
      mockPaymentModel.findById.mockReturnValue(createLeanQuery(new Error("db"), true));
      const req = createMockReq({ params: { paymentId: "p" } });
      const res = createMockRes();

      await getPaymentById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getMyPayments", () => {
    it("requires authentication", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await getMyPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns payments", async () => {
      mockPaymentModel.find.mockReturnValue(createLeanQuery([{ _id: "p" }]));
      const req = createMockReq({ user: { _id: "u" } });
      const res = createMockRes();

      await getMyPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors", async () => {
      mockPaymentModel.find.mockReturnValue(createLeanQuery(new Error("db"), true));
      const req = createMockReq({ user: { _id: "u" } });
      const res = createMockRes();

      await getMyPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
