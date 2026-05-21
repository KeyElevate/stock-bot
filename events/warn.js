const { logger } = require('../utils/logger');

module.exports = {
  name: 'warn',
  once: false,

  async execute(warning, client) {
    logger.warn(`Discord Warning: ${warning}`);
  },
};
