const { Events, ActivityType } = require('discord.js');
const { logger } = require('../utils/logger');
const { registerCommands } = require('../handlers/commandHandler');
const config = require('../utils/config');
const { ensureDirectory } = require('../utils/helpers');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    logger.info(`Bot ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Set bot activity
    client.user.setActivity({
      name: '/s help',
      type: ActivityType.Watching,
    });

    // Register slash commands
    try {
      await registerCommands(client);
    } catch (error) {
      logger.error(`Failed to register commands: ${error.message}`);
    }

    // Ensure required directories exist
    ensureDirectory(config.stock.directory);

    // Clear expired cooldowns on startup
    const { statements } = require('../database');
    await statements.clearExpiredCooldowns();

    logger.info('Startup complete');
  },
};
