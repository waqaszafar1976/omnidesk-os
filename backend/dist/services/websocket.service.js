"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebsocketServer = void 0;
const ws_1 = require("ws");
const url_1 = __importDefault(require("url"));
const database_1 = __importDefault(require("../config/database"));
const redis_1 = require("../config/redis");
const Y = __importStar(require("yjs"));
const rooms = new Map();
const saveTimeouts = new Map();
// Debounced auto-save function to back up Yjs CRDT room state to PostgreSQL
const queuePageAutoSave = (pageId, state) => {
    // Clear any existing pending auto-saves for this page
    if (saveTimeouts.has(pageId)) {
        clearTimeout(saveTimeouts.get(pageId));
    }
    const timeout = setTimeout(async () => {
        saveTimeouts.delete(pageId);
        try {
            const base64State = Buffer.from(state).toString('base64');
            const userId = '00000000-0000-0000-0000-000000000001'; // Default admin session credentials
            const client = await database_1.default.connect();
            try {
                await client.query('BEGIN');
                await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
                await client.query(`
          UPDATE pages 
          SET content = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `, [base64State, pageId]);
                await client.query('COMMIT');
                console.log(`[AutoSave] Backup snapshot successfully written for page ${pageId}`);
            }
            catch (err) {
                await client.query('ROLLBACK');
                console.error(`[AutoSave] Failed to save state transaction for page ${pageId}:`, err.message);
            }
            finally {
                client.release();
            }
        }
        catch (err) {
            console.error(`[AutoSave] Error serializing snapshot for page ${pageId}:`, err.message);
        }
    }, 2000); // 2 seconds debounce
    saveTimeouts.set(pageId, timeout);
};
// Helper to load content from database and translate it into a Yjs binary update
const loadInitialPageDocState = async (pageId) => {
    try {
        const userId = '00000000-0000-0000-0000-000000000001';
        const client = await database_1.default.connect();
        let content = '';
        let type = '';
        try {
            await client.query('BEGIN');
            await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
            const res = await client.query(`
        SELECT content, type FROM pages WHERE id = $1;
      `, [pageId]);
            if (res.rows.length > 0) {
                content = res.rows[0].content || '';
                type = res.rows[0].type || '';
            }
            await client.query('COMMIT');
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
        if (!content)
            return null;
        // Check if it is a Base64 encoded snapshot (indicates previously saved Yjs binary update)
        if (type === 'document' && !content.startsWith('{') && content.length > 10) {
            try {
                return new Uint8Array(Buffer.from(content, 'base64'));
            }
            catch (e) {
                // Fallback to text parser below
            }
        }
        // Convert existing text or JSON guidelines into standard Yjs updates
        const doc = new Y.Doc();
        const ytext = doc.getText('default');
        if (type === 'document') {
            try {
                const json = JSON.parse(content);
                // Extract paragraph texts from seeded structures
                const textLines = (json.blocks || []).map((b) => b.data?.text || '').filter(Boolean);
                ytext.insert(0, textLines.join('\n\n'));
            }
            catch (e) {
                ytext.insert(0, content);
            }
            return Y.encodeStateAsUpdate(doc);
        }
        else if (type === 'canvas') {
            // For Canvas layout dashboard sync, Yjs is not used directly, we rely on JSON websocket relay
            return null;
        }
        return null;
    }
    catch (err) {
        console.error(`Error loading initial page document state for room ${pageId}:`, err.message);
        return null;
    }
};
const setupWebsocketServer = (server) => {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    const pubClient = (0, redis_1.getPubClient)();
    const subClient = (0, redis_1.getSubClient)();
    server.on('upgrade', (request, socket, head) => {
        const pathname = url_1.default.parse(request.url || '').pathname;
        if (pathname && pathname.startsWith('/ws')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        else {
            socket.destroy();
        }
    });
    wss.on('connection', async (ws, request) => {
        const query = url_1.default.parse(request.url || '', true).query;
        const pageId = query.pageId || 'default_room';
        const channelName = `room:${pageId}`;
        console.log(`User connected to WebSocket room: ${pageId}`);
        // Join room locally
        let room = rooms.get(pageId);
        if (!room) {
            room = { clients: new Set(), documentState: null, redisSubscribed: false };
            rooms.set(pageId, room);
        }
        room.clients.add(ws);
        // Load initial state from database if room is newly initialized
        if (!room.documentState) {
            const dbState = await loadInitialPageDocState(pageId);
            if (dbState) {
                room.documentState = dbState;
            }
        }
        // Send the current room binary state to this newly connected client
        if (room.documentState) {
            ws.send(room.documentState);
        }
        // Subscribe to Redis pub/sub channel for this room (if not already subscribed on this process)
        if (!room.redisSubscribed) {
            room.redisSubscribed = true;
            try {
                await subClient.subscribe(channelName, (message) => {
                    // Received update from Redis (published by another cluster node)
                    try {
                        const data = JSON.parse(message);
                        // 1. Process binary Yjs CRDT updates
                        if (data.type === 'crdt' && rooms.has(pageId)) {
                            const localRoom = rooms.get(pageId);
                            const updateBuffer = Buffer.from(data.payload, 'base64');
                            // Apply update to process cache state
                            if (localRoom.documentState) {
                                localRoom.documentState = Y.mergeUpdates([localRoom.documentState, new Uint8Array(updateBuffer)]);
                            }
                            else {
                                localRoom.documentState = new Uint8Array(updateBuffer);
                            }
                            // Relay to all locally connected websockets
                            for (const client of localRoom.clients) {
                                if (client.readyState === ws_1.WebSocket.OPEN) {
                                    client.send(updateBuffer);
                                }
                            }
                        }
                        // 2. Process text / cursor relays
                        else if ((data.type === 'cursor' || data.type === 'selection' || data.type === 'layout') && rooms.has(pageId)) {
                            const localRoom = rooms.get(pageId);
                            for (const client of localRoom.clients) {
                                // Do not loop cursor positions back to the sender
                                if (client.readyState === ws_1.WebSocket.OPEN) {
                                    client.send(JSON.stringify(data));
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.error('Error parsing Redis Pub/Sub message:', e.message);
                    }
                });
                console.log(`Subscribed to Redis channel: ${channelName}`);
            }
            catch (err) {
                console.error(`Failed to subscribe to Redis channel ${channelName}:`, err.message);
            }
        }
        ws.on('message', async (message, isBinary) => {
            const activeRoom = rooms.get(pageId);
            if (!activeRoom)
                return;
            if (isBinary) {
                // Binary CRDT updates
                const updateArray = new Uint8Array(message);
                try {
                    // Cache the merged updates locally
                    if (activeRoom.documentState) {
                        activeRoom.documentState = Y.mergeUpdates([activeRoom.documentState, updateArray]);
                    }
                    else {
                        activeRoom.documentState = updateArray;
                    }
                    // Broadcast to all other local clients in the room
                    for (const client of activeRoom.clients) {
                        if (client !== ws && client.readyState === ws_1.WebSocket.OPEN) {
                            client.send(message);
                        }
                    }
                    // Publish binary update to Redis pub/sub channel for other instances
                    const base64Update = Buffer.from(message).toString('base64');
                    pubClient.publish(channelName, JSON.stringify({
                        type: 'crdt',
                        payload: base64Update
                    }));
                    // Queue debounced snapshot save back to PostgreSQL database
                    if (activeRoom.documentState) {
                        queuePageAutoSave(pageId, activeRoom.documentState);
                    }
                }
                catch (e) {
                    console.warn(`[Yjs WS] Handled invalid/protocol binary payload for room "${pageId}":`, e.message);
                }
            }
            else {
                // Text / cursors coordinates / canvas layout coordinates
                const payload = message.toString();
                try {
                    const parsed = JSON.parse(payload);
                    if (parsed.type === 'cursor' || parsed.type === 'selection' || parsed.type === 'layout') {
                        // Broadcast locally to other clients
                        for (const client of activeRoom.clients) {
                            if (client !== ws && client.readyState === ws_1.WebSocket.OPEN) {
                                client.send(payload);
                            }
                        }
                        // Publish to Redis channel to sync other cluster server instances
                        pubClient.publish(channelName, payload);
                    }
                }
                catch (e) {
                    // Ignore parse errors
                }
            }
        });
        ws.on('close', () => {
            console.log(`User disconnected from WebSocket room: ${pageId}`);
            const activeRoom = rooms.get(pageId);
            if (activeRoom) {
                activeRoom.clients.delete(ws);
                if (activeRoom.clients.size === 0) {
                    // Unsubscribe from Redis channel
                    try {
                        subClient.unsubscribe(channelName);
                        console.log(`Unsubscribed from Redis channel: ${channelName}`);
                    }
                    catch (e) {
                        console.error('Error unsubscribing from Redis channel:', e.message);
                    }
                    rooms.delete(pageId);
                }
            }
        });
        ws.on('error', (err) => {
            console.error(`WebSocket error in room ${pageId}:`, err);
        });
    });
    console.log('Real-time websocket server attached to HTTP server.');
};
exports.setupWebsocketServer = setupWebsocketServer;
