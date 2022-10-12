const Discord = require("discord.js");
const pool = require("../../db/guild.js");
const w3color = require("../../utility/w3color.js");
const config = require('../../config.json');

module.exports = {
  name: "points",
  category: "Gangs",
  description: "Manages gang points.",
  usage: "<add/remove/set> [points] [gang name]",
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    if (!args[0] || (args[0] != "add" && args[0] != "remove" && args[0] != "set")) {
      return message.error("You didn't provide a valid option. `add, remove, set`");
    }
    let useType = args[0];
    if (!args[1] || isNaN(args[1])) {
      return message.error("You didn't provide a valid point amount.");
    }
    let points = parseInt(args[1]);
    args.splice(0, 2);
    let gangName = args.join(" ");
    (async () =>{
      let conn, settings, gang;
      try {
        conn = await pool.getConnection();
        gang = await conn.query("SELECT uuid, points FROM gangbot_gangs WHERE name = ?", [gangName]);
        gang = gang[0];
        settings = await conn.query("SELECT * FROM gangbot_settings");
        settings = settings[0];
        if (!settings) return message.error("There was an error, please contact the server owner.");
        if (settings.create_roles != "") {
          settings.create_roles = JSON.parse(settings.create_roles);
        } else {
          settings.create_roles = []
        }
      } finally {
        if (conn) conn.release(); //release to pool

        // check if gang exists
        if (!gang || !gang.uuid) {
          return message.error("This gang doesn't exists. Please use `g?list` command to list all the gangs.")
        }

        // check if can manage points
        if (settings.create_allow == "roles") {
          let missing = []
          settings.create_roles.forEach(role => {
            if (message.guild.roles.cache.get(role)) {
              if (!message.member.roles.cache.get(role)) missing.push(`<@&${message.guild.roles.cache.get(role).id}>`)
            }
          })
          if (missing.length >= settings.create_roles.length) return message.error("You don't have the required role(s) to manage gang points! Missing role(s): " + missing.join(`, `), true)
        }
        if (settings.create_allow == "owner") {
          if (message.guild.ownerID != message.author.id) return message.error("Only server owner can manage gang points.")
        }

        // manage
        if (useType == "add") {
          let newPoints = gang.points + points;
          let a = await conn.query("UPDATE gangbot_gangs SET points = ? WHERE uuid = ?", [newPoints, gang.uuid]);
          return message.success("Points for gang "+gangName+" have been added. New total: "+newPoints+".");
        } else if (useType == "remove") {
          let newPoints = gang.points - points;
          let a = await conn.query("UPDATE gangbot_gangs SET points = ? WHERE uuid = ?", [newPoints, gang.uuid]);
          return message.success("Points for gang "+gangName+" have been removed. New total: "+newPoints+".");
        } else if (useType == "set") {
          let newPoints = points;
          let a = await conn.query("UPDATE gangbot_gangs SET points = ? WHERE uuid = ?", [newPoints, gang.uuid]);
          return message.success("Points for gang "+gangName+" have been set. New total: "+newPoints+".");
        }
      }
    })();
  }
};
