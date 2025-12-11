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
      return sendReply('<:traverser:1400313375547850877> You need to be an admin to set the event logs channel!');
    }

    const channelId = args[0];
    if (!channelId || isNaN(channelId)) {
      return sendReply('<:traverser:1400313375547850877> Please provide a valid channel ID.');
    }

    const guildId = message.guild.id;

    try {
      configDB.get(
        'SELECT 1 FROM event_manager WHERE guild_id = ?',
        [guildId],
        (err, row) => {
          if (err) {
            console.error('<:traverser:1400313375547850877> DB Error:', err.message);
            return sendReply('<:traverser:1400313375547850877> Database error occurred.');
          }

          const query = row
            ? 'UPDATE event_manager SET event_channel = ? WHERE guild_id = ?'
            : 'INSERT INTO event_manager (guild_id, event_channel) VALUES (?, ?)';

          const params = row
            ? [channelId, guildId]
            : [guildId, channelId];

          configDB.run(query, params, (err) => {
            if (err) {
              console.error('<:traverser:1400313375547850877> Failed to save log channel:', err.message);
              return sendReply('<:traverser:1400313375547850877> An error occurred while saving the event logs channel.');
            }

            const successMessage = `<:verifier:1400313376521064551> **Event Logs Set**\nThe event logs channel has been set to <#${channelId}>.`;
            sendReply(successMessage);
          });
        }
      );
    } catch (err) {
      console.error('<:traverser:1400313375547850877> Event Manager Error:', err.message);
      return sendReply('<:traverser:1400313375547850877> An error occurred while setting the event logs channel.');
    }
  },
};
