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
      return sendReply('<:traverser:1400313375547850877> You must be connected to a voice channel to use this command.');
    }

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannel.id, guildId],
      async (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:traverser:1400313375547850877> Database error occurred.');
        }

        if (!row) {
          return sendReply('<:traverser:1400313375547850877> This voice channel is not managed by the bot.');
        }

        const currentOwnerId = row.owner_id;

        if (currentOwnerId !== userId) {
          return sendReply('<:traverser:1400313375547850877> You are not the owner of this voice channel.');
        }

        if (!args[0]) {
          return sendReply('<:traverser:1400313375547850877> Please mention the user to transfer ownership to.');
        }

        let targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!targetMember) {
          return sendReply('<:traverser:1400313375547850877> User not found in this server.');
        }

        if (!targetMember.voice.channel || targetMember.voice.channel.id !== voiceChannel.id) {
          return sendReply('<:traverser:1400313375547850877> The user must be connected to the same voice channel.');
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

        const textComponent = new TextDisplayBuilder().setContent(`⚠️ Are you sure you want to transfer ownership to **${targetMember.user.tag}**?`);
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
            return interaction.reply({ content: '<:traverser:1400313375547850877> Only the command author can confirm this action.', ephemeral: true });
          }

          if (interaction.customId === 'confirm_transfer') {
            // Update database
            db.run(
              `UPDATE temp_channels SET owner_id = ? WHERE channel_id = ? AND guild_id = ?`,
              [targetMember.id, voiceChannel.id, guildId],
              (updateErr) => {
                if (updateErr) {
                  console.error(updateErr);
                  const errorText = new TextDisplayBuilder().setContent('<:traverser:1400313375547850877> Failed to transfer ownership due to a database error.');
                  const errorContainer = new ContainerBuilder().addTextDisplayComponents(errorText);
                  return interaction.update({ components: [errorContainer] });
                }

                const successText = new TextDisplayBuilder().setContent(`<:verifier:1400313376521064551> Ownership transferred to **${targetMember.user.tag}**.`);
                const successContainer = new ContainerBuilder().addTextDisplayComponents(successText);
                interaction.update({ components: [successContainer] });
              }
            );
          } else if (interaction.customId === 'cancel_transfer') {
            const cancelText = new TextDisplayBuilder().setContent('<:traverser:1400313375547850877> Transfer cancelled.');
            const cancelContainer = new ContainerBuilder().addTextDisplayComponents(cancelText);
            interaction.update({ components: [cancelContainer] });
          }
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            const timeoutText = new TextDisplayBuilder().setContent('⏰ No response received. Ownership transfer cancelled.');
            const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(timeoutText);
            confirmMessage.edit({ components: [timeoutContainer] });
          }
        });
      }
    );
  }
};
