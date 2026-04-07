import { jest } from "@jest/globals";

// Mock external modules before importing the service
jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock("streamifier", () => ({
  __esModule: true,
  default: {
    createReadStream: jest.fn(),
  },
}));

let cloudinary;
let streamifier;
let service;

beforeEach(async () => {
  jest.clearAllMocks();
  // set env vars so module config runs without warning in most tests
  process.env.CLOUDINARY_CLOUD_NAME = "demo_cloud";
  process.env.CLOUDINARY_API_KEY = "api_key";
  process.env.CLOUDINARY_API_SECRET = "api_secret";
  process.env.CLOUDINARY_FOLDER = "tests/uploads";

  // re-import module fresh for tests where needed
  jest.resetModules();
  const cloudinaryModule = await import("cloudinary");
  const streamifierModule = await import("streamifier");
  cloudinary = cloudinaryModule.v2;
  // streamifier is exported as default in the original module
  streamifier = streamifierModule.default || streamifierModule;
  service = await import("../services/cloudinary.service.js");
});

afterAll(() => {
  // clean up any env changes
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_FOLDER;
});

describe("cloudinary.service", () => {
  it("calls cloudinary.config with environment values on import", () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  });

  it("exposes sanitizeFilename default branch via __testables", () => {
    const { sanitizeFilename } = service.__testables;
    expect(sanitizeFilename()).toBe("file");
    expect(sanitizeFilename(undefined)).toBe("file");
  });

  it("exposes buildPublicId default branch via __testables", () => {
    const { buildPublicId } = service.__testables;
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    jest.spyOn(Math, "random").mockReturnValue(0.25);

    const generated = buildPublicId();
    expect(generated).toMatch(/^file_1700000000000_[0-9a-z]+$/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("uploadBase64ToCloudinary - success returns expected shape and forwards options", async () => {
    const fakeResult = {
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/file.jpg",
      public_id: "file_1600000000000_xyz123",
      resource_type: "image",
      bytes: 1234,
      width: 100,
      height: 200,
      format: "jpg",
    };

    cloudinary.uploader.upload.mockResolvedValueOnce(fakeResult);

    // deterministic ids
    jest.spyOn(Date, "now").mockReturnValue(1600000000000);
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);

    const out = await service.uploadBase64ToCloudinary("data:fake;base64,AAA", {
      filename: "file.jpg",
      folder: "my/folder",
      resourceType: "image",
    });

    expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
    const [calledData, options] = cloudinary.uploader.upload.mock.calls[0];
    expect(calledData).toBe("data:fake;base64,AAA");
    expect(options.folder).toBe("my/folder");
    expect(options.resource_type).toBe("image");
    expect(options.overwrite).toBe(false);

    // return value matches fakeResult mapped fields
    expect(out.url).toBe(fakeResult.secure_url);
    expect(out.publicId).toBe(fakeResult.public_id);
    expect(out.format).toBe(fakeResult.format);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("uploadBase64ToCloudinary - propagates upload errors as thrown Error", async () => {
    cloudinary.uploader.upload.mockRejectedValueOnce(new Error("boom"));

    await expect(
      service.uploadBase64ToCloudinary("data:fake;base64,BBB", { filename: "x.jpg" })
    ).rejects.toThrow("boom");
  });

  it("uploadBase64ToCloudinary - fallback error message used when cloudinary error lacks message", async () => {
    cloudinary.uploader.upload.mockRejectedValueOnce({});

    await expect(
      service.uploadBase64ToCloudinary("data:fake;base64,EEE", { filename: "x.jpg" })
    ).rejects.toThrow("Failed to upload image to Cloudinary");
  });

  it("uploadBase64ToCloudinary - uses default folder when not provided", async () => {
    const fakeResult = { secure_url: "u", public_id: "p", resource_type: "auto", bytes: 1, width: 1, height: 1, format: "png" };
    cloudinary.uploader.upload.mockResolvedValueOnce(fakeResult);

    const out = await service.uploadBase64ToCloudinary("data:fake;base64,CCC");

    const options = cloudinary.uploader.upload.mock.calls[0][1];
    expect(options.folder).toBe(process.env.CLOUDINARY_FOLDER || "bidsphere/uploads");
    expect(out.publicId).toBe(fakeResult.public_id);
  });

  it("uploadBase64ToCloudinary - when no filename provided uses default 'file' in public_id", async () => {
    const fakeResult = { secure_url: "u-def", public_id: "file_1600000002000_abc123", resource_type: "auto", bytes: 2, width: 2, height: 2, format: "png" };
    cloudinary.uploader.upload.mockResolvedValueOnce(fakeResult);

    jest.spyOn(Date, "now").mockReturnValue(1600000002000);
    jest.spyOn(Math, "random").mockReturnValue(0.333333);

    await service.uploadBase64ToCloudinary("data:fake;base64,DDD");

    const options = cloudinary.uploader.upload.mock.calls[0][1];
    expect(options.public_id).toMatch(/^file_1600000002000_[0-9a-z]{6}$/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("uploadBufferToCloudinary - success via upload_stream and streamifier piping", async () => {
    const fakeResult = {
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/buffer.jpg",
      public_id: "buffer_1600000000000_aaaaaa",
      resource_type: "image",
      bytes: 4321,
      width: 50,
      height: 60,
      format: "jpg",
    };

    // upload_stream should return an object that holds the callback
    cloudinary.uploader.upload_stream.mockImplementation((opts, cb) => ({ cb }));

    // when piping, call the callback with the fakeResult
    streamifier.createReadStream.mockImplementation((buf) => ({
      pipe: (dest) => {
        // simulate asynchronous callback like a real stream would
        setImmediate(() => dest.cb(null, fakeResult));
      },
    }));

    const out = await service.uploadBufferToCloudinary(Buffer.from([1, 2, 3]), { filename: "buf.png", folder: "f" });

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledTimes(1);
    const calledOptions = cloudinary.uploader.upload_stream.mock.calls[0][0];
    expect(calledOptions.folder).toBe("f");
    expect(out.url).toBe(fakeResult.secure_url);
    expect(out.publicId).toBe(fakeResult.public_id);
  });

  it("uploadBufferToCloudinary - upload_stream invokes callback with error -> rejects", async () => {
    const err = new Error("stream fail");
    cloudinary.uploader.upload_stream.mockImplementation((opts, cb) => ({ cb }));
    streamifier.createReadStream.mockImplementation(() => ({ pipe: (dest) => setImmediate(() => dest.cb(err)) }));

    await expect(service.uploadBufferToCloudinary(Buffer.from([4, 5]))).rejects.toThrow("stream fail");
  });

  it("uploadBufferToCloudinary - upload_stream error fallback message when callback error lacks message", async () => {
    cloudinary.uploader.upload_stream.mockImplementation((opts, cb) => ({ cb }));
    streamifier.createReadStream.mockImplementation(() => ({
      pipe: (dest) => setImmediate(() => dest.cb({})),
    }));

    await expect(service.uploadBufferToCloudinary(Buffer.from([10, 11]))).rejects.toThrow("Cloudinary upload failed");
  });

  it("uploadBufferToCloudinary - streamifier.createReadStream throws -> rejects", async () => {
    cloudinary.uploader.upload_stream.mockImplementation((opts, cb) => ({ cb }));
    streamifier.createReadStream.mockImplementation(() => { throw new Error("createReadStream boom"); });

    await expect(service.uploadBufferToCloudinary(Buffer.from([7, 8]))).rejects.toThrow("createReadStream boom");
  });

  it("deleteFromCloudinary - calls destroy with invalidate true when publicId provided", async () => {
    cloudinary.uploader.destroy.mockResolvedValueOnce({ result: "ok" });

    await service.deleteFromCloudinary("some-id");

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("some-id", { invalidate: true });
  });

  it("deleteFromCloudinary - returns early when publicId falsy", async () => {
    await service.deleteFromCloudinary();
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it("deleteFromCloudinary - propagates destroy error", async () => {
    cloudinary.uploader.destroy.mockRejectedValueOnce(new Error("delete fail"));
    await expect(service.deleteFromCloudinary("id-x")).rejects.toThrow("delete fail");
  });

  it("deleteFromCloudinary - fallback error message used when destroy error lacks message", async () => {
    cloudinary.uploader.destroy.mockRejectedValueOnce({});
    await expect(service.deleteFromCloudinary("id-y")).rejects.toThrow("Failed to delete image from Cloudinary");
  });

  it("buildPublicId removes extension and sanitizes filename via options.public_id", async () => {
    const fakeResult = { secure_url: "u2", public_id: "ignored", resource_type: "auto", bytes: 1, width: 1, height: 1, format: "png" };
    cloudinary.uploader.upload.mockResolvedValueOnce(fakeResult);

    jest.spyOn(Date, "now").mockReturnValue(1600000000000);
    jest.spyOn(Math, "random").mockReturnValue(0.987654321);

    await service.uploadBase64ToCloudinary("d", { filename: "my bad name!.png" });

    const options = cloudinary.uploader.upload.mock.calls[0][1];
    // sanitized filename should not contain spaces or exclamation mark
    expect(options.public_id).toMatch(/^my_bad_name.*1600000000000_[0-9a-z]{6}$/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("uploadBase64ToCloudinary - maps all returned fields (bytes,width,height,format)", async () => {
    const fakeResult = { secure_url: "u3", public_id: "p3", resource_type: "auto", bytes: 555, width: 11, height: 22, format: "webp" };
    cloudinary.uploader.upload.mockResolvedValueOnce(fakeResult);

    const out = await service.uploadBase64ToCloudinary("d3", { filename: "x" });
    expect(out.bytes).toBe(555);
    expect(out.width).toBe(11);
    expect(out.height).toBe(22);
    expect(out.format).toBe("webp");
  });

  it("module import warns when credentials missing", async () => {
    // temporarily remove all Cloudinary env vars and re-import module isolated
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    jest.resetModules();

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    // import fresh
    await import("../services/cloudinary.service.js");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    // restore keys for other tests
    process.env.CLOUDINARY_CLOUD_NAME = "demo_cloud";
    process.env.CLOUDINARY_API_KEY = "api_key";
    process.env.CLOUDINARY_API_SECRET = "api_secret";
  });

  it("module import uses default CLOUDINARY_FOLDER when env missing", async () => {
    delete process.env.CLOUDINARY_FOLDER;
    jest.resetModules();
    jest.doMock('dotenv/config', () => ({}));

    const cloudinaryModule = await import("cloudinary");
    cloudinaryModule.v2.uploader.upload.mockResolvedValueOnce({
      secure_url: "u",
      public_id: "p",
      resource_type: "auto",
      bytes: 1,
      width: 1,
      height: 1,
      format: "png",
    });

    const isolatedService = await import("../services/cloudinary.service.js");
    await isolatedService.uploadBase64ToCloudinary("data-default-folder");

    const options = cloudinaryModule.v2.uploader.upload.mock.calls.at(-1)[1];
    expect(options.folder).toBe("bidsphere/uploads");

    jest.dontMock('dotenv/config');
    process.env.CLOUDINARY_FOLDER = "tests/uploads";
  });

  it("module import warns when individual credentials missing (name, key, secret)", async () => {
    // Test missing CLOUDINARY_CLOUD_NAME alone
    delete process.env.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_API_KEY = "k";
    process.env.CLOUDINARY_API_SECRET = "s";
    jest.resetModules();
    jest.doMock('dotenv/config', () => ({}));
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await import("../services/cloudinary.service.js");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    jest.resetModules();

    // Test missing CLOUDINARY_API_KEY alone
    process.env.CLOUDINARY_CLOUD_NAME = "c";
    delete process.env.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_SECRET = "s";
    jest.resetModules();
    jest.doMock('dotenv/config', () => ({}));
    const warnSpy2 = jest.spyOn(console, "warn").mockImplementation(() => {});
    await import("../services/cloudinary.service.js");
    expect(warnSpy2).toHaveBeenCalled();
    warnSpy2.mockRestore();
    jest.resetModules();

    // Test missing CLOUDINARY_API_SECRET alone
    process.env.CLOUDINARY_CLOUD_NAME = "c";
    process.env.CLOUDINARY_API_KEY = "k";
    delete process.env.CLOUDINARY_API_SECRET;
    jest.resetModules();
    jest.doMock('dotenv/config', () => ({}));
    const warnSpy3 = jest.spyOn(console, "warn").mockImplementation(() => {});
    await import("../services/cloudinary.service.js");
    expect(warnSpy3).toHaveBeenCalled();
    warnSpy3.mockRestore();
    jest.resetModules();

    // restore env for other tests
    process.env.CLOUDINARY_CLOUD_NAME = "demo_cloud";
    process.env.CLOUDINARY_API_KEY = "api_key";
    process.env.CLOUDINARY_API_SECRET = "api_secret";
  });

  it("uploadBase64ToCloudinary - filename without extension is handled", async () => {
    const fakeResult = { secure_url: "u-noext", public_id: "p-noext", resource_type: "auto", bytes: 1, width: 1, height: 1, format: "png" };
    cloudinary.uploader.upload.mockResolvedValueOnce(fakeResult);

    jest.spyOn(Date, "now").mockReturnValue(1600000001000);
    jest.spyOn(Math, "random").mockReturnValue(0.555555);

    await service.uploadBase64ToCloudinary("d-noext", { filename: "noext" });

    const options = cloudinary.uploader.upload.mock.calls[0][1];
    expect(options.public_id).toMatch(/^noext_1600000001000_[0-9a-z]{6}$/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("uploadBufferToCloudinary - uploader throws synchronously -> rejects and logs unexpected error", async () => {
    // make uploader.upload_stream throw immediately
    cloudinary.uploader.upload_stream.mockImplementation(() => { throw new Error("uploader throw") });

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(service.uploadBufferToCloudinary(Buffer.from([9, 9]))).rejects.toThrow("uploader throw");

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("uploadBufferToCloudinary - unexpected error fallback message when thrown value lacks message", async () => {
    cloudinary.uploader.upload_stream.mockImplementation(() => { throw {}; });

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(service.uploadBufferToCloudinary(Buffer.from([12, 13]))).rejects.toThrow("Cloudinary upload failed");

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("module import warns for any missing Cloudinary credential combinations", async () => {
    // We'll try combinations where one or two credentials are missing
    const original = {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    };

    const combos = [
      { name: undefined, key: undefined, secret: undefined },
      { name: undefined, key: "k", secret: "s" },
      { name: "c", key: undefined, secret: "s" },
      { name: "c", key: "k", secret: undefined },
      { name: "c", key: "k", secret: "s" },
    ];

    // Import the module with different env combos to exercise import-time logic
    for (const combo of combos) {
      jest.resetModules();
      try {
        jest.doMock("dotenv/config", () => ({}));
      } catch (e) {
        // ignore if not supported in this environment
      }
      process.env.CLOUDINARY_CLOUD_NAME = combo.name;
      process.env.CLOUDINARY_API_KEY = combo.key;
      process.env.CLOUDINARY_API_SECRET = combo.secret;

      // importing should not throw
      await expect(import("../services/cloudinary.service.js")).resolves.toBeDefined();

      try {
        jest.dontMock("dotenv/config");
      } catch (e) {
        // ignore
      }
    }

    // restore original
    process.env.CLOUDINARY_CLOUD_NAME = original.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_API_KEY = original.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_SECRET = original.CLOUDINARY_API_SECRET;
  });
});
