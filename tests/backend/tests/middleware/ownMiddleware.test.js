import Auction from "../../models/Auction.js";
import { validateAuctionOwnership } from "../../middleware/ownMiddleware.js";
import { createMockReq, createMockRes } from "../utils/httpMocks.js";

jest.mock("../../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({ lean: jest.fn() }),
  },
}));

const mockAuctionModel = Auction;

describe("validateAuctionOwnership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an auction id parameter", async () => {
    const res = createMockRes();

    await validateAuctionOwnership(createMockReq({ params: {} }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires authentication", async () => {
    const res = createMockRes();

    await validateAuctionOwnership(
      createMockReq({ params: { auctionId: "a1" }, user: null }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when the auction is missing", async () => {
    mockAuctionModel.findById.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) });
    const res = createMockRes();

    await validateAuctionOwnership(
      createMockReq({ params: { auctionId: "a1" }, user: { _id: "owner" } }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects when the user is not the owner", async () => {
    mockAuctionModel.findById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({ _id: "a1", createdBy: "other" }),
    });
    const res = createMockRes();

    await validateAuctionOwnership(
      createMockReq({ params: { auctionId: "a1" }, user: { _id: "owner" } }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("attaches the auction when the user owns it", async () => {
    const auction = { _id: "a1", createdBy: { toString: () => "owner" } };
    mockAuctionModel.findById.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(auction) });
    const req = createMockReq({ params: { auctionId: "a1" }, user: { _id: "owner" } });
    const res = createMockRes();
    const next = jest.fn();

    await validateAuctionOwnership(req, res, next);

    expect(req.auction).toEqual(auction);
    expect(next).toHaveBeenCalled();
  });

  it("returns 400 when the database call throws", async () => {
    mockAuctionModel.findById.mockReturnValueOnce({
      lean: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const res = createMockRes();

    await validateAuctionOwnership(
      createMockReq({ params: { auctionId: "a1" }, user: { _id: "owner" } }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
