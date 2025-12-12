const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'wl-list',
    description: 'List your whitelisted users',
    usage: '.wl-list',
    async execute(message, args, client, db) {
      const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };
      const ownerId = message.author.id;
      const guildId = message.guild.id;
  
      db.all(
        `SELECT whitelisted_id FROM whitelist_users WHERE owner_id = ? AND guild_id = ?`,
        [ownerId, guildId],
        async (err, rows) => {
          if (err) return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error.');
  
          if (!rows.length) {
            return sendReply('<:infoo:1448793556394442793> You have not whitelisted any users yet.');
          }
  
          // Fetch user objects for nicer display
          const userList = rows.map(r => `<@${r.whitelisted_id}>`).join('\n');
  
          sendReply(`<:acadiarename:1448781911735402498> Your whitelisted users:\n${userList}`);
        }
      );
    }
  };
  