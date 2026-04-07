import { jest } from "@jest/globals";

let startPaymentStatusJob;
let stopPaymentStatusJob;
let getPaymentJobStatus;

const scheduledJobs = [];
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const mockCron = {
  schedule: jest.fn(),
  validate: jest.fn(),
};

const mockPaymentModel = {
  find: jest.fn(),
  updateMany: jest.fn(),
};

const buildPaymentQuery = (data) => ({
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

  mockPaymentModel.find.mockReset();
  mockPaymentModel.updateMany.mockReset();

  jest.doMock("node-cron", () => ({
    __esModule: true,
    default: mockCron,
  }));

  jest.doMock("../models/Payment.js", () => ({
    __esModule: true,
    default: mockPaymentModel,
  }));

  const mod = await import("../jobs/paymentStatusJob.js");
  startPaymentStatusJob = mod.startPaymentStatusJob;
  stopPaymentStatusJob = mod.stopPaymentStatusJob;
  getPaymentJobStatus = mod.getPaymentJobStatus;
}

beforeEach(async () => {
  await loadJobModule();
});

afterEach(() => {
  if (stopPaymentStatusJob) {
    stopPaymentStatusJob();
  }
});

describe("startPaymentStatusJob", () => {
  it("throws on invalid cron pattern", () => {
    mockCron.validate.mockReturnValueOnce(false);

    expect(() => startPaymentStatusJob({ cronPattern: "bad" })).toThrow(
      "Invalid cron pattern: bad"
    );
    expect(mockCron.schedule).not.toHaveBeenCalled();
  });

  it("schedules cron with defaults", () => {
    startPaymentStatusJob({ runOnStart: false });

    expect(mockCron.validate).toHaveBeenCalledWith("0 0 * * *");
    expect(mockCron.schedule).toHaveBeenCalledWith(
      "0 0 * * *",
      expect.any(Function),
      expect.objectContaining({ timezone: "UTC" })
    );
    expect(getPaymentJobStatus()).toEqual({ running: true, processing: false });
  });

  it("prevents duplicate scheduling", () => {
    startPaymentStatusJob({ runOnStart: false });
    startPaymentStatusJob({ runOnStart: false });
    expect(mockCron.schedule).toHaveBeenCalledTimes(1);
  });

  it("runs immediate sync when defaults are used", async () => {
    mockPaymentModel.find.mockReturnValue(buildPaymentQuery([]));

    startPaymentStatusJob();
    await flushPromises();

    expect(mockCron.validate).toHaveBeenCalledWith("0 0 * * *");
    expect(mockPaymentModel.find).toHaveBeenCalled();
  });

  it("skips initial sync when runOnStart false", async () => {
    startPaymentStatusJob({ runOnStart: false });
    await flushPromises();

    expect(mockPaymentModel.find).not.toHaveBeenCalled();
  });
});

describe("stopPaymentStatusJob", () => {
  it("stops active cron job", () => {
    startPaymentStatusJob({ runOnStart: false });
    const job = scheduledJobs[0].job;

    stopPaymentStatusJob();

    expect(job.stop).toHaveBeenCalled();
    expect(getPaymentJobStatus()).toEqual({ running: false, processing: false });
  });

  it("is no-op when job not running", () => {
    expect(() => stopPaymentStatusJob()).not.toThrow();
    expect(getPaymentJobStatus()).toEqual({ running: false, processing: false });
  });
});

describe("updateExpiredPayments via scheduler", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const consoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

  afterAll(() => {
    consoleError.mockRestore();
    consoleLog.mockRestore();
  });

  it("handles case with no expired payments", async () => {
    mockPaymentModel.find.mockReturnValueOnce(buildPaymentQuery([]));

    startPaymentStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockPaymentModel.updateMany).not.toHaveBeenCalled();
  });

  it("marks expired payments as failed", async () => {
    mockPaymentModel.find
      .mockReturnValueOnce(buildPaymentQuery([{ _id: "p1" }]))
      .mockReturnValueOnce(buildPaymentQuery([]));
    mockPaymentModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

    startPaymentStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockPaymentModel.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["p1"] } },
      {
        $set: {
          status: "FAILED",
          providerStatus: "expired",
        },
      }
    );
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining("[PaymentStatusJob] Marked 1 payment")
    );
  });

  it("processes multiple batches", async () => {
    const batch = Array.from({ length: 500 }, (_, idx) => ({ _id: `p${idx}` }));
    mockPaymentModel.find
      .mockReturnValueOnce(buildPaymentQuery(batch))
      .mockReturnValueOnce(buildPaymentQuery([{ _id: "extra" }]))
      .mockReturnValueOnce(buildPaymentQuery([]));
    mockPaymentModel.updateMany.mockResolvedValue({ modifiedCount: 10 });

    startPaymentStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockPaymentModel.find).toHaveBeenCalledTimes(2);
    expect(mockPaymentModel.updateMany).toHaveBeenCalledTimes(2);
  });

  it("resets processing flag after exceptions", async () => {
    mockPaymentModel.find.mockImplementation(() => {
      throw new Error("db error");
    });

    startPaymentStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(getPaymentJobStatus().processing).toBe(false);
    expect(consoleError).toHaveBeenCalledWith("[PaymentStatusJob] Error:", expect.any(Error));
  });

  it("prevents overlapping runs", async () => {
    let resolveLean;
    const pending = new Promise((resolve) => (resolveLean = resolve));
    mockPaymentModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue(pending),
    });

    startPaymentStatusJob({ runOnStart: false });
    const handler = scheduledJobs[0].handler;
    const first = handler();
    await flushPromises();
    const second = handler();

    resolveLean([]);
    await Promise.all([first, second]);
    expect(mockPaymentModel.find).toHaveBeenCalledTimes(1);
  });

  it("reports processing state while running", async () => {
    let resolveLean;
    const pending = new Promise((resolve) => (resolveLean = resolve));
    mockPaymentModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue(pending),
    });

    startPaymentStatusJob({ runOnStart: false });
    const promise = runScheduledJob();
    await flushPromises();
    expect(getPaymentJobStatus().processing).toBe(true);

    resolveLean([]);
    await promise;
    expect(getPaymentJobStatus().processing).toBe(false);
  });

  it("is resilient when updateMany throws", async () => {
    mockPaymentModel.find
      .mockReturnValueOnce(buildPaymentQuery([{ _id: "p1" }]))
      .mockReturnValueOnce(buildPaymentQuery([]));
    mockPaymentModel.updateMany.mockRejectedValue(new Error("write fail"));

    startPaymentStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(consoleError).toHaveBeenCalledWith("[PaymentStatusJob] Error:", expect.any(Error));
  });

  it("handles scenario with pending payments lacking ids", async () => {
    mockPaymentModel.find
      .mockReturnValueOnce(buildPaymentQuery([{ paymentId: "pub" }]))
      .mockReturnValueOnce(buildPaymentQuery([]));

    startPaymentStatusJob({ runOnStart: false });
    await runScheduledJob();

    expect(mockPaymentModel.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [undefined] } },
      expect.any(Object)
    );
  });

  it("keeps running flag true while cron scheduled", () => {
    startPaymentStatusJob({ runOnStart: false });
    expect(getPaymentJobStatus().running).toBe(true);
    stopPaymentStatusJob();
    expect(getPaymentJobStatus().running).toBe(false);
  });
});
