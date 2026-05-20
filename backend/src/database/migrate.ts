/**
 * CalcMaster — SQLite Database Migration
 * Zero-install: creates all 14 tables automatically on startup.
 * No MySQL needed. No Redis needed. Just Node.js.
 */
import { db } from '../config/database';

const MIGRATIONS = [
  // ── 1. users ──
  `CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    email           TEXT UNIQUE,
    phone           TEXT UNIQUE,
    password_hash   TEXT,
    avatar_url      TEXT,
    nickname        TEXT,
    invite_code     TEXT UNIQUE,
    invited_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    third_party_id  TEXT,
    third_party_type TEXT,
    total_recharge  REAL NOT NULL DEFAULT 0.0,
    status          INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 2. calculation_history ──
  `CREATE TABLE IF NOT EXISTS calculation_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expression       TEXT NOT NULL,
    result           TEXT NOT NULL,
    type             INTEGER NOT NULL DEFAULT 1,
    tokens_spent     INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    is_deleted       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 3. favorites ──
  `CREATE TABLE IF NOT EXISTS favorites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calculation_id  INTEGER REFERENCES calculation_history(id) ON DELETE SET NULL,
    expression      TEXT,
    result          TEXT,
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 4. login_logs ──
  `CREATE TABLE IF NOT EXISTS login_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_type    INTEGER NOT NULL DEFAULT 1,
    ip_address    TEXT,
    device_info   TEXT,
    location      TEXT,
    is_abnormal   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 5. user_wallet ──
  `CREATE TABLE IF NOT EXISTS user_wallet (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    token_balance          INTEGER NOT NULL DEFAULT 0,
    total_tokens_purchased INTEGER NOT NULL DEFAULT 0,
    total_tokens_consumed  INTEGER NOT NULL DEFAULT 0,
    total_tokens_earned    INTEGER NOT NULL DEFAULT 0,
    created_at             TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 6. user_vip ──
  `CREATE TABLE IF NOT EXISTS user_vip (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level       INTEGER NOT NULL DEFAULT 1,
    start_date  TEXT NOT NULL,
    end_date    TEXT,
    auto_renew  INTEGER NOT NULL DEFAULT 0,
    status      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 7. user_rate_tier ──
  `CREATE TABLE IF NOT EXISTS user_rate_tier (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tier            INTEGER NOT NULL DEFAULT 3,
    delay_ms        INTEGER NOT NULL DEFAULT 3000,
    max_concurrency INTEGER NOT NULL DEFAULT 1,
    upgraded_at     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 8. recharge_orders ──
  `CREATE TABLE IF NOT EXISTS recharge_orders (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_no          TEXT NOT NULL UNIQUE,
    order_type        INTEGER NOT NULL DEFAULT 1,
    plan_id           TEXT,
    amount            REAL NOT NULL DEFAULT 0,
    original_amount   REAL NOT NULL DEFAULT 0,
    tokens_awarded    INTEGER NOT NULL DEFAULT 0,
    vip_days          INTEGER NOT NULL DEFAULT 0,
    pay_channel       TEXT,
    pay_status        INTEGER NOT NULL DEFAULT 0,
    is_first_purchase INTEGER NOT NULL DEFAULT 0,
    gift_pack_id      TEXT,
    paid_at           TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 9. token_consumption_log ──
  `CREATE TABLE IF NOT EXISTS token_consumption_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type  TEXT NOT NULL,
    operation_desc  TEXT,
    tokens_spent    INTEGER NOT NULL DEFAULT 0,
    balance_before  INTEGER NOT NULL DEFAULT 0,
    balance_after   INTEGER NOT NULL DEFAULT 0,
    source          INTEGER NOT NULL DEFAULT 1,
    ip_address      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 10. user_invites ──
  `CREATE TABLE IF NOT EXISTS user_invites (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code               TEXT,
    invitee_registered_at     TEXT,
    invitee_first_recharge_at TEXT,
    invitee_total_recharge    REAL NOT NULL DEFAULT 0.0,
    inviter_reward_tokens     INTEGER NOT NULL DEFAULT 0,
    status                    INTEGER NOT NULL DEFAULT 0,
    is_valid                  INTEGER NOT NULL DEFAULT 1,
    created_at                TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 11. first_purchase_gift ──
  `CREATE TABLE IF NOT EXISTS first_purchase_gift (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    gift_pack_id        TEXT,
    order_id            INTEGER REFERENCES recharge_orders(id) ON DELETE SET NULL,
    popup_shown_at      TEXT,
    popup_dismissed_at  TEXT,
    popup_status        INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 12. rate_alerts ──
  `CREATE TABLE IF NOT EXISTS rate_alerts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_currency TEXT NOT NULL,
    to_currency   TEXT NOT NULL,
    target_rate   REAL NOT NULL,
    direction     INTEGER NOT NULL DEFAULT 1,
    is_triggered  INTEGER NOT NULL DEFAULT 0,
    notify_method INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 13. exit_intent_log ──
  `CREATE TABLE IF NOT EXISTS exit_intent_log (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    copy_id          TEXT NOT NULL,
    copy_text        TEXT NOT NULL,
    user_action      INTEGER NOT NULL DEFAULT 0,
    session_duration INTEGER NOT NULL DEFAULT 0,
    user_type        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 14. splash_popup_log ──
  `CREATE TABLE IF NOT EXISTS splash_popup_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id   TEXT NOT NULL,
    popup_index  INTEGER NOT NULL DEFAULT 1,
    popup_type   TEXT NOT NULL,
    action       INTEGER NOT NULL DEFAULT 1,
    user_type    INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// ── Indexes ──
const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_calc_user ON calculation_history(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calc_type ON calculation_history(type)`,
  `CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_login_user ON login_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wallet_user ON user_wallet(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_vip_user ON user_vip(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_vip_status ON user_vip(status, end_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tier_user ON user_rate_tier(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_user ON recharge_orders(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_status ON recharge_orders(pay_status)`,
  `CREATE INDEX IF NOT EXISTS idx_token_user ON token_consumption_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invite_inviter ON user_invites(inviter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invite_invitee ON user_invites(invitee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gift_user ON first_purchase_gift(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_alert_user ON rate_alerts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_alert_triggered ON rate_alerts(is_triggered)`,
  `CREATE INDEX IF NOT EXISTS idx_exit_user ON exit_intent_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_splash_session ON splash_popup_log(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_recharge ON users(total_recharge)`,
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
  `CREATE INDEX IF NOT EXISTS idx_order_created ON recharge_orders(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_token_created ON token_consumption_log(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_splash_action ON splash_popup_log(action)`,
];

export async function runMigrations(): Promise<void> {
  console.log('[DB] Running migrations...');

  for (const sql of MIGRATIONS) {
    await db.raw(sql);
  }

  for (const sql of INDEXES) {
    try {
      await db.raw(sql);
    } catch {
      // Index may already exist — ignore
    }
  }

  console.log('[DB] All 14 tables + indexes ready');
}

// Run directly: npx ts-node src/database/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[DB] Migration complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB] Migration failed:', err);
      process.exit(1);
    });
}
