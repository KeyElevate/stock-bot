const Database = require('better-sqlite3');
const path = require('path');
const config = require('../utils/config');
const fs = require('fs');

const dbPath = path.join(config.paths.database, 'bot.db');

// Ensure database directory exists
if (!fs.existsSync(config.paths.database)) {
  fs.mkdirSync(config.paths.database, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    is_admin INTEGER DEFAULT 0,
    is_blacklisted INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    mute_until INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    user_id TEXT NOT NULL,
    command TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, command)
  );

  CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT,
    service TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT,
    command TEXT NOT NULL,
    guild_id TEXT,
    channel_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS dashboard_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
`);

// Prepared statements for common operations
const statements = {
  // Settings
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ),
  getAllSettings: db.prepare('SELECT * FROM settings'),

  // Users
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  createUser: db.prepare(
    'INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)'
  ),
  updateUser: db.prepare(
    'UPDATE users SET username = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
  ),
  setAdmin: db.prepare(
    'UPDATE users SET is_admin = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
  ),
  setBlacklisted: db.prepare(
    'UPDATE users SET is_blacklisted = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
  ),
  setBanned: db.prepare(
    'UPDATE users SET is_banned = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
  ),
  setMuteUntil: db.prepare(
    'UPDATE users SET mute_until = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
  ),
  getAllUsers: db.prepare('SELECT * FROM users ORDER BY created_at DESC'),
  getBlacklistedUsers: db.prepare(
    'SELECT * FROM users WHERE is_blacklisted = 1 ORDER BY created_at DESC'
  ),
  getBannedUsers: db.prepare(
    'SELECT * FROM users WHERE is_banned = 1 ORDER BY created_at DESC'
  ),
  getMutedUsers: db.prepare(
    'SELECT * FROM users WHERE mute_until > strftime(\'%s\', \'now\') ORDER BY mute_until DESC'
  ),

  // Cooldowns
  getCooldown: db.prepare(
    'SELECT expires_at FROM cooldowns WHERE user_id = ? AND command = ?'
  ),
  setCooldown: db.prepare(
    'INSERT OR REPLACE INTO cooldowns (user_id, command, expires_at) VALUES (?, ?, ?)'
  ),
  clearCooldown: db.prepare(
    'DELETE FROM cooldowns WHERE user_id = ? AND command = ?'
  ),
  clearExpiredCooldowns: db.prepare(
    'DELETE FROM cooldowns WHERE expires_at < strftime(\'%s\', \'now\')'
  ),

  // Stock logs
  addStockLog: db.prepare(
    'INSERT INTO stock_logs (user_id, username, service, email, status) VALUES (?, ?, ?, ?, ?)'
  ),
  getStockLogs: db.prepare(
    'SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ),
  getStockLogsCount: db.prepare('SELECT COUNT(*) as count FROM stock_logs'),
  getStockLogsByService: db.prepare(
    'SELECT * FROM stock_logs WHERE service = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ),
  getStockLogsCountByService: db.prepare(
    'SELECT COUNT(*) as count FROM stock_logs WHERE service = ?'
  ),
  getRecentStockLogs: db.prepare(
    'SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT 50'
  ),

  // Command logs
  addCommandLog: db.prepare(
    'INSERT INTO command_logs (user_id, username, command, guild_id, channel_id) VALUES (?, ?, ?, ?, ?)'
  ),
  getCommandLogs: db.prepare(
    'SELECT * FROM command_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ),
  getCommandLogsCount: db.prepare('SELECT COUNT(*) as count FROM command_logs'),
  getCommandUsageStats: db.prepare(
    'SELECT command, COUNT(*) as count FROM command_logs GROUP BY command ORDER BY count DESC'
  ),
  getRecentCommandLogs: db.prepare(
    'SELECT * FROM command_logs ORDER BY created_at DESC LIMIT 50'
  ),
};

// Helper functions
function ensureUser(userId, username) {
  const user = statements.getUser.get(userId);
  if (!user) {
    statements.createUser.run(userId, username || 'Unknown');
    return statements.getUser.get(userId);
  }
  if (user.username !== username && username) {
    statements.updateUser.run(username, userId);
  }
  return statements.getUser.get(userId);
}

function getStockLogsPaginated(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const logs = statements.getStockLogs.all(limit, offset);
  const total = statements.getStockLogsCount.get();
  return {
    logs,
    total: total.count,
    page,
    totalPages: Math.ceil(total.count / limit),
  };
}

function getCommandLogsPaginated(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const logs = statements.getCommandLogs.all(limit, offset);
  const total = statements.getCommandLogsCount.get();
  return {
    logs,
    total: total.count,
    page,
    totalPages: Math.ceil(total.count / limit),
  };
}

module.exports = {
  db,
  statements,
  ensureUser,
  getStockLogsPaginated,
  getCommandLogsPaginated,
};
