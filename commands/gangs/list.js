const Discord = require("discord.js");
const pool = require("../../db/guild.js");

module.exports = {
  name: "list",
  category: "Gangs",
  description: "Lists all the Gangs in the server",
  aliases: ["listgangs"],
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    (async () =>{
      let conn, gangs;
      try {
        conn = await pool.getConnection();
        gangs = await conn.query("SELECT name, ownerid FROM gangbot_gangs");
      } finally {
        if (conn) conn.release(); //release to pool

        let list = "";
        gangs.forEach(gang => {
          list += `**- ${gang.name}** >> Owner <@${gang.ownerid}>\n`
        })

        const listEmbed = new Discord.MessageEmbed()
        .setTitle(`**${message.guild.name}**'s Gangs`)
        .setTimestamp()
        .setAuthor(message.author.tag, message.author.avatarURL())
        .setColor("PURPLE")
        .setDescription(list.length > 0 ? list : "No Gangs")
        message.channel.send(listEmbed)
      }
    })();
  }
};
