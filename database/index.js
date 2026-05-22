const initSqlJs = require('sql.js');
const path = require('path');
const config = require('../utils/config');
const fs = require('fs');

const dbPath = path.join(config.paths.database, 'bot.db');
let db = null;
let SQL = null;

async function initializeDatabase() {
  if (!fs.existsSync(config.paths.database)) {
    fs.mkdirSync(config.paths.database, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    is_admin INTEGER DEFAULT 0,
    is_blacklisted INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    mute_until INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cooldowns (
    user_id TEXT NOT NULL,
    command TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, command)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT,
    service TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT,
    command TEXT NOT NULL,
    guild_id TEXT,
    channel_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS dashboard_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  saveDatabase();
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

async function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function dbRun(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  stmt.step();
  const changes = db.getRowsModified();
  stmt.free();
  saveDatabase();
  return { lastID: 0, changes };
}

const statements = {
  getSetting: (key) => dbGet('SELECT value FROM settings WHERE key = ?', [key]),
  setSetting: (key, value) =>
    dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]),
  getAllSettings: () => dbAll('SELECT * FROM settings'),

  getUser: (id) => dbGet('SELECT * FROM users WHERE id = ?', [id]),
  createUser: (id, username) =>
    dbRun('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)', [id, username]),
  updateUser: (username, id) =>
    dbRun(
      "UPDATE users SET username = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [username, id]
    ),
  setAdmin: (value, id) =>
    dbRun(
      "UPDATE users SET is_admin = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [value, id]
    ),
  setBlacklisted: (value, id) =>
    dbRun(
      "UPDATE users SET is_blacklisted = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [value, id]
    ),
  setBanned: (value, id) =>
    dbRun(
      "UPDATE users SET is_banned = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [value, id]
    ),
  setMuteUntil: (until, id) =>
    dbRun(
      "UPDATE users SET mute_until = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [until, id]
    ),
  getAllUsers: () =>
    dbAll('SELECT * FROM users ORDER BY created_at DESC'),
  getBlacklistedUsers: () =>
    dbAll('SELECT * FROM users WHERE is_blacklisted = 1 ORDER BY created_at DESC'),
  getBannedUsers: () =>
    dbAll('SELECT * FROM users WHERE is_banned = 1 ORDER BY created_at DESC'),
  getMutedUsers: () =>
    dbAll(
      "SELECT * FROM users WHERE mute_until > strftime('%s', 'now') ORDER BY mute_until DESC"
    ),

  getCooldown: (userId, command) =>
    dbGet('SELECT expires_at FROM cooldowns WHERE user_id = ? AND command = ?', [
      userId,
      command,
    ]),
  setCooldown: (userId, command, expiresAt) =>
    dbRun(
      'INSERT OR REPLACE INTO cooldowns (user_id, command, expires_at) VALUES (?, ?, ?)',
      [userId, command, expiresAt]
    ),
  clearCooldown: (userId, command) =>
    dbRun('DELETE FROM cooldowns WHERE user_id = ? AND command = ?', [userId, command]),
  clearExpiredCooldowns: () =>
    dbRun("DELETE FROM cooldowns WHERE expires_at < strftime('%s', 'now')"),

  addStockLog: (userId, username, service, email, status) =>
    dbRun(
      'INSERT INTO stock_logs (user_id, username, service, email, status) VALUES (?, ?, ?, ?, ?)',
      [userId, username, service, email, status]
    ),
  getStockLogs: (limit, offset) =>
    dbAll('SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [
      limit,
      offset,
    ]),
  getStockLogsCount: () => dbGet('SELECT COUNT(*) as count FROM stock_logs'),
  getStockLogsByService: (service, limit, offset) =>
    dbAll(
      'SELECT * FROM stock_logs WHERE service = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [service, limit, offset]
    ),
  getStockLogsCountByService: (service) =>
    dbGet('SELECT COUNT(*) as count FROM stock_logs WHERE service = ?', [service]),
  getRecentStockLogs: () =>
    dbAll('SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT 50'),

  addCommandLog: (userId, username, command, guildId, channelId) =>
    dbRun(
      'INSERT INTO command_logs (user_id, username, command, guild_id, channel_id) VALUES (?, ?, ?, ?, ?)',
      [userId, username, command, guildId, channelId]
    ),
  getCommandLogs: (limit, offset) =>
    dbAll('SELECT * FROM command_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [
      limit,
      offset,
    ]),
  getCommandLogsCount: () => dbGet('SELECT COUNT(*) as count FROM command_logs'),
  getCommandUsageStats: () =>
    dbAll(
      'SELECT command, COUNT(*) as count FROM command_logs GROUP BY command ORDER BY count DESC'
    ),
  getRecentCommandLogs: () =>
    dbAll('SELECT * FROM command_logs ORDER BY created_at DESC LIMIT 50'),
};

async function ensureUser(userId, username) {
  const user = await statements.getUser(userId);
  if (!user) {
    await statements.createUser(userId, username || 'Unknown');
    return statements.getUser(userId);
  }
  if (user.username !== username && username) {
    await statements.updateUser(username, userId);
  }
  return user;
}

async function getStockLogsPaginated(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const logs = await statements.getStockLogs(limit, offset);
  const totalRow = await statements.getStockLogsCount();
  return {
    logs,
    total: totalRow ? totalRow.count : 0,
    page,
    totalPages: totalRow ? Math.ceil(totalRow.count / limit) : 0,
  };
}

async function getCommandLogsPaginated(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const logs = await statements.getCommandLogs(limit, offset);
  const totalRow = await statements.getCommandLogsCount();
  return {
    logs,
    total: totalRow ? totalRow.count : 0,
    page,
    totalPages: totalRow ? Math.ceil(totalRow.count / limit) : 0,
  };
}

module.exports = {
  db,
  statements,
  initializeDatabase,
  ensureUser,
  getStockLogsPaginated,
  getCommandLogsPaginated,
};
