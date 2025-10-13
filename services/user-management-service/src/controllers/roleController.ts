import { Request, Response } from 'express';
import { db } from '../config/database';
import { roles } from '../models/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class RoleController {
  async listRoles(req: Request, res: Response) {
    try {
      const { organizationId } = req.query;
      const conditions = [];
      if (organizationId) conditions.push(eq(roles.organizationId, organizationId as string));

      const roleList = await db.select().from(roles).where(conditions.length > 0 ? and(...conditions) : undefined);
      res.json({ success: true, data: roleList });
    } catch (error: any) {
      logger.error('Failed to list roles:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
      if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
      res.json({ success: true, data: role });
    } catch (error: any) {
      logger.error('Failed to get role:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createRole(req: Request, res: Response) {
    try {
      const { name, slug, description, organizationId, permissions } = req.body;
      const [newRole] = await db.insert(roles).values({
        name, slug, description, organizationId, permissions, isSystemRole: false
      }).returning();
      res.status(201).json({ success: true, data: newRole });
    } catch (error: any) {
      logger.error('Failed to create role:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const [updated] = await db.update(roles).set({ ...updates, updatedAt: new Date() })
        .where(eq(roles.id, id)).returning();
      if (!updated) return res.status(404).json({ success: false, error: 'Role not found' });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Failed to update role:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const roleController = new RoleController();
