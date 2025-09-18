import request from 'supertest';
import express from 'express';
import healthRoutes from '../routes/health.js';

const app = express();
app.use('/api', healthRoutes);

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'Ready');
      expect(response.body).toHaveProperty('services');
    });
  });
});