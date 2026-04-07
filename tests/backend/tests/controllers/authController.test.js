import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import { setUser, generateHashPassword } from "../../services/auth.js";
import {
  SendVerificationCode,
  WelcomeEmail,
  SendResetPwdEmail,
} from "../../services/email.sender.js";
import {
  handleRegister,
  handleLogin,
  handleLogout,
  verifyEmail,
  getCurrentUser,
  handleResetPwdEmail,
  handleResetPwd,
  getUserById,
} from "../../controllers/authController.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/User.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("../../services/auth.js", () => ({
  setUser: jest.fn(),
  generateHashPassword: jest.fn(),
}));

jest.mock("../../services/email.sender.js", () => ({
  SendVerificationCode: jest.fn(),
  WelcomeEmail: jest.fn(),
  SendResetPwdEmail: jest.fn(),
}));

const mockUserModel = User;

const createSelectQuery = (value, shouldReject = false) => ({
  select: jest.fn().mockReturnValue({
    lean: shouldReject ? jest.fn().mockRejectedValue(value) : jest.fn().mockResolvedValue(value),
  }),
});

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleRegister", () => {
    it("validates required fields", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await handleRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects duplicate email", async () => {
      mockUserModel.findOne.mockResolvedValue({ _id: "u" });
      const req = createMockReq({ body: { username: "u", email: "a@b.com", password: "x" } });
      const res = createMockRes();

      await handleRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates user and sends verification", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      generateHashPassword.mockResolvedValue("hashed");
      const req = createMockReq({ body: { username: "u", email: "a@b.com", password: "x" } });
      const res = createMockRes();

      await handleRegister(req, res);

      expect(mockUserModel.create).toHaveBeenCalled();
      expect(SendVerificationCode).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles database errors", async () => {
      mockUserModel.findOne.mockRejectedValue(new Error("db"));
      const req = createMockReq({ body: { username: "u", email: "a@b.com", password: "x" } });
      const res = createMockRes();

      await handleRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handleLogin", () => {
    it("prevents double login", async () => {
      const req = createMockReq({ cookies: { token: "t" }, body: {} });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires email and password", async () => {
      const req = createMockReq({ body: { email: "a" } });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects missing user", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const req = createMockReq({ body: { email: "a", password: "b" } });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("rejects invalid password", async () => {
      mockUserModel.findOne.mockResolvedValue({ password: "hash" });
      bcrypt.compare.mockResolvedValue(false);
      const req = createMockReq({ body: { email: "a", password: "b" } });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("requires verified user", async () => {
      mockUserModel.findOne.mockResolvedValue({ password: "hash", isVerified: false });
      bcrypt.compare.mockResolvedValue(true);
      const req = createMockReq({ body: { email: "a", password: "b" } });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("logs in successfully", async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: "u",
        password: "hash",
        isVerified: true,
        username: "user",
        email: "a",
      });
      bcrypt.compare.mockResolvedValue(true);
      setUser.mockReturnValue("signed");
      const req = createMockReq({ body: { email: "a", password: "b" } });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        "token",
        "signed",
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Login successful" })
      );
    });

    it("handles unexpected errors", async () => {
      mockUserModel.findOne.mockRejectedValue(new Error("db"));
      const req = createMockReq({ body: { email: "a", password: "b" } });
      const res = createMockRes();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handleLogout", () => {
    it("clears token cookie", async () => {
      const req = createMockReq();
      const res = createMockRes();

      await handleLogout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out" });
    });

    it("handles logout failures", async () => {
      const req = createMockReq();
      const res = createMockRes();
      res.clearCookie.mockImplementation(() => {
        throw new Error("boom");
      });

      await handleLogout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("verifyEmail", () => {
    it("validates input", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects invalid user", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const req = createMockReq({ body: { email: "a", code: "1" } });
      const res = createMockRes();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("verifies user and sends welcome email", async () => {
      const save = jest.fn().mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue({ email: "a", username: "user", save });
      const req = createMockReq({ body: { email: "a", code: "1" } });
      const res = createMockRes();

      await verifyEmail(req, res);

      expect(save).toHaveBeenCalled();
      expect(WelcomeEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles verification failures", async () => {
      mockUserModel.findOne.mockRejectedValue(new Error("db"));
      const req = createMockReq({ body: { email: "a", code: "1" } });
      const res = createMockRes();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when no token user", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: null });
    });

    it("returns null when DB user missing", async () => {
      mockUserModel.findById.mockReturnValue(createSelectQuery(null));
      const req = createMockReq({ user: { _id: "u1" } });
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.json).toHaveBeenCalledWith({ user: null });
    });

    it("returns sanitized user", async () => {
      mockUserModel.findById.mockReturnValue(
        createSelectQuery({
          _id: "u",
          username: "user",
          email: "a",
          isVerified: true,
        })
      );
      const req = createMockReq({ user: { _id: "u" } });
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.json.mock.calls[0][0].user.email).toBe("a");
    });

    it("handles datasource failures", async () => {
      mockUserModel.findById.mockReturnValue(createSelectQuery(new Error("db"), true));
      const req = createMockReq({ user: { _id: "u" } });
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("handleResetPwdEmail", () => {
    it("requires email", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await handleResetPwdEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires existing verified user", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const req = createMockReq({ body: { email: "a" } });
      const res = createMockRes();
      await handleResetPwdEmail(req, res);
      expect(res.status).toHaveBeenCalledWith(404);

      mockUserModel.findOne.mockResolvedValue({ isVerified: false });
      await handleResetPwdEmail(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("sends reset email", async () => {
      const save = jest.fn().mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue({ _id: "u", email: "a", isVerified: true, save });
      jest.spyOn(Date, "now").mockReturnValue(0);
      const req = createMockReq({ body: { email: "a" } });
      const res = createMockRes();

      await handleResetPwdEmail(req, res);

      expect(save).toHaveBeenCalled();
      expect(SendResetPwdEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      Date.now.mockRestore();
    });

    it("handles reset email failures", async () => {
      mockUserModel.findOne.mockRejectedValue(new Error("db"));
      const req = createMockReq({ body: { email: "a" } });
      const res = createMockRes();

      await handleResetPwdEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("handleResetPwd", () => {
    it("validates request body", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await handleResetPwd(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires existing user", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const req = createMockReq({ body: { token: "t", email: "a", newPassword: "x", confirmNewPassword: "x" } });
      const res = createMockRes();

      await handleResetPwd(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("validates token and matching passwords", async () => {
      mockUserModel.findOne.mockResolvedValue({
        resetToken: "t",
        resetTokenExpiry: Date.now() + 1000,
      });
      let req = createMockReq({
        body: { token: "bad", email: "a", newPassword: "x", confirmNewPassword: "x" },
      });
      let res = createMockRes();
      await handleResetPwd(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req = createMockReq({
        body: { token: "t", email: "a", newPassword: "x", confirmNewPassword: "y" },
      });
      res = createMockRes();
      mockUserModel.findOne.mockResolvedValue({
        resetToken: "t",
        resetTokenExpiry: Date.now() + 1000,
      });
      await handleResetPwd(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("requires new password different from old", async () => {
      const user = {
        resetToken: "t",
        resetTokenExpiry: Date.now() + 1000,
        password: "hash",
      };
      mockUserModel.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      const req = createMockReq({
        body: { token: "t", email: "a", newPassword: "x", confirmNewPassword: "x" },
      });
      const res = createMockRes();

      await handleResetPwd(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("resets password successfully", async () => {
      const save = jest.fn().mockResolvedValue(null);
      const user = {
        resetToken: "t",
        resetTokenExpiry: Date.now() + 1000,
        password: "hash",
        save,
      };
      mockUserModel.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);
      generateHashPassword.mockResolvedValue("newHash");
      const req = createMockReq({
        body: { token: "t", email: "a", newPassword: "x", confirmNewPassword: "x" },
      });
      const res = createMockRes();

      await handleResetPwd(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles reset failures", async () => {
      mockUserModel.findOne.mockRejectedValue(new Error("db"));
      const req = createMockReq({
        body: { token: "t", email: "a", newPassword: "x", confirmNewPassword: "x" },
      });
      const res = createMockRes();

      await handleResetPwd(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getUserById", () => {
    it("requires an id parameter", async () => {
      const req = createMockReq({ params: {} });
      const res = createMockRes();

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user is missing", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const req = createMockReq({ params: { id: "user" } });
      const res = createMockRes();

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns the public user payload", async () => {
      const user = { _id: "user", username: "demo" };
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });
      const req = createMockReq({ params: { id: "user" } });
      const res = createMockRes();

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user });
    });

    it("handles database errors", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("db")),
      });
      const req = createMockReq({ params: { id: "user" } });
      const res = createMockRes();

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
