const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure logs directory exists
if (!fs.existsSync(config.paths.logs)) {
  fs.mkdirSync(config.paths.logs, { recursive: true });
}

// Custom format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// File format (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: config.logging.level,
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // General log file
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'bot.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Stock delivery log file
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'stock.log'),
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// Create a stock-specific logger
const stockLogger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'stock-delivery.log'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, message }) => {
          return `[${timestamp}] ${message}`;
        })
      ),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

module.exports = { logger, stockLogger };
