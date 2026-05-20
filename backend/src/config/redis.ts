import Redis from 'ioredis';
import { config } from './index';

// ── In-memory store (fallback when Redis is unavailable) ──
class MemoryStore {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async incr(key: string): Promise<number> {
    const val = parseInt((await this.get(key)) || '0', 10) + 1;
    await this.set(key, String(val));
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async exists(key: string): Promise<number> {
    const val = await this.get(key);
    return val !== null ? 1 : 0;
  }

  disconnect() {}
}

// ── Redis Client (lazy init, falls back to memory) ──
let realRedis: Redis | null = null;
let useMemory = false;
const memoryStore = new MemoryStore();

function getStore(): Redis | MemoryStore {
  if (useMemory) return memoryStore;

  if (!realRedis) {
    try {
      realRedis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        retryStrategy(times) {
          if (times > 2) {
            console.log('[Redis] Unavailable — switching to in-memory store');
            useMemory = true;
            return null; // stop retrying
          }
          return Math.min(times * 100, 500);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      realRedis.on('error', () => {
        if (!useMemory && realRedis) {
          console.log('[Redis] Connection failed — using in-memory store');
          useMemory = true;
          try { realRedis?.disconnect(); } catch {}
          realRedis = null;
        }
      });
    } catch {
      console.log('[Redis] Not available — using in-memory store');
      useMemory = true;
      return new MemoryStore();
    }
  }

  return realRedis;
}

// ── Public API ──
export const redis = {
  async get(key: string): Promise<string | null> {
    return getStore().get(key);
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    const store = getStore();
    if (store instanceof MemoryStore) {
      return store.set(key, value, undefined, ttlSeconds);
    }
    if (ttlSeconds) {
      return store.set(key, value, 'EX', ttlSeconds) as Promise<'OK'>;
    }
    return store.set(key, value) as Promise<'OK'>;
  },

  async del(key: string): Promise<number> {
    return getStore().del(key);
  },

  async ttl(key: string): Promise<number> {
    return getStore().ttl(key);
  },

  async incr(key: string): Promise<number> {
    return getStore().incr(key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    return getStore().expire(key, seconds);
  },

  async exists(key: string): Promise<number> {
    return getStore().exists(key);
  },
};

export default redis;
