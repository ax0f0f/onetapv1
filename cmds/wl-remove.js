const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'wl-remove',
  description: 'Remove a user from your whitelist',
  usage: '.wl-remove @user',
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

    const user = message.mentions.users.first();
    if (!user) {
      return sendReply('<:traverser:1400313375547850877> Please mention a user to remove from your whitelist.');
    }

    db.get(
      `SELECT * FROM whitelist_users WHERE owner_id = ? AND whitelisted_id = ? AND guild_id = ?`,
      [ownerId, user.id, guildId],
      (err, row) => {
        if (err) {
          return sendReply('<:traverser:1400313375547850877> Database error.');
        }

        if (!row) {
          return sendReply(`⚠️ <@${user.id}> is not in your whitelist.`);
        }

        db.run(
          `DELETE FROM whitelist_users WHERE owner_id = ? AND whitelisted_id = ? AND guild_id = ?`,
          [ownerId, user.id, guildId],
          (err) => {
            if (err) {
              return sendReply('<:traverser:1400313375547850877> Failed to remove whitelist.');
            }

            sendReply(`<:verifier:1400313376521064551> You have removed <@${user.id}> from your whitelist.`);
          }
        );
      }
    );
  }
};
