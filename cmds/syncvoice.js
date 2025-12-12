const { TextDisplayBuilder, ContainerBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'syncvoice',
  description: 'Sync a voice channel into the system and assign a user as the owner.',
  usage: '.v syncvoice <user_id>',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You do not have permission to use this command.');
    }

    const guildId = message.guild.id;

    if (!args[0]) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a user ID.');
    }

    const userId = args[0];
    const member = message.guild.members.cache.get(userId);

    if (!member) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> User not found in this server.');
    }

    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> The user is not connected to a voice channel.');
    }

    db.get(
      `SELECT * FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> A database error occurred.');
        }

        if (row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is already managed by the bot.');
        }

        db.run(
          `INSERT INTO temp_channels (guild_id, channel_id, owner_id) VALUES (?, ?, ?)`,
          [guildId, voiceChannel.id, userId],
          (insertErr) => {
            if (insertErr) {
              console.error(insertErr);
              return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to add voice channel to the database.');
            }

            return sendReply(`<:discotoolsxyzicon1:1448758665963110603> Voice channel synced successfully. Owner set to <@${userId}>.`);
          }
        );
      }
    );
  }
};
