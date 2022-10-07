const Discord = require("discord.js");
const pool = require("../../db/guild.js");

module.exports = {
  name: "leaderboard",
  category: "Gangs",
  description: "Leaderboard of gangs who has most of the members or gang points",
  aliases: ["lb"],
  usage: "[points/members]",
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    (async () =>{
      let conn, members, gangs;
      try {
        conn = await pool.getConnection();
        members = await conn.query("SELECT ganguuid FROM gangbot_members");
        gangs = await conn.query("SELECT name, uuid FROM gangbot_gangs");
      } finally {
        if (conn) conn.release(); //release to pool

        let top = [];
        gangs.forEach(gang => {
          let membercount = 0;
          members.forEach(m => {
            if (m.ganguuid == gang.uuid) membercount++;
          });
          top.push({gang: gang, members: membercount, points: gang.points});
        });

        top.sort((a, b) => b.members - a.members);
        let count = top.length < 10 ? top.length : 10;

        let lb = [];
        for (let i = 0; i < count; i++) {
          lb.push(`${i == 0 ? ':crown:' : (i === 1 ? ':second_place:' : (i === 2 ? ':third_place:': `${i + 1}.`))} **${top[i].gang.name}** | Members: ${top[i].members}`)
        }

        const listEmbed = new Discord.MessageEmbed()
        .setTitle(`🏅 **${message.guild.name}**'s Gang Leaderboard 🏅`)
        .setTimestamp()
        .setAuthor(message.author.tag, message.author.avatarURL())
        .setColor("GOLD")
        .setDescription(lb.length > 0 ? lb : "No Gangs.")
        message.channel.send(listEmbed)
      }
    })();
  }
};
