const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const config = require('../../utils/config');

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

    if (!config.discord.ownerIds.includes(userId)) {
      const user = await statements.getUser(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can blacklist users.' })],
          ephemeral: true,
        });
      }
    }

    const target = interaction.options.getUser('user');

    if (target.id === userId || config.discord.ownerIds.includes(target.id)) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Target', description: 'You cannot blacklist this user.' })],
        ephemeral: true,
      });
    }

    await ensureUser(target.id, target.username);
    await statements.setBlacklisted(1, target.id);

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
