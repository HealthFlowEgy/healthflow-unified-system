/**
 * File Service - Business Logic
 */

import { db } from '../config/database';
import { files, fileAccessLog, fileShares, type File, type NewFile } from '../models/schema';
import { storageService } from './storageService';
import { logger } from '../utils/logger';
import { eq, and, isNull, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

interface UploadFileOptions {
  file: Buffer;
  filename: string;
  mimeType: string;
  size: number;
  category: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  uploadedBy: string;
  uploadedByName: string;
  tenantId?: string;
}

export class FileService {
  async uploadFile(options: UploadFileOptions): Promise<File> {
    try {
      // Upload to storage
      const storagePath = await storageService.uploadFile(
        options.file,
        options.filename,
        options.mimeType
      );

      // Generate stored filename
      const hash = crypto.randomBytes(8).toString('hex');
      const ext = options.filename.split('.').pop();
      const storedFilename = `${hash}.${ext}`;

      // Save to database
      const [newFile] = await db.insert(files).values({
        originalFilename: options.filename,
        storedFilename,
        storagePath,
        mimeType: options.mimeType,
        fileSize: options.size,
        category: options.category,
        entityType: options.entityType,
        entityId: options.entityId,
        description: options.description,
        tags: options.tags,
        isPublic: options.isPublic || false,
        uploadedBy: options.uploadedBy,
        uploadedByName: options.uploadedByName,
        tenantId: options.tenantId,
        metadata: {
          originalSize: options.size,
          uploadedAt: new Date().toISOString()
        }
      }).returning();

      logger.info('File uploaded successfully', {
        fileId: newFile.id,
        filename: options.filename,
        size: options.size
      });

      return newFile;
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw error;
    }
  }

  async getFile(fileId: string, tenantId?: string): Promise<File | null> {
    try {
      const conditions = [
        eq(files.id, fileId),
        isNull(files.deletedAt)
      ];

      if (tenantId) {
        conditions.push(eq(files.tenantId, tenantId));
      }

      const [file] = await db
        .select()
        .from(files)
        .where(and(...conditions))
        .limit(1);

      return file || null;
    } catch (error) {
      logger.error('Failed to get file:', error);
      throw error;
    }
  }

  async listFiles(filters: {
    category?: string;
    entityType?: string;
    entityId?: string;
    uploadedBy?: string;
    tenantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ files: File[]; total: number }> {
    try {
      const conditions = [isNull(files.deletedAt)];

      if (filters.category) {
        conditions.push(eq(files.category, filters.category));
      }
      if (filters.entityType) {
        conditions.push(eq(files.entityType, filters.entityType));
      }
      if (filters.entityId) {
        conditions.push(eq(files.entityId, filters.entityId));
      }
      if (filters.uploadedBy) {
        conditions.push(eq(files.uploadedBy, filters.uploadedBy));
      }
      if (filters.tenantId) {
        conditions.push(eq(files.tenantId, filters.tenantId));
      }

      const fileList = await db
        .select()
        .from(files)
        .where(and(...conditions))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0)
        .orderBy(sql`${files.createdAt} DESC`);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(and(...conditions));

      return {
        files: fileList,
        total: count
      };
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const file = await this.getFile(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      // Soft delete in database
      await db
        .update(files)
        .set({ deletedAt: new Date() })
        .where(eq(files.id, fileId));

      // Log deletion
      await this.logAccess(fileId, { id: userId } as any, 'delete');

      // Optionally delete from storage
      // await storageService.deleteFile(file.storagePath);

      logger.info('File deleted', { fileId, userId });

      return true;
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async checkAccess(file: File, user: any): Promise<boolean> {
    // Public files are accessible to everyone
    if (file.isPublic) {
      return true;
    }

    // Owner has full access
    if (file.uploadedBy === user.id) {
      return true;
    }

    // Check if file is shared with user
    const [share] = await db
      .select()
      .from(fileShares)
      .where(
        and(
          eq(fileShares.fileId, file.id),
          eq(fileShares.sharedWith, user.id),
          eq(fileShares.isActive, true)
        )
      )
      .limit(1);

    if (share) {
      // Check expiration
      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        return false;
      }

      // Check access count
      if (share.maxAccessCount && share.accessCount >= share.maxAccessCount) {
        return false;
      }

      return true;
    }

    // Admin users have access to all files in their tenant
    if (user.role === 'admin' && file.tenantId === user.tenantId) {
      return true;
    }

    return false;
  }

  async logAccess(fileId: string, user: any, action: string, metadata?: any): Promise<void> {
    try {
      await db.insert(fileAccessLog).values({
        fileId,
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        action,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        metadata
      });
    } catch (error) {
      logger.error('Failed to log file access:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  async shareFile(
    fileId: string,
    sharedBy: string,
    sharedWith: string,
    accessLevel: string,
    expiresAt?: Date,
    maxAccessCount?: number
  ): Promise<any> {
    try {
      const accessToken = crypto.randomBytes(32).toString('hex');

      const [share] = await db.insert(fileShares).values({
        fileId,
        sharedBy,
        sharedWith,
        accessLevel,
        expiresAt,
        maxAccessCount,
        accessToken,
        isActive: true
      }).returning();

      logger.info('File shared', { fileId, sharedBy, sharedWith });

      return share;
    } catch (error) {
      logger.error('Failed to share file:', error);
      throw error;
    }
  }

  async getFileStats(tenantId?: string): Promise<any> {
    try {
      const conditions = [isNull(files.deletedAt)];
      
      if (tenantId) {
        conditions.push(eq(files.tenantId, tenantId));
      }

      const [stats] = await db
        .select({
          totalFiles: sql<number>`count(*)`,
          totalSize: sql<number>`sum(${files.fileSize})`,
          avgSize: sql<number>`avg(${files.fileSize})`
        })
        .from(files)
        .where(and(...conditions));

      const categoryStats = await db
        .select({
          category: files.category,
          count: sql<number>`count(*)`,
          totalSize: sql<number>`sum(${files.fileSize})`
        })
        .from(files)
        .where(and(...conditions))
        .groupBy(files.category);

      return {
        ...stats,
        byCategory: categoryStats
      };
    } catch (error) {
      logger.error('Failed to get file stats:', error);
      throw error;
    }
  }
}

export const fileService = new FileService();

