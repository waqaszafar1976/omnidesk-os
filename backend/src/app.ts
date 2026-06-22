import express from 'express';
import cors from 'cors';
import { verifyJWT } from './middleware/auth.middleware';
import documentRoutes from './routes/document.routes';
import tableRoutes from './routes/table.routes';
import formulaRoutes from './routes/formula.routes';
import aiRoutes from './routes/ai.routes';
import authRoutes from './routes/auth.routes';
import billingRoutes from './routes/billing.routes';
import developerRoutes from './routes/developer.routes';
import analyticsRoutes from './routes/analytics.routes';
import taskRoutes from './routes/task.routes';
import workspaceRoutes from './routes/workspace.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Apply JWT verification middleware to all /api/v1 routes
app.use('/api/v1', verifyJWT);

// Register API Routes
app.use('/api/v1', documentRoutes);
app.use('/api/v1', tableRoutes);
app.use('/api/v1', formulaRoutes);
app.use('/api/v1', aiRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', billingRoutes);
app.use('/api/v1', developerRoutes);
app.use('/api/v1', analyticsRoutes);
app.use('/api/v1', taskRoutes);
app.use('/api/v1', workspaceRoutes);

// Base health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'omnidesk-api-server' });
});

// Seed API endpoint for developer convenience
app.post('/api/v1/seed', async (req, res) => {
  try {
    const { seedMockData } = require('./config/seed_data');
    await seedMockData();
    res.json({ success: true, message: 'Re-seeded database successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Middleware placeholder for JWT setting in postgres context
app.use((req, res, next) => {
  // For MVP demonstration, we mock user headers if not set
  req.headers.user_id = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
  next();
});

export default app;
