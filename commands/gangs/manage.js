const Discord = require("discord.js");
const pool = require("../../db/guild.js");
const w3color = require("../../utility/w3color.js");

var expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
var regex = new RegExp(expression);

module.exports = {
  name: "manage",
  category: "Gangs",
  description: "Manages the Gang you own or moderate.",
  aliases: ["m"],
  usage: "<name/description/color/banner/setadmin/removeadmin/kick/transferownership>",
  cooldown: 5,
  guildOnly: true,
  execute(bot, message, args) {
    let gangName = args.join(" ");
    (async () =>{
      let conn, member, members, gangs;
      try {
        conn = await pool.getConnection();
        gangs = await conn.query("SELECT name, uuid, ownerid FROM gangbot_gangs");
        member = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.author.id]);
        member = member[0];
        members = await conn.query("SELECT id, ganguuid, `rank` FROM gangbot_members");
      } finally {
        if (conn) conn.release(); //release to pool

        let user = member
        if (!user) {
          user = {
            id: message.author.id,
            tag: message.author.tag,
            ganguuid: '',
            gangname: "None",
            rank: null,
            joinDate: null
          }
          return message.error("You dont own or moderate a Gang!");
        } else if (user.rank != "Owner" && user.rank != "Admin") {
          return message.error("You can't manage the Gang you're in or you're not in a Gang!");
        } else {
          if (!args[0]) return message.error("You didn't provide a true option. `name, description, color, banner, setadmin, removeadmin, kick, invite, transferownership`")
          if (user.gangname != 'None' && !(function(){
            for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === gangName) return true;}
            return false;})()) {
            for (let i = 0; i < gangs.length; i++) {
              if (gangs[i].uuid === user.ganguuid) {
                user.gangname = gangs[i].name;
                break;
              }
            }
          }
          let gang = (function(){for (let i = 0; i < gangs.length; i++) {if (gangs[i].name === user.gangname) return gangs[i];}
          return null;})();
          let admins = []
          switch (args[0].toLowerCase()) {
            case "name":
              if (!args[1]) return message.error("The gang name should be between 0 and 32 characters.\nWarning, this is capital sensitive.");
              if (args[1] == gang.name) return message.error("This is the same name as the old one! Try a new one.")
              if (args[1].length > 32 || args[1].length < 3 || args[1].includes('\n')) return message.error("The gang name should be between 0 and 32 characters and should not include new lines.\nWarning, this is capital sensitive.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let ret = await conn.query("UPDATE gangbot_gangs SET name = ? WHERE uuid = ?", [args[1], gang.uuid]);
                  ret = await conn.query("UPDATE gangbot_members SET gangname = ? WHERE gangname = ?", [args[1], gang.name]);
                  message.success(`Gang name has been updated to **${args[1]}** successfully.`)
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();
              break;
            case "description":
              args.shift();
              let desc = args.join(" ");
              if (desc.length == 0 || desc.length > 4000) return message.error("The gang description should be between 0 and 4000 characters.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let ret = await conn.query("UPDATE gangbot_gangs SET description = ? WHERE uuid = ?", [desc, gang.uuid]);
                  message.success(`Gang description has been updated successfully.`)
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();
              break;
            case "color":
              if (!args[1]) return message.error("You didn't provide a hex color for the guild.");
              if (!w3color(args[1]).valid) return message.error("This is not a valid color. Please provide a hex color for the guild.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let ret = await conn.query("UPDATE gangbot_gangs SET color = ? WHERE uuid = ?", [args[1], gang.uuid]);
                  message.success(`Gang color has been updated to **${args[1]}** successfully.`)
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();
              break;
            case "banner":
              if (args[1]) {
                if (args[1].toLowerCase() == 'clear') {
                  gang.banner = null;
                  // save
                  (async () => {
                    try {
                      conn = await pool.getConnection();
                      let ret = await conn.query("UPDATE gangbot_gangs SET banner = ? WHERE uuid = ?", [gang.banner, gang.uuid]);
                      message.success(`Gang banner has been cleared successfully.`)
                    } finally {
                      if (conn) conn.release(); //release to pool
                    }
                  })();
                } else return message.error(`You didn't provide a image for the guild, please attach a image with your message. If you wish to remove your banner please use \`${message.prefix}manage banner clear\` command.`);
              } else {
                if (message.attachments.size == 0) return message.error(`You didn't provide a image for the guild, please attach a image with your message. If you wish to remove your banner please use \`${message.prefix}manage banner clear\` command.`);
                gang.banner = message.attachments.first().proxyURL;
                // save
                (async () => {
                  try {
                    conn = await pool.getConnection();
                    let ret = await conn.query("UPDATE gangbot_gangs SET banner = ? WHERE uuid = ?", [gang.banner, gang.uuid]);
                    message.success(`Gang banner has been updated to the image you attached successfully.`)
                  } finally {
                    if (conn) conn.release(); //release to pool
                  }
                })();
              }
              break;
            case "setadmin":
              if (user.rank != "Owner") return message.error("Only Owner of the gang can manage this.");
              if (!message.mentions.users.first()) return message.error("You did not mention a user to set as Admin.");
              let admins = [];
              members.forEach(m => {
                if (gang.uuid == m.ganguuid && m.rank == "Admin") admins.push(m.id);
              });
              if (admins.size == 6) return message.error("You can only have 6 admins at a time in your gang.");
              if (message.mentions.users.first().id == message.author.id) return message.error("You can't be Admin! You're already the Owner.");
              if (admins.includes(message.mentions.users.first().id)) return message.error("This user is already an Admin.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let target = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.mentions.users.first().id]);
                  target = target[0];
                  if (!target) {
                    return message.error("This user is not in your gang.");
                  } else {
                    if (target.ganguuid != gang.uuid) return message.error("This user is not in your gang.");
                  }
                  target.rank = "Admin";
                  let ret = await conn.query("UPDATE gangbot_members SET `rank` = ? WHERE id = ?", [target.rank, target.id]);
                  message.success(`User has been set as a Admin successfully.`)
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();
              break;
            case "removeadmin":
              if (user.rank != "Owner") return message.error("Only Owner of the gang can manage this.");
              if (!message.mentions.users.first()) return message.error("You did not mention a user to remove their Admin.");
              let adminlist = [];
              members.forEach(m => {
                if (gang.uuid == m.ganguuid && m.rank == "Admin") admins.push(m.id);
              });
              if (!adminlist.includes(message.mentions.users.first().id)) return message.error("This user is not an Admin.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let target = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.mentions.users.first().id]);
                  target = target[0];
                  if (!target) {
                    return message.error("This user is not in your gang.");
                  } else {
                    if (target.ganguuid != gang.uuid) return message.error("This user is not in your gang.");
                  }
                  target.rank = "Member";
                  let ret = await conn.query("UPDATE gangbot_members SET `rank` = ? WHERE id = ?", [target.rank, target.id]);
                  message.success(`User has been removed from Admins successfully.`)
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();
              break;
            case "kick":
              if (user.rank != "Owner" && user.rank != "Admin") return message.error("Only Owner or Admin of the Gang can manage this.");
              if (!message.mentions.users.first()) return message.error("You did not mention a user to kick from the Gang.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let target = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.mentions.users.first().id]);
                  target = target[0];
                  if (!target) {
                    return message.error("This user is not in your gang.");
                  } else {
                    if (target.ganguuid != gang.uuid) return message.error("This user is not in your gang.");
                  }
                  target.ganguuid = "";
                  target.gangname = "None";
                  target.rank = null;
                  target.joinDate = null;
                  let ret = await conn.query("UPDATE gangbot_members SET ganguuid = ?, gangname = ?, `rank` = ?, joindate = ? WHERE id = ?", [target.ganguuid, target.gangname, target.rank, target.joinDate, target.id]);
                  message.success(`User has been kicked from the Gang successfully.`)
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();             
              break;
            case "invite":
              if (user.rank != "Owner" && user.rank != "Admin") return message.error("Only Owner or Admin of the Gang can manage this.");
              if (!message.mentions.users.first()) return message.error("You did not mention a user to invite to the Gang.");
              // check if in gang
              (async () => {
                let invitetarget;
                try {
                  conn = await pool.getConnection();
                  invitetarget = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.mentions.users.first().id]);
                  invitetarget = invitetarget[0];
                } finally {
                  if (conn) conn.release(); //release to pool

                  if(invitetarget) {
                    if (invitetarget.ganguuid == gang.uuid) return message.error("This user is already in your gang.");
                    if (invitetarget.gangname != "None") return message.error("This user is already in a gang.");
                  }
                  let userkey = message.mentions.users.first().id+gang.uuid;
                  for (var i = 0; i < global.gang_invites.length; i++) {
                    if (global.gang_invites[i] === userkey) return message.error("User is already invited.");
                  }    
                  global.gang_invites.push(userkey);
                  // not in any gang
                  message.success("<@" + message.mentions.users.first().id + "> was invited to your gang.");
                  setTimeout(function(){
                    for (var i = 0; i < global.gang_invites.length; i++) {
                      if (global.gang_invites[i] === userkey) {
                        global.gang_invites.splice(i, 1);
                        message.error("User invite timed out.");
                        break;
                      }
                    }    
                  }, 60000);
                }
              })();  
              break;
            case "transferownership":
              if (user.rank != "Owner") return message.error("Only Owner of the gang can manage this.");
              if (!message.mentions.users.first()) return message.error("You did not mention the user to transfer the Gang to.");
              // save
              (async () => {
                try {
                  conn = await pool.getConnection();
                  let target = await conn.query("SELECT * FROM gangbot_members WHERE id = ?", [message.mentions.users.first().id]);
                  target = target[0];
                  if (!target) {
                    return message.error("This user is not in your Gang.");
                  }
                  if (target.rank == "Owner") {
                    return message.error("This user is already a Gang owner");
                  } else if (target.ganguuid != gang.uuid) {
                    return message.error("This user is not in your Gang.");
                  } else {
                    let confirm = await message.channel.send(`<:warning:724052384031965284> | Do you really wish to transfer **${gang.name}** to ${target.tag}? (yes/no)`);
                    confirm.channel.awaitMessages(m => m.author.id == message.author.id, {max: 1, time: 60000, errors: ['time']}).then(async c => {
                      if (c.first().content.toLowerCase() == "yes" || c.first().content.toLowerCase() == "y") {
                        gang.ownertag = message.mentions.users.first().tag;
                        gang.owneravatar = message.mentions.users.first().avatarURL();
                        gang.ownerid = message.mentions.users.first().id;
                        target.rank = "Owner";
                        user.rank = "Member";
                        let ret = await conn.query("UPDATE gangbot_members SET `rank` = ? WHERE id = ?", [target.rank, target.id]);
                        ret = await conn.query("UPDATE gangbot_members SET `rank` = ? WHERE id = ?", [user.rank, user.id]);
                        ret = await conn.query("UPDATE gangbot_gangs SET ownertag = ?, owneravatar = ?, ownerid = ? WHERE uuid = ?", [gang.ownertag, gang.owneravatar, gang.ownerid, gang.uuid]);
                      } else {
                        return message.error("Command cancelled.");
                      }
                    });
                  }
                } finally {
                  if (conn) conn.release(); //release to pool
                }
              })();             
              break;
            default:
              return message.error("You didn't provide a option. `name, description, color, banner, setadmin, removeadmin, kick, invite, transferownership`");
          }
        }
      }
    })();
  }
};
