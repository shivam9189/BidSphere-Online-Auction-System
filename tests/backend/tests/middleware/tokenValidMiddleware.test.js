import Auction from "../../models/Auction.js";
import { validateRegistration } from "../../middleware/tokenValidMiddleware.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockAuctionModel = Auction;

const buildReq = (overrides = {}) =>
  createMockReq({
    params: { auctionId: "a1" },
    user: { _id: "user1" },
    ...overrides,
  });

describe("validateRegistration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when the auction is missing", async () => {
    mockAuctionModel.findById.mockResolvedValueOnce(null);
    const res = createMockRes();

    await validateRegistration(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects when the user has not registered", async () => {
    mockAuctionModel.findById.mockResolvedValueOnce({
      registrations: [{ _id: "other" }],
    });
    const res = createMockRes();

    await validateRegistration(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("User not registered") })
    );
  });

  it("calls next when the user is registered", async () => {
    mockAuctionModel.findById.mockResolvedValueOnce({
      registrations: [{ _id: { toString: () => "user1" } }],
    });
    const res = createMockRes();
    const next = jest.fn();

    await validateRegistration(buildReq(), res, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 500 when database lookup throws", async () => {
    mockAuctionModel.findById.mockRejectedValueOnce(new Error("db"));
    const res = createMockRes();

    await validateRegistration(buildReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
