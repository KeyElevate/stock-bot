const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success: 0x2ecc71,
  error: 0xe74c3c,
  warning: 0xf39c12,
  info: 0x3498db,
  default: 0x5865f2,
  stock: 0x1abc9c,
  admin: 0x9b59b6,
};

function createEmbed(options = {}) {
  const embed = new EmbedBuilder();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.color) embed.setColor(options.color);
  if (options.fields) embed.addFields(options.fields);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.timestamp) embed.setTimestamp();
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.author) {
    embed.setAuthor({
      name: options.author.name,
      iconURL: options.author.iconURL,
    });
  }

  return embed;
}

function successEmbed(options = {}) {
  return createEmbed({
    color: COLORS.success,
    timestamp: true,
    footer: 'Stock Bot',
    ...options,
  });
}

function errorEmbed(options = {}) {
  return createEmbed({
    color: COLORS.error,
    timestamp: true,
    footer: 'Stock Bot',
    ...options,
  });
}

function warningEmbed(options = {}) {
  return createEmbed({
    color: COLORS.warning,
    timestamp: true,
    footer: 'Stock Bot',
    ...options,
  });
}

function infoEmbed(options = {}) {
  return createEmbed({
    color: COLORS.info,
    timestamp: true,
    footer: 'Stock Bot',
    ...options,
  });
}

function stockEmbed(options = {}) {
  return createEmbed({
    color: COLORS.stock,
    timestamp: true,
    footer: 'Stock Bot',
    ...options,
  });
}

function adminEmbed(options = {}) {
  return createEmbed({
    color: COLORS.admin,
    timestamp: true,
    footer: 'Stock Bot',
    ...options,
  });
}

module.exports = {
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  stockEmbed,
  adminEmbed,
  COLORS,
};
