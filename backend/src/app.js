import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import apiRoutes from './routes/index.js';

/**
 * Express ilovasini yaratadi. Telegram webhook (agar bo‘lsa) `beforeApi` orqali ulanadi.
 */
export function createApp({ beforeApi } = {}) {
  const app = express();

  app.set('trust proxy', 1); // Render / Vercel proksi ortida to‘g‘ri IP uchun
  app.disable('x-powered-by');
  app.use(helmet());

  if (beforeApi) beforeApi(app);

  app.use(
    cors({
      origin(origin, callback) {
        // origin yo‘q = server-server yoki curl so‘rovi
        if (!origin || config.frontendUrls.includes(origin.replace(/\/+$/, ''))) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );
  app.use(express.json({ limit: '20kb' }));

  app.get('/', (_req, res) => res.json({ name: 'Kaloriya kalkulyatori API', status: 'ok' }));
  app.use('/api', apiLimiter, apiRoutes);
  app.use('/api', notFoundHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
