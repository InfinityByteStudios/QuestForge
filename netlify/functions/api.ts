import { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import express from 'express';
import { registerRoutes } from '../../server/routes';

// Cache the initialized handler across Lambda invocations (warm starts)
let cached: any;

async function getServerlessHandler() {
  if (cached) return cached;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Lightweight request logger for /api only
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        const ms = Date.now() - start;
        // eslint-disable-next-line no-console
        console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
      }
    });
    next();
  });

  // Register existing routes (they already include /api prefixes)
  await registerRoutes(app);

  // Generic error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
  });

  cached = serverless(app, {
    // We want to keep original path for Express matching (/api/...)
    basePath: undefined
  });
  return cached;
}

export const handler: Handler = async (event, context) => {
  const h = await getServerlessHandler();
  return h(event, context);
};

// NOTE: In-memory storage (server/storage.ts) will NOT persist across cold starts.
// This means characters & combat sessions reset when a new Lambda container spins up.
// For persistence you will need to migrate to a real database (e.g., Neon/Postgres already partially scaffolded) or durable KV.