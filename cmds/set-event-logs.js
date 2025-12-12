const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'set-event-logs',
  description: 'Sets the event log channel.',
  usage: '.set-event-logs <channel-id>',
  
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
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You need to be an admin to set the event logs channel!');
    }

    const channelId = args[0];
    if (!channelId || isNaN(channelId)) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a valid channel ID.');
    }

    const guildId = message.guild.id;

    try {
      configDB.get(
        'SELECT 1 FROM event_manager WHERE guild_id = ?',
        [guildId],
        (err, row) => {
          if (err) {
            console.error('<:discotoolsxyzicon:1448758684535488562> DB Error:', err.message);
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred.');
          }

          const query = row
            ? 'UPDATE event_manager SET event_channel = ? WHERE guild_id = ?'
            : 'INSERT INTO event_manager (guild_id, event_channel) VALUES (?, ?)';

          const params = row
            ? [channelId, guildId]
            : [guildId, channelId];

          configDB.run(query, params, (err) => {
            if (err) {
              console.error('<:discotoolsxyzicon:1448758684535488562> Failed to save log channel:', err.message);
              return sendReply('<:discotoolsxyzicon:1448758684535488562> An error occurred while saving the event logs channel.');
            }

            const successMessage = `<:discotoolsxyzicon1:1448758665963110603> **Event Logs Set**\nThe event logs channel has been set to <#${channelId}>.`;
            sendReply(successMessage);
          });
        }
      );
    } catch (err) {
      console.error('<:discotoolsxyzicon:1448758684535488562> Event Manager Error:', err.message);
      return sendReply('<:discotoolsxyzicon:1448758684535488562> An error occurred while setting the event logs channel.');
    }
  },
};
