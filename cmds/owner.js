const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'owner',
  description: 'Show the current owner of your temporary voice channel.',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    const guildId = message.guild.id;

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return sendReply('<:traverser:1400313375547850877> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:traverser:1400313375547850877> A database error occurred. Please try again later.');
        }

        if (!row) {
          return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot.');
        }

        const ownerId = row.owner_id;
        const ownerMember = message.guild.members.cache.get(ownerId);

        if (!ownerMember) {
          return sendReply('⚠️ The owner of this voice channel is no longer in the server.');
        }

        sendReply(`<:couronne1Copy:1400312921698861076> **Voice Channel Owner:** <@${ownerMember.id}>`);
      }
    );
  },
};
