require('dotenv').config();
const path = require('path');

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    ownerId: process.env.OWNER_ID,
  },
  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT) || 3000,
    secret: process.env.DASHBOARD_SECRET || 'change-this-to-a-random-secure-string',
    username: process.env.DASHBOARD_USERNAME || 'admin',
    password: process.env.DASHBOARD_PASSWORD || 'change-me-secure-password',
  },
  bot: {
    prefix: process.env.BOT_PREFIX || '!',
    defaultCooldown: parseInt(process.env.DEFAULT_COOLDOWN) || 5,
    stockDeliveryDelay: parseInt(process.env.STOCK_DELIVERY_DELAY) || 3500,
    maxStockPerUpload: parseInt(process.env.MAX_STOCK_PER_UPLOAD) || 500,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    stockChannelId: process.env.LOG_STOCK_CHANNEL_ID || null,
  },
  stock: {
    channelId: process.env.STOCK_CHANNEL_ID || null,
    directory: path.join(__dirname, '..', 'stocks'),
  },
  paths: {
    database: path.join(__dirname, '..', 'database'),
    logs: path.join(__dirname, '..', 'logs'),
    stocks: path.join(__dirname, '..', 'stocks'),
  },
};
