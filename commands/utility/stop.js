const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Safely shuts down the bot (owner/admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Check if user is bot owner
    if (interaction.user.id !== config.discord.ownerId) {
      // Check if user is admin in database
      const { statements } = require('../../database');
      const user = statements.getUser.get(interaction.user.id);

      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only the bot owner or admins can use this command.' })],
          ephemeral: true,
        });
      }
    }

    await interaction.reply({
      embeds: [successEmbed({ title: 'Shutting Down', description: 'The bot is shutting down safely...' })],
    });

    logger.warn(`Bot shutdown initiated by ${interaction.user.tag} (${interaction.user.id})`);

    // Graceful shutdown
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  },
};
