const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from using the bot (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to ban')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Check if user is bot owner or admin
    if (userId !== config.discord.ownerId) {
      const user = statements.getUser.get(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can ban users.' })],
          ephemeral: true,
        });
      }
    }

    const target = interaction.options.getUser('user');

    // Prevent banning self or owner
    if (target.id === userId) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Target', description: 'You cannot ban yourself.' })],
        ephemeral: true,
      });
    }

    if (target.id === config.discord.ownerId) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Target', description: 'You cannot ban the bot owner.' })],
        ephemeral: true,
      });
    }

    ensureUser(target.id, target.username);
    statements.setBanned.run(1, target.id);

    logger.info(`User banned: ${target.tag} (${target.id}) by ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [
        successEmbed({
          title: 'User Banned',
          description: `${target.tag} has been banned from using the bot.`,
        }),
      ],
    });
  },
};
