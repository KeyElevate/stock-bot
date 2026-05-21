const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a mute from a user (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to unmute')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (userId !== config.discord.ownerId) {
      const user = statements.getUser.get(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can unmute users.' })],
          ephemeral: true,
        });
      }
    }

    const target = interaction.options.getUser('user');

    ensureUser(target.id, target.username);
    statements.setMuteUntil.run(0, target.id);

    logger.info(`User unmuted: ${target.tag} (${target.id}) by ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [
        successEmbed({
          title: 'User Unmuted',
          description: `${target.tag} has been unmuted and can now use stock commands.`,
        }),
      ],
    });
  },
};
