const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'wl-add',
  description: 'Add a user to your whitelist (max 5)',
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
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please mention a user to whitelist.');
    }

    const userToAdd = message.mentions.users.first();
    if (!userToAdd) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Invalid user.');
    }

    if (userToAdd.id === message.author.id) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You cannot whitelist yourself.');
    }

    const ownerId = message.author.id;
    const guildId = message.guild.id;
    const whitelistedId = userToAdd.id;

    // Check if user is blacklisted first
    db.get(
      `SELECT * FROM blacklist_users WHERE owner_id = ? AND blacklisted_id = ? AND guild_id = ?`,
      [ownerId, whitelistedId, guildId],
      (err, blacklistRow) => {
        if (err) {
          console.error('<:discotoolsxyzicon:1448758684535488562> Database error:', err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
        }

        if (blacklistRow) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This user is blacklisted. Remove them from blacklist before whitelisting.');
        }

        // Check how many users the author has already whitelisted in this guild
        db.get(
          `SELECT COUNT(*) AS count FROM whitelist_users WHERE owner_id = ? AND guild_id = ?`,
          [ownerId, guildId],
          (err2, row) => {
            if (err2) {
              console.error('<:discotoolsxyzicon:1448758684535488562> Database error:', err2);
              return message.reply({
                embeds: [new EmbedBuilder().setColor('#f5eee2').setDescription('<:discotoolsxyzicon:1448758684535488562> Database error occurred.')]
              });
            }

            if (row.count >= 5) {
              return sendReply('<:discotoolsxyzicon:1448758684535488562> You have already whitelisted 5 users. Remove some before adding more.');
            }

            // Check if user is already whitelisted
            db.get(
              `SELECT * FROM whitelist_users WHERE owner_id = ? AND whitelisted_id = ? AND guild_id = ?`,
              [ownerId, whitelistedId, guildId],
              (err3, exists) => {
                if (err3) {
                  console.error('<:discotoolsxyzicon:1448758684535488562> Database error:', err3);
                  return message.reply({
                    embeds: [new EmbedBuilder().setColor('#f5eee2').setDescription('<:discotoolsxyzicon:1448758684535488562> Database error occurred.')]
                  });
                }

                if (exists) {
                  return sendReply('<:discotoolsxyzicon:1448758684535488562> This user is already whitelisted by you.');
                }

                // Insert the new whitelist entry
                db.run(
                  `INSERT INTO whitelist_users (owner_id, whitelisted_id, guild_id) VALUES (?, ?, ?)`,
                  [ownerId, whitelistedId, guildId],
                  (err4) => {
                    if (err4) {
                      console.error('<:discotoolsxyzicon:1448758684535488562> Database error:', err4);
                      return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred while adding whitelist.');
                    }

                    sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully whitelisted ${userToAdd.tag}.`);
                  }
                );
              }
            );
          }
        );
      }
    );
  }
};
