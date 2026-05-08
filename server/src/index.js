import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { CLIENT_ORIGIN, COMPANY, PORT, ROOT_DIR, UPLOAD_DIR } from './config.js';
import { connectDb } from './db.js';
import { bookingUpload, handleUploadErrors } from './upload.js';
import { asyncHandler } from './utils/http.js';
import { create as createBooking } from './controllers/bookingController.js';
import { create as createCallRequest } from './controllers/callRequestController.js';
import authRoutes from './routes/authRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import callRequestRoutes from './routes/callRequestRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import stockMovementRoutes from './routes/stockMovementRoutes.js';
import userRoutes from './routes/userRoutes.js';
import workOrderRoutes from './routes/workOrderRoutes.js';

const app = express();

function isAllowedOrigin(origin) {
  if (!origin || origin === 'null') return true;
  if (origin === CLIENT_ORIGIN) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '12mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, company: COMPANY.name, time: new Date().toISOString() });
});

app.post('/api/public/bookings', bookingUpload.single('problemImage'), handleUploadErrors, asyncHandler(createBooking));
app.post('/api/public/contact-requests', asyncHandler(createCallRequest));

app.use('/api/auth', authRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/call-requests', callRequestRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/work-orders', workOrderRoutes);

const clientDistDir = path.join(ROOT_DIR, 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  if (!error.status || error.status >= 500) console.error(error);
  res.status(error.status || 500).json({ message: error.message || 'Something went wrong' });
});

try {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`Service Management API running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('MongoDB connection failed. Start MongoDB locally or set MONGO_URI in server/.env.');
  console.error(`Connection detail: ${error.message}`);
  process.exit(1);
}
