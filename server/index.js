import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.js';
import productsRouter from './routes/products.js';
import featureRequestsRouter from './routes/featureRequests.js';
import tradingRouter from './routes/trading.js';
import uploadsRouter from './routes/uploads.js';
import exportsRouter from './routes/exports.js';
import npdEpicsRouter from './routes/npdEpics.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import costsRouter from './routes/costs.js';
import businessCasesRouter from './routes/businessCases.js';
import { requireAuth, ensureInitialUser, pruneSessions } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// Behind Railway's / the office load balancer's proxy: use the real client IP
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Sign-in endpoints are open; every other /api route needs a signed-in user
// (except the few calls the public request pages make — see lib/auth.js)
app.use('/api/auth', authRouter);
app.use('/api', requireAuth);

// API routes
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/requests', featureRequestsRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/upload', uploadsRouter);
app.use('/api/export', exportsRouter);
app.use('/api/npd-epics', npdEpicsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/costs', costsRouter);
app.use('/api/business-cases', businessCasesRouter);

// Production: serve client build
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    // Client errors (bad upload etc.) carry a useful message; hide internals for 5xx in production
    error: process.env.NODE_ENV === 'production' && status >= 500 ? 'Internal server error' : err.message,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  ensureInitialUser().catch((err) => console.error('Could not create first user:', err.message));
  pruneSessions().catch(() => {});
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
