const Discord = require("discord.js");
const pool = require("../../db/guild.js");
const find = require("../../utility/find.js");

module.exports = {
  name: "profile",
  category: "Gangs",
  description: "Get profile information about Gangs",
  usage: "[username/user ID/mention]",
  aliases: ["p"],
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    (async () =>{
      let conn, user, member, gangs;
      try {
        conn = await pool.getConnection();

        if (args[0]) {
          user = await find.guildMember(bot, message, args.join(" "));
          if (!user) return message.error("You didnt provide a true member.", true, "<username/user ID/mention>");
          user = user.user
        } else {
          user = message.author
        }

        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [user.id]);
        member = member[0];
        gangs = await conn.query("SELECT name, uuid FROM gangbot_gangs");
      } finally {
        if (conn) conn.release(); //release to pool

        if (!member) {
          member = {
            id: message.author.id,
            tag: message.author.tag,
            gangname: "None",
            ganguuid: "",
            rank: null,
            joindate: null
          }
        }
        let saveMember = false;
        let gangName = member.gangname;
        if (gangName != 'None' && !(function(){
          for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === gangName) return true;}
          return false;})()) {
            for (let i = 0; i < gangs.length; i++) {
              if (gangs[i].uuid === member.ganguuid) {
                member.gangname = gangs[i].name;
                saveMember = true;
                break;
              }
            }
        } else {
          let tempgang = (function(){for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === gangName) return gangs[i];}
            return null;})();
          if (tempgang && tempgang.uuid != member.ganguuid) {
            member.gangname = "None";
            member.ganguuid = "";
            member.rank = null;
            member.joindate = null;
            saveMember = true;
          }
        }
        if (saveMember) {
          (async () =>{
            try {
              conn = await pool.getConnection();
              let ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate, member.id, member.tag, member.ganguuid, member.gangname, member.rank, member.joinDate]);
            } finally {
              if (conn) conn.release(); //release to pool
            }
          })();
        }
        message.channel.send(new Discord.MessageEmbed()
        .setAuthor(user.tag, user.avatarURL())
        .setDescription(`:fleur_de_lis: **Gang Name**: ${member.gangname}\n:clock10: **Join Date**: ${member.joindate ? member.joindate : "-"}\n:star: **Gang Rank**: ${member.rank ? member.rank : "-"}`)
        .setColor("GOLD")
        .setTimestamp());
      }
    })();
  }
};
