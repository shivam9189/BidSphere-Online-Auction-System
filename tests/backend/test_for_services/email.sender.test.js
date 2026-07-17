import { jest } from "@jest/globals";

// Mock all email templates used by the service
jest.mock("../email-templates/verify_email.template.js", () => ({
  __esModule: true,
  Verification_Email_Template: "Code:{verificationCode}",
}));

jest.mock("../email-templates/welcome_email.template.js", () => ({
  __esModule: true,
  Welcome_Email_Template: "Welcome,{name}",
}));

jest.mock("../email-templates/outbid_email.template.js", () => ({
  __esModule: true,
  Outbid_Email_Template: "Item:{itemName}|Title:{auctionTitle}|Bid:{currentBid}|Max:{maxLimit}|IDs:{auctionId}-{auctionId}",
}));

jest.mock("../email-templates/restPwd_email.template.js", () => ({
  __esModule: true,
  Reset_Password_Email_Template: "Reset:{resetLink}",
}));

jest.mock("../email-templates/auctionWinner_email.template.js", () => ({
  __esModule: true,
  Auction_Winner_Email_Template: "Winner:{name}|Auction:{auctionName}",
}));

jest.mock("../email-templates/cod_email.template.js", () => ({
  __esModule: true,
  COD_Selected_Email_Template: "COD:{name}|{auctionName}",
}));

jest.mock("../email-templates/upi_email.template.js", () => ({
  __esModule: true,
  UPI_Selected_Email_Template: "UPI:{name}|{auctionName}|{upiLink}|{amount}|{qrCode}",
}));

jest.mock("../email-templates/paymentVerification_email.template.js", () => ({
  __esModule: true,
  Payment_Verified_Email_Template: "Paid:{name}|{auctionName}",
}));

jest.mock("../email-templates/paymentRejection_email.template.js", () => ({
  __esModule: true,
  Payment_Rejection_Template: "Reject:{reason}",
}));

jest.mock("../email-templates/paymentVerifyRequest_email.template.js", () => ({
  __esModule: true,
  PAYMENT_Verification_Request_Sent_Template: "VerifyReq:{name}|{auctionName}|{reqFor}",
}));

// QRCode mock
jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toBuffer: jest.fn(),
  },
}));

// Mock the actual transporter so it doesn't try to verify SMTP during tests
jest.mock("../services/email.transporter.js", () => ({
  __esModule: true,
  default: {
    verify: jest.fn((cb) => cb && cb(null, true)),
    sendMail: jest.fn().mockResolvedValue({}),
  },
}));

// We'll set global.fetch in beforeEach so the module under test uses the mock

let service;
let fetchMock;
let QRCode;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.resetModules();

  // set required env vars
  process.env.BREVO_API_KEY = "test-api-key";
  process.env.BREVO_FROM_EMAIL = "from@example.com";

  // mock global fetch
  fetchMock = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue({ status: "ok" }) });
  global.fetch = fetchMock;

  // import QRCode mock
  const qr = await import("qrcode");
  QRCode = qr.default;

  service = await import("../services/email.sender.js");
});

afterAll(() => {
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_FROM_EMAIL;
  delete global.fetch;
});

