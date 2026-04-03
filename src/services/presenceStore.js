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
      lazyConnect: true,
      enableReadyCheck: false
    });
    this.connected = false;
    this.disabled = false;

    this.redis.on("error", (error) => {
      this.disabled = true;
      this.connected = false;
      console.warn("Redis presence disabled, falling back to memory store:", error.message);
    });

    this.redis.on("close", () => {
      this.connected = false;
    });
  }

  async ensureConnection() {
    if (this.disabled) {
      throw new Error("Redis presence unavailable");
    }

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

class FallbackPresenceStore {
  constructor(redisUrl) {
    this.memoryStore = new MemoryPresenceStore();
    this.primaryStore = redisUrl ? new RedisPresenceStore(redisUrl) : null;
  }

  async run(method, ...args) {
    if (!this.primaryStore || this.primaryStore.disabled) {
      return this.memoryStore[method](...args);
    }

    try {
      return await this.primaryStore[method](...args);
    } catch (_error) {
      this.primaryStore.disabled = true;
      return this.memoryStore[method](...args);
    }
  }

  async setCursor(formId, userId, payload) {
    return this.run("setCursor", formId, userId, payload);
  }

  async getPresence(formId) {
    return this.run("getPresence", formId);
  }

  async removePresence(formId, userId) {
    return this.run("removePresence", formId, userId);
  }
}

function createPresenceStore() {
  return new FallbackPresenceStore(env.REDIS_URL);
}

module.exports = { createPresenceStore };
