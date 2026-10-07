import { IStorageProvider, UploadResult } from './StorageProvider';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { StorageError } from '../utils/errors';
import { Readable } from 'stream';
import axios from 'axios';

export class CloudinaryProvider implements IStorageProvider {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(
      env.cloudinary.cloudName &&
      env.cloudinary.apiKey &&
      env.cloudinary.apiSecret
    );

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: env.cloudinary.cloudName,
        api_key: env.cloudinary.apiKey,
        api_secret: env.cloudinary.apiSecret,
      });
      console.log('Cloudinary storage provider initialized.');
    } else {
      console.warn(
        'WARNING: Cloudinary credentials missing. CloudinaryProvider will run in local mock/developer fallback mode.'
      );
    }
  }

  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      // Mock developer mode upload
      console.log(`[Mock Cloudinary] Simulating upload of ${filename}`);
      const mockId = `mock-cloudinary-${Date.now()}`;
      return {
        fileId: mockId,
        storagePath: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', // Default modern chart mock image
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'bi_platform_media',
          public_id: filename.split('.')[0] + '-' + Date.now(),
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new StorageError(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`)
            );
          }
          resolve({
            fileId: result.public_id,
            storagePath: result.secure_url,
          });
        }
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async download(fileId: string): Promise<NodeJS.ReadableStream> {
    if (!this.isConfigured) {
      // Return a simple readable stream with a mock text in dev mode
      const stream = new Readable();
      stream.push('Mock Cloudinary file stream content');
      stream.push(null);
      return stream;
    }

    try {
      // In Cloudinary, files are publicly available via URL. We download it and return the stream.
      const resourceUrl = cloudinary.url(fileId, { secure: true });
      const response = await axios.get(resourceUrl, { responseType: 'stream' });
      return response.data;
    } catch (err) {
      throw new StorageError(`Cloudinary download failed: ${(err as Error).message}`);
    }
  }

  async delete(fileId: string): Promise<void> {
    if (!this.isConfigured) {
      console.log(`[Mock Cloudinary] Deleted resource ${fileId}`);
      return;
    }

    try {
      await cloudinary.uploader.destroy(fileId);
    } catch (err) {
      throw new StorageError(`Cloudinary delete failed: ${(err as Error).message}`);
    }
  }
}

export const cloudinaryProvider = new CloudinaryProvider();
export default cloudinaryProvider;
