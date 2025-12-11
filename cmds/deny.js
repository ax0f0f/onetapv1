const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'deny',
  description: 'Deny a user or role from your temporary voice channel and move the user to setup room if connected.',
  usage: '.v deny <user or role>',
  aliases: ['reject'],
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

    if (!args[0]) {
      return sendReply('<:traverser:1400313375547850877> Please provide a user or role mention or ID to deny access.');
    }

    const inputId = args[0].replace(/[<@!&#>]/g, '');
    const targetMember = guild.members.cache.get(inputId);
    const targetRole = guild.roles.cache.get(inputId);

    if (!targetMember && !targetRole) {
      return sendReply('<:traverser:1400313375547850877> Target user or role not found in this server.');
    }

    if (targetMember?.id === '335869842748080140') {
      return sendReply('<:traverser:1400313375547850877> You can’t deny the developer.');
    }

    const member = guild.members.cache.get(userId);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      return sendReply('<:traverser:1400313375547850877> You must be connected to a voice channel to use this command.');
    }

    try {
      const tempChannelRow = await new Promise((resolve, reject) => {
        db.get(
          `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
          [voiceChannel.id, guildId],
          (err, row) => (err ? reject(err) : resolve(row))
        );
      });

      if (!tempChannelRow) {
        return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot or you are not allowed to deny users here.');
      }

      const channelOwnerId = tempChannelRow.owner_id;

      const managerRows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT manager_id FROM user_managers WHERE owner_id = ?`,
          [channelOwnerId],
          (err, rows) => (err ? reject(err) : resolve(rows))
        );
      });

      const managers = managerRows.map(r => r.manager_id);
      const isOwner = channelOwnerId === userId;
      const isManager = managers.includes(userId);

      if (!isOwner && !isManager) {
        return sendReply('<:traverser:1400313375547850877> You must be the voice channel owner or a manager to deny users.');
      }

      if (targetMember) {
        if (targetMember.id === userId) {
          return sendReply('<:traverser:1400313375547850877> You cannot deny yourself.');
        }

        if (!isOwner && targetMember.id === channelOwnerId) {
          return sendReply('<:traverser:1400313375547850877> Managers cannot deny the channel owner.');
        }

        if (!isOwner && managers.includes(targetMember.id)) {
          return sendReply('<:traverser:1400313375547850877> Managers cannot deny other managers.');
        }

        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
          Connect: false,
          Speak: false,
        });

        if (targetMember.voice.channelId === voiceChannel.id) {
          const configRow = await new Promise((resolve, reject) => {
            db.get(
              `SELECT room_id FROM guild_config WHERE guild_id = ?`,
              [guildId],
              (err, row) => (err ? reject(err) : resolve(row))
            );
          });

          if (configRow?.room_id) {
            const setupRoom = guild.channels.cache.get(configRow.room_id);
            if (setupRoom) await targetMember.voice.setChannel(setupRoom);
          }
        }

        return sendReply(`<:verifier:1400313376521064551> Successfully denied access for ${targetMember.user.tag}.`);

      } else if (targetRole) {
        await voiceChannel.permissionOverwrites.edit(targetRole.id, {
          Connect: false,
          Speak: false,
        });

        return sendReply(`<:verifier:1400313376521064551> Successfully denied access for role ${targetRole.name}.`);
      }

    } catch (error) {
      console.error('Error in deny command:', error);
      return sendReply('<:traverser:1400313375547850877> Failed to deny permissions due to an error.');
    }
  }
};
