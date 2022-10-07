const Discord = require("discord.js");
const pool = require("../../db/guild.js");

module.exports = {
  name: "remove",
  category: "Gangs",
  description: "Removes the gang you own or a spesific gang.",
  usage: "<gang name>",
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    (async () =>{
      let conn, member, gangs;
      try {
        conn = await pool.getConnection();
        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.author.id]);
        member = member[0];
        gangs = await conn.query("SELECT uuid, name, ownerid, ownertag FROM gangbot_gangs");
      } finally {
        if (conn) conn.release(); //release to pool

        let user = member;
        let gang = { name: null };
        if (!user) {
            user = {
              id: message.author.id,
              tag: message.author.tag,
              ganguuid: '',
              gangname: "None",
              rank: null,
              joinDate: null
            }
            if (message.guild.ownerID != message.author.id) return message.error("You dont own a Gang!");
        } else {
          gang = (function(){
            for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === user.gangname) return gangs[i];}
          })();
        }

        if (args[0]) {
          if (message.guild.ownerID != message.author.id && !message.member.permissions.has("ADMINISTRATOR") && user.rank != "Owner") return message.error("You do not have permission to remove gangs. Only Administrators, Server Owner or Gang Owners can remove gangs.");
          gang = (function(){
            for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === args.join(" ")) return gangs[i];}
          })();
          if (!gang) return message.error("This gang does not exist! Use the `g?list` command to see all gangs.");
          if (message.author.id != gang.ownerid) return message.error("You are not the owner of this gang.")
        } else {
          if (user.rank != "Owner") return message.error("You cannot remove a gang, you must be a Owner of the gang or a Server Admin to do it so.");
        }
  
        let confirm = await message.channel.send(`<:warning:724052384031965284> | Do you really wish to remove the **${gang.name}** gang? (yes/no)`);
        confirm.channel.awaitMessages(m => m.author.id == message.author.id, {max: 1, time: 60000, errors: ['time']}).then(c => {
          if (c.first().content.toLowerCase() == "yes" || c.first().content.toLowerCase() == "y") {
            member = {
              id: gang.ownerid,
              tag: gang.ownertag,
              ganguuid: '',
              gangname: "None",
              rank: null,
              joinDate: null
            };
            (async () =>{
              try {
                conn = await pool.getConnection();

                let ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate, member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate]);
                ret = await conn.query("DELETE FROM gangbot_gangs WHERE uuid = ?", [gang.uuid]);
                message.success("The gang has been removed successfully.")
              } finally {
                if (conn) conn.release(); //release to pool
              }
            })();
          } else {
            return message.error("Command cancelled.");
          }
        });

      }
    })();
  }
};
