const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements } = require('../../database');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-s')
    .setDescription('Set the channel where /s commands can be used (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to restrict stock commands to (leave empty to remove restriction)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (!config.discord.ownerIds.includes(interaction.user.id)) {
      const user = await statements.getUser(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can configure settings.' })],
          ephemeral: true,
        });
      }
    }

    const channel = interaction.options.getChannel('channel');

    if (channel) {
      await statements.setSetting('stock_channel_id', channel.id);
      logger.info(`Stock channel set to ${channel.name} (${channel.id}) by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          successEmbed({
            title: 'Stock Channel Set',
            description: `Stock commands can now only be used in ${channel}.`,
          }),
        ],
      });
    } else {
      await statements.setSetting('stock_channel_id', '');
      logger.info(`Stock channel restriction removed by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          successEmbed({
            title: 'Restriction Removed',
            description: 'Stock commands can now be used in any channel.',
          }),
        ],
      });
    }
  },
};
