import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

import 'dotenv/config'; 
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER = "bidsphere/uploads",
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    "Cloudinary credentials are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment."
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const sanitizeFilename = (filename = "file") =>
  filename.replace(/[^a-zA-Z0-9\.\-_]/g, "_");

const buildPublicId = (filename = "file") => {
  const nameWithoutExt = sanitizeFilename(filename).replace(/\.[^.]+$/, "");
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${nameWithoutExt}_${timestamp}_${random}`;
};

export const uploadBase64ToCloudinary = async (
  base64Data,
  { filename = "file.jpg", folder = CLOUDINARY_FOLDER, resourceType = "auto" } = {}
) => {
  try {
    const options = {
      folder,
      public_id: buildPublicId(filename),
      resource_type: resourceType,
      overwrite: false,
      invalidate: false,
    };

    const result = await cloudinary.uploader.upload(base64Data, options);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error("Cloudinary base64 upload error:", error);
    throw new Error(error.message || "Failed to upload image to Cloudinary");
  }
};

export const uploadBufferToCloudinary = async (
  buffer,
  { filename = "file.jpg", folder = CLOUDINARY_FOLDER, resourceType = "auto" } = {}
) =>
  new Promise((resolve, reject) => {
    try {
      const options = {
        folder,
        public_id: buildPublicId(filename),
        resource_type: resourceType,
        overwrite: false,
        invalidate: false,
      };

      const cloudinaryStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            console.error("Cloudinary buffer upload error:", error);
            return reject(new Error(error.message || "Cloudinary upload failed"));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      );

      streamifier.createReadStream(buffer).pipe(cloudinaryStream);
    } catch (error) {
      console.error("Cloudinary buffer upload unexpected error:", error);
      reject(new Error(error.message || "Cloudinary upload failed"));
    }
  });

export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error(error.message || "Failed to delete image from Cloudinary");
  }
};

export const __testables = {
  sanitizeFilename,
  buildPublicId,
};
