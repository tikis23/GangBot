module.exports = client => {
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
  //Categories
  for (const file of commands) {
    const command = require(`../commands/${file[0]}/${file[1]}`)
    client.commands.set(command.name, command);
  }
}
