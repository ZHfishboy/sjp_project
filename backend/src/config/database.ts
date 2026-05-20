import knex from 'knex';
import path from 'path';
import fs from 'fs';
import { config } from './index';

// Ensure data directory exists
const dbPath = path.resolve(config.db.path);
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath,
  },
  pool: {
    min: 1,
    max: 10,
    afterCreate: (conn: any, cb: Function) => {
      // Enable WAL mode for better concurrent read performance
      conn.pragma('journal_mode = WAL');
      // Enable foreign keys
      conn.pragma('foreign_keys = ON');
      cb(null, conn);
    },
  },
  useNullAsDefault: true,
  log: {
    warn(message: any) {
      if (config.env === 'development') {
        console.warn('[DB Warn]', message);
      }
    },
    error(message: any) {
      console.error('[DB Error]', message);
    },
  },
});

export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('[DB] SQLite connected —', dbPath);
    return true;
  } catch (error) {
    console.error('[DB] SQLite connection failed:', error);
    return false;
  }
}
