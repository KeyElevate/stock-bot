const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('../utils/config');
const { logger } = require('../utils/logger');

const commands = new Map();

/**
 * Loads all commands from the commands directory
 * @param {Map} commandsMap - Map to store loaded commands
 */
function loadCommands(commandsMap = commands) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = [];

  // Recursively find all .js files in commands directory
  function findCommandFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findCommandFiles(filePath);
      } else if (file.endsWith('.js')) {
        commandFiles.push(filePath);
      }
    }
  }

  findCommandFiles(commandsPath);

  for (const file of commandFiles) {
    try {
      const command = require(file);
      if (command.data && command.execute) {
        commandsMap.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Skipping command file ${file}: missing data or execute`);
      }
    } catch (error) {
      logger.error(`Failed to load command ${file}: ${error.message}`);
    }
  }

  logger.info(`Loaded ${commandsMap.size} commands`);
  return commandsMap;
}

/**
 * Registers slash commands with Discord API
 * @param {Client} client - Discord client
 */
async function registerCommands(client) {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  const commandData = [];
  for (const [, command] of commands) {
    commandData.push(command.data.toJSON());
  }

  try {
    logger.info('Started refreshing application (/) commands.');

    // Register globally
    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commandData,
    });

    logger.info(`Successfully registered ${commandData.length} application commands.`);
  } catch (error) {
    logger.error(`Failed to register commands: ${error.message}`);
    throw error;
  }
}

/**
 * Gets a command by name
 * @param {string} name - Command name
 * @returns {object|undefined} - Command object
 */
function getCommand(name) {
  return commands.get(name);
}

/**
 * Gets all loaded commands
 * @returns {Map} - Commands map
 */
function getAllCommands() {
  return commands;
}

module.exports = {
  commands,
  loadCommands,
  registerCommands,
  getCommand,
  getAllCommands,
};
