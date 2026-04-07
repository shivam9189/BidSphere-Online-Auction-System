import { jest } from "@jest/globals";

// Mock the AuctionLog model used by the service
jest.mock("../models/AuctionLog.js", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
  },
}));

import AuctionLog from "../models/AuctionLog.js";
import { logAuctionEvent } from "../services/logger.service.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("logAuctionEvent", () => {
  it("calls AuctionLog.findOneAndUpdate with provided fields and upsert true", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({
      auctionId: "a1",
      userId: "u1",
      userName: "Alice",
      type: "AUTO_BID_TRIGGERED",
      details: { amount: 100 },
    });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: "a1" },
      { $push: { logs: { userId: "u1", userName: "Alice", type: "AUTO_BID_TRIGGERED", details: { amount: 100 } } } },
      { upsert: true }
    );
  });

  it("uses empty object for default details when not provided", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({ auctionId: "a2", userId: "u2", userName: "Bob", type: "BID" });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: "a2" },
      { $push: { logs: { userId: "u2", userName: "Bob", type: "BID", details: {} } } },
      { upsert: true }
    );
  });

  it("accepts an explicit empty details object", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({ auctionId: "a3", userId: "u3", userName: "Carl", type: "BID", details: {} });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: "a3" },
      { $push: { logs: { userId: "u3", userName: "Carl", type: "BID", details: {} } } },
      { upsert: true }
    );
  });

  it("accepts null details and pushes null", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({ auctionId: "a4", userId: "u4", userName: "Dana", type: "BID", details: null });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: "a4" },
      { $push: { logs: { userId: "u4", userName: "Dana", type: "BID", details: null } } },
      { upsert: true }
    );
  });

  it("works without userName (undefined)", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({ auctionId: "a5", userId: "u5", type: "BID" });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: "a5" },
      { $push: { logs: { userId: "u5", userName: undefined, type: "BID", details: {} } } },
      { upsert: true }
    );
  });

  it("works without userId (undefined)", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({ auctionId: "a6", userName: "Eve", type: "NOTICE" });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: "a6" },
      { $push: { logs: { userId: undefined, userName: "Eve", type: "NOTICE", details: {} } } },
      { upsert: true }
    );
  });

  it("handles multiple calls and different auctionIds", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValue({});

    await logAuctionEvent({ auctionId: "a7", userId: "u7", userName: "G", type: "T1" });
    await logAuctionEvent({ auctionId: "a8", userId: "u8", userName: "H", type: "T2" });

    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(AuctionLog.findOneAndUpdate.mock.calls[0][0]).toEqual({ auctionId: "a7" });
    expect(AuctionLog.findOneAndUpdate.mock.calls[1][0]).toEqual({ auctionId: "a8" });
  });

  it("does not throw and logs error when AuctionLog.findOneAndUpdate throws", async () => {
    const error = new Error("db fail");
    AuctionLog.findOneAndUpdate.mockRejectedValueOnce(error);

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(logAuctionEvent({ auctionId: "ax", userId: "ux", userName: "X", type: "ERR" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith("Error logging auction event:", error.message);
    spy.mockRestore();
  });

  it("always sets upsert true in options", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});

    await logAuctionEvent({ auctionId: "a9", userId: "u9", userName: "I", type: "UP" });

    const opts = AuctionLog.findOneAndUpdate.mock.calls[0][2];
    expect(opts).toEqual({ upsert: true });
  });

  it("preserves the provided type string", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});
    await logAuctionEvent({ auctionId: "a10", userId: "u10", userName: "J", type: "AUCTION_EXTENDED" });

    const pushObj = AuctionLog.findOneAndUpdate.mock.calls[0][1].$push.logs;
    expect(pushObj.type).toBe("AUCTION_EXTENDED");
  });

  it("returns undefined on success", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});
    const res = await logAuctionEvent({ auctionId: "a11", userId: "u11", userName: "K", type: "OK" });
    expect(res).toBeUndefined();
  });

  it("accepts falsy auctionId and still calls findOneAndUpdate", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});
    await logAuctionEvent({ auctionId: undefined, userId: "u12", userName: "L", type: "F" });
    expect(AuctionLog.findOneAndUpdate).toHaveBeenCalledWith(
      { auctionId: undefined },
      { $push: { logs: { userId: "u12", userName: "L", type: "F", details: {} } } },
      { upsert: true }
    );
  });

  it("does not call console.error on successful write", async () => {
    AuctionLog.findOneAndUpdate.mockResolvedValueOnce({});
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await logAuctionEvent({ auctionId: "a13", userId: "u13", userName: "M", type: "S" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
