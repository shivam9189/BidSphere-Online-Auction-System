/**
 * @file auth.test.js
 *
 * Test suite for:
 *  - setUser
 *  - getUser
 *  - generateHashPassword
 *
 * Total tests: 41
 */

import { jest } from "@jest/globals";

/* -------------------------------------------------------
   1. Mock dependencies BEFORE importing auth.js
-------------------------------------------------------- */

// jsonwebtoken is imported as default: import jwt from "jsonwebtoken";
jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

// bcryptjs is imported as default: import bcrypt from "bcryptjs";
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

// User model is imported as default: import User from "../models/User.js";
// From this test file (backend/test_for_services/auth_test/auth.test.js)
// to models: ../models/User.js
jest.mock("../models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

/* -------------------------------------------------------
   2. Import functions from auth module AFTER mocks
-------------------------------------------------------- */

// Adjust this path if your auth.js is in a different folder.
// Current assumption: backend/services/auth.js
let setUser, getUser, generateHashPassword;

beforeAll(async () => {
  const mod = await import("../services/auth.js"); // change to "../utils/auth.js" etc if needed
  setUser = mod.setUser;
  getUser = mod.getUser;
  generateHashPassword = mod.generateHashPassword;
});

/* -------------------------------------------------------
   3. Tests for setUser
-------------------------------------------------------- */

describe("setUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs a JWT with _id and email", () => {
    const user = { _id: "123", email: "a@b.com" };
    jwt.sign.mockReturnValue("token-1");

    const result = setUser(user);

    expect(jwt.sign).toHaveBeenCalledTimes(1);
    expect(jwt.sign).toHaveBeenCalledWith(
      { _id: "123", email: "a@b.com" },
      "$@BidSphere"
    );
    expect(result).toBe("token-1");
  });

  it("returns whatever jwt.sign returns", () => {
    jwt.sign.mockReturnValue("abc.xyz.123");
    const result = setUser({ _id: "1", email: "x@y.z" });
    expect(result).toBe("abc.xyz.123");
  });

  it("uses secret '$@BidSphere' exactly", () => {
    const user = { _id: "u1", email: "test@example.com" };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [, usedSecret] = jwt.sign.mock.calls[0];
    expect(usedSecret).toBe("$@BidSphere");
  });

  it("ignores extra fields on user when building token payload", () => {
    const user = {
      _id: "u2",
      email: "user@test.com",
      username: "myuser",
      role: "ADMIN",
    };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload).toEqual({ _id: "u2", email: "user@test.com" });
  });

  it("works if email is null (still passes email: null)", () => {
    const user = { _id: "u3", email: null };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload).toEqual({ _id: "u3", email: null });
  });

  it("works if email is undefined (still passes email: undefined)", () => {
    const user = { _id: "u4" }; // no email
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload).toEqual({ _id: "u4", email: undefined });
  });

  it("throws if jwt.sign throws", () => {
    const user = { _id: "u5", email: "e@e.com" };
    jwt.sign.mockImplementation(() => {
      throw new Error("sign error");
    });
    expect(() => setUser(user)).toThrow("sign error");
  });

  it("supports numeric-like string id", () => {
    const user = { _id: "12345", email: "num@test.com" };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload._id).toBe("12345");
  });

  it("supports non-string id (e.g., ObjectId-like)", () => {
    const fakeId = { some: "object" };
    const user = { _id: fakeId, email: "obj@test.com" };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload._id).toBe(fakeId);
  });

  it("allows empty string email", () => {
    const user = { _id: "id", email: "" };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload.email).toBe("");
  });

  it("allows empty string _id", () => {
    const user = { _id: "", email: "x@y.com" };
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload._id).toBe("");
  });

  it("still works even if user object has no _id and no email", () => {
    const user = {};
    jwt.sign.mockReturnValue("tok");
    setUser(user);
    const [payload] = jwt.sign.mock.calls[0];
    expect(payload).toEqual({ _id: undefined, email: undefined });
  });
});

/* -------------------------------------------------------
   4. Tests for getUser
-------------------------------------------------------- */

