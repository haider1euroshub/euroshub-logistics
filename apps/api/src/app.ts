import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { sendError } from './middleware/envelope.js';

// Route modules
import authRoutes from './routes/auth.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import hubRoutes from './routes/hub.routes.js';
import driverRoutes from './routes/driver.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import notificationRoutes from './routes/notification.routes.js';

export const app = express();

// 1. Core middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // In development allow localhost or no origin (e.g. mobile/curl)
      if (!origin || origin.startsWith('http://localhost:') || origin === env.CORS_ORIGIN) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 3. API Route registration
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/hubs', hubRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api', adminRoutes); // admin hubs, vehicles, pricing-rules, users, settings, audit-logs, pricing/estimate
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);

// 4. Fallback 404 handler
app.use((req: Request, res: Response) => {
  return sendError(res, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.path}`, 404);
});

// 5. Global centralized error handler
app.use(errorHandler);
