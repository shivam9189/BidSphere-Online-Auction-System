import Auction from "../../models/Auction.js";
import AdminNotification from "../../models/AdminNotification.js";
import Payment from "../../models/Payment.js";
import {
  adminLogin,
  adminLogout,
  getAllAuctions,
  getAuctionDetails,
  verifyAuction,
  removeAuction,
  getNotifications,
  confirmNotification,
  rejectNotification,
} from "../../controllers/adminController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";
import { createQueryChain, createDoc } from "../utils/mongooseMocks.js";

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../../models/AdminNotification.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../../models/Payment.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockAuctionModel = Auction;
const mockAdminNotifModel = AdminNotification;
const mockPaymentModel = Payment;

const createNotifQuery = (notif) => ({
  populate: jest.fn().mockResolvedValue(notif),
});

describe("adminController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@bidsphere.com";
    process.env.ADMIN_PASSWORD = "secret";
  });

  describe("adminLogin", () => {
    it("rejects when already logged in", async () => {
      const req = createMockReq({ body: {}, cookies: { adminToken: "token" } });
      const res = createMockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("validates required fields", async () => {
      const req = createMockReq({ body: { email: "x" } });
      const res = createMockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects invalid credentials", async () => {
      const req = createMockReq({ body: { email: "wrong", password: "secret" } });
      const res = createMockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("rejects valid email but wrong password", async () => {
      const req = createMockReq({
        body: { email: "admin@bidsphere.com", password: "bad" },
      });
      const res = createMockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("logs in successfully", async () => {
      const req = createMockReq({
        body: { email: "admin@bidsphere.com", password: "secret" },
        ip: "::ffff:10.0.0.1",
      });
      const res = createMockRes();

      await adminLogin(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        "adminToken",
        "admin_logged_in",
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Admin Login successful" })
      );
    });

    it("handles unexpected errors", async () => {
      const req = createMockReq({ body: { email: "admin@bidsphere.com", password: "secret" } });
      const res = createMockRes();
      res.cookie.mockImplementation(() => {
        throw new Error("boom");
      });

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("adminLogout", () => {
    it("clears cookie", async () => {
      const req = createMockReq();
      const res = createMockRes();

      await adminLogout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        "adminToken",
        expect.objectContaining({ httpOnly: true, secure: true, sameSite: "none", path: "/" })
      );
      expect(res.json).toHaveBeenCalledWith({ message: "Admin logged out" });
    });

    it("handles logout failures", async () => {
      const req = createMockReq();
      const res = createMockRes();
      res.clearCookie.mockImplementation(() => {
        throw new Error("fail");
      });

      await adminLogout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getAllAuctions", () => {
    it("returns paginated auctions", async () => {
      mockAuctionModel.find.mockReturnValue(
        createQueryChain([{ _id: "a" }])
      );
      mockAuctionModel.countDocuments.mockResolvedValue(1);
      const req = createMockReq({ query: { status: "live", page: 1, limit: 5 } });
      const res = createMockRes();

      await getAllAuctions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].pagination.total).toBe(1);
    });

    it("handles errors", async () => {
      mockAuctionModel.find.mockImplementation(() => {
        throw new Error("fail");
      });
      const req = createMockReq();
      const res = createMockRes();

      await getAllAuctions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getAuctionDetails", () => {
    it("rejects invalid id", async () => {
      const req = createMockReq({ params: { auctionId: "bad" } });
      const res = createMockRes();

      await getAuctionDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns auction details", async () => {
      mockAuctionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: "a" }),
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await getAuctionDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when missing", async () => {
      mockAuctionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await getAuctionDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles database failures", async () => {
      mockAuctionModel.findById.mockImplementationOnce(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await getAuctionDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("verifyAuction", () => {
    it("rejects invalid id", async () => {
      const req = createMockReq({ params: { auctionId: "bad" } });
      const res = createMockRes();

      await verifyAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires existing auction", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });

      const res = createMockRes();
      await verifyAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("prevents double verification", async () => {
      mockAuctionModel.findById.mockResolvedValue({ verified: true });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await verifyAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("verifies auction successfully", async () => {
      const auction = {
        _id: "a",
        verified: false,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000).toISOString(),
        save: jest.fn().mockResolvedValue(null),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn(() => ({ _id: "a" })),
      };
      mockAuctionModel.findById.mockResolvedValue(auction);
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await verifyAuction(req, res);

      expect(auction.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("derives status for future and past windows", async () => {
      const futureAuction = {
        _id: "f",
        verified: false,
        startTime: new Date(Date.now() + 60_000).toISOString(),
        endTime: new Date(Date.now() + 120_000).toISOString(),
        save: jest.fn().mockResolvedValue(null),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn(() => ({ _id: "f" })),
      };
      const endedAuction = {
        _id: "e",
        verified: false,
        startTime: new Date(Date.now() - 120_000).toISOString(),
        endTime: new Date(Date.now() - 60_000).toISOString(),
        save: jest.fn().mockResolvedValue(null),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn(() => ({ _id: "e" })),
      };

      mockAuctionModel.findById
        .mockResolvedValueOnce(futureAuction)
        .mockResolvedValueOnce(endedAuction);

      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await verifyAuction(req, res);
      expect(futureAuction.status).toBe("UPCOMING");

      await verifyAuction(req, res);
      expect(endedAuction.status).toBe("ENDED");
    });

    it("handles verification failures", async () => {
      mockAuctionModel.findById.mockImplementationOnce(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await verifyAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("removeAuction", () => {
    it("rejects invalid id", async () => {
      const req = createMockReq({ params: { auctionId: "bad" } });
      const res = createMockRes();

      await removeAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires auction existence", async () => {
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await removeAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("rejects already removed auction", async () => {
      mockAuctionModel.findById.mockResolvedValue({ status: "REMOVED" });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await removeAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("marks auction as removed", async () => {
      const auction = {
        status: "LIVE",
        save: jest.fn().mockResolvedValue(null),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn(() => ({ _id: "a" })),
      };
      mockAuctionModel.findById.mockResolvedValue(auction);
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await removeAuction(req, res);

      expect(auction.status).toBe("REMOVED");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles unexpected removal errors", async () => {
      mockAuctionModel.findById.mockImplementationOnce(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await removeAuction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getNotifications", () => {
    it("returns notifications", async () => {
      mockAdminNotifModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "n" }]),
      });
      const req = createMockReq({ query: { status: "pending" } });
      const res = createMockRes();

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].notifications).toHaveLength(1);
    });

    it("skips status filter when empty string provided", async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockAdminNotifModel.find.mockReturnValue(chain);
      const req = createMockReq({ query: { status: "" } });
      const res = createMockRes();

      await getNotifications(req, res);

      expect(mockAdminNotifModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors", async () => {
      mockAdminNotifModel.find.mockImplementation(() => {
        throw new Error("db");
      });
      const req = createMockReq();
      const res = createMockRes();

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("confirmNotification", () => {
    it("validates id", async () => {
      const req = createMockReq({ params: { id: "bad" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires existing notification", async () => {
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(null));
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("prevents double processing", async () => {
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery({ status: "CONFIRM" }));
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updates payment and auction registrations", async () => {
      const save = jest.fn().mockResolvedValue(null);
      const notif = {
        _id: "n1",
        status: "PENDING",
        payment: { _id: "p1" },
        auctionId: { _id: "a1" },
        userId: { _id: "u1" },
        save,
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockPaymentModel.findById.mockResolvedValue({
        _id: "p1",
        status: "PENDING",
        type: "WINNING PAYMENT",
        save: jest.fn().mockResolvedValue(null),
      });
      const registrations = [];
      mockAuctionModel.findById.mockResolvedValue({
        registrations,
        totalParticipants: 0,
        save: jest.fn().mockResolvedValue(null),
      });
      mockAdminNotifModel.create.mockResolvedValue({});
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(registrations).toContainEqual("u1");
    });

    it("updates payment even when type is not winning", async () => {
      const save = jest.fn().mockResolvedValue(null);
      const paymentSave = jest.fn().mockResolvedValue(null);
      const notif = {
        _id: "n3",
        status: "PENDING",
        payment: { _id: "p3" },
        auctionId: null,
        userId: null,
        save,
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockPaymentModel.findById.mockResolvedValue({ _id: "p3", type: "REGISTRATION FEES", save: paymentSave });
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(paymentSave).toHaveBeenCalled();
      expect(mockAdminNotifModel.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("completes confirmation even when auction lookup fails", async () => {
      const save = jest.fn().mockResolvedValue(null);
      const notif = {
        status: "PENDING",
        payment: null,
        auctionId: { _id: "a3" },
        userId: { _id: "u3" },
        save,
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockAuctionModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(mockAuctionModel.findById).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles primitive references and missing payment records", async () => {
      const save = jest.fn().mockResolvedValue(null);
      const notif = {
        status: "PENDING",
        payment: "p4",
        auctionId: "a4",
        userId: "u4",
        save,
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockPaymentModel.findById.mockResolvedValue(null);
      mockAuctionModel.findById.mockResolvedValue({
        registrations: undefined,
        totalParticipants: undefined,
        save: jest.fn().mockResolvedValue(null),
      });
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(mockPaymentModel.findById).toHaveBeenCalledWith("p4");
      expect(mockAuctionModel.findById).toHaveBeenCalledWith("a4");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("skips registration when user already added", async () => {
      const save = jest.fn().mockResolvedValue(null);
      const notif = {
        _id: "n2",
        status: "PENDING",
        payment: null,
        auctionId: { _id: "a2" },
        userId: { _id: "u2" },
        save,
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockAuctionModel.findById.mockResolvedValue({
        registrations: ["u2"],
        totalParticipants: 5,
        save: jest.fn(),
      });

      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAuctionModel.findById).toHaveBeenCalled();
    });

    it("handles confirmation failures", async () => {
      mockAdminNotifModel.findById.mockImplementationOnce(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await confirmNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("rejectNotification", () => {
    it("validates id", async () => {
      const req = createMockReq({ params: { id: "bad" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires notification", async () => {
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(null));
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("prevents double processing", async () => {
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery({ status: "REJECT" }));
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects payment and notification", async () => {
      const notif = {
        status: "PENDING",
        payment: { _id: "p1" },
        save: jest.fn().mockResolvedValue(null),
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockPaymentModel.findById.mockResolvedValue({
        status: "PENDING",
        save: jest.fn().mockResolvedValue(null),
      });
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(notif.save).toHaveBeenCalled();
    });

    it("rejects notification without payment reference", async () => {
      const notif = {
        status: "PENDING",
        payment: null,
        save: jest.fn().mockResolvedValue(null),
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(mockPaymentModel.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects primitive payment ids even if record missing", async () => {
      const notif = {
        status: "PENDING",
        payment: "p2",
        save: jest.fn().mockResolvedValue(null),
      };
      mockAdminNotifModel.findById.mockReturnValue(createNotifQuery(notif));
      mockPaymentModel.findById.mockResolvedValue(null);
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(mockPaymentModel.findById).toHaveBeenCalledWith("p2");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles rejection failures", async () => {
      mockAdminNotifModel.findById.mockImplementationOnce(() => {
        throw new Error("db");
      });
      const req = createMockReq({ params: { id: "507f1f77bcf86cd799439011" } });
      const res = createMockRes();

      await rejectNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
