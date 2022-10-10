const Discord = require("discord.js");
const pool = require("../../db/guild.js");
const config = require('../../config.json');

module.exports = {
  name: "remove",
  category: "Gangs",
  description: "Removes the gang you own or a spesific gang.",
  usage: "<gang name>",
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    (async () =>{
      let conn, member, members, gangs;
      try {
        conn = await pool.getConnection();
        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.author.id]);
        member = member[0];
        members = await conn.query("SELECT * FROM gangbot_members");
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
  
        let confirm = await message.channel.send(`:warning: | Do you really wish to remove the **${gang.name}** gang? (yes/no)`);
        confirm.channel.awaitMessages(m => m.author.id == message.author.id, {max: 1, time: 60000, errors: ['time']}).then(c => {
          if (c.first().content.toLowerCase() == "yes" || c.first().content.toLowerCase() == "y") {
            (async () =>{
              try {
                conn = await pool.getConnection();

                let ret = await conn.query("UPDATE gangbot_members SET ganguuid = ?, gangname = ?, `rank` = ?, joindate = ? WHERE gangname = ?", ["", "None", null, null, gang.name]);
                ret = await conn.query("DELETE FROM gangbot_gangs WHERE uuid = ?", [gang.uuid]);
                message.success("The gang has been removed successfully.")
                let role = message.guild.roles.cache.find(role => role.name === user.gangname + " gang");
                if (role) role.delete();
                role = message.guild.roles.cache.find(r => r.id === config.gangrole);
                if (role) {
                  members.forEach(m => {
                    if (m.id) {
                      let u = message.guild.members.cache.get(m.id);
                      if (u) {
                        u.roles.remove(role);
                      }
                    }
                  });
                }
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
