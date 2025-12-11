const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'name',
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

    if (!args.length) {
      return sendReply('<:traverser:1400313375547850877> Please provide the new voice channel name.\nUsage: `.v name <new name>`');
    }

    const newName = args.join(' ').trim();
    const member = message.guild.members.cache.get(userId);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return sendReply('<:traverser:1400313375547850877> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:traverser:1400313375547850877> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot or you are not allowed to rename it.');
        }

        const channelOwnerId = row.owner_id;

        if (channelOwnerId === userId) {
          return renameVoiceChannel();
        }

        db.get(
          `SELECT 1 FROM user_managers WHERE owner_id = ? AND manager_id = ?`,
          [channelOwnerId, userId],
          (err2, managerRow) => {
            if (err2) {
              console.error(err2);
              return sendReply('<:traverser:1400313375547850877> Manager DB query error occurred.');
            }

            if (managerRow) {
              return renameVoiceChannel();
            }

            return sendReply('<:traverser:1400313375547850877> You must be the voice channel owner or one of their managers to rename this channel.');
          }
        );

        function renameVoiceChannel() {
          voiceChannel.edit({ name: newName }).then(() => {
            sendReply(`<:verifier:1400313376521064551> Voice channel renamed to \`${newName}\`.`);
          }).catch(error => {
            console.error(error);
            sendReply('<:traverser:1400313375547850877> Failed to rename the voice channel. Make sure I have permission to manage channels.');
          });
        }
      }
    );
  }
};
