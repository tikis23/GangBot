const Discord = require("discord.js");
const pool = require("../../db/guild.js");
const find = require("../../utility/find.js");
const w3color = require("../../utility/w3color.js");
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: "create",
  category: "Gangs",
  description: "Creates a gang. If allowed for everyone, gangs will be created as their own unless they have Manage Server permission.",
  aliases: ["addgang"],
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    (async () =>{
      let conn, member, settings, gangs;
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

        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.author.id]);
        member = member[0];
        gangs = await conn.query("SELECT name FROM gangbot_gangs");
      } finally {
        if (conn) conn.release(); //release to pool

        if (member && settings.create_allow == "everyone") {
          if (member.ganguuid != "") return message.error("You are already in a gang!");
        }

        if (settings.create_allow == "everyone") {
        //Public
        let collector = message.channel.createMessageCollector(m => m.author.id === message.author.id, { time: 600000 })
        let msg = await message.channel.send("Gang creator started! What should be the gang's name? (case sensitive)\nType in `cancel` anytime to exit the creator.");
        let uuid = uuidv4();

        let newGang = {
          name: "",
          uuid: uuid,
          description: "",
          owner: {
            tag: message.author.tag,
            avatar: message.author.avatarURL(),
            id: message.author.id
          },
          points: 0,
          banner: "",
          color: "#000000",
          role: "",
          createdAt: new Date()
        }

        collector.on("collect", c => {
          if (c.content.toLowerCase() == "cancel") {
            collector.stop()
            return message.channel.send("Gang creator has been cancelled.");
          }
          let count = collector.collected.size;
          switch (count) {
            case 1:
              //Name
              if (c.content.length > 32 || c.content.length < 3 || c.content.includes('\n')) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang Name length must be in between 3 and 32 characters and should not include newlines(Case sensitive).\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else if ((function(){
                for (let i = 0; i < gangs.length; i++) {
                  if (gangs[i].name === c.content) return true;
                }
                return false;
              })()) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("A gang with this name already exist!.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.name = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's name will be \`${c.content}\`, what should be the description to the gang?\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 2:
              //Description
              if (c.content.length > 1024 || c.content.length < 3) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang Name length must be in between 3 and 1024 characters.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.description = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's description has been set, what should be the color of the gang?\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 3:
              //Color
              if (!w3color(c.content).valid) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang color must be a valid color.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.color = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's color is set, What should be the flag of this gang? Please attach a image or type in \`skip\`.\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 4:
              //Banner
              if (!c.attachments.first() && c.content.toLowerCase() != "skip") {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("You must attach a image with your message.\nPlease try again or type in \`skip\` to skip. Type in `cancel` to cancel.", true).then(m => m.delete({timeout: 5000}))
              } else if (c.attachments.first() || c.content.toLowerCase() == "skip") {
                newGang.banner = c.attachments.first() ? c.attachments.first().url : null
                msg.delete().then(async () => msg = await message.channel.send(`Gang's banner is now set. Your gang has been created! Your followers now can use the \`g?join ${newGang.name}\` command to join your gang.`));
                collector.stop();

                member = {
                  id: message.author.id,
                  tag: message.author.tag,
                  gang: {
                    uuid: uuid,
                    name: newGang.name,
                    rank: "Owner",
                    joinDate: new Date()
                  }
                };
                // save
                (async () => {
                  try {
                    conn = await pool.getConnection();

                    let ret = await conn.query("INSERT INTO gangbot_gangs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newGang.uuid, newGang.name, newGang.description, newGang.owner.tag, newGang.owner.avatar, newGang.owner.id, newGang.points, newGang.banner, newGang.color, newGang.role, newGang.createdAt]);
                    ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.gang.uuid, member.gang.name, member.gang.rank, member.gang.joinDate, member.id, member.tag, member.gang.uuid, member.gang.name, member.gang.rank, member.gang.joinDate]);

                    message.guild.roles.create({
                      data: {
                        name: newGang.name,
                        color: newGang.color,
                      },
                      reason: 'GangBot role',
                    }).then(role => {message.member.roles.add(role)}).catch(console.error);

                  } finally {
                    if (conn) conn.release(); //release to pool
                  }
                })();
              }
            break;
          }
        });

        collector.on("end", (c, r) => {
          if (r == "time") message.error("Gang creator timed out.", false);
        })
      } else if (settings.create_allow == "roles") {
        //Role
        let missing = []
        settings.create_roles.forEach(role => {
          if (message.guild.roles.cache.get(role)) {
            if (!message.member.roles.cache.get(role)) missing.push(`<@&${message.guild.roles.cache.get(role).id}>`)
          }
        })
        if (missing.length >= settings.create_roles.length) return message.error("You don't have the required role(s) to create a gang! Missing role(s): " + missing.join(`, `), true)

        let collector = message.channel.createMessageCollector(m => m.author.id === message.author.id, { time: 600000 })
        let msg = await message.channel.send("Gang creator started! What should be the gang's name? (case sensitive)\nType in \`cancel\` anytime to exit the creator.");
        let uuid = uuidv4();

        let newGang = {
          name: "",
          uuid: uuid,
          owner: {
            tag: "",
            avatar: "",
            id: ""
          },
          description: "",
          points: 0,
          banner: "",
          color: "#000000",
          role: "",
          createdAt: new Date()
        }

        collector.on("collect", c => {
          if (c.content.toLowerCase() == "cancel") {
            collector.stop()
            return message.channel.send("Gang creator has been cancelled.");
          }
          let count = collector.collected.size;
          switch (count) {
            case 1:
              //Name
              if (c.content.length > 32 || c.content.length < 3) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang Name length must be in between 3 and 32 characters(Case sensitive).\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else if ((function(){
                for (let i = 0; i < gangs.length; i++) {
                  if (gangs[i].name === c.content) return true;
                }
                return false;
              })()) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("A gang with this name already exist!.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.name = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Your gang's name will be \`${c.content}\`, what should be the description to your gang?\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 2:
              //Description
              if (c.content.length > 1024 || c.content.length < 3) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang Name length must be in between 3 and 1024 characters.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.description = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Your gang's description has been set, what should be the color of your gang?\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 3:
              //Color
              if (!w3color(c.content).valid) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang color must be a valid color.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.color = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's color is set, What should be the flag for the gang? Please attach a image or  type in \`skip\` to skip.\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 4:
              //Banner
              if (!c.attachments.first() && c.content.toLowerCase() != "skip") {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("You must attach a image with your message.\nPlease try again or type in `skip` to skip. Type in `cancel` to cancel.", true).then(m => m.delete({timeout: 5000}))
              } else if (c.attachments.first() || c.content.toLowerCase() == "skip") {
                newGang.banner = c.attachments.first() ? c.attachments.first().url : null
                msg.delete().then(async () => msg = await message.channel.send(`Gang's baner is now set. You must mention the user you want to make the owner of the gang.\nType in \`cancel\` anytime to exit the creator.`))

              }
            break;
            case 5:
              let user = c.mentions.members.first()
              if (!user) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("You must mention the user you want to make the owner of the gang.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                  // save
                  (async () => {
                  try {
                    conn = await pool.getConnection();

                    let member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [user.id]);
                    member = member[0];
                    if (member) {
                      if (member.gangname != "None" || (function(){
                        for (let i = 0; i < gangs.length; i++) {
                          if (gangs[i].name === member.gangname) return true;
                        }
                        return false;})()) {
                        collector.dispose(c)
                        collector.collected.delete(c.id)
                        message.error("This user is already in a gang.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
                        return
                      }
                    }

                    newGang.owner.tag = user.user.tag;
                    newGang.owner.avatar = user.user.avatarURL();
                    newGang.owner.id = user.id;
                    member = {
                      id: user.id,
                      tag: user.user.tag,
                      gang: {
                        uuid: uuid,
                        name: newGang.name,
                        rank: "Owner",
                        joinDate: new Date()
                      }
                    }

                    let ret = await conn.query("INSERT INTO gangbot_gangs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newGang.uuid, newGang.name, newGang.description, newGang.owner.tag, newGang.owner.avatar, newGang.owner.id, newGang.points, newGang.banner, newGang.color, newGang.role, newGang.createdAt]);
                    ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.gang.uuid, member.gang.name, member.gang.rank, member.gang.joinDate, member.id, member.tag, member.gang.uuid, member.gang.name, member.gang.rank, member.gang.joinDate]);

                    msg.delete().then(async () => msg = await message.channel.send(`Their gang has been created! Their followers now can use the \`g?join ${newGang.name}\` command to join their gang.`))
                    collector.stop()

                    message.guild.roles.create({
                      data: {
                        name: newGang.name,
                        color: newGang.color,
                      },
                      reason: 'GangBot role',
                    }).then(role => {user.roles.add(role)}).catch(console.error);

                  } finally {
                    if (conn) conn.release(); //release to pool
                  }
                })();
              }
            break;
          }
        })

        collector.on("end", (c, r) => {
          if (r == "time") message.error("Gang creator timed out.", false);
        })
      } else if (settings.create_allow == "owner") {
        //Owner
        if (message.guild.ownerID != message.author.id) return message.error("Only server owner can create gangs.")

        let collector = message.channel.createMessageCollector(m => m.author.id === message.author.id, { time: 600000 })
        let msg = await message.channel.send("Gang creator started! What should be the gang's name? (case sensitive)\nType in `cancel` to exit the creator.");
        let uuid = uuidv4();

        let newGang = {
          name: "",
          uuid: uuid,
          owner: {
            tag: "",
            avatar: "",
            id: ""
          },
          description: "",
          points: 0,
          banner: "",
          color: "#000000",
          role: "",
          createdAt: new Date()
        }

        collector.on("collect", c => {
          if (c.content.toLowerCase() == "cancel") {
            collector.stop()
            return message.channel.send("Gang creator has been cancelled.");
          }
          let count = collector.collected.size;
          switch (count) {
            case 1:
              //Name
              if (c.content.length > 32 || c.content.length < 3) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang Name length must be in between 3 and 32 characters(Case sensitive).\nType in \`cancel\` anytime to exit the creator.", true).then(m => m.delete({timeout: 5000}))
              } else if ((function(){
                for (let i = 0; i < gangs.length; i++) {
                  if (gangs[i].name === c.content) return true;
                }
                return false;
              })()) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("A gang with this name already exist!.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.name = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's name will be \`${c.content}\`, what should be the description to the gang?\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 2:
              //Description
              if (c.content.length > 1024 || c.content.length < 3) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang Name length must be in between 3 and 1024 characters.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.description = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's description has been set, what should be the color of the gang?\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 3:
              //Color
              if (!w3color(c.content).valid) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("Gang color must be a valid color.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                newGang.color = c.content
                msg.delete().then(async () => msg = await message.channel.send(`Gang's color is set, What should be the flag for the gang? Please attach a image or type in \`skip\` to skip.\nType in \`cancel\` anytime to exit the creator.`))
              }
            break;
            case 4:
              //Banner
              if (!c.attachments.first() && c.content.toLowerCase() != "skip") {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("You must attach a image with your message.\nPlease try again or type in `skip` to skip. Type in `cancel` to cancel.", true).then(m => m.delete({timeout: 5000}))
              } else if (c.attachments.first() || c.content.toLowerCase() == "skip") {
                newGang.banner = c.attachments.first() ? c.attachments.first().url : null
                msg.delete().then(async () => msg = await message.channel.send(`Gang's baner is now set. You must mention the user you want to make the owner of the gang.`))
              }
            break;
            case 5:
              let user = c.mentions.members.first()
              if (!user) {
                collector.dispose(c)
                collector.collected.delete(c.id)
                message.error("You must mention the user you want to make the owner of the gang.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
              } else {
                // save
                (async () => {
                  try {
                    conn = await pool.getConnection();

                    let member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [user.id]);
                    member = member[0];
                    if (member) {
                      if (member.gangname != "None" || (function(){
                        for (let i = 0; i < gangs.length; i++) {
                          if (gangs[i].name === member.gangname) return true;
                        }
                        return false;})()) {
                        collector.dispose(c)
                        collector.collected.delete(c.id)
                        message.error("This user is already in a gang.\nPlease try again or type in `cancel`.", true).then(m => m.delete({timeout: 5000}))
                        return
                      }
                    }

                    newGang.owner.tag = user.user.tag;
                    newGang.owner.avatar = user.user.avatarURL();
                    newGang.owner.id = user.id;
                    member = {
                      id: user.id,
                      tag: user.user.tag,
                      gang: {
                        uuid: uuid,
                        name: newGang.name,
                        rank: "Owner",
                        joinDate: new Date()
                      }
                    }

                    let ret = await conn.query("INSERT INTO gangbot_gangs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newGang.uuid, newGang.name, newGang.description, newGang.owner.tag, newGang.owner.avatar, newGang.owner.id, newGang.points, newGang.banner, newGang.color, newGang.role, newGang.createdAt]);
                    ret = await conn.query("INSERT INTO gangbot_members values (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, tag = ?, ganguuid = ?, gangname = ?, `rank` = ?, joindate = ?", [member.id, member.tag, member.gang.uuid, member.gang.name, member.gang.rank, member.gang.joinDate, member.id, member.tag, member.gang.uuid, member.gang.name, member.gang.rank, member.gang.joinDate]);

                    msg.delete().then(async () => msg = await message.channel.send(`Their gang has been created! Their followers now can use the \`g?join ${newGang.name}\` command to join their gang.`))
                    collector.stop()

                    message.guild.roles.create({
                      data: {
                        name: newGang.name,
                        color: newGang.color,
                      },
                      reason: 'GangBot role',
                    }).then(role => {user.roles.add(role)}).catch(console.error);

                  } finally {
                    if (conn) conn.release(); //release to pool
                  }
                })();
              }
            break;
          }
        });
        collector.on("end", (c, r) => {
          if (r == "time") message.error("Gang creator timed out.", false);
        });
      }
      }
    })();
  }
};
