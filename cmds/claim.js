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
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot.');
        }

        const currentOwnerId = row.owner_id;

        if (currentOwnerId === userId) {
          return sendReply('<:infoo:1448793556394442793> You are already the owner of this voice channel.');
        }

        if (userId !== '335869842748080140') {
          const guild = message.guild;
          const currentOwnerMember = guild.members.cache.get(currentOwnerId);

          if (
            currentOwnerMember &&
            currentOwnerMember.voice.channel &&
            currentOwnerMember.voice.channel.id === voiceChannel.id
          ) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> The current owner is still connected to this voice channel. You cannot claim it.');
          }
        }

        db.run(
          `UPDATE temp_channels SET owner_id = ? WHERE channel_id = ? AND guild_id = ?`,
          [userId, voiceChannel.id, guildId],
          (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to claim ownership due to a database error.');
            }

            sendReply('<:discotoolsxyzicon1:1448758665963110603> You have claimed ownership of this voice channel.');
          }
        );
      }
    );
  },
};
