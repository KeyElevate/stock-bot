const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements } = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-s-logs')
    .setDescription('Set the stock logs channel (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel for stock delivery logs (leave empty to disable logging)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Check if user is bot owner or admin
    if (interaction.user.id !== config.discord.ownerId) {
      const user = statements.getUser.get(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can configure settings.' })],
          ephemeral: true,
        });
      }
    }

    const channel = interaction.options.getChannel('channel');

    if (channel) {
      statements.setSetting.run('stock_logs_channel_id', channel.id);
      logger.info(`Stock logs channel set to ${channel.name} (${channel.id}) by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          successEmbed({
            title: 'Stock Logs Channel Set',
            description: `Stock delivery logs will now be sent to ${channel}.`,
          }),
        ],
      });
    } else {
      statements.setSetting.run('stock_logs_channel_id', '');
      logger.info(`Stock logs channel disabled by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          successEmbed({
            title: 'Logging Disabled',
            description: 'Stock delivery logging has been disabled.',
          }),
        ],
      });
    }
  },
};
