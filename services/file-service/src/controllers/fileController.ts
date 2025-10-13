/**
 * File Controller
 */

import { Request, Response } from 'express';
import { fileService } from '../services/fileService';
import { storageService } from '../services/storageService';
import { logger } from '../utils/logger';
import { z } from 'zod';

const uploadSchema = z.object({
  category: z.enum([
    'prescription',
    'medical_record',
    'profile_photo',
    'lab_result',
    'xray',
    'document',
    'insurance_card',
    'id_document'
  ]),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false)
});

export class FileController {
  async uploadFile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      const validated = uploadSchema.parse(req.body);

      const uploadedFile = await fileService.uploadFile({
        file: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: validated.category,
        entityType: validated.entityType,
        entityId: validated.entityId,
        description: validated.description,
        tags: validated.tags,
        isPublic: validated.isPublic,
        uploadedBy: user.id,
        uploadedByName: `${user.firstName} ${user.lastName}`,
        tenantId: user.tenantId
      });

      logger.info(`File uploaded: ${uploadedFile.id}`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: uploadedFile
      });
    } catch (error: any) {
      logger.error('File upload failed:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'File upload failed'
      });
    }
  }

  async uploadMultipleFiles(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const files = (req as any).files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided'
        });
      }

      const validated = uploadSchema.parse(req.body);

      const uploadPromises = files.map((file: any) =>
        fileService.uploadFile({
          file: file.buffer,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          category: validated.category,
          entityType: validated.entityType,
          entityId: validated.entityId,
          description: validated.description,
          tags: validated.tags,
          isPublic: validated.isPublic,
          uploadedBy: user.id,
          uploadedByName: `${user.firstName} ${user.lastName}`,
          tenantId: user.tenantId
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      res.status(201).json({
        success: true,
        data: uploadedFiles,
        count: uploadedFiles.length
      });
    } catch (error: any) {
      logger.error('Multiple file upload failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'File upload failed'
      });
    }
  }

  async getFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const file = await fileService.getFile(id, user.tenantId);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      const hasAccess = await fileService.checkAccess(file, user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await fileService.logAccess(file.id, user, 'view');

      res.status(200).json({
        success: true,
        data: file
      });
    } catch (error) {
      logger.error('Failed to get file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file'
      });
    }
  }

  async downloadFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const file = await fileService.getFile(id, user.tenantId);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      const hasAccess = await fileService.checkAccess(file, user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const fileBuffer = await storageService.downloadFile(file.storagePath);

      await fileService.logAccess(file.id, user, 'download');

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
      res.setHeader('Content-Length', file.fileSize.toString());
      res.send(fileBuffer);
    } catch (error) {
      logger.error('Failed to download file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download file'
      });
    }
  }

  async getFileUrl(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { expiresIn = 3600 } = req.query;
      const user = (req as any).user;

      const file = await fileService.getFile(id, user.tenantId);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      const hasAccess = await fileService.checkAccess(file, user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const url = await storageService.getFileUrl(
        file.storagePath,
        parseInt(expiresIn as string)
      );

      res.status(200).json({
        success: true,
        data: {
          url,
          expiresIn: parseInt(expiresIn as string)
        }
      });
    } catch (error) {
      logger.error('Failed to get file URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file URL'
      });
    }
  }

  async listFiles(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        category,
        entityType,
        entityId,
        limit = 50,
        offset = 0
      } = req.query;

      const result = await fileService.listFiles({
        category: category as string,
        entityType: entityType as string,
        entityId: entityId as string,
        tenantId: user.tenantId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.status(200).json({
        success: true,
        data: result.files,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to list files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list files'
      });
    }
  }

  async deleteFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const file = await fileService.getFile(id, user.tenantId);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Only owner or admin can delete
      if (file.uploadedBy !== user.id && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await fileService.deleteFile(id, user.id);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file'
      });
    }
  }

  async shareFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { sharedWith, accessLevel, expiresAt, maxAccessCount } = req.body;

      const file = await fileService.getFile(id, user.tenantId);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Only owner can share
      if (file.uploadedBy !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only file owner can share'
        });
      }

      const share = await fileService.shareFile(
        id,
        user.id,
        sharedWith,
        accessLevel,
        expiresAt ? new Date(expiresAt) : undefined,
        maxAccessCount
      );

      res.status(201).json({
        success: true,
        data: share
      });
    } catch (error) {
      logger.error('Failed to share file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to share file'
      });
    }
  }

  async getFileStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const stats = await fileService.getFileStats(user.tenantId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get file stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file stats'
      });
    }
  }
}

export const fileController = new FileController();


  /**
   * Share file with another user
   */
  async shareFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sharedWith, expiresAt } = req.body;
      const user = (req as any).user;

      const file = await fileService.getFile(id, user.tenantId);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Only owner can share
      if (file.uploadedBy !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only file owner can share'
        });
      }

      const share = await fileService.shareFile(
        id,
        sharedWith,
        user.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.status(201).json({
        success: true,
        data: share
      });
    } catch (error) {
      logger.error('Failed to share file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to share file'
      });
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await fileService.getFileStats(user.tenantId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get file stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file statistics'
      });
    }
  }
}

export const fileController = new FileController();
