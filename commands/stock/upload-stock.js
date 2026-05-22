const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const {
  validateStockLine,
  isStockDuplicate,
  getNextStockFileNumber,
  ensureDirectory,
  getStockCount,
} = require('../../utils/helpers');
const config = require('../../utils/config');
const path = require('path');
const fs = require('fs');

// Store pending uploads
const pendingUploads = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upload-stock')
    .setDescription('Upload stock from a .txt file (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('service')
        .setDescription('The service name for the stock')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName('file')
        .setDescription('Stock file (.txt) - format: url:email:password')
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const { getStockServices } = require('../../utils/helpers');
    const services = getStockServices();

    const filtered = services.filter((s) => s.toLowerCase().includes(focusedValue)).slice(0, 25);

    await interaction.respond(
      filtered.map((s) => ({ name: s, value: s }))
    );
  },

  async execute(interaction) {
    const userId = interaction.user.id;

    // Check if user is bot owner or admin
    if (!config.discord.ownerIds.includes(interaction.user.id)) {
      const user = await statements.getUser(userId);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can upload stock.' })],
          ephemeral: true,
        });
      }
    }

    const service = interaction.options.getString('service').toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const attachment = interaction.options.getAttachment('file');

    // Ensure service directory exists
    const serviceDir = path.join(config.stock.directory, service);
    ensureDirectory(serviceDir);

    if (attachment) {
      // File attached - process immediately
      await interaction.deferReply({ ephemeral: true });
      return await processUpload(interaction, service, attachment.url, serviceDir);
    } else {
      // No file - wait for file upload
      await interaction.reply({
        embeds: [
          warningEmbed({
            title: 'Waiting for File',
            description: `Please upload a **.txt** file with stock for **${service}** within the next **60 seconds**.\n\nFormat: \`url:email:password\` (one per line)`,
          }),
        ],
        ephemeral: true,
      });

      // Set up a message collector for 60 seconds
      const filter = (m) => m.author.id === userId && m.attachments.size > 0;
      const collected = await interaction.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ['time'],
      }).catch(() => null);

      if (!collected || collected.size === 0) {
        await interaction.followUp({
          embeds: [errorEmbed({ title: 'Timeout', description: 'No file was uploaded within 60 seconds.' })],
          ephemeral: true,
        });
        return;
      }

      const msg = collected.first();
      const fileAttachment = msg.attachments.first();

      if (!fileAttachment.name.endsWith('.txt')) {
        await interaction.followUp({
          embeds: [errorEmbed({ title: 'Invalid File', description: 'Please upload a .txt file.' })],
          ephemeral: true,
        });
        return;
      }

      await interaction.followUp({
        embeds: [warningEmbed({ title: 'Processing', description: 'Processing your stock file...' })],
        ephemeral: true,
      });

      await processUpload(interaction, service, fileAttachment.url, serviceDir);
    }
  },
};

async function processUpload(interaction, service, fileUrl, serviceDir) {
  try {
    // Download the file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const content = await response.text();
    const lines = content.split('\n');

    let valid = 0;
    let duplicates = 0;
    let invalid = 0;
    let currentFileNumber = getNextStockFileNumber(service);
    let currentFileLines = [];
    let filesWritten = 0;

    for (const line of lines) {
      const stock = validateStockLine(line);

      if (!stock) {
        if (line.trim() && !line.trim().startsWith('#')) {
          invalid++;
        }
        continue;
      }

      // Check for duplicates
      if (isStockDuplicate(service, stock.original)) {
        duplicates++;
        continue;
      }

      currentFileLines.push(stock.original);
      valid++;

      // Write to file when we reach max per file or max per upload
      if (currentFileLines.length >= config.bot.maxStockPerUpload) {
        const fileName = `stock_${currentFileNumber}.txt`;
        fs.writeFileSync(path.join(serviceDir, fileName), currentFileLines.join('\n') + '\n');
        currentFileNumber++;
        filesWritten++;
        currentFileLines = [];
      }
    }

    // Write remaining lines
    if (currentFileLines.length > 0) {
      const fileName = `stock_${currentFileNumber}.txt`;
      fs.writeFileSync(path.join(serviceDir, fileName), currentFileLines.join('\n') + '\n');
      filesWritten++;
    }

    const totalStock = getStockCount(service);

    logger.info(`Stock uploaded: service=${service} valid=${valid} duplicates=${duplicates} invalid=${invalid} by ${interaction.user.tag}`);

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: 'Stock Upload Complete',
          description: `Successfully uploaded stock for **${service}**.`,
          fields: [
            { name: 'Valid Entries', value: `${valid}`, inline: true },
            { name: 'Duplicates Skipped', value: `${duplicates}`, inline: true },
            { name: 'Invalid Lines', value: `${invalid}`, inline: true },
            { name: 'Files Written', value: `${filesWritten}`, inline: true },
            { name: 'Total Stock', value: `${totalStock}`, inline: true },
          ],
        }),
      ],
    });
  } catch (error) {
    logger.error(`Stock upload failed: ${error.message}`);

    await interaction.editReply({
      embeds: [
        errorEmbed({
          title: 'Upload Failed',
          description: `Failed to process the stock file: ${error.message}`,
        }),
      ],
    });
  }
}
