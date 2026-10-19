import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ENV } from '../config/env';

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, ENV.UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `book-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const bookExtensions = ['.pdf', '.epub', '.txt', '.md'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  if (file.fieldname === 'cover' || file.fieldname === 'coverImage') {
    if (imageExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid cover image format (${ext}). Allowed: JPG, PNG, WEBP.`));
    }
    return;
  }

  if (bookExtensions.includes(ext) || imageExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${ext}). Allowed formats: PDF, EPUB, TXT, MD.`));
  }
};

export const uploadBookFile = multer({
  storage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024 // 50MB limit
  },
  fileFilter
});

export const uploadBookFields = uploadBookFile.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

