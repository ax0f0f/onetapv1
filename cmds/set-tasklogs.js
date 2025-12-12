const { PermissionFlagsBits, TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'set-tasklogs',
  description: 'Set the channel where task logs will be sent.',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You need Administrator permissions to use this command.');
    }

    const guildId = message.guild.id;
    let channel = message.mentions.channels.first();

    if (!channel && args[0]) {
      try {
        channel = await message.guild.channels.fetch(args[0]);
      } catch {
        return sendReply('<:discotoolsxyzicon:1448758684535488562> Invalid channel ID or mention.');
      }
    }

    if (!channel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please mention a channel or provide its ID.');
    }

    db.run(`
      INSERT INTO task_settings (guild_id, tasklogs)
      VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET tasklogs = excluded.tasklogs
    `, [guildId, channel.id], (err) => {
      if (err) {
        console.error('DB error:', err);
        return sendReply('⚠️ Something went wrong while saving to the database.');
      }

      sendReply(`<:discotoolsxyzicon1:1448758665963110603> Task log channel has been set to <#${channel.id}>.`);
    });
  }
};
