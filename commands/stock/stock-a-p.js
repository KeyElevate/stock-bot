const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements } = require('../../database');
const { extractServicesFromFlatFiles, importServiceLines, getAllStockFiles } = require('../../utils/helpers');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock-a-p')
    .setDescription('Auto-parse all stock files and import detected services immediately (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!config.discord.ownerIds.includes(interaction.user.id)) {
      const user = await statements.getUser(interaction.user.id);
      if (!user || !user.is_admin) {
        return interaction.reply({
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can use this command.' })],
          ephemeral: true,
        });
      }
    }

    const flatFiles = getAllStockFiles();
    if (flatFiles.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed({ title: 'No Stock Files', description: 'No flat stock files found. Upload stock first with `/upload-stock`.', })],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const services = extractServicesFromFlatFiles();
    const serviceEntries = Object.entries(services);

    if (serviceEntries.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed({ title: 'No Services Detected', description: 'Could not detect any valid services from the stock files.', })],
      });
    }

    let created = 0;
    let imported = 0;
    let skipped = 0;

    for (const [svc, lines] of serviceEntries) {
      const result = importServiceLines(svc, lines);
      if (result.imported > 0) created++;
      imported += result.imported;
      skipped += result.skipped;
    }

    logger.info(`Stock auto-parse: ${created} services, ${imported} imported, ${skipped} skipped by ${interaction.user.tag}`);

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: 'Import Completed',
          description: [
            `✓ Created services: **${created}**`,
            `✓ Imported accounts: **${imported}**`,
            `✓ Skipped duplicates: **${skipped}**`,
          ].join('\n'),
        }),
      ],
    });
  },
};
