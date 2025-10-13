/**
 * Chat Service
 * Handle chat rooms and messages
 */

import { db } from '../config/database';
import { chatRooms, chatMessages } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface CreateRoomData {
  name?: string;
  type: 'direct' | 'group' | 'support';
  participants: string[];
  createdBy: string;
  tenantId: string;
}

interface SendMessageData {
  roomId: string;
  senderId: string;
  senderName: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  content: string;
  attachments?: any[];
  replyTo?: string;
  tenantId: string;
}

class ChatService {
  async createRoom(data: CreateRoomData): Promise<any> {
    try {
      const [room] = await db.insert(chatRooms).values({
        name: data.name,
        type: data.type,
        participants: data.participants,
        createdBy: data.createdBy,
        tenantId: data.tenantId,
        isActive: true
      }).returning();

      logger.info(`Chat room created: ${room.id}`);
      return room;
    } catch (error) {
      logger.error('Failed to create chat room:', error);
      throw error;
    }
  }

  async getRoomsByUser(userId: string, tenantId: string): Promise<any[]> {
    try {
      const rooms = await db.select()
        .from(chatRooms)
        .where(
          and(
            eq(chatRooms.tenantId, tenantId),
            eq(chatRooms.isActive, true)
          )
        );

      // Filter rooms where user is a participant
      return rooms.filter(room => 
        (room.participants as string[]).includes(userId)
      );
    } catch (error) {
      logger.error('Failed to get user rooms:', error);
      return [];
    }
  }

  async sendMessage(data: SendMessageData): Promise<any> {
    try {
      const [message] = await db.insert(chatMessages).values({
        roomId: data.roomId,
        senderId: data.senderId,
        senderName: data.senderName,
        messageType: data.messageType,
        content: data.content,
        attachments: data.attachments,
        replyTo: data.replyTo,
        readBy: [data.senderId], // Sender has read it
        tenantId: data.tenantId
      }).returning();

      logger.info(`Message sent: ${message.id}`);
      return message;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  async getMessages(roomId: string, limit: number = 50, before?: Date): Promise<any[]> {
    try {
      let query = db.select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.roomId, roomId),
            eq(chatMessages.isDeleted, false)
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);

      if (before) {
        query = query.where(lt(chatMessages.createdAt, before));
      }

      const messages = await query;
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Failed to get messages:', error);
      return [];
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const [message] = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId));

      if (!message) {
        throw new Error('Message not found');
      }

      const readBy = (message.readBy as string[]) || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        
        await db.update(chatMessages)
          .set({ readBy })
          .where(eq(chatMessages.id, messageId));
      }
    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const [message] = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId));

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }

      await db.update(chatMessages)
        .set({ isDeleted: true })
        .where(eq(chatMessages.id, messageId));

      logger.info(`Message deleted: ${messageId}`);
    } catch (error) {
      logger.error('Failed to delete message:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string, roomId?: string): Promise<number> {
    try {
      let query = db.select()
        .from(chatMessages)
        .where(eq(chatMessages.isDeleted, false));

      if (roomId) {
        query = query.where(eq(chatMessages.roomId, roomId));
      }

      const messages = await query;
      
      // Count messages where user hasn't read
      return messages.filter(msg => 
        msg.senderId !== userId && 
        !(msg.readBy as string[]).includes(userId)
      ).length;
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      return 0;
    }
  }
}

export const chatService = new ChatService();
