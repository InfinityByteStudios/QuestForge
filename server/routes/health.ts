import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    platform: process.env.NETLIFY ? 'netlify' : 'local',
    region: process.env.AWS_REGION || 'unknown',
    deployId: process.env.DEPLOY_ID || 'unknown'
  };

  res.status(200).json(healthCheck);
}));

router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  const checks = {
    storage: 'in-memory',
    firebase: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not-configured',
    environment: 'ok'
  };
  
  res.status(200).json({
    status: 'Ready',
    timestamp: new Date().toISOString(),
    platform: process.env.NETLIFY ? 'netlify' : 'local',
    services: checks
  });
}));

export default router;