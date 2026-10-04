import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

export interface StorageResult {
  fileUrl: string;
  storageKey: string;
}

export interface IStorageService {
  uploadFile(file: Express.Multer.File): Promise<StorageResult>;
  deleteFile(storageKey: string): Promise<void>;
  getFileUrl(storageKey: string): string;
}

export class LocalStorageService implements IStorageService {
  async uploadFile(file: Express.Multer.File): Promise<StorageResult> {
    const filename = path.basename(file.path);
    // Relative URL served by static middleware
    const fileUrl = `/uploads/${filename}`;
    return {
      fileUrl,
      storageKey: filename
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = path.join(ENV.UPLOAD_DIR, storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  getFileUrl(storageKey: string): string {
    return `/uploads/${storageKey}`;
  }
}

// Future Cloudflare R2 / S3 Service implementation can drop in here
export class CloudflareR2StorageService implements IStorageService {
  async uploadFile(file: Express.Multer.File): Promise<StorageResult> {
    // Cloudflare R2 implementation placeholder
    return {
      fileUrl: `https://r2.example.com/${file.filename}`,
      storageKey: file.filename
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    console.log(`Cloudflare R2 delete for ${storageKey}`);
  }

  getFileUrl(storageKey: string): string {
    return `https://r2.example.com/${storageKey}`;
  }
}

export const storageService: IStorageService = new LocalStorageService();
