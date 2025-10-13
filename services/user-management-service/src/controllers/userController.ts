import { Request, Response } from 'express';
import { activityService } from '../services/activityService';
import { sessionService } from '../services/sessionService';
import { db } from '../config/database';
import { users, userRoles, roles, auditLogs } from '../models/schema';
import { eq, and, isNull, or, like, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as bcrypt from 'bcrypt';

export class UserController {
  async listUsers(req: Request, res: Response) {
    try {
      const { organizationId, status, search, limit = 50, offset = 0 } = req.query;
      const conditions = [isNull(users.deletedAt)];
      
      if (organizationId) conditions.push(eq(users.organizationId, organizationId as string));
      if (status) conditions.push(eq(users.status, status as string));
      if (search) {
        conditions.push(or(
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )!);
      }

      const userList = await db.select().from(users).where(and(...conditions))
        .limit(parseInt(limit as string)).offset(parseInt(offset as string));
      
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(...conditions));

      res.json({ success: true, data: userList, pagination: { total: count, limit, offset } });
    } catch (error: any) {
      logger.error('Failed to list users:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [user] = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
      
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const userRolesList = await db.select({ role: roles }).from(userRoles)
        .leftJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, id));

      res.json({ success: true, data: { ...user, roles: userRolesList.map(ur => ur.role) } });
    } catch (error: any) {
      logger.error('Failed to get user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, phone, organizationId, roleIds } = req.body;
      const currentUser = (req as any).user;

      const passwordHash = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        email, passwordHash, firstName, lastName, phone, organizationId, status: 'active'
      }).returning();

      if (roleIds && roleIds.length > 0) {
        await db.insert(userRoles).values(roleIds.map((roleId: string) => ({
          userId: newUser.id, roleId, grantedBy: currentUser.id
        })));
      }

      await db.insert(auditLogs).values({
        userId: currentUser.id, organizationId, action: 'user:create', resourceType: 'user',
        resourceId: newUser.id, changes: { email, firstName, lastName }
      });

      logger.info('User created', { userId: newUser.id, email });
      res.status(201).json({ success: true, data: newUser });
    } catch (error: any) {
      logger.error('Failed to create user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = (req as any).user;

      const [updated] = await db.update(users).set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id)).returning();

      if (!updated) return res.status(404).json({ success: false, error: 'User not found' });

      await db.insert(auditLogs).values({
        userId: currentUser.id, action: 'user:update', resourceType: 'user',
        resourceId: id, changes: updates
      });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Failed to update user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;

      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
      await db.insert(auditLogs).values({
        userId: currentUser.id, action: 'user:delete', resourceType: 'user', resourceId: id
      });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async assignRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { roleId } = req.body;
      const currentUser = (req as any).user;

      await db.insert(userRoles).values({ userId: id, roleId, grantedBy: currentUser.id });
      res.json({ success: true, message: 'Role assigned successfully' });
    } catch (error: any) {
      logger.error('Failed to assign role:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const userController = new UserController();
