const { TextDisplayBuilder, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  name: 'transfer',
  description: 'Transfer ownership of your temporary voice channel to another user in the same channel.',
  usage: '.v transfer @user',
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
    const userId = message.author.id;
    const member = message.guild.members.cache.get(userId);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      async (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This voice channel is not managed by the bot.');
        }

        const currentOwnerId = row.owner_id;

        if (currentOwnerId !== userId) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> You are not the owner of this voice channel.');
        }

        if (!args[0]) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Please mention the user to transfer ownership to.');
        }

        let targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!targetMember) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> User not found in this server.');
        }

        if (!targetMember.voice.channel || targetMember.voice.channel.id !== voiceChannel.id) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> The user must be connected to the same voice channel.');
        }

        // Send confirmation message
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_transfer')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('cancel_transfer')
            .setLabel('No')
            .setStyle(ButtonStyle.Secondary)
        );

        const textComponent = new TextDisplayBuilder().setContent(`<:warn1:1448792086810726601> Are you sure you want to transfer ownership to **${targetMember.user.tag}**?`);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);

        const confirmMessage = await message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [containerComponent, confirmRow]
        });

        // Create collector
        const collector = confirmMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 15_000,
          max: 1
        });

        collector.on('collect', interaction => {
          if (interaction.user.id !== userId) {
            return interaction.reply({ content: '<:discotoolsxyzicon:1448758684535488562> Only the command author can confirm this action.', ephemeral: true });
          }

          if (interaction.customId === 'confirm_transfer') {
            // Update database
            db.run(
              `UPDATE temp_channels SET owner_id = ? WHERE channel_id = ? AND guild_id = ?`,
              [targetMember.id, voiceChannel.id, guildId],
              (updateErr) => {
                if (updateErr) {
                  console.error(updateErr);
                  const errorText = new TextDisplayBuilder().setContent('<:discotoolsxyzicon:1448758684535488562> Failed to transfer ownership due to a database error.');
                  const errorContainer = new ContainerBuilder().addTextDisplayComponents(errorText);
                  return interaction.update({ components: [errorContainer] });
                }

                const successText = new TextDisplayBuilder().setContent(`<:discotoolsxyzicon1:1448758665963110603> Ownership transferred to **${targetMember.user.tag}**.`);
                const successContainer = new ContainerBuilder().addTextDisplayComponents(successText);
                interaction.update({ components: [successContainer] });
              }
            );
          } else if (interaction.customId === 'cancel_transfer') {
            const cancelText = new TextDisplayBuilder().setContent('<:discotoolsxyzicon:1448758684535488562> Transfer cancelled.');
            const cancelContainer = new ContainerBuilder().addTextDisplayComponents(cancelText);
            interaction.update({ components: [cancelContainer] });
          }
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            const timeoutText = new TextDisplayBuilder().setContent('<:time1:1448795572902428715> No response received. Ownership transfer cancelled.');
            const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(timeoutText);
            confirmMessage.edit({ components: [timeoutContainer] });
          }
        });
      }
    );
  }
};
