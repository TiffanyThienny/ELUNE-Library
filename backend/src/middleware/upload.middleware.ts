import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { ENV } from '../config/env';

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

export const EPUB_UNSUPPORTED_MESSAGE =
  'EPUB files are not supported yet. Please upload the book as a PDF (text-based PDFs work best), TXT, or MD file.';

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, ENV.UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Server-generated, unpredictable name. Only the (already allowlisted) lower-case
    // extension is taken from the client; the client filename never reaches the disk.
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    cb(null, `book-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  // EPUB is a ZIP archive and no EPUB parser is installed, so it is rejected here,
  // before multer writes anything to disk.
  const bookExtensions = ['.pdf', '.txt', '.md'];
  // SVG is intentionally excluded: it can carry script and is served from the API origin.
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  // Filter rejections are client errors; tag them so the error handler returns 400, not 500.
  const reject = (message: string) =>
    cb(Object.assign(new Error(message), { statusCode: 400, code: 'INVALID_FILE_TYPE' }));

  if (file.fieldname === 'cover' || file.fieldname === 'coverImage') {
    if (imageExtensions.includes(ext)) {
      cb(null, true);
    } else {
      reject(`Invalid cover image format (${ext || 'none'}). Allowed: JPG, PNG, WEBP, GIF.`);
    }
    return;
  }

  if (ext === '.epub') {
    cb(
      Object.assign(new Error(EPUB_UNSUPPORTED_MESSAGE), { statusCode: 415, code: 'UNSUPPORTED_FORMAT' })
    );
    return;
  }

  // The book "file" field accepts documents only.
  if (bookExtensions.includes(ext)) {
    cb(null, true);
  } else {
    reject(`Invalid file type (${ext || 'none'}). Allowed formats: PDF, TXT, MD.`);
  }
};

export const uploadBookFile = multer({
  storage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024, // 50MB file limit
    // Text fields can include a base64 data-URL cover preview, which is large.
    // Raise the field value/size limits so a data-URL cover does not abort the
    // whole multipart request (default multer field limit is only 1MB / ~100KB).
    fieldSize: 25 * 1024 * 1024, // 25MB per text field (covers base64 data URLs)
    fields: 50
  },
  fileFilter
});

export const uploadBookFields = uploadBookFile.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

