import { jest } from "@jest/globals";

let startRegistrationStatusJob;
let stopRegistrationStatusJob;
let getRegistrationJobStatus;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const scheduledJobs = [];
const mockCron = {
  schedule: jest.fn(),
  validate: jest.fn(),
};
const mockAuctionModel = {
  find: jest.fn(),
  bulkWrite: jest.fn(),
};

const buildQueryChain = (data) => ({
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(data),
});

const runScheduledJob = async (index = 0) => {
  const jobEntry = scheduledJobs[index];
  if (!jobEntry) {
    throw new Error("No scheduled job captured");
  }
  await jobEntry.handler();
};

async function loadJobModule() {
  jest.resetModules();
  scheduledJobs.length = 0;

  mockCron.schedule.mockReset();
  mockCron.validate.mockReset();
  mockCron.schedule.mockImplementation((pattern, handler, options) => {
    const job = { stop: jest.fn() };
    scheduledJobs.push({ pattern, handler, options, job });
    return job;
  });
  mockCron.validate.mockReturnValue(true);

  mockAuctionModel.find.mockReset();
  mockAuctionModel.bulkWrite.mockReset();

  jest.doMock("node-cron", () => ({
    __esModule: true,
    default: mockCron,
  }));

  jest.doMock("../models/Auction.js", () => ({
    __esModule: true,
    default: mockAuctionModel,
  }));

  const mod = await import("../jobs/au-registrationStatusJob.js");
  startRegistrationStatusJob = mod.startRegistrationStatusJob;
  stopRegistrationStatusJob = mod.stopRegistrationStatusJob;
  getRegistrationJobStatus = mod.getRegistrationJobStatus;
}

beforeEach(async () => {
  await loadJobModule();
});

afterEach(() => {
  if (stopRegistrationStatusJob) {
    stopRegistrationStatusJob();
  }
});

describe("startRegistrationStatusJob", () => {
  it("throws when cron pattern invalid", () => {
    mockCron.validate.mockReturnValueOnce(false);

    expect(() => startRegistrationStatusJob({ cronPattern: "bad" })).toThrow(
      "Invalid cron pattern: bad"
    );
    expect(mockCron.schedule).not.toHaveBeenCalled();
  });

  it("schedules a job with provided cron pattern", () => {
    startRegistrationStatusJob({ cronPattern: "*/5 * * * *", runOnStart: false });

    expect(mockCron.validate).toHaveBeenCalledWith("*/5 * * * *");
    expect(mockCron.schedule).toHaveBeenCalledWith(
      "*/5 * * * *",
      expect.any(Function),
      expect.objectContaining({ timezone: "UTC" })
    );
    expect(getRegistrationJobStatus()).toEqual({ running: true, processing: false });
  });

  it("does not schedule twice if already running", () => {
    startRegistrationStatusJob({ runOnStart: false });
    startRegistrationStatusJob({ runOnStart: false });

    expect(mockCron.schedule).toHaveBeenCalledTimes(1);
  });

  it("runs the initial sync when defaults are used", async () => {
    mockAuctionModel.find.mockReturnValueOnce(buildQueryChain([]));

    startRegistrationStatusJob();
    await flushPromises();

    expect(mockCron.validate).toHaveBeenCalledWith("*/1 * * * *");
    expect(mockAuctionModel.find).toHaveBeenCalledTimes(1);
  });

  it("skips the initial sync when runOnStart is false", async () => {
    startRegistrationStatusJob({ runOnStart: false });
    await flushPromises();

    expect(mockAuctionModel.find).not.toHaveBeenCalled();
  });
});

describe("stopRegistrationStatusJob", () => {
  it("stops existing cron job and clears status", () => {
    startRegistrationStatusJob({ runOnStart: false });
    const [job] = scheduledJobs;

    stopRegistrationStatusJob();

    expect(job.job.stop).toHaveBeenCalledTimes(1);
    expect(getRegistrationJobStatus()).toEqual({ running: false, processing: false });
  });

  it("is a no-op when no cron job is running", () => {
    expect(() => stopRegistrationStatusJob()).not.toThrow();
    expect(getRegistrationJobStatus()).toEqual({ running: false, processing: false });
  });
});

