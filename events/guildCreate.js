const { Events } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  once: false,

  async execute(guild, client) {
    logger.info(`Bot added to guild: ${guild.name} (${guild.id}) - Members: ${guild.memberCount}`);
  },
};
