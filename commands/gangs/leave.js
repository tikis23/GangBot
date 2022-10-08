const Discord = require("discord.js");
const pool = require("../../db/guild.js");

module.exports = {
  name: "leave",
  category: "Gangs",
  description: "Leave your gang!",
  usage: "<gang name>",
  cooldown: 5,
  execute(bot, message, args) {
    (async () =>{
      let conn, member;
      try {
        conn = await pool.getConnection();

        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.author.id]);
        member = member[0];
      } finally {
        if (conn) conn.release(); //release to pool
        
        if (member && member.gangname != "None") {
          if (member.rank == "Owner") {
            return message.error("You can't leave your own gang. If you wish to transfer your gang's ownership please use the `g?manage transferownership` command.");
          } else if (member.rank == "Admin") {
            let msg = await message.channel.send(`You are a Admin on the **${gangName}**. Are you sure you want to leave your gang?(yes)`);
            msg.channel.awaitMessages(m => m.author.id == message.author.id, {max: 1, time:60000, errors: ['time']}).then(c => {
              if (c.first().content.toLowerCase() != "yes") return message.error("Command cancelled.");
              if (!c.first()) return message.error("Command timed out.");
            });
          }

          let gangName = member.gangname;
          member = {
            id: message.author.id,
            tag: message.author.tag,
            ganguuid: '',
            gangname: "None",
            rank: null,
            joinDate: null
          }
          (async () =>{
            try {
              conn = await pool.getConnection();
              let ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate, member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate]);
              message.success(`You left the **${gangName}**.`);
              let role = message.guild.roles.cache.find(role => role.name === gangName + " gang");
              if (role) message.member.roles.remove(role);
            } finally {
              if (conn) conn.release(); //release to pool
            }
          })();
        } else {
          return message.error("You are not in a gang!");
        }
      }
    })();
  }
};
