const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const { parseDuration, formatTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Temporarily mute a user from stock commands (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to mute')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Duration of the mute (e.g., 5m, 1h, 7d)')
        .setRequired(true)
        .addChoices(
          { name: '1 minute', value: '1m' },
          { name: '5 minutes', value: '5m' },
          { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },
          { name: '5 hours', value: '5h' },
          { name: '10 hours', value: '10h' },
          { name: '24 hours', value: '24h' },
          { name: '7 days', value: '7d' }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (userId !== config.discord.ownerId) {
      const user = statements.getUser.get(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can mute users.' })],
          ephemeral: true,
        });
      }
    }

    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');

    if (target.id === userId || target.id === config.discord.ownerId) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Target', description: 'You cannot mute this user.' })],
        ephemeral: true,
      });
    }

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Duration', description: 'Invalid duration format. Use: 1m, 5m, 30m, 1h, 5h, 10h, 24h, 7d' })],
        ephemeral: true,
      });
    }

    const muteUntil = Math.floor(Date.now() / 1000) + Math.floor(durationMs / 1000);

    ensureUser(target.id, target.username);
    statements.setMuteUntil.run(muteUntil, target.id);

    const muteEnd = new Date(muteUntil * 1000);

    logger.info(`User muted: ${target.tag} (${target.id}) until ${muteEnd.toLocaleString()} by ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [
        successEmbed({
          title: 'User Muted',
          description: `${target.tag} has been muted from stock commands until ${muteEnd.toLocaleString()}.`,
        }),
      ],
    });
  },
};
