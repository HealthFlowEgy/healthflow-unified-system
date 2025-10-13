import { Request, Response } from 'express';
import { db } from '../config/database';
import { dashboards, widgets } from '../models/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class DashboardController {
  async listDashboards(req: Request, res: Response) {
    try {
      const { organizationId } = req.query;
      const conditions = organizationId ? eq(dashboards.organizationId, organizationId as string) : undefined;
      const dashboardList = await db.select().from(dashboards).where(conditions);
      res.json({ success: true, data: dashboardList });
    } catch (error: any) {
      logger.error('Failed to list dashboards:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDashboard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [dashboard] = await db.select().from(dashboards).where(eq(dashboards.id, id)).limit(1);
      if (!dashboard) return res.status(404).json({ success: false, error: 'Dashboard not found' });
      
      const dashboardWidgets = await db.select().from(widgets).where(eq(widgets.dashboardId, id));
      res.json({ success: true, data: { ...dashboard, widgets: dashboardWidgets } });
    } catch (error: any) {
      logger.error('Failed to get dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createDashboard(req: Request, res: Response) {
    try {
      const { name, slug, description, organizationId, layout, filters } = req.body;
      const currentUser = (req as any).user;
      
      const [newDashboard] = await db.insert(dashboards).values({
        name, slug, description, organizationId, layout, filters, createdBy: currentUser.id
      }).returning();
      
      res.status(201).json({ success: true, data: newDashboard });
    } catch (error: any) {
      logger.error('Failed to create dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateDashboard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const [updated] = await db.update(dashboards).set({ ...updates, updatedAt: new Date() })
        .where(eq(dashboards.id, id)).returning();
      if (!updated) return res.status(404).json({ success: false, error: 'Dashboard not found' });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Failed to update dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const dashboardController = new DashboardController();
