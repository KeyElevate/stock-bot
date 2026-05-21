const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Validates a stock line format: url:email:password
 * @param {string} line - The stock line to validate
 * @returns {object|null} - Parsed stock object or null if invalid
 */
function validateStockLine(line) {
  if (!line || typeof line !== 'string') return null;

  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const parts = trimmed.split(':');
  if (parts.length < 3) return null;

  const url = parts[0].trim();
  const email = parts[1].trim();
  const password = parts.slice(2).join(':').trim();

  if (!url || !email || !password) return null;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;

  return { url, email, password, original: trimmed };
}

/**
 * Parses a stock file and returns valid stock entries
 * @param {string} filePath - Path to the stock file
 * @returns {Array} - Array of valid stock objects
 */
function parseStockFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const stocks = [];

  for (const line of lines) {
    const stock = validateStockLine(line);
    if (stock) {
      stocks.push(stock);
    }
  }

  return stocks;
}

/**
 * Gets the next available stock file number for a service
 * @param {string} service - Service name
 * @returns {number} - Next file number
 */
function getNextStockFileNumber(service) {
  const serviceDir = path.join(config.stock.directory, service.toLowerCase());
  if (!fs.existsSync(serviceDir)) return 1;

  const files = fs.readdirSync(serviceDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));
  if (files.length === 0) return 1;

  const numbers = files
    .map((f) => parseInt(f.replace('stock_', '').replace('.txt', '')))
    .filter((n) => !isNaN(n));

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

/**
 * Gets total stock count for a service
 * @param {string} service - Service name
 * @returns {number} - Total stock count
 */
function getStockCount(service) {
  const serviceDir = path.join(config.stock.directory, service.toLowerCase());
  if (!fs.existsSync(serviceDir)) return 0;

  let count = 0;
  const files = fs.readdirSync(serviceDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));

  for (const file of files) {
    const stocks = parseStockFile(path.join(serviceDir, file));
    count += stocks.length;
  }

  return count;
}

/**
 * Gets all available stock services
 * @returns {Array} - Array of service names
 */
function getStockServices() {
  if (!fs.existsSync(config.stock.directory)) return [];

  return fs
    .readdirSync(config.stock.directory)
    .filter((dir) => fs.statSync(path.join(config.stock.directory, dir)).isDirectory());
}

/**
 * Checks if a stock line already exists in any stock file for a service
 * @param {string} service - Service name
 * @param {string} line - Stock line to check
 * @returns {boolean} - True if duplicate exists
 */
function isStockDuplicate(service, line) {
  const serviceDir = path.join(config.stock.directory, service.toLowerCase());
  if (!fs.existsSync(serviceDir)) return false;

  const files = fs.readdirSync(serviceDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(serviceDir, file), 'utf-8');
    if (content.includes(line)) return true;
  }

  return false;
}

/**
 * Removes a specific stock line from stock files
 * @param {string} service - Service name
 * @param {string} line - Stock line to remove
 * @returns {boolean} - True if removed successfully
 */
function removeStockLine(service, line) {
  const serviceDir = path.join(config.stock.directory, service.toLowerCase());
  if (!fs.existsSync(serviceDir)) return false;

  const files = fs.readdirSync(serviceDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));

  for (const file of files) {
    const filePath = path.join(serviceDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const filteredLines = lines.filter((l) => l.trim() !== line.trim());

    if (filteredLines.length !== lines.length) {
      // Remove empty lines at end
      while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === '') {
        filteredLines.pop();
      }

      if (filteredLines.length === 0) {
        fs.unlinkSync(filePath);
      } else {
        fs.writeFileSync(filePath, filteredLines.join('\n') + '\n', 'utf-8');
      }
      return true;
    }
  }

  return false;
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Parses a duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '5m', '1h', '7d')
 * @returns {number|null} - Duration in milliseconds or null if invalid
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Formats a timestamp to a readable string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date string
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Masks an email for logging purposes
 * @param {string} email - Email to mask
 * @returns {string} - Masked email
 */
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

module.exports = {
  validateStockLine,
  parseStockFile,
  getNextStockFileNumber,
  getStockCount,
  getStockServices,
  isStockDuplicate,
  removeStockLine,
  ensureDirectory,
  parseDuration,
  formatTimestamp,
  maskEmail,
};
