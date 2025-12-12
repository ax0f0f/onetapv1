const { TextDisplayBuilder, ContainerBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
  name: 'setup-room',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!message.member.permissions.has('Administrator')) {
      return sendReply("<:warn1:1448792086810726601> You need **Administrator** permission to use this command.");
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

    if (!channel) {
      return sendReply("<:discotoolsxyzicon:1448758684535488562> Please specify a valid voice channel.\n\n**Usage:** `.v setup-room <channel>`");
    }

    if (channel.type !== ChannelType.GuildVoice) {
      return sendReply("<:warn1:1448792086810726601> The specified channel must be a **voice channel**.");
    }

    db.get(`SELECT * FROM guild_config WHERE guild_id = ?`, [message.guild.id], (err, row) => {
      if (err) {
        console.error(err);
        return sendReply("<:discotoolsxyzicon:1448758684535488562> Failed to access configuration.");
      }

      const isUpdate = !!row;

      const query = isUpdate
        ? `UPDATE guild_config SET room_id = ? WHERE guild_id = ?`
        : `INSERT INTO guild_config (room_id, guild_id) VALUES (?, ?)`;

      db.run(query, [channel.id, message.guild.id], (err) => {
        if (err) {
          console.error(err);
          return sendReply("<:discotoolsxyzicon:1448758684535488562> Failed to save configuration.");
        }

        const successMessage = `${isUpdate ? '' : '<:discotoolsxyzicon1:1448758665963110603>'} ${isUpdate ? 'Updated' : 'Setup complete'}.\n\nUsers who join ${channel} will now trigger temp room creation.`;
        sendReply(successMessage);
      });
    });
  }
};
