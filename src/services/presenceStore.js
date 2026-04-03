const Redis = require("ioredis");
const { env } = require("../config/env");

class MemoryPresenceStore {
  constructor() {
    this.map = new Map();
  }

  async setCursor(formId, userId, payload) {
    const key = String(formId);
    const room = this.map.get(key) || new Map();
    room.set(String(userId), { ...payload, updatedAt: Date.now() });
    this.map.set(key, room);
  }

  async getPresence(formId) {
    const room = this.map.get(String(formId));
    if (!room) {
      return [];
    }
    return Array.from(room.values());
  }

  async removePresence(formId, userId) {
    const room = this.map.get(String(formId));
    if (!room) {
      return;
    }
    room.delete(String(userId));
  }
}

class RedisPresenceStore {
  constructor(url) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
    this.connected = false;
  }

  async ensureConnection() {
    if (!this.connected) {
      await this.redis.connect();
      this.connected = true;
    }
  }

  async setCursor(formId, userId, payload) {
    await this.ensureConnection();
    const key = `presence:${formId}:${userId}`;
    await this.redis.set(key, JSON.stringify({ ...payload, updatedAt: Date.now() }), "EX", 5);
  }

  async getPresence(formId) {
    await this.ensureConnection();
    const keys = await this.redis.keys(`presence:${formId}:*`);
    if (!keys.length) {
      return [];
    }
    const values = await this.redis.mget(keys);
    return values.filter(Boolean).map((value) => JSON.parse(value));
  }

  async removePresence(formId, userId) {
    await this.ensureConnection();
    await this.redis.del(`presence:${formId}:${userId}`);
  }
}

function createPresenceStore() {
  if (env.REDIS_URL) {
    return new RedisPresenceStore(env.REDIS_URL);
  }
  return new MemoryPresenceStore();
}

module.exports = { createPresenceStore };
