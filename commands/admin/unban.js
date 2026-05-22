const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the bot (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to unban')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (!config.discord.ownerIds.includes(userId)) {
      const user = await statements.getUser(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can unban users.' })],
          ephemeral: true,
        });
      }
    }

    const target = interaction.options.getUser('user');

    await ensureUser(target.id, target.username);
    await statements.setBanned(0, target.id);

    logger.info(`User unbanned: ${target.tag} (${target.id}) by ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [
        successEmbed({
          title: 'User Unbanned',
          description: `${target.tag} has been unbanned from the bot.`,
        }),
      ],
    });
  },
};
