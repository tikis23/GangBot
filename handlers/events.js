module.exports = (client) => {
  //dir = events
  const eventFiles = [
    "guildCreate.js",
    "guildRemove.js",
    "message.js",
    "ready.js"
  ];
  for (let i = 0; i < eventFiles.length; i++) {
    const event = require(`../events/${eventFiles[i]}`);
    const name = eventFiles[i].split(".")[0];
    client.events.set(name, event);
    client.on(name, (...args) => client.events.get(name)(client, ...args));
  }
}
