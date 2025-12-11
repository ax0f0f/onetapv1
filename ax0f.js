require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Check token availability
if (!process.env.TOKEN) {
  console.error('<:traverser:1400313375547850877> No token found in .env file!');
  process.exit(1);
}

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize command collection
client.commands = new Collection();

// Helper function to log database connection errors
function connectDatabase(dbName) {
  return new sqlite3.Database(dbName, (err) => {
    if (err) {
      console.error(`<:traverser:1400313375547850877> ${dbName} Connection Error:`, err.message);
      return null;
    }
    console.log(`📊 Connected to ${dbName}`);
    return dbName;
  });
}

// Connect to config.db (which now includes event_manager table)
const configDB = connectDatabase('./config.db');

// Promisify the database methods for async usage
const { promisify } = require('util');
const dbAll = promisify(configDB.all).bind(configDB);
const dbRun = promisify(configDB.run).bind(configDB); // Make sure dbRun is defined properly

// Check if the database is initialized properly
if (!configDB) {
  console.error('<:traverser:1400313375547850877> Database connection failed!');
  process.exit(1); // Exit if database failed to connect
}

// Create tables in config.db (including the event_manager table)
configDB.serialize(() => {
  // General tables
  configDB.run(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      room_id TEXT,
      prefix TEXT DEFAULT '.v'
    )
  `);

  configDB.run(`
    CREATE TABLE IF NOT EXISTS temp_channels (
      channel_id TEXT PRIMARY KEY,
      owner_id TEXT,
      guild_id TEXT
    )
  `);

  configDB.run(`
    CREATE TABLE IF NOT EXISTS user_managers (
      owner_id TEXT,
      manager_id TEXT,
      PRIMARY KEY (owner_id, manager_id)
    )
  `);

  configDB.run(`
    CREATE TABLE IF NOT EXISTS whitelist_users (
      owner_id TEXT,
      whitelisted_id TEXT,
      guild_id TEXT,
      PRIMARY KEY (owner_id, whitelisted_id, guild_id)
    )
  `);

  configDB.run(`
    CREATE TABLE IF NOT EXISTS blacklist_users (
      owner_id TEXT,
      blacklisted_id TEXT,
      guild_id TEXT,
      PRIMARY KEY (owner_id, blacklisted_id, guild_id)
    )

    
  `);

  // Event manager table integrated into config.db
  configDB.run(`
    CREATE TABLE IF NOT EXISTS event_manager (
      guild_id TEXT PRIMARY KEY,
      event_name TEXT,
      event_role TEXT,
      event_category TEXT,
      event_channel TEXT
    )
  `);

  configDB.run(`
    CREATE TABLE IF NOT EXISTS task_settings (
      guild_id TEXT PRIMARY KEY,
      taskers TEXT,
      managers TEXT,
      tasklogs TEXT
    )
  `);

});
// Create/Open the task.db SQLite database
const taskDB = new sqlite3.Database('./task.db', (err) => {
  if (err) {
    console.error('❌ Failed to open task.db:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to task.db');
  }
});

// Create the task_counts table if it doesn't exist yet
taskDB.run(`
  CREATE TABLE IF NOT EXISTS task_counts (
    server_id TEXT NOT NULL,
    tasker_id TEXT NOT NULL,
    number_of_tasks INTEGER DEFAULT 0,
    PRIMARY KEY (server_id, tasker_id)
  )
`);
// Load commands
const commandsPath = path.join(__dirname, 'cmds');
const commandFiles = fs.existsSync(commandsPath)
  ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
  : [];

console.log('📁 Loading commands...');
for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if (!command.name || typeof command.execute !== 'function') {
      console.warn(`⚠️ Skipping invalid command file: ${file}`);
      continue;
    }
    client.commands.set(command.name, command);
    console.log(`✅ Loaded command: ${command.name}`);
  } catch (error) {
    console.error(`<:traverser:1400313375547850877> Error loading command ${file}:`, error);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.existsSync(eventsPath)
  ? fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))
  : [];

console.log('📁 Loading events...');
for (const file of eventFiles) {
  try {
    const event = require(path.join(eventsPath, file));
    if (!event.name || typeof event.execute !== 'function') {
      console.warn(`⚠️ Skipping invalid event file: ${file}`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client, configDB));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client, configDB));
    }
    console.log(`✅ Loaded event: ${event.name}`);
  } catch (error) {
    console.error(`<:traverser:1400313375547850877> Error loading event ${file}:`, error);
  }
}

// Log in with token from .env
client.login(process.env.TOKEN);

// Load your button event
const buttonEvent = require('./events/button.js');

// Register button event listener with proper param passing
client.on(buttonEvent.name, (...args) => {
  // args[0] is interaction
  buttonEvent.execute(...args, client, configDB, taskDB);
});

// Export client and the configDB
module.exports = { client, configDB };
