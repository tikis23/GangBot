const config = require('./config.json');

//MongoDB
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(config.db_url, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("Mongoose - Connected to database successfully.");
  }).catch(err => {
    console.error("Mongoose - Could not connect to the database! " + err);
  });
})();

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
