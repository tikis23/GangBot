const Discord = require("discord.js");
const pool = require("../../db/guild.js");

global.gang_invites = []

module.exports = {
  name: "join",
  category: "Gangs",
  description: "Join a gang!",
  usage: "<gang name>",
  cooldown: 5,
  execute(bot, message, args) {
    let gangName = args.join(" ");
    (async () =>{
      let conn, member, gangs;
      try {
        conn = await pool.getConnection();
        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.author.id]);
        member = member[0];
        gangs = await conn.query("SELECT uuid, name, ownerid FROM gangbot_gangs");
      } finally {
        if (conn) conn.release(); //release to pool

        let gang = (function(){for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === gangName) return gangs[i];}
        return null;})();
        if (!gang) return message.error("This gang does not exist!");
        if (member) {
          if (member.gangname != "None") return message.error("You are already in a gang!");
        }
        let userkey = message.author.id+gang.uuid;
        let found = false;
        for (var i = 0; i < global.gang_invites.length; i++) {
            if (global.gang_invites[i] === userkey) {
                global.gang_invites.splice(i, 1);
                found = true;
                break;
            }
        }
        if (!found) return message.error("You are not invited to this gang.");

        member = {
          id: message.author.id,
          tag: message.author.tag,
          ganguuid: gang.uuid,
          gangname: gang.name,
          rank: "Member",
          joinDate: new Date()
        };

        (async () =>{
          try {
            conn = await pool.getConnection();
            let ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate, member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate]);
            message.success(`You successfully joined the **${gang.name}**!`)
            let role = message.guild.roles.cache.find(role => role.name === gang.name);
            if (role) message.member.roles.add(role);
          } finally {
            if (conn) conn.release(); //release to pool
          }
        })();
      }
    })();
  }
};
