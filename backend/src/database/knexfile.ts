import type { Knex } from 'knex';
import path from 'path';
import { config } from '../config';

const knexConfig: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(config.db.path),
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn: any, cb: Function) => {
      conn.pragma('journal_mode = WAL');
      conn.pragma('foreign_keys = ON');
      cb(null, conn);
    },
  },
};

export default knexConfig;
