import Auction from "../../models/Auction.js";
import { validateBid, validateAutoBid } from "../../middleware/bidValidMiddleware.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockAuction = Auction;
const baseAuction = {
  _id: "a1",
  currentBid: 150,
  startingPrice: 100,
  minIncrement: 10,
  createdBy: { toString: () => "seller" },
};

const buildReq = (overrides = {}) =>
  createMockReq({
    params: { auctionId: "auction" },
    body: { amount: 200, maxLimit: 250, ...overrides.body },
    user: { _id: "buyer" },
    ...overrides,
  });

describe("validateBid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when the auction is missing", async () => {
    mockAuction.findById.mockResolvedValueOnce(null);
    const res = createMockRes();

    await validateBid(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("requires numeric amounts", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();

    await validateBid(buildReq({ body: { amount: "hi" } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires positive amounts", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();

    await validateBid(buildReq({ body: { amount: 0 } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires bids above current and starting price", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();

    await validateBid(buildReq({ body: { amount: 120 } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires bids to respect the min increment", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();

    await validateBid(buildReq({ body: { amount: 155 } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("prevents sellers from bidding on their auctions", async () => {
    mockAuction.findById.mockResolvedValueOnce({
      ...baseAuction,
      createdBy: { toString: () => "buyer" },
    });
    const res = createMockRes();

    await validateBid(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("calls next for valid bids", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();
    const next = jest.fn();

    await validateBid(buildReq({ body: { amount: 170 } }), res, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 500 when the lookup fails", async () => {
    mockAuction.findById.mockRejectedValueOnce(new Error("db"));
    const res = createMockRes();

    await validateBid(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("validateAutoBid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires numeric limits", async () => {
    const res = createMockRes();

    await validateAutoBid(buildReq({ body: { maxLimit: "bad" } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when the auction is missing", async () => {
    mockAuction.findById.mockResolvedValueOnce(null);
    const res = createMockRes();

    await validateAutoBid(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("prevents sellers from creating auto-bids", async () => {
    mockAuction.findById.mockResolvedValueOnce({
      ...baseAuction,
      createdBy: { toString: () => "buyer" },
    });
    const res = createMockRes();

    await validateAutoBid(buildReq({ body: { maxLimit: 500 } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("ensures the max limit beats the current bid + increment", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();

    await validateAutoBid(buildReq({ body: { maxLimit: 155 } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("calls next when validations pass", async () => {
    mockAuction.findById.mockResolvedValueOnce(baseAuction);
    const res = createMockRes();
    const next = jest.fn();

    await validateAutoBid(buildReq({ body: { maxLimit: 300 } }), res, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 500 on failures", async () => {
    mockAuction.findById.mockRejectedValueOnce(new Error("boom"));
    const res = createMockRes();

    await validateAutoBid(buildReq({ body: { maxLimit: 400 } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
