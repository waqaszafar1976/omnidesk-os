import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// In-memory PubSub fallback for local developer boot
class InMemoryPubSub {
  private listeners = new Map<string, Set<(message: string) => void>>();

  async connect() {
    console.log('In-memory PubSub mock system active.');
  }

  async publish(channel: string, message: string) {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      for (const listener of channelListeners) {
        listener(message);
      }
    }
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    let channelListeners = this.listeners.get(channel);
    if (!channelListeners) {
      channelListeners = new Set();
      this.listeners.set(channel, channelListeners);
    }
    channelListeners.add(callback);
  }

  async unsubscribe(channel: string, callback: (message: string) => void) {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(callback);
    }
  }
}

let redisPub: any = null;
let redisSub: any = null;
let isRedisMock = false;

export const initializeRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL is missing. Using in-memory PubSub mock.');
    const mock = new InMemoryPubSub();
    redisPub = mock;
    redisSub = mock;
    isRedisMock = true;
    return;
  }

  try {
    redisPub = createClient({ url: process.env.REDIS_URL });
    redisSub = redisPub.duplicate();

    await redisPub.connect();
    await redisSub.connect();
    
    console.log('Redis Pub/Sub connected successfully.');
    isRedisMock = false;
  } catch (e) {
    console.error('Error connecting to Redis cluster. Falling back to in-memory PubSub:', e);
    const mock = new InMemoryPubSub();
    redisPub = mock;
    redisSub = mock;
    isRedisMock = true;
  }
};

export const getPubClient = () => {
  if (!redisPub) {
    const mock = new InMemoryPubSub();
    redisPub = mock;
    redisSub = mock;
    isRedisMock = true;
  }
  return redisPub;
};

export const getSubClient = () => {
  if (!redisSub) {
    const mock = new InMemoryPubSub();
    redisPub = mock;
    redisSub = mock;
    isRedisMock = true;
  }
  return redisSub;
};

export const getIsRedisMock = () => isRedisMock;
