import { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../../server/routes.js';

// Cache the initialized handler across Lambda invocations (warm starts)
let cached: any;

async function getServerlessHandler() {
  if (cached) return cached;

  const app = express();
  
  // CORS configuration
  app.use(cors({
    origin: true, // Allow all origins for now
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    console.log(`${req.method} ${req.path} - Start`);
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    });
    next();
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      platform: 'netlify'
    });
  });

  try {
    // Import and register routes directly
    const { storage } = await import('../../server/storage.js');
    const { 
      insertCharacterSchema,
      moveCharacterSchema,
      combatActionSchema,
      useItemSchema,
      equipItemSchema
    } = await import('../../shared/schema.js');
    const { applyLevelUps, levelFromExperience } = await import('../../shared/leveling.js');

    // Character routes
    app.post("/api/characters", async (req, res) => {
      try {
        const characterData = insertCharacterSchema.parse(req.body);
        const character = await storage.createCharacter(characterData);
        res.json(character);
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.get("/api/characters/:id", async (req, res) => {
      try {
        const character = await storage.getCharacter(req.params.id);
        if (!character) {
          return res.status(404).json({ message: "Character not found" });
        }
        const derivedLevel = levelFromExperience(character.experience);
        if (derivedLevel !== character.level) {
          const updated = await storage.updateCharacter(character.id, { level: derivedLevel });
          return res.json(updated);
        }
        res.json(character);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    });

    app.patch("/api/characters/:id", async (req, res) => {
      try {
        const character = await storage.updateCharacter(req.params.id, req.body);
        res.json(character);
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    // Location routes
    app.get("/api/locations", async (req, res) => {
      try {
        const locations = await storage.getAllLocations();
        res.json(locations);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    });

    console.log('Routes registered successfully');
  } catch (error) {
    console.error('Error registering routes:', error);
    app.use('/api/*', (req, res) => {
      res.status(500).json({ 
        error: 'Server initialization failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  }

  // Generic error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error:', err);
    const status = err.status || 500;
    res.status(status).json({ 
      message: err.message || 'Internal Server Error',
      path: req.path,
      method: req.method
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    console.log(`404 - ${req.method} ${req.path}`);
    res.status(404).json({ 
      error: 'Not Found',
      path: req.path,
      method: req.method,
      available: '/api/health'
    });
  });

  cached = serverless(app, {
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