describe("getUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null if token is null", async () => {
    const res = await getUser(null);
    expect(res).toBeNull();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it("returns null if token is undefined", async () => {
    const res = await getUser(undefined);
    expect(res).toBeNull();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it("returns null if token is empty string", async () => {
    const res = await getUser("");
    expect(res).toBeNull();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it("returns null if jwt.verify throws generic error", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("bad token");
    });
    const res = await getUser("invalid.token");
    expect(jwt.verify).toHaveBeenCalledTimes(1);
    expect(res).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns null if jwt.verify throws TokenExpiredError-like", async () => {
    const err = new Error("jwt expired");
    err.name = "TokenExpiredError";
    jwt.verify.mockImplementation(() => {
      throw err;
    });
    const res = await getUser("expired.token");
    expect(res).toBeNull();
  });

  it("returns null if payload is null", async () => {
    jwt.verify.mockReturnValue(null);
    const res = await getUser("some.token");
    expect(res).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns null if payload is not an object", async () => {
    jwt.verify.mockReturnValue("just-a-string");
    const res = await getUser("some.token");
    expect(res).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns null if payload._id is missing", async () => {
    jwt.verify.mockReturnValue({ email: "x@y.z" });
    const res = await getUser("some.token");
    expect(res).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns null if payload._id is null", async () => {
    jwt.verify.mockReturnValue({ _id: null, email: "x@y.z" });
    const res = await getUser("some.token");
    expect(res).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns null if payload._id is empty string", async () => {
    jwt.verify.mockReturnValue({ _id: "", email: "x@y.z" });
    const res = await getUser("some.token");
    expect(res).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("calls jwt.verify with secret '$@BidSphere'", async () => {
    jwt.verify.mockReturnValue({ _id: "u1" });
    const selectMock = jest.fn().mockResolvedValue({ _id: "u1" });
    User.findById.mockReturnValue({ select: selectMock });

    await getUser("valid");

    expect(jwt.verify).toHaveBeenCalledWith("valid", "$@BidSphere");
  });

  it("calls User.findById with payload._id", async () => {
    jwt.verify.mockReturnValue({ _id: "user-id-123", email: "u@u.com" });
    const selectMock = jest.fn().mockResolvedValue({ _id: "user-id-123" });
    User.findById.mockReturnValue({ select: selectMock });

    await getUser("token");
    expect(User.findById).toHaveBeenCalledWith("user-id-123");
  });

  it("uses correct projection when selecting user fields", async () => {
    jwt.verify.mockReturnValue({ _id: "u2" });
    const selectMock = jest.fn().mockResolvedValue({ _id: "u2" });
    User.findById.mockReturnValue({ select: selectMock });

    await getUser("token");
    expect(selectMock).toHaveBeenCalledWith(
      "-password -resetToken -resetTokenExpiry -verificationCode"
    );
  });

  it("returns user object when found", async () => {
    jwt.verify.mockReturnValue({ _id: "u3" });
    const fakeUser = { _id: "u3", email: "user@test.com" };
    const selectMock = jest.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select: selectMock });

    const res = await getUser("token");
    expect(res).toBe(fakeUser);
  });

  it("returns null if user not found", async () => {
    jwt.verify.mockReturnValue({ _id: "u4" });
    const selectMock = jest.fn().mockResolvedValue(null);
    User.findById.mockReturnValue({ select: selectMock });

    const res = await getUser("token");
    expect(res).toBeNull();
  });

  it("propagates error if User.findById throws BEFORE select is accessed", async () => {
    jwt.verify.mockReturnValue({ _id: "u5" });
    User.findById.mockImplementation(() => {
      throw new Error("DB connection error");
    });

    await expect(getUser("token")).rejects.toThrow("DB connection error");
  });

  it("propagates error if .select() rejects", async () => {
    jwt.verify.mockReturnValue({ _id: "u6" });
    const selectMock = jest.fn().mockRejectedValue(new Error("select fail"));
    User.findById.mockReturnValue({ select: selectMock });

    await expect(getUser("token")).rejects.toThrow("select fail");
  });

  it("handles case where jwt.verify returns payload with extra fields", async () => {
    jwt.verify.mockReturnValue({
      _id: "u7",
      email: "e@x.com",
      role: "ADMIN",
      extra: "data",
    });
    const fakeUser = { _id: "u7" };
    const selectMock = jest.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select: selectMock });

    const res = await getUser("token");
    expect(res).toBe(fakeUser);
  });

  it("works when payload._id is numeric", async () => {
    jwt.verify.mockReturnValue({ _id: 12345 });
    const fakeUser = { _id: 12345 };
    const selectMock = jest.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select: selectMock });

    const res = await getUser("token");
    expect(User.findById).toHaveBeenCalledWith(12345);
    expect(res).toBe(fakeUser);
  });

  it("can be called multiple times and reuses mocks", async () => {
    jwt.verify.mockReturnValue({ _id: "multi1" });
    const fakeUser = { _id: "multi1" };
    const selectMock = jest.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select: selectMock });

    const r1 = await getUser("t1");
    const r2 = await getUser("t2");

    expect(jwt.verify).toHaveBeenCalledTimes(2);
    expect(r1).toBe(fakeUser);
    expect(r2).toBe(fakeUser);
  });

  it("does not modify the token string passed in", async () => {
    jwt.verify.mockReturnValue({ _id: "immutable" });
    const selectMock = jest.fn().mockResolvedValue({ _id: "immutable" });
    User.findById.mockReturnValue({ select: selectMock });

    const token = "original.token";
    await getUser(token);
    expect(token).toBe("original.token");
  });

  it("jwt.verify is only called once per getUser call", async () => {
    jwt.verify.mockReturnValue({ _id: "once" });
    const selectMock = jest.fn().mockResolvedValue({ _id: "once" });
    User.findById.mockReturnValue({ select: selectMock });

    await getUser("token");
    expect(jwt.verify).toHaveBeenCalledTimes(1);
  });

  it("does not call User.findById when token invalid", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    await getUser("bad");
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("handles token that yields payload with only _id", async () => {
    jwt.verify.mockReturnValue({ _id: "only-id" });
    const fakeUser = { _id: "only-id" };
    const selectMock = jest.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select: selectMock });

    const res = await getUser("token");
    expect(res).toBe(fakeUser);
  });
});

