const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.GuildDelete,
  once: false,

  async execute(guild, client) {
    logger.info(`Bot removed from guild: ${guild.name} (${guild.id})`);
  },
};
