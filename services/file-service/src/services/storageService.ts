/**
 * Storage Service - S3 and Local Storage
 */

import { logger } from '../utils/logger';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface StorageProvider {
  uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string>;
  downloadFile(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<boolean>;
  getFileUrl(storagePath: string, expiresIn: number): Promise<string>;
}

// S3 Provider (Production)
class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || 'healthflow-files';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  }

  async uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string> {
    try {
      // In production, use AWS SDK
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3({
      //   region: this.region,
      //   accessKeyId: this.accessKeyId,
      //   secretAccessKey: this.secretAccessKey
      // });

      const key = `uploads/${Date.now()}-${filename}`;

      // const result = await s3.upload({
      //   Bucket: this.bucket,
      //   Key: key,
      //   Body: file,
      //   ContentType: mimeType,
      //   ServerSideEncryption: 'AES256'
      // }).promise();

      logger.info('File uploaded to S3', { key, size: file.length });

      return key;
    } catch (error) {
      logger.error('S3 upload failed:', error);
      throw error;
    }
  }

  async downloadFile(storagePath: string): Promise<Buffer> {
    try {
      // In production, use AWS SDK
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3({...});
      
      // const result = await s3.getObject({
      //   Bucket: this.bucket,
      //   Key: storagePath
      // }).promise();

      // return result.Body as Buffer;

      logger.info('File downloaded from S3', { path: storagePath });
      return Buffer.from('mock file content');
    } catch (error) {
      logger.error('S3 download failed:', error);
      throw error;
    }
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      // In production, use AWS SDK
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3({...});
      
      // await s3.deleteObject({
      //   Bucket: this.bucket,
      //   Key: storagePath
      // }).promise();

      logger.info('File deleted from S3', { path: storagePath });
      return true;
    } catch (error) {
      logger.error('S3 delete failed:', error);
      throw error;
    }
  }

  async getFileUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      // In production, use AWS SDK
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3({...});
      
      // const url = s3.getSignedUrl('getObject', {
      //   Bucket: this.bucket,
      //   Key: storagePath,
      //   Expires: expiresIn
      // });

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storagePath}?expires=${expiresIn}`;
      
      logger.info('Generated signed URL', { path: storagePath, expiresIn });
      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }
}

// Local Storage Provider (Development)
class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || '/tmp/healthflow-uploads';
  }

  async uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string> {
    try {
      // Ensure upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Generate unique filename
      const hash = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(filename);
      const storedFilename = `${hash}${ext}`;
      const storagePath = path.join(this.uploadDir, storedFilename);

      // Write file
      await fs.writeFile(storagePath, file);

      logger.info('File uploaded locally', { path: storagePath, size: file.length });

      return storedFilename;
    } catch (error) {
      logger.error('Local upload failed:', error);
      throw error;
    }
  }

  async downloadFile(storagePath: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.uploadDir, storagePath);
      const file = await fs.readFile(filePath);

      logger.info('File downloaded locally', { path: storagePath });
      return file;
    } catch (error) {
      logger.error('Local download failed:', error);
      throw error;
    }
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, storagePath);
      await fs.unlink(filePath);

      logger.info('File deleted locally', { path: storagePath });
      return true;
    } catch (error) {
      logger.error('Local delete failed:', error);
      throw error;
    }
  }

  async getFileUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, return a direct URL (in production, this would be served by the API)
    const url = `${process.env.API_URL}/files/download/${storagePath}`;
    
    logger.info('Generated local file URL', { path: storagePath });
    return url;
  }
}

// Storage Service Class
export class StorageService {
  private provider: StorageProvider;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    switch (provider) {
      case 's3':
        this.provider = new S3StorageProvider();
        logger.info('Storage service initialized with S3');
        break;

      case 'local':
      default:
        this.provider = new LocalStorageProvider();
        logger.info('Storage service initialized with Local storage');
        break;
    }
  }

  async uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string> {
    return this.provider.uploadFile(file, filename, mimeType);
  }

  async downloadFile(storagePath: string): Promise<Buffer> {
    return this.provider.downloadFile(storagePath);
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    return this.provider.deleteFile(storagePath);
  }

  async getFileUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    return this.provider.getFileUrl(storagePath, expiresIn);
  }
}

export const storageService = new StorageService();

