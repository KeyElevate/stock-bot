const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adminEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');
const { statements, ensureUser } = require('../../database');
const { ensureDirectory, getStockServices } = require('../../utils/helpers');
const config = require('../../utils/config');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Manage stock sections (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Create a new stock section')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the stock section')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete a stock section')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the stock section to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all available stock sections')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('count')
        .setDescription('Show stock count for a service')
        .addStringOption((option) =>
          option
            .setName('service')
            .setDescription('Service name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
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
          embeds: [errorEmbed({ title: 'Access Denied', description: 'Only admins can manage stock sections.' })],
          ephemeral: true,
        });
      }
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        return handleAdd(interaction);
      case 'delete':
        return handleDelete(interaction);
      case 'list':
        return handleList(interaction);
      case 'count':
        return handleCount(interaction);
    }
  },
};

async function handleAdd(interaction) {
  const name = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-_]/g, '');

  if (!name) {
    return interaction.reply({
      embeds: [errorEmbed({ title: 'Invalid Name', description: 'Service name can only contain letters, numbers, hyphens, and underscores.' })],
      ephemeral: true,
    });
  }

  const serviceDir = path.join(config.stock.directory, name);

  if (fs.existsSync(serviceDir)) {
    return interaction.reply({
      embeds: [errorEmbed({ title: 'Already Exists', description: `Stock section **${name}** already exists.` })],
      ephemeral: true,
    });
  }

  ensureDirectory(serviceDir);

  logger.info(`Stock section created: ${name} by ${interaction.user.tag}`);

  await interaction.reply({
    embeds: [
      successEmbed({
        title: 'Stock Section Created',
        description: `Successfully created stock section **${name}**.\nYou can now upload stock using \`/upload-stock\`.`,
      }),
    ],
  });
}

async function handleDelete(interaction) {
  const name = interaction.options.getString('name').toLowerCase();
  const serviceDir = path.join(config.stock.directory, name);

  if (!fs.existsSync(serviceDir)) {
    return interaction.reply({
      embeds: [errorEmbed({ title: 'Not Found', description: `Stock section **${name}** does not exist.` })],
      ephemeral: true,
    });
  }

  // Count stocks before deletion
  const { getStockCount } = require('../../utils/helpers');
  const count = getStockCount(name);

  // Delete directory recursively
  fs.rmSync(serviceDir, { recursive: true, force: true });

  logger.info(`Stock section deleted: ${name} (${count} stocks removed) by ${interaction.user.tag}`);

  await interaction.reply({
    embeds: [
      successEmbed({
        title: 'Stock Section Deleted',
        description: `Successfully deleted stock section **${name}**.\n${count} stock entries were removed.`,
      }),
    ],
  });
}

async function handleList(interaction) {
  const services = getStockServices();

  if (services.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed({ title: 'No Sections', description: 'No stock sections have been created yet.' })],
      ephemeral: true,
    });
  }

  const { getStockCount } = require('../../utils/helpers');
  const fields = [];

  for (const service of services) {
    const count = getStockCount(service);
    fields.push({ name: service, value: `${count} stocks`, inline: true });
  }

  await interaction.reply({
    embeds: [
      adminEmbed({
        title: 'Stock Sections',
        description: `Total: **${services.length}** sections`,
        fields,
      }),
    ],
    ephemeral: true,
  });
}

async function handleCount(interaction) {
  const service = interaction.options.getString('service').toLowerCase();
  const { getStockCount } = require('../../utils/helpers');
  const count = getStockCount(service);

  await interaction.reply({
    embeds: [
      adminEmbed({
        title: `Stock Count: ${service}`,
        description: `**${count}** stock entries available.`,
      }),
    ],
    ephemeral: true,
  });
}
