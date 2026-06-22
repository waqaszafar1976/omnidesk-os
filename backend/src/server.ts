import http from 'http';
import app from './app';
import { setupWebsocketServer } from './services/websocket.service';
import { initializeDatabase } from './config/database';
import { seedMockData } from './config/seed_data';
import { initializeRedis } from './config/redis';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Initialize PostgreSQL schemas and tables
    await initializeDatabase();

    // 2. Initialize Redis Client Pub/Sub Broker
    await initializeRedis();

    // 3. Pre-populate tables with wholesale recovery tracker seed records
    await seedMockData();

    // 3. Create HTTP server combining Express and WebSockets
    const server = http.createServer(app);

    // 4. Attach WebSocket relay coordination server
    setupWebsocketServer(server);

    // 5. Start listening
    server.listen(port, () => {
      console.log(`==================================================`);
      console.log(`OMNIDESK OS BACKEND SERVER RUNNING ON PORT ${port}`);
      console.log(`REST API Endpoint: http://localhost:${port}/api/v1`);
      console.log(`WS API Endpoint: ws://localhost:${port}/ws`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('Fatal error starting Omnidesk backend server:', error);
    process.exit(1);
  }
};

startServer();
