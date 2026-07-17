import { restrictToLoggedinUserOnly, checkAuth } from "../../middleware/authMiddleware.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";
import { getUser } from "../../services/auth.js";

jest.mock("../../services/auth.js", () => ({
  __esModule: true,
  getUser: jest.fn(),
}));

describe("authMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("restrictToLoggedinUserOnly", () => {
    it("requires the auth cookie", async () => {
      const req = createMockReq({ cookies: {} });
      const res = createMockRes();

      await restrictToLoggedinUserOnly(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects when token user is missing", async () => {
      getUser.mockResolvedValueOnce(null);
      const req = createMockReq({ cookies: { token: "abc" } });
      const res = createMockRes();

      await restrictToLoggedinUserOnly(req, res, jest.fn());

      expect(getUser).toHaveBeenCalledWith("abc");
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("attaches the user and calls next", async () => {
      const user = { _id: "u1" };
      getUser.mockResolvedValueOnce(user);
      const req = createMockReq({ cookies: { token: "abc" } });
      const res = createMockRes();
      const next = jest.fn();

      await restrictToLoggedinUserOnly(req, res, next);

      expect(req.user).toBe(user);
      expect(next).toHaveBeenCalled();
    });

    it("returns 500 when getUser throws", async () => {
      getUser.mockRejectedValueOnce(new Error("boom"));
      const req = createMockReq({ cookies: { token: "abc" } });
      const res = createMockRes();

      await restrictToLoggedinUserOnly(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Internal server error" })
      );
    });
  });

  describe("checkAuth", () => {
    it("silently loads the user when present", async () => {
      const user = { _id: "user" };
      getUser.mockResolvedValueOnce(user);
      const req = createMockReq({ cookies: { token: "abc" } });
      const res = createMockRes();
      const next = jest.fn();

      await checkAuth(req, res, next);

      expect(req.user).toBe(user);
      expect(next).toHaveBeenCalled();
    });

    it("continues when no token exists", async () => {
      getUser.mockResolvedValueOnce(undefined);
      const req = createMockReq({ cookies: {} });
      const res = createMockRes();
      const next = jest.fn();

      await checkAuth(req, res, next);

      expect(getUser).toHaveBeenCalledWith(undefined);
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it("returns 500 on errors", async () => {
      getUser.mockRejectedValueOnce(new Error("explode"));
      const req = createMockReq({ cookies: { token: "abc" } });
      const res = createMockRes();

      await checkAuth(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
