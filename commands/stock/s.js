const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, stockEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { logger, stockLogger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const { searchStockInFiles, removeStockLineByContent, maskEmail, formatTimestamp } = require('../../utils/helpers');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('s')
    .setDescription('Request stock by searching all files for a URL match')
    .addStringOption((option) =>
      option
        .setName('service')
        .setDescription('Search term (e.g., xbox, netflix, gmail)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const searchTerm = interaction.options.getString('service').toLowerCase();
    const userId = interaction.user.id;

    if (!searchTerm) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Search', description: 'Please provide a search term.' })],
        ephemeral: true,
      });
    }

    await ensureUser(userId, interaction.user.username);

    const user = await statements.getUser(userId);
    if (user && user.is_banned) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Banned', description: 'You are banned from using this bot.' })],
        ephemeral: true,
      });
    }

    if (user && user.is_blacklisted) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Blacklisted', description: 'You are blacklisted from using stock commands.' })],
        ephemeral: true,
      });
    }

    if (user && user.mute_until > Math.floor(Date.now() / 1000)) {
      const muteEnd = new Date(user.mute_until * 1000);
      return interaction.reply({
        embeds: [
          errorEmbed({
            title: 'Muted',
            description: `You are muted from using stock commands until ${muteEnd.toLocaleString()}.`,
          }),
        ],
        ephemeral: true,
      });
    }

    const cooldownKey = `${userId}:s`;
    const cooldown = await statements.getCooldown(userId, cooldownKey);
    if (cooldown && cooldown.expires_at > Math.floor(Date.now() / 1000)) {
      const remaining = cooldown.expires_at - Math.floor(Date.now() / 1000);
      return interaction.reply({
        embeds: [
          warningEmbed({
            title: 'Cooldown Active',
            description: `Please wait ${remaining} second(s) before using this command again.`,
          }),
        ],
        ephemeral: true,
      });
    }

    const cooldownDuration = config.bot.defaultCooldown;
    await statements.setCooldown(
      userId,
      cooldownKey,
      Math.floor(Date.now() / 1000) + cooldownDuration
    );

    const stockChannelSetting = await statements.getSetting('stock_channel_id');
    if (stockChannelSetting && interaction.channelId !== stockChannelSetting.value) {
      return interaction.reply({
        embeds: [
          errorEmbed({
            title: 'Wrong Channel',
            description: `Stock commands can only be used in the designated stock channel.`,
          }),
        ],
        ephemeral: true,
      });
    }

    const results = searchStockInFiles(searchTerm);

    if (results.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'No Stock', description: `No stock found matching **${searchTerm}**.` })],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const stockToDeliver = results[0];
    const remaining = results.length - 1;

    try {
      const dmEmbed = stockEmbed({
        title: `Stock: ${searchTerm.toUpperCase()}`,
        fields: [
          { name: 'Name / URL', value: `\`${stockToDeliver.url}\``, inline: false },
          { name: 'Email', value: `\`${stockToDeliver.email}\``, inline: false },
          { name: 'Password', value: `\`${stockToDeliver.password}\``, inline: false },
        ],
        footer: `Remaining matching: ${remaining}`,
      });

      await interaction.user.send({ embeds: [dmEmbed] });

      removeStockLineByContent(stockToDeliver.original);

      await statements.addStockLog(userId, interaction.user.username, searchTerm, maskEmail(stockToDeliver.email), 'success');
      stockLogger.info(`Stock delivered: user=${interaction.user.tag} search=${searchTerm} email=${maskEmail(stockToDeliver.email)} status=success`);

      await interaction.editReply({
        embeds: [
          successEmbed({
            title: 'Stock Delivered',
            description: `Stock for **${searchTerm}** has been sent to your DMs.`,
            fields: [{ name: 'Remaining Matching', value: `${remaining}`, inline: true }],
          }),
        ],
      });

      await logToStockChannel(interaction, searchTerm, stockToDeliver, 'success');
    } catch (error) {
      logger.error(`DM failed for ${interaction.user.tag}: ${error.message}`);

      await statements.addStockLog(userId, interaction.user.username, searchTerm, maskEmail(stockToDeliver.email), 'dm_failed');
      stockLogger.info(`Stock delivery FAILED: user=${interaction.user.tag} search=${searchTerm} email=${maskEmail(stockToDeliver.email)} status=dm_failed`);

      await interaction.editReply({
        embeds: [
          errorEmbed({
            title: 'Delivery Failed',
            description: 'Could not send the stock to your DMs. Please enable DMs from server members and try again.',
          }),
        ],
      });

      await logToStockChannel(interaction, searchTerm, stockToDeliver, 'dm_failed');
    }
  },
};

async function logToStockChannel(interaction, service, stock, status) {
  try {
    const { statements } = require('../../database');
    const logChannelSetting = await statements.getSetting('stock_logs_channel_id');

    if (!logChannelSetting) return;

    const channel = await interaction.client.channels.fetch(logChannelSetting.value).catch(() => null);
    if (!channel) return;

    const logEmbed = stockEmbed({
      title: 'Stock Delivery Log',
      fields: [
        { name: 'User', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
        { name: 'Service', value: service, inline: true },
        { name: 'Status', value: status === 'success' ? 'Delivered' : 'DM Failed', inline: true },
        { name: 'Email', value: `\`${maskEmail(stock.email)}\``, inline: false },
        { name: 'Time', value: formatTimestamp(Math.floor(Date.now() / 1000)), inline: false },
      ],
    });

    await channel.send({ embeds: [logEmbed] });
  } catch (error) {
    // Silently fail logging
  }
}
