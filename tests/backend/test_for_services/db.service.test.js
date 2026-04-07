import { jest } from "@jest/globals";

// Mock mongoose before importing the module under test
jest.mock("mongoose", () => {
  const connect = jest.fn();
  const m = { connect };
  return {
    __esModule: true,
    default: m,
    // also expose named for compatibility
    connect,
  };
});

// Prevent dotenv from loading real .env during tests
jest.mock('dotenv/config', () => ({}));

let mongoose;
let connectDB;

beforeEach(async () => {
  jest.clearAllMocks();
  // reset env
  delete process.env.MONGO_URI;
  // re-import module fresh each test to pick up env changes
  jest.resetModules();
  // import fresh mocked mongoose for this module registry
  mongoose = await import("mongoose");
  const mod = await import("../services/db.js");
  connectDB = mod.default;
});

afterAll(() => {
  delete process.env.MONGO_URI;
});

describe("connectDB (backend/services/db.js)", () => {
  it("exports a default async function", () => {
    expect(typeof connectDB).toBe("function");
  });

  it("calls mongoose.connect with MONGO_URI when set", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/testdb";
    // re-import to pick env change
    jest.resetModules();
    const mongooseLocal = await import("mongoose");
    const mod = await import("../services/db.js");
    const fn = mod.default;

    await fn();
    expect(mongooseLocal.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });

  it("calls mongoose.connect with undefined when MONGO_URI not set", async () => {
    // ensure env missing
    delete process.env.MONGO_URI;
    jest.resetModules();
    const mongooseLocal = await import("mongoose");
    const mod = await import("../services/db.js");
    const fn = mod.default;

    await fn();
    expect(mongooseLocal.connect).toHaveBeenCalledWith(undefined);
  });

  it("invokes mongoose.connect only once per call", async () => {
    process.env.MONGO_URI = "u1";
    jest.resetModules();
    const mongooseLocal = await import("mongoose");
    const mod = await import("../services/db.js");
    const fn = mod.default;
    await fn();
    expect(mongooseLocal.connect).toHaveBeenCalledTimes(1);
  });

  it("handles synchronous throw from mongoose.connect and logs 'config error'", async () => {
    // make connect throw synchronously
    mongoose.connect.mockImplementationOnce(() => { throw new Error("boom"); });
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    await connectDB();

    expect(spy).toHaveBeenCalledWith("config error");
    spy.mockRestore();
  });

  it("resolves when mongoose.connect returns a resolved promise", async () => {
    mongoose.connect.mockResolvedValueOnce({ ok: 1 });
    await expect(connectDB()).resolves.toBeUndefined();
  });

  it("resolves when mongoose.connect returns non-promise value", async () => {
    mongoose.connect.mockReturnValueOnce(123);
    await expect(connectDB()).resolves.toBeUndefined();
  });

  it("works with long MONGO_URI values", async () => {
    process.env.MONGO_URI = "mongodb+srv://user:pass@cluster0.example.com/dbname?retryWrites=true&w=majority";
    jest.resetModules();
    const mongooseLocal = await import("mongoose");
    const mod = await import("../services/db.js");
    const fn = mod.default;
    await fn();
    expect(mongooseLocal.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });

  it("multiple sequential calls call mongoose.connect repeatedly", async () => {
    mongoose.connect.mockResolvedValue({});
    await connectDB();
    await connectDB();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it("does not call console.log on successful connect", async () => {
    mongoose.connect.mockResolvedValue({});
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await connectDB();
    expect(spy).not.toHaveBeenCalledWith("config error");
    spy.mockRestore();
  });

  it("uses current process.env value at call time (reflects changes)", async () => {
    process.env.MONGO_URI = "first";
    jest.resetModules();
    const mongooseLocal = await import("mongoose");
    const mod = await import("../services/db.js");
    const fn = mod.default;
    await fn();
    expect(mongooseLocal.connect).toHaveBeenCalledWith("first");

    // change env and call again
    process.env.MONGO_URI = "second";
    await fn();
    expect(mongooseLocal.connect).toHaveBeenCalledWith("second");
  });

  it("returns quickly even if mongoose.connect returns a delayed promise", async () => {
    let resolveInner;
    const innerPromise = new Promise((res) => { resolveInner = res; });
    mongoose.connect.mockReturnValueOnce(innerPromise);

    const p = connectDB();
    // connectDB is async but doesn't await connect — it should resolve before innerPromise resolves
    await expect(p).resolves.toBeUndefined();

    // now resolve inner promise to avoid dangling unresolved promise
    resolveInner({});
    await innerPromise; // ensure inner resolves
  });

  it("calling connectDB when mongoose.connect throws different errors still logs once", async () => {
    mongoose.connect.mockImplementationOnce(() => { throw new Error("e1"); }); 
    mongoose.connect.mockImplementationOnce(() => { throw new Error("e2"); }); 
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await connectDB();
    await connectDB();
    // called twice but logs twice
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("does not produce unhandled rejection when mongoose.connect returns resolved promise", async () => {
    mongoose.connect.mockResolvedValue({});
    // just ensure calling doesn't cause rejection (no spy on global)
    await connectDB();
  });

  it("gracefully handles being called with no side effects repeatedly", async () => {
    mongoose.connect.mockResolvedValue({});
    for (let i = 0; i < 5; i++) await connectDB();
    expect(mongoose.connect).toHaveBeenCalledTimes(5);
  });
});
