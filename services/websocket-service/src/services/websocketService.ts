import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface UserSocket extends Socket {
  userId?: string;
  tenantId?: string;
}

export class WebSocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: UserSocket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('authenticate', (data: { userId: string; tenantId: string }) => {
        socket.userId = data.userId;
        socket.tenantId = data.tenantId;

        if (!this.userSockets.has(data.userId)) {
          this.userSockets.set(data.userId, new Set());
        }
        this.userSockets.get(data.userId)!.add(socket.id);

        socket.join(`user:${data.userId}`);
        socket.join(`tenant:${data.tenantId}`);

        logger.info(`User authenticated: ${data.userId}`);
        socket.emit('authenticated', { success: true });
      });

      socket.on('join_room', (room: string) => {
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room: ${room}`);
      });

      socket.on('leave_room', (room: string) => {
        socket.leave(room);
        logger.info(`Socket ${socket.id} left room: ${room}`);
      });

      socket.on('message', (data: { room: string; message: any }) => {
        this.io.to(data.room).emit('message', {
          from: socket.userId,
          message: data.message,
          timestamp: new Date()
        });
      });

      socket.on('typing_start', (data: { room: string }) => {
        socket.to(data.room).emit('typing_start', { userId: socket.userId });
      });

      socket.on('typing_stop', (data: { room: string }) => {
        socket.to(data.room).emit('typing_stop', { userId: socket.userId });
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          const userSocketSet = this.userSockets.get(socket.userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(socket.userId);
            }
          }
        }
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
    logger.info(`Sent event ${event} to user ${userId}`);
  }

  sendToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
    logger.info(`Sent event ${event} to room ${room}`);
  }

  broadcast(event: string, data: any) {
    this.io.emit(event, data);
    logger.info(`Broadcast event ${event}`);
  }
}
