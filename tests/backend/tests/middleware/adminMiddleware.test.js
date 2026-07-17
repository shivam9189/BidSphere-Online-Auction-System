import { restrictAdminIP, requireAdminAuth } from "../../middleware/adminMiddleware.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

describe("adminMiddleware", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, ADMIN_IP: "192.168.0.10" };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("restrictAdminIP", () => {
    it("allows requests from the configured IP", () => {
      const req = createMockReq({ ip: "192.168.0.10" });
      const res = createMockRes();
      const next = jest.fn();

      restrictAdminIP(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("normalizes IPv4-mapped IPv6 addresses", () => {
      const req = createMockReq({ ip: "::ffff:192.168.0.10" });
      const res = createMockRes();
      const next = jest.fn();

      restrictAdminIP(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("rejects traffic from other IPs", () => {
      const req = createMockReq({ ip: "10.0.0.2" });
      const res = createMockRes();
      const next = jest.fn();

      restrictAdminIP(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
      expect(next).not.toHaveBeenCalled();
    });

    it("handles unexpected errors when IP is missing", () => {
      const req = createMockReq({ ip: null });
      const res = createMockRes();
      const next = jest.fn();

      restrictAdminIP(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Internal server error" })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireAdminAuth", () => {
    it("allows requests with a valid admin token", () => {
      const req = createMockReq({ cookies: { adminToken: "admin_logged_in" } });
      const res = createMockRes();
      const next = jest.fn();

      requireAdminAuth(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("rejects missing tokens", () => {
      const req = createMockReq({ cookies: {} });
      const res = createMockRes();
      const next = jest.fn();

      requireAdminAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin authentication required. Please log in.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejects invalid tokens", () => {
      const req = createMockReq({ cookies: { adminToken: "nope" } });
      const res = createMockRes();
      const next = jest.fn();

      requireAdminAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 500 when cookie access throws", () => {
      const res = createMockRes();
      const next = jest.fn();
      const req = {};
      Object.defineProperty(req, "cookies", {
        get() {
          throw new Error("cookie boom");
        },
      });

      requireAdminAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Internal server error" })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
