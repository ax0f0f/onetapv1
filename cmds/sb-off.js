const { PermissionsBitField, TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");

module.exports = {
  name: 'sb-off',
  description: 'Disable soundboard permission for everyone in the voice channel.',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    const userId = message.author.id;
    const member = message.guild.members.cache.get(userId);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be in a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, message.guild.id],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot or you are not allowed to modify it.');
        }

        const channelOwnerId = row.owner_id;

        if (channelOwnerId === userId) {
          return disableSoundboard();
        }

        db.get(
          `SELECT 1 FROM user_managers WHERE owner_id = ? AND manager_id = ?`,
          [channelOwnerId, userId],
          (err2, managerRow) => {
            if (err2) {
              console.error(err2);
              return sendReply('<:discotoolsxyzicon:1448758684535488562> Manager DB error occurred.');
            }

            if (managerRow) {
              return disableSoundboard();
            }

            return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the channel owner or a manager to disable soundboard.');
          }
        );

        async function disableSoundboard() {
          try {
            await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
              [PermissionsBitField.Flags.UseSoundboard]: false,
            });

            return sendReply('<:arcadiasboff:1448781989846188106> Disabled **Use Soundboard** permission for everyone in this voice channel.');
          } catch (err) {
            console.error("Permission edit failed:", err);
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to update permissions.');
          }
        }
      }
    );
  }
};
