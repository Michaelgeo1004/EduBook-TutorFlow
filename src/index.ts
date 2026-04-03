import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import 'dotenv/config';

import authRoutes from './routes/auth';
import tutorRoutes from './routes/tutors';
import sessionRoutes from './routes/sessions';
import paymentRoutes from './routes/payments';
import webhookRoutes from './routes/webhooks';
import calendarRoutes from './routes/calendar';
import { initSocket } from './socket/chat';

const app = express();
const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});
initSocket(io);

app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/tutors', tutorRoutes);
app.use('/sessions', sessionRoutes);
app.use('/payments', paymentRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/calendar', calendarRoutes);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`EduBook API running on http://localhost:${PORT}`);
  console.log('Socket.io ready');
});
