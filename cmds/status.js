const axios = require("axios");
const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");

module.exports = {
  name: 'status',
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
    const guildId = message.guild.id;

    const statusMessage = args.join(' ').trim();
    if (!statusMessage) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a status message.\nUsage: `status <your status>`');
    }

    const member = message.guild.members.cache.get(userId);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot or you are not allowed to set a status for it.');
        }

        const channelOwnerId = row.owner_id;

        if (channelOwnerId === userId) {
          return setVoiceStatus();
        }

        db.get(
          `SELECT 1 FROM user_managers WHERE owner_id = ? AND manager_id = ?`,
          [channelOwnerId, userId],
          (err2, managerRow) => {
            if (err2) {
              console.error(err2);
              return sendReply('<:discotoolsxyzicon:1448758684535488562> Manager DB query error occurred.');
            }

            if (managerRow) {
              return setVoiceStatus();
            }

            return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner or one of their managers to set the channel status.');
          }
        );

        async function setVoiceStatus() {
          const url = `https://discord.com/api/v10/channels/${voiceChannel.id}/voice-status`;
          const payload = { status: statusMessage };

          try {
            await axios.put(url, payload, {
              headers: {
                Authorization: `Bot ${client.token}`,
                'Content-Type': 'application/json'
              }
            });

            return sendReply(`<:discotoolsxyzicon1:1448758665963110603> Voice status updated to: \`${statusMessage}\``);
          } catch (err) {
            console.error("Failed to update voice status:", err?.response?.data || err.message);
            return sendReply(`<:discotoolsxyzicon:1448758684535488562> Failed to update voice status.`);
          }
        }
      }
    );
  }
};
