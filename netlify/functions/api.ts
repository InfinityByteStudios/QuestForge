import { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';

// Import storage and schemas
import { storage } from '../../server/storage.js';
import { 
  insertCharacterSchema,
  moveCharacterSchema,
  combatActionSchema,
  useItemSchema,
  equipItemSchema
} from '../../shared/schema.js';
import { applyLevelUps, levelFromExperience } from '../../shared/leveling.js';

let cached: any;

async function getServerlessHandler() {
  if (cached) return cached;

  const app = express();
  
  // CORS
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      platform: 'netlify'
    });
  });

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

  app.get("/api/locations/:id", async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Movement
  app.post("/api/characters/:id/move", async (req, res) => {
    try {
      const { locationId } = moveCharacterSchema.parse(req.body);
      const character = await storage.updateCharacter(req.params.id, { 
        currentLocationId: locationId 
      });
      res.json(character);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Error handlers
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  });

  app.use('*', (req, res) => {
    res.status(404).json({ 
      error: 'Not Found',
      path: req.path,
      method: req.method
    });
  });

  cached = serverless(app);
  return cached;
}

export const handler: Handler = async (event, context) => {
  const h = await getServerlessHandler();
  return h(event, context);
};