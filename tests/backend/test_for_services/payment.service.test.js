import { jest } from "@jest/globals";

// Mock the Auction model before importing the service
jest.mock("../models/Auction.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import Auction from "../models/Auction.js";
import { generateUpiLink } from "../services/payment.service.js";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PAYMENT_UPI_ID = "test@upi";
});

afterAll(() => {
  delete process.env.PAYMENT_UPI_ID;
});

describe("generateUpiLink", () => {
  it("throws when auction not found", async () => {
    Auction.findById.mockResolvedValueOnce(null);
    await expect(generateUpiLink("auc1", 100)).rejects.toThrow("Auction not found");
    expect(Auction.findById).toHaveBeenCalledWith("auc1");
  });

  it("returns a valid upi link for integer registration fee", async () => {
    Auction.findById.mockResolvedValueOnce({ _id: "auc2" });
    const link = await generateUpiLink("auc2", 150);
    const url = new URL(link);
    expect(url.protocol).toBe("upi:");
    // custom scheme places 'pay' as the hostname
    expect(url.hostname).toBe("pay");
    const params = new URLSearchParams(url.search);
    expect(params.get("pa")).toBe("test@upi");
    expect(params.get("am")).toBe("150");
    expect(params.get("cu")).toBe("INR");
  });

  it("returns link for decimal registration fee", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("x", 12.34);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("am")).toBe("12.34");
  });

  it("handles zero registration fee", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("x0", 0);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("am")).toBe("0");
  });

  it("handles negative registration fee (still stringified)", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("neg", -50);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("am")).toBe("-50");
  });

  it("uses PAYMENT_UPI_ID env var in pa param", async () => {
    process.env.PAYMENT_UPI_ID = "myupi@bank";
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("u1", 1);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("pa")).toBe("myupi@bank");
  });

  it("calls Auction.findById with provided auctionId", async () => {
    Auction.findById.mockResolvedValueOnce({});
    await generateUpiLink("auction-xyz", 10);
    expect(Auction.findById).toHaveBeenCalledWith("auction-xyz");
  });

  it("handles registrationFees passed as string", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("s1", "99.99");
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("am")).toBe("99.99");
  });

  it("encodes special characters in PAYMENT_UPI_ID", async () => {
    process.env.PAYMENT_UPI_ID = "user+test@bank.co.in";
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("e1", 5);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("pa")).toBe("user+test@bank.co.in");
  });

  it("works for very large registrationFees", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const big = 1e12;
    const link = await generateUpiLink("big", big);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("am")).toBe(big.toString());
  });

  it("returns only expected query keys", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("k1", 7);
    const params = new URLSearchParams(new URL(link).search);
    const keys = Array.from(params.keys()).sort();
    expect(keys).toEqual(["am", "cu", "pa"].sort());
  });

  it("includes IN R currency code exactly 'INR'", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("r1", 8);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("cu")).toBe("INR");
  });

  it("reflects updated env var between calls", async () => {
    Auction.findById.mockResolvedValue({});
    process.env.PAYMENT_UPI_ID = "first@upi";
    const link1 = await generateUpiLink("c1", 1);
    process.env.PAYMENT_UPI_ID = "second@upi";
    const link2 = await generateUpiLink("c2", 2);
    const pa1 = new URLSearchParams(new URL(link1).search).get("pa");
    const pa2 = new URLSearchParams(new URL(link2).search).get("pa");
    expect(pa1).toBe("first@upi");
    expect(pa2).toBe("second@upi");
  });

  it("behaves when PAYMENT_UPI_ID is missing (pa becomes 'undefined')", async () => {
    delete process.env.PAYMENT_UPI_ID;
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("noenv", 3);
    const params = new URLSearchParams(new URL(link).search);
    expect(params.get("pa")).toBe("undefined");
  });

  it("always returns a string starting with 'upi://pay?'", async () => {
    Auction.findById.mockResolvedValueOnce({});
    const link = await generateUpiLink("start", 11);
    expect(typeof link).toBe("string");
    expect(link.startsWith("upi://pay?")).toBe(true);
  });
});
