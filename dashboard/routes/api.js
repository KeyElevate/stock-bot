const express = require('express');
const router = express.Router();
const { statements, getStockLogsPaginated, getCommandLogsPaginated } = require('../../database');
const { getStockServices, getStockCount, parseStockFile, validateStockLine, ensureDirectory, removeStockLine } = require('../../utils/helpers');
const config = require('../../utils/config');
const path = require('path');
const fs = require('fs');
const { logger } = require('../../utils/logger');

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
  logger.error(`API error: ${err.message}`);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Dashboard statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const services = getStockServices();
  let totalStock = 0;
  const serviceStats = [];

  for (const service of services) {
    const count = getStockCount(service);
    totalStock += count;
    serviceStats.push({ name: service, count });
  }

  const totalUsers = await statements.getAllUsers();
  const blacklistedUsers = await statements.getBlacklistedUsers();
  const bannedUsers = await statements.getBannedUsers();
  const mutedUsers = await statements.getMutedUsers();
  const commandStats = await statements.getCommandUsageStats();
  const stockLogsCount = await statements.getStockLogsCount();
  const commandLogsCount = await statements.getCommandLogsCount();

  res.json({
    totalStock,
    totalServices: services.length,
    serviceStats,
    totalUsers: totalUsers.length,
    blacklistedUsers: blacklistedUsers.length,
    bannedUsers: bannedUsers.length,
    mutedUsers: mutedUsers.length,
    commandStats,
    stockLogsCount: stockLogsCount ? stockLogsCount.count : 0,
    commandLogsCount: commandLogsCount ? commandLogsCount.count : 0,
    botOnline: true,
    uptime: process.uptime(),
  });
}));

// Stock services
router.get('/services', asyncHandler(async (req, res) => {
  const services = getStockServices();
  const serviceData = services.map((s) => ({
    name: s,
    count: getStockCount(s),
  }));
  res.json(serviceData);
}));

// Create a new service
router.post('/services', asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name required' });

  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!sanitizedName) return res.status(400).json({ error: 'Invalid service name' });

  const serviceDir = path.join(config.stock.directory, sanitizedName);
  if (fs.existsSync(serviceDir)) return res.status(409).json({ error: 'Service already exists' });

  ensureDirectory(serviceDir);
  logger.info(`Service created via dashboard: ${sanitizedName}`);
  res.json({ success: true, name: sanitizedName });
}));

// Stock entries for a service
router.get('/stock/:service', asyncHandler(async (req, res) => {
  const service = req.params.service.toLowerCase();
  const serviceDir = path.join(config.stock.directory, service);

  if (!fs.existsSync(serviceDir)) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const files = fs.readdirSync(serviceDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));
  let stocks = [];

  for (const file of files) {
    const filePath = path.join(serviceDir, file);
    const fileStocks = parseStockFile(filePath);
    stocks = stocks.concat(fileStocks.map((s) => ({ ...s, file })));
  }

  res.json({ service, count: stocks.length, stocks });
}));

// Add stock to a service
router.post('/stock/:service/add', asyncHandler(async (req, res) => {
  const service = req.params.service.toLowerCase();
  const { lines } = req.body;

  if (!lines || !Array.isArray(lines)) {
    return res.status(400).json({ error: 'Invalid input. Provide an array of lines.' });
  }

  const serviceDir = path.join(config.stock.directory, service);
  ensureDirectory(serviceDir);

  let valid = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const line of lines) {
    const stock = validateStockLine(line);
    if (!stock) {
      invalid++;
      continue;
    }

    const { isStockDuplicate, getNextStockFileNumber } = require('../../utils/helpers');
    if (isStockDuplicate(service, stock.original)) {
      duplicates++;
      continue;
    }

    valid++;
    const fileNumber = getNextStockFileNumber(service);
    const fileName = `stock_${fileNumber}.txt`;
    const filePath = path.join(serviceDir, fileName);

    fs.appendFileSync(filePath, stock.original + '\n');
  }

  res.json({ valid, duplicates, invalid, total: getStockCount(service) });
}));

// Delete stock entry
router.delete('/stock/:service/:email', asyncHandler(async (req, res) => {
  const service = req.params.service.toLowerCase();
  const email = decodeURIComponent(req.params.email);

  const serviceDir = path.join(config.stock.directory, service);
  if (!fs.existsSync(serviceDir)) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const files = fs.readdirSync(serviceDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));

  for (const file of files) {
    const filePath = path.join(serviceDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const filteredLines = lines.filter((l) => {
      const parts = l.split(':');
      return parts[1]?.trim() !== email;
    });

    if (filteredLines.length !== lines.length) {
      while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === '') {
        filteredLines.pop();
      }

      if (filteredLines.length === 0) {
        fs.unlinkSync(filePath);
      } else {
        fs.writeFileSync(filePath, filteredLines.join('\n') + '\n', 'utf-8');
      }

      return res.json({ success: true, remaining: getStockCount(service) });
    }
  }

  res.status(404).json({ error: 'Stock entry not found' });
}));

// Delete a service
router.delete('/services/:name', asyncHandler(async (req, res) => {
  const name = req.params.name.toLowerCase();
  const serviceDir = path.join(config.stock.directory, name);

  if (!fs.existsSync(serviceDir)) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const count = getStockCount(name);
  fs.rmSync(serviceDir, { recursive: true, force: true });

  res.json({ success: true, removedStock: count });
}));

// Users management
router.get('/users', asyncHandler(async (req, res) => {
  const users = await statements.getAllUsers();
  res.json(users);
}));

// Ban user
router.post('/users/:id/ban', asyncHandler(async (req, res) => {
  await statements.setBanned(1, req.params.id);
  res.json({ success: true });
}));

// Unban user
router.post('/users/:id/unban', asyncHandler(async (req, res) => {
  await statements.setBanned(0, req.params.id);
  res.json({ success: true });
}));

// Blacklist user
router.post('/users/:id/blacklist', asyncHandler(async (req, res) => {
  await statements.setBlacklisted(1, req.params.id);
  res.json({ success: true });
}));

// Unblacklist user
router.post('/users/:id/unblacklist', asyncHandler(async (req, res) => {
  await statements.setBlacklisted(0, req.params.id);
  res.json({ success: true });
}));

// Mute user
router.post('/users/:id/mute', asyncHandler(async (req, res) => {
  const { duration } = req.body;
  const { parseDuration } = require('../../utils/helpers');
  const durationMs = parseDuration(duration);

  if (!durationMs) {
    return res.status(400).json({ error: 'Invalid duration format' });
  }

  const muteUntil = Math.floor(Date.now() / 1000) + Math.floor(durationMs / 1000);
  await statements.setMuteUntil(muteUntil, req.params.id);
  res.json({ success: true, muteUntil });
}));

// Unmute user
router.post('/users/:id/unmute', asyncHandler(async (req, res) => {
  await statements.setMuteUntil(0, req.params.id);
  res.json({ success: true });
}));

// Stock logs
router.get('/logs/stock', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const logs = await getStockLogsPaginated(page, limit);
  res.json(logs);
}));

// Command logs
router.get('/logs/commands', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const logs = await getCommandLogsPaginated(page, limit);
  res.json(logs);
}));

// Bot status
router.get('/status', (req, res) => {
  res.json({
    online: true,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
  });
});

module.exports = router;
