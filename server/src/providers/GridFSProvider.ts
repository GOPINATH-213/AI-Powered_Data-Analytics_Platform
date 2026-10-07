import { IStorageProvider, UploadResult } from './StorageProvider';
import mongoose from 'mongoose';
import { Readable } from 'stream';
import { StorageError, NotFoundError } from '../utils/errors';

export class GridFSProvider implements IStorageProvider {
  private getBucket(): mongoose.mongo.GridFSBucket {
    if (!mongoose.connection.db) {
      throw new StorageError('Database connection is not established.');
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'documents',
    });
  }

  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      try {
        const bucket = this.getBucket();
        const uploadStream = bucket.openUploadStream(filename, {
          contentType: mimeType,
        });

        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);

        readableStream
          .pipe(uploadStream)
          .on('error', (err) => {
            reject(new StorageError(`GridFS upload failed: ${err.message}`));
          })
          .on('finish', () => {
            resolve({
              fileId: uploadStream.id.toString(),
            });
          });
      } catch (err) {
        reject(err);
      }
    });
  }

  async download(fileId: string): Promise<NodeJS.ReadableStream> {
    try {
      const bucket = this.getBucket();
      const objectId = new mongoose.Types.ObjectId(fileId);
      
      // Verify if file exists
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError('File not found in GridFS storage.');
      }

      return bucket.openDownloadStream(objectId);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new StorageError(`GridFS download failed: ${(err as Error).message}`);
    }
  }

  async delete(fileId: string): Promise<void> {
    try {
      const bucket = this.getBucket();
      const objectId = new mongoose.Types.ObjectId(fileId);
      await bucket.delete(objectId);
    } catch (err) {
      throw new StorageError(`GridFS delete failed: ${(err as Error).message}`);
    }
  }
}

export const gridFSProvider = new GridFSProvider();
export default gridFSProvider;
