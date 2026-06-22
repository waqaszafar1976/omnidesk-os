import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import pool from '../config/database';
import { getPubClient, getSubClient } from '../config/redis';
import * as Y from 'yjs';

interface Room {
  clients: Set<WebSocket>;
  documentState: Uint8Array | null;
  redisSubscribed: boolean;
}

const rooms = new Map<string, Room>();
const saveTimeouts = new Map<string, NodeJS.Timeout>();

// Debounced auto-save function to back up Yjs CRDT room state to PostgreSQL
const queuePageAutoSave = (pageId: string, state: Uint8Array) => {
  // Clear any existing pending auto-saves for this page
  if (saveTimeouts.has(pageId)) {
    clearTimeout(saveTimeouts.get(pageId)!);
  }

  const timeout = setTimeout(async () => {
    saveTimeouts.delete(pageId);
    try {
      const base64State = Buffer.from(state).toString('base64');
      const userId = '00000000-0000-0000-0000-000000000001'; // Default admin session credentials

      const client = await pool.connect();
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
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[AutoSave] Failed to save state transaction for page ${pageId}:`, err.message);
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error(`[AutoSave] Error serializing snapshot for page ${pageId}:`, err.message);
    }
  }, 2000); // 2 seconds debounce

  saveTimeouts.set(pageId, timeout);
};

// Helper to load content from database and translate it into a Yjs binary update
const loadInitialPageDocState = async (pageId: string): Promise<Uint8Array | null> => {
  try {
    const userId = '00000000-0000-0000-0000-000000000001';
    const client = await pool.connect();
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
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (!content) return null;

    // Check if it is a Base64 encoded snapshot (indicates previously saved Yjs binary update)
    if (type === 'document' && !content.startsWith('{') && content.length > 10) {
      try {
        return new Uint8Array(Buffer.from(content, 'base64'));
      } catch (e) {
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
        const textLines = (json.blocks || []).map((b: any) => b.data?.text || '').filter(Boolean);
        ytext.insert(0, textLines.join('\n\n'));
      } catch (e) {
        ytext.insert(0, content);
      }
      return Y.encodeStateAsUpdate(doc);
    } else if (type === 'canvas') {
      // For Canvas layout dashboard sync, Yjs is not used directly, we rely on JSON websocket relay
      return null;
    }

    return null;
  } catch (err: any) {
    console.error(`Error loading initial page document state for room ${pageId}:`, err.message);
    return null;
  }
};

export const setupWebsocketServer = (server: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true });
  const pubClient = getPubClient();
  const subClient = getSubClient();

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url || '').pathname;

    if (pathname && pathname.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, request) => {
    const query = url.parse(request.url || '', true).query;
    const pageId = (query.pageId as string) || 'default_room';
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
        await subClient.subscribe(channelName, (message: string) => {
          // Received update from Redis (published by another cluster node)
          try {
            const data = JSON.parse(message);
            
            // 1. Process binary Yjs CRDT updates
            if (data.type === 'crdt' && rooms.has(pageId)) {
              const localRoom = rooms.get(pageId)!;
              const updateBuffer = Buffer.from(data.payload, 'base64');
              
              // Apply update to process cache state
              if (localRoom.documentState) {
                localRoom.documentState = Y.mergeUpdates([localRoom.documentState, new Uint8Array(updateBuffer)]);
              } else {
                localRoom.documentState = new Uint8Array(updateBuffer);
              }

              // Relay to all locally connected websockets
              for (const client of localRoom.clients) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(updateBuffer);
                }
              }
            } 
            // 2. Process text / cursor relays
            else if ((data.type === 'cursor' || data.type === 'selection' || data.type === 'layout') && rooms.has(pageId)) {
              const localRoom = rooms.get(pageId)!;
              for (const client of localRoom.clients) {
                // Do not loop cursor positions back to the sender
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(data));
                }
              }
            }
          } catch (e: any) {
            console.error('Error parsing Redis Pub/Sub message:', e.message);
          }
        });
        console.log(`Subscribed to Redis channel: ${channelName}`);
      } catch (err: any) {
        console.error(`Failed to subscribe to Redis channel ${channelName}:`, err.message);
      }
    }

    ws.on('message', async (message: Buffer, isBinary: boolean) => {
      const activeRoom = rooms.get(pageId);
      if (!activeRoom) return;

      if (isBinary) {
        // Binary CRDT updates
        const updateArray = new Uint8Array(message);
        
        try {
          // Cache the merged updates locally
          if (activeRoom.documentState) {
            activeRoom.documentState = Y.mergeUpdates([activeRoom.documentState, updateArray]);
          } else {
            activeRoom.documentState = updateArray;
          }

          // Broadcast to all other local clients in the room
          for (const client of activeRoom.clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
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
        } catch (e: any) {
          console.warn(`[Yjs WS] Handled invalid/protocol binary payload for room "${pageId}":`, e.message);
        }
      } else {
        // Text / cursors coordinates / canvas layout coordinates
        const payload = message.toString();
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'cursor' || parsed.type === 'selection' || parsed.type === 'layout') {
            // Broadcast locally to other clients
            for (const client of activeRoom.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            }
            // Publish to Redis channel to sync other cluster server instances
            pubClient.publish(channelName, payload);
          }
        } catch (e) {
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
          } catch (e: any) {
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
