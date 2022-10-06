const Discord = require("discord.js");

function prettyString(string) {
 return string.replace(/_/g, " ").replace(/guild/gi, "Server").replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();})
}

module.exports = {
  name: "help",
  category: "General",
  description: "Shows the list of commands.",
  aliases: ["commands"],
  examples: "gn!help embed\ngn!commands",
  usage: "[command name]",
  cooldown: 5,
  execute(bot, message, args) {
    if (!args[0]) {

      let helpEmbed = new Discord.MessageEmbed()
      .setTitle("Here are the commands:")
      .setDescription(`Use \`${message.prefix}help <command name>\` to get into a command's details.`)
      .setTimestamp()
      .setFooter("Requested by " + message.author.username, message.author.avatarURL())
      .setColor("BLUE");

      //dir = commands
      const commands = [
        ["dev", "addguild.js"],
        ["dev", "backdoor.js"],
        ["dev", "changelog.js"],
        ["dev", "eval.js"],
        ["dev", "reload.js"],
        ["dev", "test.js"],
        ["gangs", "create.js"],
        ["gangs", "info.js"],
        ["gangs", "join.js"],
        ["gangs", "leaderboard.js"],
        ["gangs", "leave.js"],
        ["gangs", "list.js"],
        ["gangs", "manage.js"],
        ["gangs", "profile.js"],
        ["gangs", "remove.js"],
        ["gangs", "setcreator.js"],
        ["general", "help.js"],
        ["general", "ping.js"]
      ];
      let helpList = {"dev":[], "gangs":[], "general":[]};
      commands.forEach(entry => {
        if (entry[0] === "dev") return;
        const command = entry[1].slice(0, entry[1].length-3)
        if (!bot.commands.get(command).dev && !bot.commands.get(command).unstaged) helpList[entry[0]].push(`\`${command}\``);
      });
      //helpEmbed.addField("Dev", helpList["dev"].join(", "));
      helpEmbed.addField("Gangs", helpList["gangs"].join(", "));
      helpEmbed.addField("General", helpList["general"].join(", "));
      message.channel.send(helpEmbed);
    } else {

      let command = bot.commands.get(args[0].toLowerCase())
      if (!command) return message.channel.send(`<:cross:724049024943915209> | There's no such a command like that, to see the full command list please use \`${message.prefix}commands\` command. `);

      let perms = []
      if (command.reqPermissions) {
        command.reqPermissions.forEach(perm => {
          perms.push(prettyString(perm))
        })
      }
      let helpEmbed = new Discord.MessageEmbed()
      .setTitle(command.name)
      .setFooter("The usage in <> is required, [] is optional. Requested by " + message.author.tag, message.author.avatarURL())
      .setColor("#fffff0")
      if (command.description) helpEmbed.addField("**Description**", command.description);
      if (command.category) helpEmbed.addField("**Category**", command.category, true)
      if (command.aliases) helpEmbed.addField("**Aliases**", command.aliases.join(', '), true);
      if (command.usage) helpEmbed.addField("**Usage**", `\`${message.prefix + command.name} ${command.usage}\``, true);
      if (command.examples) helpEmbed.addField("**Examples**", `\`\`\`${command.examples}\`\`\``);
      if (command.reqPermissions) helpEmbed.addField("**Required Permission(s)**", perms);
      if (command.guildOnly) helpEmbed.addField("**Guild Only**", "Command only can be executed in a server.");
      if (command.dmOnly) helpEmbed.addField("**DM Only**", "Command only can be executed in DMs.");
      if (command.dev) helpEmbed.addField("**Dev**", "Only Bot Developers can execute this command.");
      if (command.voted) helpEmbed.addField("**Voted**", "You have to vote for the bot to use this command.")
      if (command.cooldown) helpEmbed.addField("**Cooldown**", command.cooldown + " second(s)");
      message.channel.send(helpEmbed)
    }
  }
};
