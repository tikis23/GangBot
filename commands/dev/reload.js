const Discord = require("discord.js");

module.exports = {
  name: "reload",
  category: "Dev",
  description: "Reloads a command.",
  usage: "[command name]",
  example: `gn!reload help`,
  dev: true,
  execute(bot, message, args) {
    if (!args[0]) return message.channel.send(`:x: | Missing arguments. \n-Usage: \`${message.prefix}${this.name} ${this.usage}\``);
    let commandName = args[0].toLowerCase()
    if (!bot.commands.get(commandName)) return message.channel.send(":x: | This command does not exist.");
    let category = bot.commands.get(commandName).category.toLowerCase()

    try {
      delete require.cache[require.resolve(`../${category}/${commandName}.js`)];
      bot.commands.delete(commandName);
      const pull = require(`../${category}/${commandName}.js`);
      !pull.category ? pull.category = category : null
      bot.commands.set(commandName, pull);
    } catch(err) {
      return message.channel.send(":x: | Could not reload the command: " + err);
    }

    message.channel.send(":x: | Command has been reloaded successfully.");
  }
};
