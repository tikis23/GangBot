const Discord = require("discord.js");
const pool = require("../../db/guild.js");

module.exports = {
  name: "setcreator",
  category: "Gangs",
  description: "Sets the Gang creator's usability.",
  aliases: ["setperms"],
  usage: "<everyone/roles/owner> [roles(mention/id)]",
  cooldown: 5,
  reqPermissions: ['ADMINISTRATOR'],
  execute(bot, message, args) {

    (async () =>{
      let conn, settings;
      try {
        conn = await pool.getConnection();
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

        if (!args[0]) return message.error("You didn't provide a option to set as usability.", true, `<everyone/roles/owner>`);
        switch (args[0].toLowerCase()) {
          case "everyone":
            settings.create_allow = 'everyone';
            // save
            (async () =>{
              try {
                conn = await pool.getConnection();
                let ret = await conn.query("UPDATE gangbot_settings SET create_allow = ?, create_roles = ?", [settings.create_allow, ""]);
                message.success("Gang creator usability is successfully set for everyone to use.")
              } finally {
                if (conn) conn.release(); //release to pool
              }
            })();
            break;
          case "owner":
            settings.create_allow = 'owner';
            // save
            (async () =>{
              try {
                conn = await pool.getConnection();
                let ret = await conn.query("UPDATE gangbot_settings SET create_allow = ?, create_roles = ?", [settings.create_allow, ""]);
                message.success("Gang creator usability is successfully set for only owner of this server to use.")
              } finally {
                if (conn) conn.release(); //release to pool
              }
            })();
            break;
          case "roles":
            if (!args[1]) return message.error("You didn't mention or provide any roles required to be able to use gang creator.");
            if (message.mentions.roles.size = 0) return message.error("You didn't mention or provide any roles required to be able to use gang creator.");
            settings.create_allow = 'roles';
            let roles = []
            message.mentions.roles.forEach(r => roles.push(r.id));
            settings.create_roles = JSON.stringify(roles);
            // save
            (async () =>{
              try {
                conn = await pool.getConnection();
                let ret = await conn.query("UPDATE gangbot_settings SET create_allow = ?, create_roles = ?", [settings.create_allow, settings.create_roles]);
                message.success("Gang creator usability is successfully set for the roles you provided to use.")
              } finally {
                if (conn) conn.release(); //release to pool
              }
            })();
            break;
          default:
            return message.error("You didn't provide a option to set as usability.", true, `<everyone/roles/owner>`);
            break;
        }
      }
    })();
  }
};
