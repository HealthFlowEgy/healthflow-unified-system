import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { WebSocketService } from './services/websocketService';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const wsService = new WebSocketService(io);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'websocket' });
});

const PORT = process.env.PORT || 4014;

httpServer.listen(PORT, () => {
  logger.info(`WebSocket Service running on port ${PORT}`);
});
