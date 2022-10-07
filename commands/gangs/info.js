const Discord = require("discord.js");
const pool = require("../../db/guild.js");
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: "info",
  category: "Gangs",
  description: "Lists the information about a Gang.",
  aliases: ["i"],
  usage: "<gang name>",
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    let gangName = args.join(" ");

    (async () =>{
      let conn, members, gangs;
      try {
        conn = await pool.getConnection();

        members = await conn.query("SELECT * FROM gangbot_members");
        members.metadata = null
        gangs = await conn.query("SELECT * FROM gangbot_gangs");
        gangs.metadata = null

      } finally {
        if (conn) conn.release(); //release to pool

        let gang = (function(){
          for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === gangName) return gangs[i];}
        })();
        if (!gang) return message.error("This gang doesn't exists. Please use `g?list` command to list all the gangs.");
        let memberCount = 0;
        let adminList = [];
        members.forEach(m => {
          if (m.gangname == gangName) {
            if (m.rank == "Member") {memberCount++;}
            else if (m.rank == "Admin") adminList.push(`<@${a.id}>`)
          }
        });
        let owner = (function(){
          for (let i = 0; i < members.length; i++) {if (members[i].id === gang.ownerid) return members[i];}
        })();
        let role = gang.role;
        if (role != "") role = message.guild.roles.cache.get(role);
        let gangEmbed = new Discord.MessageEmbed()
        .setTitle(gang.name)
        .setDescription(gang.description)
        .setColor(gang.color)
        .setAuthor(owner ? owner.tag : gang.ownertag, gang.owneravatar)
        .addField("Admins", adminList.join(", ").length > 0 ? adminList.join(", ") : "No Admins", true)
        .addField("Role", role != "" ? `<@&${role.id}>` : "No Gang Role")
        .addField(":busts_in_silhouette: Members", memberCount + adminList.length + 1, true)
        .addField(":military_medal: Gang Points", `${gang.points} points`, true)
        .setFooter(`Created at: ${gang.createdate}`)
        gang.banner =! null ? gangEmbed.setImage(gang.banner) : null
        message.channel.send(gangEmbed);
      }
    })();
  }
};
