const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements } = require('../../database');
const {
  validateStockLine,
  ensureDirectory,
  generateStockFileName,
} = require('../../utils/helpers');
const config = require('../../utils/config');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upload-stock')
    .setDescription('Upload a stock file (.txt) — format: url:email:password (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addAttachmentOption((option) =>
      option
        .setName('file')
        .setDescription('Stock file (.txt) - format: url:email:password (one per line)')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check if user is bot owner or admin
    if (!config.discord.ownerIds.includes(interaction.user.id)) {
      const user = await statements.getUser(interaction.user.id);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can upload stock.' })],
          ephemeral: true,
        });
      }
    }

    const attachment = interaction.options.getAttachment('file');
    if (!attachment.name.endsWith('.txt')) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'Invalid File', description: 'Please upload a .txt file.' })],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('Failed to download file');

      const content = await response.text();
      const lines = content.split('\n');

      let valid = 0;
      let invalid = 0;

      for (const line of lines) {
        if (line.trim() && !line.trim().startsWith('#') && !validateStockLine(line)) {
          invalid++;
        } else if (validateStockLine(line)) {
          valid++;
        }
      }

      ensureDirectory(config.stock.directory);
      const fileName = generateStockFileName();
      const filePath = path.join(config.stock.directory, fileName);

      fs.writeFileSync(filePath, content, 'utf-8');

      logger.info(`Stock uploaded: file=${fileName} valid=${valid} invalid=${invalid} by ${interaction.user.tag}`);

      await interaction.editReply({
        embeds: [
          successEmbed({
            title: 'Stock Upload Complete',
            description: `Saved to \`${fileName}\`.`,
            fields: [
              { name: 'Valid Entries', value: `${valid}`, inline: true },
              { name: 'Invalid Lines', value: `${invalid}`, inline: true },
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
  },
};
