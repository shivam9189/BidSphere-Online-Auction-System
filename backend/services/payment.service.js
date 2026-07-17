import Auction from "../models/Auction.js";
import dotenv from "dotenv";
dotenv.config();

export async function generateUpiLink(auctionId, registrationFees) {
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new Error("Auction not found");
  }

  const upiId = process.env.PAYMENT_UPI_ID;

  const params = new URLSearchParams({
    pa: upiId,
    am: registrationFees.toString(),
    cu: "INR",
  }); 

  const upiLink = `upi://pay?${params.toString()}`;
  return upiLink;
}

