/**
 * Session Management Service
 * Handle user sessions, tokens, and active connections
 */

import { db } from '../config/database';
import { userSessions } from '../models/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

interface CreateSessionData {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  tenantId: string;
}

class SessionService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create new session
   */
  async createSession(data: CreateSessionData): Promise<any> {
    const sessionId = uuidv4();
    const token = this.generateToken(data.userId, sessionId);
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    const session = await db.insert(userSessions).values({
      id: sessionId,
      userId: data.userId,
      token,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      deviceInfo: data.deviceInfo ? JSON.stringify(data.deviceInfo) : null,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt,
      tenantId: data.tenantId,
      createdAt: new Date()
    }).returning();

    return session[0];
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, sessionId: string): string {
    return jwt.sign(
      {
        userId,
        sessionId,
        type: 'session'
      },
      this.JWT_SECRET,
      {
        expiresIn: '24h'
      }
    );
  }

  /**
   * Verify token and get session
   */
  async verifyToken(token: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      const session = await db.query.userSessions.findFirst({
        where: and(
          eq(userSessions.id, decoded.sessionId),
          eq(userSessions.isActive, true),
          gte(userSessions.expiresAt, new Date())
        )
      });

      if (session) {
        // Update last activity
        await this.updateActivity(session.id);
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    return await db.query.userSessions.findMany({
      where: and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true),
        gte(userSessions.expiresAt, new Date())
      ),
      orderBy: [desc(userSessions.lastActivityAt)]
    });
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(userSessions.id, sessionId));
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ 
        isActive: false,
        terminatedAt: new Date()
      })
      .where(eq(userSessions.id, sessionId));
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllUserSessions(userId: string): Promise<number> {
    const result = await db
      .update(userSessions)
      .set({ 
        isActive: false,
        terminatedAt: new Date()
      })
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true)
      ));

    return result.rowCount || 0;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await db
      .update(userSessions)
      .set({ 
        isActive: false,
        terminatedAt: new Date()
      })
      .where(and(
        eq(userSessions.isActive, true),
        lte(userSessions.expiresAt, new Date())
      ));

    return result.rowCount || 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId: string): Promise<any> {
    const sessions = await db.query.userSessions.findMany({
      where: eq(userSessions.userId, userId)
    });

    const activeSessions = sessions.filter(s => s.isActive && s.expiresAt > new Date());
    const expiredSessions = sessions.filter(s => !s.isActive || s.expiresAt <= new Date());

    // Group by device
    const byDevice: Record<string, number> = {};
    sessions.forEach(session => {
      if (session.userAgent) {
        const device = this.parseDevice(session.userAgent);
        byDevice[device] = (byDevice[device] || 0) + 1;
      }
    });

    return {
      total: sessions.length,
      active: activeSessions.length,
      expired: expiredSessions.length,
      byDevice
    };
  }

  /**
   * Parse device from user agent
   */
  private parseDevice(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }
}

export const sessionService = new SessionService();

