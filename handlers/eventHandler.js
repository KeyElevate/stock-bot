const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

const events = new Map();

/**
 * Loads all event handlers from the events directory
 * @param {Client} client - Discord client
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));
      if (event.name && event.execute) {
        events.set(event.name, event);

        // Register the event with the client
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        logger.info(`Loaded event: ${event.name} (${event.once ? 'once' : 'on'})`);
      } else {
        logger.warn(`Skipping event file ${file}: missing name or execute`);
      }
    } catch (error) {
      logger.error(`Failed to load event ${file}: ${error.message}`);
    }
  }

  logger.info(`Loaded ${events.size} events`);
  return events;
}

/**
 * Gets an event by name
 * @param {string} name - Event name
 * @returns {object|undefined} - Event object
 */
function getEvent(name) {
  return events.get(name);
}

module.exports = {
  events,
  loadEvents,
  getEvent,
};
