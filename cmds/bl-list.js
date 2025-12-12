const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'bl-list',
  description: 'List your blacklisted users',
  usage: '.bl-list',
  async execute(message, args, client, db) {
    const ownerId = message.author.id;
    const guildId = message.guild.id;

    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    db.all(
      `SELECT blacklisted_id FROM blacklist_users WHERE owner_id = ? AND guild_id = ?`,
      [ownerId, guildId],
      async (err, rows) => {
        if (err) {
          console.error('❌ Database error:', err);
          return sendReply('❌ Database error.');
        }

        if (!rows.length) {
          return sendReply('<:infoo:1448793556394442793> You have not blacklisted any users yet.');
        }

        const userList = rows.map(r => `<@${r.blacklisted_id}>`).join('\n');

        sendReply(`<:acadiarename:1448781911735402498> Your blacklisted users:\n${userList}`);
      }
    );
  }
};
