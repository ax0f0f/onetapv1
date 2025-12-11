const { TextDisplayBuilder, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  name: 'man-clear',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    const createComponentReply = (content, components) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        return { flags: MessageFlags.IsComponentsV2, components: [containerComponent, ...components] };
    };

    db.run(`
      CREATE TABLE IF NOT EXISTS user_managers (
        owner_id TEXT,
        manager_id TEXT,
        PRIMARY KEY (owner_id, manager_id)
      )
    `, async (err) => {
      if (err) {
        console.error(err);
        return sendReply('<:arcadiafalse:1381422467251306496> Database error occurred.');
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_clear')
          .setLabel('Yes')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('cancel_clear')
          .setLabel('No')
          .setStyle(ButtonStyle.Secondary)
      );

      const confirmationMessage = await message.channel.send(createComponentReply('⚠️ Are you sure you want to clear **your** manager list? This action **cannot** be undone.', [row]));

      const filter = (interaction) => {
        return (
          (interaction.customId === 'confirm_clear' || interaction.customId === 'cancel_clear') &&
          interaction.user.id === message.author.id
        );
      };

      try {
        const interaction = await confirmationMessage.awaitMessageComponent({
          filter,
          componentType: ComponentType.Button,
          time: 15000
        });

        if (interaction.customId === 'confirm_clear') {
          db.run(`DELETE FROM user_managers WHERE owner_id = ?`, [message.author.id], function (err) {
            if (err) {
              console.error(err);
              interaction.update(createComponentReply('<:arcadiafalse:1381422467251306496> Failed to clear your managers due to database error.', []));
              return;
            }

            interaction.update(createComponentReply('<:arcadiatrue:1381421969055944707> All your managers have been cleared.', []));
          });
        } else {
          interaction.update(createComponentReply('❎ Manager clear canceled.', []));
        }
      } catch {
        confirmationMessage.edit(createComponentReply('⌛ Time expired. Manager clear canceled.', []));
      }
    });
  }
};
