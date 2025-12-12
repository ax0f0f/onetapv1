const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'lock',
  description: 'Lock your temporary voice channel for everyone except owner and managers currently connected.',
  usage: 'lock',
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
        return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot or you are not allowed to lock it.');
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
        return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner or a manager to lock this channel.');
      }

      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });

      const ownerMember = await guild.members.fetch(channelOwnerId).catch(() => null);
      if (ownerMember) {
        await voiceChannel.permissionOverwrites.edit(ownerMember, { Connect: true });
      }

      for (const managerId of managers) {
        const managerMember = await guild.members.fetch(managerId).catch(() => null);
        if (managerMember && managerMember.voice.channelId === voiceChannel.id) {
          await voiceChannel.permissionOverwrites.edit(managerMember, { Connect: true });
        }
      }

      if (!voiceChannel.name.startsWith('.')) {
        await voiceChannel.setName(`. ${voiceChannel.name}`);
      }

      return sendReply('<:controledacces:1448781573985009826> Channel has been locked <:accesrefuse:1448781645833568287> for everyone except the owner and managers currently in the voice channel.');

    } catch (error) {
      console.error('Error locking channel:', error);
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to lock the channel. Make sure I have permission to manage channel permissions.');
    }
  }
};
