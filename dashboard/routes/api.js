const express = require('express');
const router = express.Router();
const { statements, getStockLogsPaginated, getCommandLogsPaginated } = require('../../database');
const { getStockServices, getStockCount, parseStockFile, validateStockLine, ensureDirectory, removeStockLine } = require('../../utils/helpers');
const config = require('../../utils/config');
const path = require('path');
const fs = require('fs');
const { logger } = require('../../utils/logger');

// Dashboard statistics
router.get('/stats', (req, res) => {
  try {
    const services = getStockServices();
    let totalStock = 0;
    const serviceStats = [];

    for (const service of services) {
      const count = getStockCount(service);
      totalStock += count;
      serviceStats.push({ name: service, count });
    }

    const totalUsers = statements.getAllUsers.all();
    const blacklistedUsers = statements.getBlacklistedUsers.all();
    const bannedUsers = statements.getBannedUsers.all();
    const mutedUsers = statements.getMutedUsers.all();
    const commandStats = statements.getCommandUsageStats.all();
    const stockLogsCount = statements.getStockLogsCount.get();
    const commandLogsCount = statements.getCommandLogsCount.get();

    res.json({
      totalStock,
      totalServices: services.length,
      serviceStats,
      totalUsers: totalUsers.length,
      blacklistedUsers: blacklistedUsers.length,
      bannedUsers: bannedUsers.length,
      mutedUsers: mutedUsers.length,
      commandStats,
      stockLogsCount: stockLogsCount.count,
      commandLogsCount: commandLogsCount.count,
      botOnline: true,
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error(`Stats API error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Stock services
router.get('/services', (req, res) => {
  try {
    const services = getStockServices();
    const serviceData = services.map((s) => ({
      name: s,
      count: getStockCount(s),
    }));
    res.json(serviceData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a new service
router.post('/services', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name required' });

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!sanitizedName) return res.status(400).json({ error: 'Invalid service name' });

    const serviceDir = path.join(config.stock.directory, sanitizedName);
    if (fs.existsSync(serviceDir)) return res.status(409).json({ error: 'Service already exists' });

    ensureDirectory(serviceDir);
    logger.info(`Service created via dashboard: ${sanitizedName}`);
    res.json({ success: true, name: sanitizedName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Stock entries for a service
router.get('/stock/:service', (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// Add stock to a service
router.post('/stock/:service/add', (req, res) => {
  try {
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
  } catch (error) {
    logger.error(`Add stock API error: ${error.message}`);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Delete stock entry
router.delete('/stock/:service/:email', (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// Delete a service
router.delete('/services/:name', (req, res) => {
  try {
    const name = req.params.name.toLowerCase();
    const serviceDir = path.join(config.stock.directory, name);

    if (!fs.existsSync(serviceDir)) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const count = getStockCount(name);
    fs.rmSync(serviceDir, { recursive: true, force: true });

    res.json({ success: true, removedStock: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Users management
router.get('/users', (req, res) => {
  try {
    const users = statements.getAllUsers.all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Ban user
router.post('/users/:id/ban', (req, res) => {
  try {
    statements.setBanned.run(1, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.post('/users/:id/unban', (req, res) => {
  try {
    statements.setBanned.run(0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Blacklist user
router.post('/users/:id/blacklist', (req, res) => {
  try {
    statements.setBlacklisted.run(1, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to blacklist user' });
  }
});

// Unblacklist user
router.post('/users/:id/unblacklist', (req, res) => {
  try {
    statements.setBlacklisted.run(0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblacklist user' });
  }
});

// Mute user
router.post('/users/:id/mute', (req, res) => {
  try {
    const { duration } = req.body;
    const { parseDuration } = require('../../utils/helpers');
    const durationMs = parseDuration(duration);

    if (!durationMs) {
      return res.status(400).json({ error: 'Invalid duration format' });
    }

    const muteUntil = Math.floor(Date.now() / 1000) + Math.floor(durationMs / 1000);
    statements.setMuteUntil.run(muteUntil, req.params.id);
    res.json({ success: true, muteUntil });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mute user' });
  }
});

// Unmute user
router.post('/users/:id/unmute', (req, res) => {
  try {
    statements.setMuteUntil.run(0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// Stock logs
router.get('/logs/stock', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const logs = getStockLogsPaginated(page, limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock logs' });
  }
});

// Command logs
router.get('/logs/commands', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const logs = getCommandLogsPaginated(page, limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch command logs' });
  }
});

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
