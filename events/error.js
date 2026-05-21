const { logger } = require('../utils/logger');

module.exports = {
  name: 'error',
  once: false,

  async execute(error, client) {
    logger.error(`Discord API Error: ${error.message}`);
    logger.error(error.stack);
  },
};