describe("email.sender service", () => {
  it("SendVerificationCode - sends POST with verification code", async () => {
    const spyLog = jest.spyOn(console, "log").mockImplementation(() => {});
    await service.SendVerificationCode("a@b.com", "12345");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const body = JSON.parse(opts.body);
    expect(body.sender.email).toBe(process.env.BREVO_FROM_EMAIL);
    expect(body.htmlContent).toContain("12345");
    spyLog.mockRestore();
  });

  it("SendVerificationCode - fetch rejects -> function catches and logs", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendVerificationCode("x@x.com", "999")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("WelcomeEmail - sends welcome email with name replaced", async () => {
    await service.WelcomeEmail("u@u.com", "John");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("John");
  });

  it("WelcomeEmail - fetch error is swallowed and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.WelcomeEmail("u@u.com", "J")) .resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendOutBidEmail - replaces placeholders and calls fetch with correct subject", async () => {
    await service.SendOutBidEmail("b@b.com", "Phone", 100, 200, "auc123", "TitleX");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const opts = fetchMock.mock.calls[0][1];
    const body = JSON.parse(opts.body);
    expect(body.subject).toContain("Phone");
    expect(body.htmlContent).toContain("auc123");
    // ensure replaceAll worked (two occurrences in template)
    expect(body.htmlContent.split("auc123").length).toBeGreaterThan(1);
  });

  it("SendResetPwdEmail - includes reset link in htmlContent", async () => {
    await service.SendResetPwdEmail("r@r.com", "http://reset/1");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("http://reset/1");
  });

  it("SendAuctionWinnerEmail - includes winner name and auctionName", async () => {
    await service.SendAuctionWinnerEmail("w@w.com", "WinnerName", "Auction1");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("WinnerName");
    expect(body.htmlContent).toContain("Auction1");
  });

  it("SendCODSelectedEmail - includes name and auctionName", async () => {
    await service.SendCODSelectedEmail("c@c.com", "Seller", "Auction2");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("Seller");
    expect(body.htmlContent).toContain("Auction2");
  });

  it("SendUPISelectedEmail - generates QR, includes base64 attachment", async () => {
    const buf = Buffer.from("qrcontent");
    QRCode.toBuffer.mockResolvedValueOnce(buf);

    await service.SendUPISelectedEmail("u@u.com", "Name", "Auction3", "upi://pay", 500);

    expect(QRCode.toBuffer).toHaveBeenCalledWith("upi://pay");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.attachment).toBeDefined();
    expect(body.attachment[0].content).toBe(buf.toString("base64"));
  });

  it("SendUPISelectedEmail - QRCode failure is caught and logged", async () => {
    QRCode.toBuffer.mockRejectedValueOnce(new Error("qrfail"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendUPISelectedEmail("u@u.com", "N", "A", "link", 10)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // error branches for other functions to increase coverage
  it("SendOutBidEmail - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendOutBidEmail("b@b.com", "Phone", 1, 2, "id", "T")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendResetPwdEmail - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr2"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendResetPwdEmail("r@r.com", "link")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendAuctionWinnerEmail - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr3"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendAuctionWinnerEmail("w@w.com", "Name", "A")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendCODSelectedEmail - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr4"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendCODSelectedEmail("c@c.com", "Name", "A")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendPaymentVerifiedEmail - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr5"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendPaymentVerifiedEmail("p@p.com", "P", "A")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendPaymentRejection - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr6"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendPaymentRejection("e@e.com", "r")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendPaymentVerificationRequestSent - fetch rejection is caught and logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("neterr7"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(service.SendPaymentVerificationRequestSent("q@q.com", "N", "A", "req")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendSellerWinnerNotification - success when template present", async () => {
    // Re-mock the seller template and re-import the module to exercise success path
    jest.resetModules();
    jest.doMock("../email-templates/sellerNotification_email.template.js", () => ({
      __esModule: true,
      Seller_Winner_Notification_Template: "Seller:{sellerName}|{winnerName}|{auctionName}|{saleAmount}|{listingFee}|{netEarnings}|{address}",
    }));

    // ensure envs
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_FROM_EMAIL = "from@example.com";

    const fetchMock2 = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue({ status: "ok" }) });
    global.fetch = fetchMock2;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const svc = await import("../services/email.sender.js");
    await svc.SendSellerWinnerNotification("s@s.com", "seller", "winner", "AuctionX", 100, 2, 98, "addr");

    expect(fetchMock2).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "Seller Auction Sold email sent:",
      { status: "ok" }
    );
    logSpy.mockRestore();
  });

  it("SendSellerWinnerNotification - another success path (fresh import)", async () => {
    jest.resetModules();
    jest.doMock("../email-templates/sellerNotification_email.template.js", () => ({
      __esModule: true,
      Seller_Winner_Notification_Template: "Seller:{sellerName}|{winnerName}|{auctionName}|{saleAmount}|{listingFee}|{netEarnings}|{address}",
    }));

    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_FROM_EMAIL = "from@example.com";

    const fetchMock3 = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue({ status: "ok" }) });
    global.fetch = fetchMock3;

    const svc2 = await import("../services/email.sender.js");
    await svc2.SendSellerWinnerNotification("s2@s.com", "seller2", "winner2", "AuctionY", 200, 5, 195, "addr2");

    expect(fetchMock3).toHaveBeenCalled();
  });

  it("SendPaymentVerifiedEmail - sends payment verified email", async () => {
    await service.SendPaymentVerifiedEmail("p@p.com", "PName", "Auction4");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("PName");
  });

  it("SendPaymentRejection - sends rejection reason", async () => {
    await service.SendPaymentRejection("e@e.com", "Insufficient funds");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("Insufficient funds");
  });

  it("SendPaymentVerificationRequestSent - includes reqFor replacement", async () => {
    await service.SendPaymentVerificationRequestSent("q@q.com", "QName", "AuctionQ", "identity");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain("identity");
  });

  it("SendSellerWinnerNotification - missing template triggers catch and logs error", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    // The service references Seller_Winner_Notification_Template which isn't imported
    // This should cause an exception inside the try and be caught
    await expect(
      service.SendSellerWinnerNotification("s@s.com", "seller", "winner", "A", 100, 5, 95, "addr")
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SendSellerWinnerNotification - fetch rejection logs error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("sellerfail"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      service.SendSellerWinnerNotification("err@s.com", "seller", "winner", "AuctionZ", 123, 4, 119, "addr")
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      "Error sending seller auction sold email:",
      expect.any(Error)
    );
    spy.mockRestore();
  });

  it("multiple functions include BREVO api-key header in fetch", async () => {
    await service.WelcomeEmail("h@h.com", "H");
    await service.SendOutBidEmail("b@b.com", "I", 1, 2, "id1", "T");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      const headers = call[1].headers;
      expect(headers["api-key"]).toBe(process.env.BREVO_API_KEY);
    }
  });
});
