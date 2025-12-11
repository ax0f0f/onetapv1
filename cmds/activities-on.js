const { PermissionsBitField, TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");

module.exports = {
  name: 'activities-on',
  description: 'Enable Activities for everyone in your voice channel.',
  async execute(message, args, client, db) {
    const userId = message.author.id;
    const member = message.guild.members.cache.get(userId);
    const voiceChannel = member?.voice?.channel;

    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!voiceChannel) {
      return sendReply('<:traverser:1400313375547850877> You must be in a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, message.guild.id],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:traverser:1400313375547850877> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot or you are not allowed to modify it.');
        }

        const channelOwnerId = row.owner_id;

        if (channelOwnerId === userId) {
          return enableActivities();
        }

        db.get(
          `SELECT 1 FROM user_managers WHERE owner_id = ? AND manager_id = ?`,
          [channelOwnerId, userId],
          (err2, managerRow) => {
            if (err2) {
              console.error(err2);
              return sendReply('<:traverser:1400313375547850877> Manager DB error occurred.');
            }

            if (managerRow) {
              return enableActivities();
            }

            return sendReply('<:traverser:1400313375547850877> You must be the channel owner or a manager to enable activities.');
          }
        );

        async function enableActivities() {
          try {
            await voiceChannel.permissionOverwrites.edit(
              voiceChannel.guild.roles.everyone,
              { [PermissionsBitField.Flags.UseExternalApps]: true }

            );

            return sendReply('<:acradiaacton:1384186660731883570> Activities permission enabled for everyone in this voice channel.');
          } catch (err) {
            console.error("Permission edit failed:", err);
            return sendReply('<:traverser:1400313375547850877> Failed to update permissions.');
          }
        }
      }
    );
  }
};
