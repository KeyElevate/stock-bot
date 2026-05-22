const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements } = require('../../database');
const { getStockServices, getStockCount, searchStockInFiles, importServiceLines, getAllStockFiles } = require('../../utils/helpers');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock-a-p')
    .setDescription('Refill low-stock services by searching flat stock files (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((option) =>
      option
        .setName('threshold')
        .setDescription('Refill services with this many or fewer items (default: 5)')
        .setRequired(false)
        .setMinValue(1)
    ),

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

    const threshold = interaction.options.getInteger('threshold') || 5;

    await interaction.deferReply({ ephemeral: true });

    const existingServices = getStockServices();

    if (existingServices.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed({ title: 'No Services', description: 'No existing stock sections found. Use `/stock-u-e-p` first to create them.', })],
      });
    }

    const lowStock = existingServices
      .map((s) => ({ name: s, count: getStockCount(s) }))
      .filter((s) => s.count <= threshold);

    if (lowStock.length === 0) {
      return interaction.editReply({
        embeds: [successEmbed({ title: 'All Stocked Up', description: `All ${existingServices.length} services have more than ${threshold} items. Nothing to refill.`, })],
      });
    }

    let refilled = 0;
    let imported = 0;
    let skipped = 0;

    for (const svc of lowStock) {
      const results = searchStockInFiles(svc.name);
      if (results.length === 0) continue;

      const lines = results.map((r) => r.original);
      const result = importServiceLines(svc.name, lines);
      if (result.imported > 0) refilled++;
      imported += result.imported;
      skipped += result.skipped;
    }

    if (refilled === 0) {
      return interaction.editReply({
        embeds: [warningEmbed({ title: 'Nothing Found', description: `Found ${lowStock.length} low-stock service(s), but no matching entries in flat stock files.`, })],
      });
    }

    logger.info(`Stock auto-parse: refilled ${refilled}/${lowStock.length} low-stock services, ${imported} imported, ${skipped} skipped by ${interaction.user.tag}`);

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: 'Refill Completed',
          description: [
            `✓ Refilled: **${refilled}** / **${lowStock.length}** low-stock service${lowStock.length > 1 ? 's' : ''}`,
            `✓ Imported accounts: **${imported}**`,
            `✗ Skipped duplicates: **${skipped}**`,
          ].join('\n'),
        }),
      ],
    });
  },
};