/* -------------------------------------------------------
   5. Tests for generateHashPassword
-------------------------------------------------------- */

describe("generateHashPassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls bcrypt.hash with the password and salt rounds 10", async () => {
    bcrypt.hash.mockResolvedValue("hash1");
    await generateHashPassword("myPassword");
    expect(bcrypt.hash).toHaveBeenCalledWith("myPassword", 10);
  });

  it("returns the hash value from bcrypt.hash", async () => {
    bcrypt.hash.mockResolvedValue("hash-xyz");
    const res = await generateHashPassword("pass");
    expect(res).toBe("hash-xyz");
  });

  it("can hash different passwords independently", async () => {
    bcrypt.hash.mockResolvedValueOnce("h1").mockResolvedValueOnce("h2");

    const r1 = await generateHashPassword("p1");
    const r2 = await generateHashPassword("p2");

    expect(r1).toBe("h1");
    expect(r2).toBe("h2");
    expect(bcrypt.hash).toHaveBeenCalledTimes(2);
  });

  it("propagates error when bcrypt.hash rejects", async () => {
    bcrypt.hash.mockRejectedValue(new Error("hash failed"));
    await expect(generateHashPassword("x")).rejects.toThrow("hash failed");
  });

  it("allows empty string password", async () => {
    bcrypt.hash.mockResolvedValue("empty-hash");
    const res = await generateHashPassword("");
    expect(bcrypt.hash).toHaveBeenCalledWith("", 10);
    expect(res).toBe("empty-hash");
  });

  it("allows very long password", async () => {
    const longPass = "a".repeat(1000);
    bcrypt.hash.mockResolvedValue("long-hash");
    const res = await generateHashPassword(longPass);
    expect(bcrypt.hash).toHaveBeenCalledWith(longPass, 10);
    expect(res).toBe("long-hash");
  });
});
