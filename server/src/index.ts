import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { QueueService } from './queueService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
initDatabase();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Broadcast helper
function broadcastQueueUpdate(event: string = 'queue:updated', payload?: any) {
  const summary = QueueService.getQueueSummary();
  io.emit(event, payload || summary);
  // Also always emit generic queue:updated
  if (event !== 'queue:updated') {
    io.emit('queue:updated', summary);
  }
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.emit('queue:updated', QueueService.getQueueSummary());

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Queue Summary
app.get('/api/queue/summary', (req, res) => {
  res.json(QueueService.getQueueSummary());
});

// Services
app.get('/api/services', (req, res) => {
  const activeOnly = req.query.all !== 'true';
  res.json(QueueService.getServices(activeOnly));
});

// Barbers
app.get('/api/barbers', (req, res) => {
  res.json(QueueService.getBarbers());
});

// Waiting Queue
app.get('/api/queue/waiting', (req, res) => {
  res.json(QueueService.getWaitingQueue());
});

// All Active Queue (waiting, called, in chair)
app.get('/api/queue/active', (req, res) => {
  res.json(QueueService.getAllActiveQueue());
});

// Get Entry by Token or ID
app.get('/api/queue/entry/:tokenOrId', (req, res) => {
  const { tokenOrId } = req.params;
  const entry = /^\d+$/.test(tokenOrId) 
    ? QueueService.getEntryById(Number(tokenOrId))
    : QueueService.getEntryByToken(tokenOrId);

  if (!entry) {
    return res.status(404).json({ error: 'Queue entry not found' });
  }
  res.json(entry);
});

// Join Queue (Online)
app.post('/api/queue/join', (req, res) => {
  const result = QueueService.joinQueue({
    customer_name: req.body.customer_name,
    phone: req.body.phone,
    service_ids: req.body.service_ids,
    barber_preference: req.body.barber_preference,
    is_walk_in: false,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('queue:updated');
  res.status(201).json(result);
});

// Walk-in Queue (Reception)
app.post('/api/queue/walkin', (req, res) => {
  const result = QueueService.joinQueue({
    customer_name: req.body.customer_name,
    phone: req.body.phone,
    service_ids: req.body.service_ids,
    barber_preference: req.body.barber_preference,
    is_walk_in: true,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('queue:updated');
  res.status(201).json(result);
});

// Call Next Customer for Barber
app.post('/api/queue/call-next', (req, res) => {
  const { barberName } = req.body;
  if (!barberName) {
    return res.status(400).json({ error: 'Barber name is required' });
  }

  const result = QueueService.callNext(barberName);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Broadcast specific customer:called event for TV highlight & chime
  broadcastQueueUpdate('customer:called', {
    token: result.entry?.token,
    barberName,
    customerName: result.entry?.customer_name,
    entry: result.entry
  });

  res.json(result);
});

// Barber Start Service (In chair)
app.post('/api/queue/start', (req, res) => {
  const { barberName } = req.body;
  const result = QueueService.startService(barberName);
  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('queue:updated');
  res.json(result);
});

// Barber Complete Service (Done)
app.post('/api/queue/complete', (req, res) => {
  const { barberName } = req.body;
  const result = QueueService.completeService(barberName);
  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('queue:updated');
  res.json(result);
});

// Cancel Entry (Waiting only)
app.post('/api/queue/cancel', (req, res) => {
  const { tokenOrId } = req.body;
  const result = QueueService.cancelEntry(tokenOrId);
  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('queue:updated');
  res.json(result);
});

// Mark No-show (Called only)
app.post('/api/queue/no-show', (req, res) => {
  const { tokenOrId } = req.body;
  const result = QueueService.markNoShow(tokenOrId);
  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('queue:updated');
  res.json(result);
});

// Add Barber
app.post('/api/barbers', (req, res) => {
  const { name } = req.body;
  const result = QueueService.addBarber(name);
  if (!result.success) {
    return res.status(400).json(result);
  }
  broadcastQueueUpdate('barber:updated');
  res.status(201).json(result);
});

// Update Operating Hours
app.post('/api/settings/hours', (req, res) => {
  const { open_time, close_time } = req.body;
  const result = QueueService.updateOperatingHours(open_time, close_time);
  broadcastQueueUpdate('queue:updated');
  res.json(result);
});

// Barber On break / Available toggle
app.post('/api/barbers/break', (req, res) => {
  const { barberName, onBreak } = req.body;
  const result = QueueService.setBarberBreak(barberName, Boolean(onBreak));
  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('barber:updated', result.barber);
  res.json(result);
});

// Barber Duty toggle
app.post('/api/barbers/duty', (req, res) => {
  const { barberName, onDuty } = req.body;
  const result = QueueService.setBarberDuty(barberName, Boolean(onDuty));
  if (!result.success) {
    return res.status(400).json(result);
  }

  broadcastQueueUpdate('barber:updated', result.barber);
  res.json(result);
});

// Online Queue Open / Close toggle
app.post('/api/settings/online-queue', (req, res) => {
  const { isOpen } = req.body;
  const result = QueueService.setOnlineQueueOpen(Boolean(isOpen));
  broadcastQueueUpdate('queue:updated');
  res.json(result);
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  res.json(QueueService.getDailyStats());
});

// Admin Add Service
app.post('/api/services', (req, res) => {
  const { name_en, name_gu, duration, price, is_active } = req.body;
  if (!name_en || !name_gu || !duration || !price) {
    return res.status(400).json({ error: 'All service fields are required' });
  }
  const created = QueueService.addService({
    name_en,
    name_gu,
    duration: Number(duration),
    price: Number(price),
    is_active: is_active !== false,
  });
  broadcastQueueUpdate('queue:updated');
  res.status(201).json(created);
});

// Admin Update Service
app.put('/api/services/:id', (req, res) => {
  const id = Number(req.params.id);
  const success = QueueService.updateService(id, req.body);
  if (!success) {
    return res.status(404).json({ error: 'Service not found' });
  }
  broadcastQueueUpdate('queue:updated');
  res.json({ success: true });
});

// Serve frontend build in production
const clientDistPath = path.resolve(__dirname, '../../dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`[Server] Royal Crown Salon Queue backend running on port ${PORT}`);
});
