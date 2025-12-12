const { PermissionsBitField, TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'permit',
  description: 'Allow a user or role permission to connect, speak, and send messages in your voice channel (and its related text channel).',
  usage: '.v permit <user or role>',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    const guild = message.guild;
    const author = message.member;

    if (!args[0]) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a user or role ID or mention.\nUsage: `.v permit <user or role>`');
    }

    const inputId = args[0].replace(/[<@!&#>]/g, '');
    const targetMember = guild.members.cache.get(inputId);
    const targetRole = guild.roles.cache.get(inputId);

    if (!targetMember && !targetRole) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> User or Role not found in this server.');
    }

    const voiceChannel = author.voice.channel;
    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You need to be connected to your voice channel to use this command.');
    }

    const guildId = guild.id;
    const voiceChannelId = voiceChannel.id;

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannelId, guildId],
      async (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred. Try again later.');
        }

        if (!row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot.');
        }

        const ownerId = row.owner_id;

        if (author.id !== ownerId && !(await isManagerOf(ownerId, author.id, db))) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice owner or a manager to use this command.');
        }

        try {
          const overwriteTarget = targetMember || targetRole;

          await voiceChannel.permissionOverwrites.edit(overwriteTarget, {
            Connect: true,
            Speak: true,
          });

          let relatedTextChannel = null;
          if (voiceChannel.parent) {
            relatedTextChannel = guild.channels.cache.find(
              c =>
                c.type === 0 &&
                c.parentId === voiceChannel.parentId &&
                c.name.toLowerCase().includes('interface')
            );
          }

          if (relatedTextChannel) {
            await relatedTextChannel.permissionOverwrites.edit(overwriteTarget, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
            });
          }

          return sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully permitted ${overwriteTarget} .`);
        } catch (error) {
          console.error('Permission overwrite error:', error);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to update permissions. Make sure I have the necessary permissions.');
        }
      }
    );

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
  },
};
