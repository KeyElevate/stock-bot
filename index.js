require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { logger } = require('./utils/logger');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const config = require('./utils/config');
const { ensureDirectory } = require('./utils/helpers');
const { initializeDatabase } = require('./database');

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID', 'OWNER_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] || process.env[envVar].startsWith('your-') || process.env[envVar].startsWith('change-')) {
    logger.error(`Missing or invalid environment variable: ${envVar}`);
    logger.error('Please configure your .env file before starting the bot.');
    process.exit(1);
  }
}

// Ensure required directories exist
ensureDirectory(config.stock.directory);
ensureDirectory(config.paths.database);
ensureDirectory(config.paths.logs);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// Load commands and events
loadCommands();
loadEvents(client);

// Initialize database and start bot
(async () => {
  try {
    await initializeDatabase();
    logger.info('Database initialized');

    // Login to Discord
    await client.login(config.discord.token);
    logger.info(`Logged in as ${client.user?.tag}`);
  } catch (error) {
    logger.error(`Failed to start: ${error.message}`);
    process.exit(1);
  }
})();
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // Don't exit - keep the bot running
});

// Anti-crash: Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error(error.stack);
  // Don't exit - keep the bot running
});

// Anti-crash: Handle SIGTERM and SIGINT for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Export client for dashboard use
module.exports = client;