describe("updateRegistrationWindows via scheduler", () => {
  it("exits early when already processing", async () => {
    mockAuctionModel.find.mockReturnValue(buildQueryChain([]));
    startRegistrationStatusJob({ runOnStart: false });
    const handler = scheduledJobs[0].handler;

    const firstRun = handler();
    const secondRun = handler();

    await Promise.all([firstRun, secondRun]);

    expect(mockAuctionModel.find).toHaveBeenCalledTimes(1);
  });

  it("processes batches and skips when list empty", async () => {
    mockAuctionModel.find.mockReturnValueOnce(buildQueryChain([]));
    startRegistrationStatusJob({ runOnStart: false });

    await runScheduledJob();

    expect(mockAuctionModel.bulkWrite).not.toHaveBeenCalled();
  });

  it("updates auctions when registration flag differs", async () => {
    const now = Date.now();
    const start = new Date(now + 60 * 60 * 1000);
    const end = new Date(now + 2 * 60 * 60 * 1000);
    const record = { _id: "1", startTime: start, endTime: end, isRegistrationOpen: false };
    mockAuctionModel.find.mockReturnValueOnce(buildQueryChain([record])).mockReturnValueOnce(buildQueryChain([]));
    mockAuctionModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockAuctionModel.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { _id: "1" },
            update: { $set: { isRegistrationOpen: true } },
          },
        },
      ],
      { ordered: false }
    );
  });

  it("does not send updates when flags already correct", async () => {
    const now = Date.now();
    const start = new Date(now + 60 * 60 * 1000);
    const end = new Date(now + 2 * 60 * 60 * 1000);
    const record = { _id: "1", startTime: start, endTime: end, isRegistrationOpen: true };
    mockAuctionModel.find.mockReturnValueOnce(buildQueryChain([record])).mockReturnValueOnce(buildQueryChain([]));

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockAuctionModel.bulkWrite).not.toHaveBeenCalled();
  });

  it("handles multiple batches when batch size reached", async () => {
    const now = Date.now();
    const baseStart = new Date(now + 60 * 60 * 1000);
    const baseEnd = new Date(now + 3 * 60 * 60 * 1000);
    const fullBatch = Array.from({ length: 500 }, (_, idx) => ({
      _id: String(idx),
      startTime: baseStart,
      endTime: baseEnd,
      isRegistrationOpen: false,
    }));
    mockAuctionModel.find
      .mockReturnValueOnce(buildQueryChain(fullBatch))
      .mockReturnValueOnce(buildQueryChain([{ _id: "extra", startTime: baseStart, endTime: baseEnd, isRegistrationOpen: false }]))
      .mockReturnValueOnce(buildQueryChain([]));
    mockAuctionModel.bulkWrite.mockResolvedValue({ modifiedCount: 10 });

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockAuctionModel.find).toHaveBeenCalledTimes(2);
    expect(mockAuctionModel.bulkWrite).toHaveBeenCalledTimes(2);
  });

  it("logs and continues when bulkWrite throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const now = Date.now();
    const start = new Date(now + 60 * 60 * 1000);
    const end = new Date(now + 2 * 60 * 60 * 1000);
    mockAuctionModel.find
      .mockReturnValueOnce(buildQueryChain([{ _id: "1", startTime: start, endTime: end, isRegistrationOpen: false }]))
      .mockReturnValueOnce(buildQueryChain([]));
    mockAuctionModel.bulkWrite.mockRejectedValue(new Error("boom"));

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(consoleSpy).toHaveBeenCalledWith("[RegistrationJob] Error:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("resets processing flag after errors", async () => {
    mockAuctionModel.find.mockImplementation(() => {
      throw new Error("fail");
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(getRegistrationJobStatus().processing).toBe(false);
    consoleSpy.mockRestore();
  });

  it("reports processing state while handler is running", async () => {
    let resolveLean;
    const pendingPromise = new Promise((resolve) => {
      resolveLean = resolve;
    });
    mockAuctionModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue(pendingPromise),
    });

    startRegistrationStatusJob({ runOnStart: false });
    const handlerPromise = runScheduledJob();
    await flushPromises();
    expect(getRegistrationJobStatus().processing).toBe(true);

    resolveLean([]);
    await handlerPromise;
    expect(getRegistrationJobStatus().processing).toBe(false);
  });

  it("prevents overlapping runs", async () => {
    let resolveLean;
    const pendingPromise = new Promise((resolve) => {
      resolveLean = resolve;
    });
    mockAuctionModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue(pendingPromise),
    });

    startRegistrationStatusJob({ runOnStart: false });
    const handler = scheduledJobs[0].handler;
    const firstRun = handler();
    await flushPromises();
    const secondRun = handler();

    resolveLean([]);
    await Promise.all([firstRun, secondRun]);
    expect(mockAuctionModel.find).toHaveBeenCalledTimes(1);
  });

  it("handles auctions closing registration window", async () => {
    const now = Date.now();
    const start = new Date(now - 2 * 60 * 60 * 1000);
    const end = new Date(now + 2 * 60 * 1000);
    const record = { _id: "close", startTime: start, endTime: end, isRegistrationOpen: true };
    mockAuctionModel.find.mockReturnValueOnce(buildQueryChain([record])).mockReturnValueOnce(buildQueryChain([]));
    mockAuctionModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockAuctionModel.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { _id: "close" },
            update: { $set: { isRegistrationOpen: false } },
          },
        },
      ],
      { ordered: false }
    );
  });

  it("propagates console.error when updateRegistrationWindows throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockAuctionModel.find.mockImplementation(() => {
      throw new Error("db down");
    });

    startRegistrationStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(consoleSpy).toHaveBeenCalledWith("[RegistrationJob] Error:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
