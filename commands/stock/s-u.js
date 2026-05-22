const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, stockEmbed, warningEmbed } = require('../../utils/embeds');
const { logger, stockLogger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const { getStockCount, removeStockLine, parseStockFile, maskEmail, formatTimestamp } = require('../../utils/helpers');
const config = require('../../utils/config');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('s-u')
    .setDescription('Request stock from any service (including custom sections)')
    .addStringOption((option) =>
      option
        .setName('service')
        .setDescription('The service name (e.g., netflix, spotify, etc.)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const service = interaction.options.getString('service').toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const userId = interaction.user.id;

    if (!service) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid Service', description: 'Please provide a valid service name.' })],
        ephemeral: true,
      });
    }

    // Ensure user exists in database
    await ensureUser(userId, interaction.user.username);

    // Check if user is banned
    const user = await statements.getUser(userId);
    if (user && user.is_banned) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Banned', description: 'You are banned from using this bot.' })],
        ephemeral: true,
      });
    }

    // Check if user is blacklisted
    if (user && user.is_blacklisted) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Blacklisted', description: 'You are blacklisted from using stock commands.' })],
        ephemeral: true,
      });
    }

    // Check if user is muted
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

    // Check cooldown
    const cooldownKey = `${userId}:s-u`;
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

    // Set cooldown
    const cooldownDuration = config.bot.defaultCooldown;
    await statements.setCooldown(
      userId,
      cooldownKey,
      Math.floor(Date.now() / 1000) + cooldownDuration
    );

    // Check stock channel restriction
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

    // Check if stock exists
    const stockDir = path.join(config.stock.directory, service);
    if (!fs.existsSync(stockDir)) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'No Stock', description: `No stock available for **${service}**.` })],
        ephemeral: true,
      });
    }

    // Get all stocks from all files
    const files = fs.readdirSync(stockDir).filter((f) => f.startsWith('stock_') && f.endsWith('.txt'));
    let allStocks = [];
    let stockFileMap = [];

    for (const file of files) {
      const filePath = path.join(stockDir, file);
      const stocks = parseStockFile(filePath);
      for (const stock of stocks) {
        allStocks.push(stock);
        stockFileMap.push({ ...stock, file: filePath });
      }
    }

    if (allStocks.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Out of Stock', description: `All **${service}** stock has been delivered.` })],
        ephemeral: true,
      });
    }

    // Acknowledge interaction
    await interaction.deferReply({ ephemeral: true });

    // Deliver stock
    const stockToDeliver = stockFileMap[0];
    const stockCount = allStocks.length;

    try {
      // Send to DM
      const dmEmbed = stockEmbed({
        title: `Stock: ${service.charAt(0).toUpperCase() + service.slice(1)}`,
        fields: [
          { name: 'Name / URL', value: `\`${stockToDeliver.url}\``, inline: false },
          { name: 'Email', value: `\`${stockToDeliver.email}\``, inline: false },
          { name: 'Password', value: `\`${stockToDeliver.password}\``, inline: false },
        ],
        footer: `Remaining: ${stockCount - 1} | Service: ${service}`,
      });

      await interaction.user.send({ embeds: [dmEmbed] });

      // Remove delivered stock
      removeStockLine(service, stockToDeliver.original);

      // Log delivery
      await statements.addStockLog(userId, interaction.user.username, service, maskEmail(stockToDeliver.email), 'success');
      stockLogger.info(`Stock delivered: user=${interaction.user.tag} service=${service} email=${maskEmail(stockToDeliver.email)} status=success`);

      // Send confirmation
      await interaction.editReply({
        embeds: [
          successEmbed({
            title: 'Stock Delivered',
            description: `Stock for **${service}** has been sent to your DMs.`,
            fields: [{ name: 'Remaining Stock', value: `${stockCount - 1}`, inline: true }],
          }),
        ],
      });

      // Log to stock logs channel
      await logToStockChannel(interaction, service, stockToDeliver, 'success');
    } catch (error) {
      logger.error(`DM failed for ${interaction.user.tag}: ${error.message}`);

      await statements.addStockLog(userId, interaction.user.username, service, maskEmail(stockToDeliver.email), 'dm_failed');
      stockLogger.info(`Stock delivery FAILED: user=${interaction.user.tag} service=${service} email=${maskEmail(stockToDeliver.email)} status=dm_failed`);

      await interaction.editReply({
        embeds: [
          errorEmbed({
            title: 'Delivery Failed',
            description: 'Could not send the stock to your DMs. Please enable DMs from server members and try again.',
          }),
        ],
      });

      await logToStockChannel(interaction, service, stockToDeliver, 'dm_failed');
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
