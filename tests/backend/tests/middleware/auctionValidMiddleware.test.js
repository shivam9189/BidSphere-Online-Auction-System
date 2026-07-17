import {
  validateCreateAuction,
  validateUpdateAuction,
  validateObjectIdParam,
  ensureBeforeStart,
} from "../../middleware/auctionValidMiddleware.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";
import { isValidObjectId } from "mongoose";

jest.mock("mongoose", () => ({
  __esModule: true,
  isValidObjectId: jest.fn(),
}));

const buildBaseAuctionBody = (overrides = {}) => ({
  title: "Vintage Clock",
  name: "Clock",
  startingPrice: 100,
  minIncrement: 10,
  startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

describe("validateCreateAuction", () => {
  it("passes with a valid payload", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ buyItNowPrice: 150 }) });
    const res = createMockRes();
    const next = jest.fn();

    validateCreateAuction(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows auctions without a buy-it-now price", () => {
    const req = createMockReq({ body: buildBaseAuctionBody() });
    const res = createMockRes();
    const next = jest.fn();

    validateCreateAuction(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("requires a title", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ title: "" }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires an item name", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ name: null }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("validates starting price", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ startingPrice: -1 }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("startingPrice") })
    );
  });

  it("validates min increment", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ minIncrement: 0 }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires start and end times", () => {
    const { endTime, ...rest } = buildBaseAuctionBody();
    const req = createMockReq({ body: rest });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects invalid dates", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ startTime: "bad", endTime: "also" }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid startTime or endTime" })
    );
  });

  it("rejects when end time is before start time", () => {
    const req = createMockReq({
      body: buildBaseAuctionBody({
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "endTime must be after startTime" })
    );
  });

  it("validates buyItNowPrice positivity", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ buyItNowPrice: 0 }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "buyItNowPrice must be a positive number" })
    );
  });

  it("requires buyItNowPrice to exceed starting price", () => {
    const req = createMockReq({ body: buildBaseAuctionBody({ buyItNowPrice: 50 }) });
    const res = createMockRes();

    validateCreateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "buyItNowPrice must be greater than startingPrice" })
    );
  });
});

describe("validateUpdateAuction", () => {
  it("rejects unknown fields", () => {
    const req = createMockReq({ body: { unexpected: true } });
    const res = createMockRes();

    validateUpdateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects invalid start/end combinations", () => {
    const req = createMockReq({
      body: {
        title: "ok",
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 60 * 1000).toISOString(),
      },
    });
    const res = createMockRes();

    validateUpdateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("endTime") })
    );
  });

  it("validates single date fields", () => {
    const req = createMockReq({ body: { title: "ok", startTime: "not-a-date" } });
    const res = createMockRes();

    validateUpdateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid date provided" })
    );
  });

  it("validates single endTime values", () => {
    const req = createMockReq({ body: { title: "ok", endTime: "nope" } });
    const res = createMockRes();

    validateUpdateAuction(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid date provided" })
    );
  });

  it("validates numeric fields", () => {
    const res1 = createMockRes();
    validateUpdateAuction(
      createMockReq({ body: { title: "ok", startingPrice: -1 } }),
      res1,
      jest.fn()
    );
    expect(res1.status).toHaveBeenCalledWith(400);

    const res2 = createMockRes();
    validateUpdateAuction(
      createMockReq({ body: { title: "ok", minIncrement: 0 } }),
      res2,
      jest.fn()
    );
    expect(res2.status).toHaveBeenCalledWith(400);

    const res3 = createMockRes();
    validateUpdateAuction(
      createMockReq({ body: { title: "ok", buyItNowPrice: "bad" } }),
      res3,
      jest.fn()
    );
    expect(res3.status).toHaveBeenCalledWith(400);
  });

  it("requires images to be arrays", () => {
    const req = createMockReq({ body: { title: "ok", images: "no" } });
    const res = createMockRes();

    validateUpdateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("validates condition values", () => {
    const req = createMockReq({ body: { title: "ok", condition: "used" } });
    const res = createMockRes();

    validateUpdateAuction(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("accepts whitelisted condition values", () => {
    const req = createMockReq({ body: { title: "ok", condition: "good" } });
    const res = createMockRes();
    const next = jest.fn();

    validateUpdateAuction(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows valid buyItNowPrice updates", () => {
    const req = createMockReq({ body: { title: "ok", buyItNowPrice: 250 } });
    const res = createMockRes();
    const next = jest.fn();

    validateUpdateAuction(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("accepts updates when start and end times are valid", () => {
    const req = createMockReq({
      body: {
        title: "ok",
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      },
    });
    const res = createMockRes();
    const next = jest.fn();

    validateUpdateAuction(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("passes valid updates", () => {
    const req = createMockReq({
      body: {
        title: "Updated",
        description: "text",
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
    const res = createMockRes();
    const next = jest.fn();

    validateUpdateAuction(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe("validateObjectIdParam", () => {
  const middleware = validateObjectIdParam("auctionId");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects invalid ids", () => {
    isValidObjectId.mockReturnValueOnce(false);
    const req = createMockReq({ params: { auctionId: "bad" } });
    const res = createMockRes();

    middleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("passes valid ids", () => {
    isValidObjectId.mockReturnValueOnce(true);
    const req = createMockReq({ params: { auctionId: "507f1f77bcf86cd799439011" } });
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe("ensureBeforeStart", () => {
  it("requires the auction to be loaded", () => {
    const res = createMockRes();

    ensureBeforeStart()(createMockReq({}), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects once the auction has started", () => {
    const req = createMockReq({ auction: { startTime: new Date(Date.now() - 1000).toISOString() } });
    const res = createMockRes();

    ensureBeforeStart()(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("enforces minimum days before start", () => {
    const start = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const req = createMockReq({ auction: { startTime: start } });
    const res = createMockRes();

    ensureBeforeStart(2)(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("allows operations before the deadline", () => {
    const start = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const req = createMockReq({ auction: { startTime: start } });
    const res = createMockRes();
    const next = jest.fn();

    ensureBeforeStart(2)(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows operations when no buffer is required", () => {
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const req = createMockReq({ auction: { startTime: start } });
    const res = createMockRes();
    const next = jest.fn();

    ensureBeforeStart()(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
