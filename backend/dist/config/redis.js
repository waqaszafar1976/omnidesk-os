"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsRedisMock = exports.getSubClient = exports.getPubClient = exports.initializeRedis = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// In-memory PubSub fallback for local developer boot
class InMemoryPubSub {
    listeners = new Map();
    async connect() {
        console.log('In-memory PubSub mock system active.');
    }
    async publish(channel, message) {
        const channelListeners = this.listeners.get(channel);
        if (channelListeners) {
            for (const listener of channelListeners) {
                listener(message);
            }
        }
    }
    async subscribe(channel, callback) {
        let channelListeners = this.listeners.get(channel);
        if (!channelListeners) {
            channelListeners = new Set();
            this.listeners.set(channel, channelListeners);
        }
        channelListeners.add(callback);
    }
    async unsubscribe(channel, callback) {
        const channelListeners = this.listeners.get(channel);
        if (channelListeners) {
            channelListeners.delete(callback);
        }
    }
}
let redisPub = null;
let redisSub = null;
let isRedisMock = false;
const initializeRedis = async () => {
    if (!process.env.REDIS_URL) {
        console.warn('REDIS_URL is missing. Using in-memory PubSub mock.');
        const mock = new InMemoryPubSub();
        redisPub = mock;
        redisSub = mock;
        isRedisMock = true;
        return;
    }
    try {
        redisPub = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
        redisSub = redisPub.duplicate();
        await redisPub.connect();
        await redisSub.connect();
        console.log('Redis Pub/Sub connected successfully.');
        isRedisMock = false;
    }
    catch (e) {
        console.error('Error connecting to Redis cluster. Falling back to in-memory PubSub:', e);
        const mock = new InMemoryPubSub();
        redisPub = mock;
        redisSub = mock;
        isRedisMock = true;
    }
};
exports.initializeRedis = initializeRedis;
const getPubClient = () => {
    if (!redisPub) {
        const mock = new InMemoryPubSub();
        redisPub = mock;
        redisSub = mock;
        isRedisMock = true;
    }
    return redisPub;
};
exports.getPubClient = getPubClient;
const getSubClient = () => {
    if (!redisSub) {
        const mock = new InMemoryPubSub();
        redisPub = mock;
        redisSub = mock;
        isRedisMock = true;
    }
    return redisSub;
};
exports.getSubClient = getSubClient;
const getIsRedisMock = () => isRedisMock;
exports.getIsRedisMock = getIsRedisMock;
