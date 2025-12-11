const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'bl-add',
  description: 'Add a user to your blacklist',
  usage: '.bl-add @user',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!args[0]) {
      return sendReply('<:traverser:1400313375547850877> Please mention a user to blacklist.');
    }

    const userToAdd = message.mentions.users.first();
    if (!userToAdd) {
      return sendReply('<:traverser:1400313375547850877> Invalid user.');
    }

    if (userToAdd.id === message.author.id) {
      return sendReply('<:traverser:1400313375547850877> You cannot blacklist yourself.');
    }

    const ownerId = message.author.id;
    const guildId = message.guild.id;
    const blacklistedId = userToAdd.id;

    db.get(
      `SELECT * FROM whitelist_users WHERE owner_id = ? AND whitelisted_id = ? AND guild_id = ?`,
      [ownerId, blacklistedId, guildId],
      (err, whitelistRow) => {
        if (err) {
          console.error('<:traverser:1400313375547850877> Database error:', err);
          return sendReply('<:traverser:1400313375547850877> Database error occurred.');
        }

        if (whitelistRow) {
          return sendReply('<:traverser:1400313375547850877> This user is whitelisted. Remove them from whitelist before blacklisting.');
        }

        db.get(
          `SELECT * FROM blacklist_users WHERE owner_id = ? AND blacklisted_id = ? AND guild_id = ?`,
          [ownerId, blacklistedId, guildId],
          (err2, blacklistRow) => {
            if (err2) {
              console.error('<:traverser:1400313375547850877> Database error:', err2);
              return sendReply('<:traverser:1400313375547850877> Database error occurred.');
            }

            if (blacklistRow) {
              return sendReply('<:traverser:1400313375547850877> This user is already blacklisted by you.');
            }

            db.run(
              `INSERT INTO blacklist_users (owner_id, blacklisted_id, guild_id) VALUES (?, ?, ?)`,
              [ownerId, blacklistedId, guildId],
              (err3) => {
                if (err3) {
                  console.error('<:traverser:1400313375547850877> Database error:', err3);
                  return sendReply('<:traverser:1400313375547850877> Database error occurred while adding to blacklist.');
                }

                sendReply(`<:verifier:1400313376521064551> Successfully blacklisted ${userToAdd.tag}.`);
              }
            );
          }
        );
      }
    );
  }
};
