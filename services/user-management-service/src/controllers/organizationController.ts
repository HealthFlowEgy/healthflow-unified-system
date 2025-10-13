import { Request, Response } from 'express';
import { db } from '../config/database';
import { organizations } from '../models/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class OrganizationController {
  async listOrganizations(req: Request, res: Response) {
    try {
      const orgList = await db.select().from(organizations).where(isNull(organizations.deletedAt));
      res.json({ success: true, data: orgList });
    } catch (error: any) {
      logger.error('Failed to list organizations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
      if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });
      res.json({ success: true, data: org });
    } catch (error: any) {
      logger.error('Failed to get organization:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createOrganization(req: Request, res: Response) {
    try {
      const { name, slug, type, email, phone, address } = req.body;
      const [newOrg] = await db.insert(organizations).values({
        name, slug, type, email, phone, address, status: 'active'
      }).returning();
      res.status(201).json({ success: true, data: newOrg });
    } catch (error: any) {
      logger.error('Failed to create organization:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const [updated] = await db.update(organizations).set({ ...updates, updatedAt: new Date() })
        .where(eq(organizations.id, id)).returning();
      if (!updated) return res.status(404).json({ success: false, error: 'Organization not found' });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Failed to update organization:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const organizationController = new OrganizationController();
