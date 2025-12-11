const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'claim',
  description: 'Claim ownership of a temporary voice channel if the current owner is not present, or force claim if you are Kifo.',
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
          return sendReply('<:traverser:1400313375547850877> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot.');
        }

        const currentOwnerId = row.owner_id;

        if (currentOwnerId === userId) {
          return sendReply('ℹ️ You are already the owner of this voice channel.');
        }

        if (userId !== '335869842748080140') {
          const guild = message.guild;
          const currentOwnerMember = guild.members.cache.get(currentOwnerId);

          if (
            currentOwnerMember &&
            currentOwnerMember.voice.channel &&
            currentOwnerMember.voice.channel.id === voiceChannel.id
          ) {
            return sendReply('<:traverser:1400313375547850877> The current owner is still connected to this voice channel. You cannot claim it.');
          }
        }

        db.run(
          `UPDATE temp_channels SET owner_id = ? WHERE channel_id = ? AND guild_id = ?`,
          [userId, voiceChannel.id, guildId],
          (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              return sendReply('<:traverser:1400313375547850877> Failed to claim ownership due to a database error.');
            }

            sendReply('<:verifier:1400313376521064551> You have claimed ownership of this voice channel.');
          }
        );
      }
    );
  },
};
