const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements } = require('../../database');
const { extractServicesFromFlatFiles, importServiceLines, getAllStockFiles } = require('../../utils/helpers');
const config = require('../../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock-u-e-p')
    .setDescription('Scan stock files and preview detected services before importing (admin only)')
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

    const total = serviceEntries.reduce((sum, [, lines]) => sum + lines.length, 0);
    const sorted = serviceEntries.sort((a, b) => b[1].length - a[1].length);
    const MAX_DESC = 4000;

    let descLines = [];
    let descSize = 0;

    for (const [svc, lines] of sorted) {
      const line = `**${svc}** → ${lines.length} account${lines.length > 1 ? 's' : ''}`;
      if (descSize + line.length + 1 > MAX_DESC) break;
      descLines.push(line);
      descSize += line.length + 1;
    }

    let desc = descLines.join('\n');
    const hidden = sorted.length - descLines.length;
    if (hidden > 0) {
      desc += `\n*...and ${hidden} more service${hidden > 1 ? 's' : ''}*`;
    }

    const embed = {
      color: 0x00bfff,
      title: 'Detected Services',
      description: `Found **${sorted.length}** service${sorted.length > 1 ? 's' : ''} across **${total}** account${total > 1 ? 's' : ''}:\n\n${desc}`,
      footer: { text: 'Import will create stock sections and move accounts.' },
    };

    const confirm = new ButtonBuilder()
      .setCustomId('confirm_import')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId('reject_import')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirm, reject);

    const reply = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    let cancelled = false;

    try {
      const collected = await reply.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
        componentType: ComponentType.Button,
      });

      if (collected.customId === 'reject_import') {
        cancelled = true;
        await collected.update({
          embeds: [warningEmbed({ title: 'Cancelled', description: 'Import cancelled. No changes were made.' })],
          components: [],
        });
        return;
      }

      if (collected.customId === 'confirm_import') {
        await collected.update({
          embeds: [{
            color: 0xffa500,
            title: 'Importing...',
            description: 'Processing services, please wait...',
          }],
          components: [],
        });

        let created = 0;
        let imported = 0;
        let skipped = 0;

        for (const [svc, lines] of serviceEntries) {
          const result = importServiceLines(svc, lines);
          if (result.imported > 0) created++;
          imported += result.imported;
          skipped += result.skipped;
        }

        logger.info(`Stock auto-import: ${created} services, ${imported} imported, ${skipped} skipped by ${interaction.user.tag}`);

        const resultEmbed = {
          color: 0x00ff00,
          title: 'Import Completed',
          description: [
            `✓ Created services: **${created}**`,
            `✓ Imported accounts: **${imported}**`,
            `✓ Skipped duplicates: **${skipped}**`,
          ].join('\n'),
        };

        await interaction.editReply({ embeds: [resultEmbed], components: [] });
      }
    } catch (err) {
      if (err.code !== 'INTERACTION_COLLECTOR_ERROR' && !cancelled) {
        logger.error(`stock-u-e-p error: ${err.message}`);
        await interaction.editReply({
          embeds: [errorEmbed({ title: 'Timeout', description: 'No response within 60 seconds. Import cancelled.' })],
          components: [],
        });
      }
    }
  },
};
