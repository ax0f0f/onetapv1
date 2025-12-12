const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'limit',
  description: 'Set a user limit on your temporary voice channel (0 to 99).',
  usage: 'vlimit <number>',
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
    const guild = message.guild;
    const guildId = guild.id;

    const member = guild.members.cache.get(userId);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be connected to a voice channel to use this command.');
    }

    const limit = parseInt(args[0], 10);
    if (isNaN(limit) || limit < 0 || limit > 99) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a valid user limit between 0 and 99.');
    }

    try {
      const tempChannelRow = await new Promise((resolve, reject) => {
        db.get(
          `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
          [voiceChannel.id, guildId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!tempChannelRow) {
        return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot or you are not allowed to modify it.');
      }

      const channelOwnerId = tempChannelRow.owner_id;

      const managerRows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT manager_id FROM user_managers WHERE owner_id = ?`,
          [channelOwnerId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const managers = managerRows.map(r => r.manager_id);

      const isOwner = channelOwnerId === userId;
      const isManager = managers.includes(userId);

      if (!isOwner && !isManager) {
        return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner or a manager to set the limit.');
      }

      await voiceChannel.setUserLimit(limit);

      return sendReply(`<:discotoolsxyzicon1:1448758665963110603> User limit set to \`${limit}\` for the voice channel.`);

    } catch (error) {
      console.error('Error setting user limit:', error);
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to set the user limit. Make sure I have the correct permissions.');
    }
  }
};
