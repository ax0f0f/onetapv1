const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'set-event-category',
  description: 'Sets the category ID for the event channel.',
  usage: '.set-event-category <category-id>',
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   * @param {import('sqlite3').Database} configDB
   */
  async execute(message, args, client, configDB) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You need to be an admin to set the event category!');
    }

    const categoryId = args[0];
    if (!categoryId) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You need to specify a category ID.');
    }

    const guildId = message.guild.id;
    const eventName = 'Default Event'; // Modify as needed

    try {
      await configDB.run(
        `INSERT OR REPLACE INTO event_manager (guild_id, event_name, event_category) 
         VALUES (?, ?, ?)`,
        [guildId, eventName, categoryId]
      );

      const successMessage = `<:discotoolsxyzicon1:1448758665963110603> **Event Category Set**\nThe event category has been successfully set to <#${categoryId}>.`;
      sendReply(successMessage);
    } catch (err) {
      console.error('<:discotoolsxyzicon:1448758684535488562> Event Manager Error:', err.message);
      return sendReply('<:discotoolsxyzicon:1448758684535488562> An error occurred while setting the event category.');
    }
  },
};
