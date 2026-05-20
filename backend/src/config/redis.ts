import Redis from 'ioredis';
import { config } from './index';

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

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async incr(key: string): Promise<number> {
    const value = parseInt((await this.get(key)) || '0', 10) + 1;
    const entry = this.store.get(key);
    this.store.set(key, {
      value: String(value),
      expiresAt: entry?.expiresAt || null,
    });
    return value;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async exists(key: string): Promise<number> {
    return (await this.get(key)) === null ? 0 : 1;
  }

  disconnect() {}
}

const memoryStore = new MemoryStore();
let realRedis: Redis | null = null;
let forcedMemory = !process.env.REDIS_URL && !process.env.REDIS_HOST;

function markMemoryMode() {
  forcedMemory = true;
  try {
    realRedis?.disconnect();
  } catch {}
  realRedis = null;
}

function createRedisClient() {
  if (realRedis || forcedMemory) return realRedis;

  realRedis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 1500,
      })
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 1500,
      });

  realRedis.on('error', () => {
    markMemoryMode();
  });

  realRedis.on('end', () => {
    markMemoryMode();
  });

  return realRedis;
}

async function withStore<T>(operation: (store: Redis | MemoryStore) => Promise<T>): Promise<T> {
  const client = createRedisClient();
  if (!client) return operation(memoryStore);

  try {
    return await operation(client);
  } catch {
    markMemoryMode();
    return operation(memoryStore);
  }
}

export const redis = {
  async get(key: string): Promise<string | null> {
    return withStore((store) => store.get(key));
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    return withStore((store) => {
      if (store instanceof MemoryStore) return store.set(key, value, ttlSeconds);
      return ttlSeconds
        ? (store.set(key, value, 'EX', ttlSeconds) as Promise<'OK'>)
        : (store.set(key, value) as Promise<'OK'>);
    });
  },

  async del(key: string): Promise<number> {
    return withStore((store) => store.del(key));
  },

  async ttl(key: string): Promise<number> {
    return withStore((store) => store.ttl(key));
  },

  async incr(key: string): Promise<number> {
    return withStore((store) => store.incr(key));
  },

  async expire(key: string, seconds: number): Promise<number> {
    return withStore((store) => store.expire(key, seconds));
  },

  async exists(key: string): Promise<number> {
    return withStore((store) => store.exists(key));
  },

  disconnect(): void {
    markMemoryMode();
  },
};

export default redis;
