const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user from stock commands (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to blacklist')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (userId !== config.discord.ownerId) {
      const user = statements.getUser.get(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can blacklist users.' })],
          ephemeral: true,
        });
      }
    }

    const target = interaction.options.getUser('user');

    if (target.id === userId || target.id === config.discord.ownerId) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Target', description: 'You cannot blacklist this user.' })],
        ephemeral: true,
      });
    }

    ensureUser(target.id, target.username);
    statements.setBlacklisted.run(1, target.id);

    logger.info(`User blacklisted: ${target.tag} (${target.id}) by ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [
        successEmbed({
          title: 'User Blacklisted',
          description: `${target.tag} has been blacklisted from stock commands.`,
        }),
      ],
    });
  },
};
