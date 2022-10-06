const config = require('./config.json');

//Discord
const { Client, Collection } = require("discord.js");
const client = new Client({
  disableMentions: "everyone",
  messageCacheMaxSize: 35,
  messageCacheLifetime: 60,
  messageSweepInterval: 60
});

client.commands = new Collection();
client.events = new Collection();
client.ready = false;

["commands","events"].forEach(handler => {
  require(`./handlers/${handler}.js`)(client);
});

client.login(config.bot_token);
