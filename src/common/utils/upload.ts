// ✅ Cloudinary Image Upload Setup for Marketplace Backend

import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";

/* ----------------------------
   1. CLOUDINARY CONFIGURATION
---------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* ----------------------------
   2. MULTER STORAGE (TEMP FILES)
---------------------------- */
const upload = multer({ dest: "uploads/" });

/* ----------------------------
   3. UPLOAD HANDLER
---------------------------- */
export const uploadToCloudinary = async (
  filePath: string,
  folder = "listings"
) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
    });
    fs.unlinkSync(filePath); // remove temp file
    return result.secure_url;
  } catch (err) {
    throw new Error("Cloudinary Upload Failed");
  }
};

/* ----------------------------
   4. EXPRESS ROUTE HANDLER
---------------------------- */
export const uploadImageHandler = [
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const imageUrl = await uploadToCloudinary(req.file.path);
      res
        .status(201)
        .json({ status: true, message: "Uploaded", url: imageUrl });
    } catch (err) {
      if (err instanceof Error) {
        res.status(500).json({ status: false, message: err.message });
      }
    }
  },
];

export const uploadMultipleImagesHandler = [
  upload.array("images", 10),
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0)
      return res.status(400).json({ message: "No files uploaded" });

    try {
      const urls = await Promise.all(
        files.map((file) => uploadToCloudinary(file.path))
      );
      res.status(201).json({ status: true, message: "Images uploaded", urls });
    } catch (err) {
      if (err instanceof Error) {
        res.status(500).json({ status: false, message: err.message });
      }
    }
  },
];

