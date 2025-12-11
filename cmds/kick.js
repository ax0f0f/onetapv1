const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a user from your temporary voice channel by disconnecting them.',
  usage: '.v kick <user>',
  aliases: ['vc-kick', 'disconnect'],
  async execute(message, args, client, db) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!args[0]) {
      return sendReply('<:traverser:1400313375547850877> Please provide a user mention or ID to kick.');
    }

    const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!targetMember) {
      return sendReply('<:traverser:1400313375547850877> Target user not found in this server.');
    }

    if (targetMember.id === '335869842748080140') {
      return sendReply('<:traverser:1400313375547850877> You can’t kick the developer.');
    }

    const member = message.guild.members.cache.get(userId);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      return sendReply('<:traverser:1400313375547850877> You must be connected to a voice channel to use this command.');
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
        return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot or you are not allowed to kick users here.');
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
        return sendReply('<:traverser:1400313375547850877> You must be the voice channel owner or a manager to kick users.');
      }

      if (targetMember.id === userId) {
        return sendReply('<:traverser:1400313375547850877> You cannot kick yourself.');
      }

      if (!isOwner && targetMember.id === channelOwnerId) {
        return sendReply('<:traverser:1400313375547850877> Managers cannot kick the channel owner.');
      }

      if (!isOwner && managers.includes(targetMember.id)) {
        return sendReply('<:traverser:1400313375547850877> Managers cannot kick other managers.');
      }

      if (targetMember.voice.channelId === voiceChannel.id) {
        await targetMember.voice.disconnect('Kicked from the temporary voice channel.');
        return sendReply(`<:verifier:1400313376521064551> Successfully kicked ${targetMember.user.tag} from the voice channel.`);
      } else {
        return sendReply('<:traverser:1400313375547850877> The user is not connected to your voice channel.');
      }

    } catch (error) {
      console.error('Error in kick command:', error);
      return sendReply('<:traverser:1400313375547850877> Failed to kick user due to an error.');
    }
  }
};
