import { Types } from 'mongoose';

export interface UploadResult {
  fileId: string; // The identifier key used to fetch/download/delete the file
  storagePath?: string; // Optional path/url for media CDN links
}

export interface IStorageProvider {
  /**
   * Uploads a file buffer/metadata to the storage target
   */
  upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  /**
   * Downloads/Streams a file from the storage target
   */
  download(fileId: string): Promise<NodeJS.ReadableStream>;

  /**
   * Deletes a file from the storage target
   */
  delete(fileId: string): Promise<void>;
}
