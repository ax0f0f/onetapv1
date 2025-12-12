const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'unlock',
  description: 'Unlock your temporary voice channel for everyone.',
  usage: 'unlock',
  async execute(message, args, client, db) {
    const sendMessage = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };
    const userId = message.author.id;
    const guild = message.guild;
    const guildId = guild.id;

    const member = guild.members.cache.get(userId);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return sendMessage('<:discotoolsxyzicon:1448758684535488562> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      async (err, row) => {
        if (err) {
          console.error(err);
          return sendMessage('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
        }

        if (!row) {
          return sendMessage('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot or you are not allowed to unlock it.');
        }

        const ownerId = row.owner_id;

        // Check if user is owner or manager of the owner
        if (userId === ownerId || await isManagerOf(ownerId, userId, db)) {
          return unlockChannel();
        }

        return sendMessage('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner or their manager to unlock this channel.');

        async function unlockChannel() {
          try {
            // Remove lock emoji prefix from channel name if exists
            if (voiceChannel.name.startsWith('.')) {
              await voiceChannel.setName(voiceChannel.name.slice(2)); // Remove the "🔒 " prefix
            }

            // Reset connect permission for everyone to default (allow connect)
            await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
              Connect: null
            });

            return sendMessage('<:accesrefuse:1448781645833568287> Channel has been unlocked <:controledacces:1448781573985009826> for everyone.');
          } catch (error) {
            console.error(error);
            return sendMessage('<:discotoolsxyzicon:1448758684535488562> Failed to unlock the channel. Ensure I have permission to manage channel permissions.');
          }
        }
      }
    );

    // Helper function to check if user is a manager of the owner
    async function isManagerOf(ownerId, managerId, db) {
      return new Promise((resolve) => {
        db.get(
          `SELECT 1 FROM user_managers WHERE owner_id = ? AND manager_id = ?`,
          [ownerId, managerId],
          (err, row) => {
            if (err) {
              console.error(err);
              return resolve(false);
            }
            resolve(!!row);
          }
        );
      });
    }
  }
};
