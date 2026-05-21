const { Events } = require('discord.js');
const { errorEmbed, warningEmbed } = require('../utils/embeds');
const { logger } = require('../utils/logger');
const { getCommand } = require('../handlers/commandHandler');
const { statements, ensureUser } = require('../database');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    // Handle autocomplete
    if (interaction.isAutocomplete()) {
      const command = getCommand(interaction.commandName);
      if (command && command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          logger.error(`Autocomplete error for ${interaction.commandName}: ${error.message}`);
        }
      }
      return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = getCommand(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command executed: ${interaction.commandName}`);
      return;
    }

    // Ensure user exists in database
    ensureUser(interaction.user.id, interaction.user.username);

    // Log command usage
    try {
      statements.addCommandLog.run(
        interaction.user.id,
        interaction.user.username,
        interaction.commandName,
        interaction.guildId,
        interaction.channelId
      );
    } catch (error) {
      logger.error(`Failed to log command: ${error.message}`);
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}: ${error.message}`);
      logger.error(error.stack);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          embeds: [errorEmbed({ title: 'Error', description: 'An unexpected error occurred. Please try again later.' })],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed({ title: 'Error', description: 'An unexpected error occurred. Please try again later.' })],
          ephemeral: true,
        });
      }
    }
  },
};
