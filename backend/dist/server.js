"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const websocket_service_1 = require("./services/websocket.service");
const database_1 = require("./config/database");
const seed_data_1 = require("./config/seed_data");
const redis_1 = require("./config/redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const port = process.env.PORT || 5000;
const startServer = async () => {
    try {
        // 1. Initialize PostgreSQL schemas and tables
        await (0, database_1.initializeDatabase)();
        // 2. Initialize Redis Client Pub/Sub Broker
        await (0, redis_1.initializeRedis)();
        // 3. Pre-populate tables with wholesale recovery tracker seed records
        await (0, seed_data_1.seedMockData)();
        // 3. Create HTTP server combining Express and WebSockets
        const server = http_1.default.createServer(app_1.default);
        // 4. Attach WebSocket relay coordination server
        (0, websocket_service_1.setupWebsocketServer)(server);
        // 5. Start listening
        server.listen(port, () => {
            console.log(`==================================================`);
            console.log(`OMNIDESK OS BACKEND SERVER RUNNING ON PORT ${port}`);
            console.log(`REST API Endpoint: http://localhost:${port}/api/v1`);
            console.log(`WS API Endpoint: ws://localhost:${port}/ws`);
            console.log(`==================================================`);
        });
    }
    catch (error) {
        console.error('Fatal error starting Omnidesk backend server:', error);
        process.exit(1);
    }
};
startServer();
