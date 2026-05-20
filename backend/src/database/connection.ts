import { db } from '../config/database';

export { db };

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  if (params) {
    return db.raw(sql, params) as any;
  }
  return db.raw(sql) as any;
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function insert(table: string, data: Record<string, any>): Promise<number> {
  const [id] = await db(table).insert(data);
  return typeof id === 'number' ? id : (id as any)?.id || 0;
}

export async function insertAndGet<T = any>(table: string, data: Record<string, any>): Promise<T> {
  const [id] = await db(table).insert(data);
  const rowId = typeof id === 'number' ? id : (id as any)?.id || id;
  const row = await db(table).where({ id: rowId }).first();
  return row as T;
}
