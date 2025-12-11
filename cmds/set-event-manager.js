const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'set-event-manager',
  description: 'Sets the event manager role for the server.',
  usage: '.set-event-manager <role mention or ID>',

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
      return sendReply('<:traverser:1400313375547850877> You need to be an admin to set the event manager!');
    }

    if (!args.length) {
      return sendReply('<:traverser:1400313375547850877> Please mention a role or provide a valid role ID.');
    }

    const input = args[0];
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(input);

    if (!role) {
      return sendReply('<:traverser:1400313375547850877> Could not find a valid role by mention or ID.');
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
            ? 'UPDATE event_manager SET event_role = ? WHERE guild_id = ?'
            : 'INSERT INTO event_manager (event_role, guild_id) VALUES (?, ?)';

          const params = row
            ? [role.id, guildId]
            : [role.id, guildId];

          configDB.run(query, params, (err) => {
            if (err) {
              console.error('<:traverser:1400313375547850877> Failed to set event manager role:', err.message);
              return sendReply('<:traverser:1400313375547850877> An error occurred while saving the event manager role.');
            }

            const successMessage = `<:verifier:1400313376521064551> **Event Manager Role Set**\nThe event manager role has been set to **${role.name}**.`;
            sendReply(successMessage);
          });
        }
      );
    } catch (err) {
      console.error('<:traverser:1400313375547850877> Event Manager Error:', err.message);
      return sendReply('<:traverser:1400313375547850877> An error occurred while setting the event manager role.');
    }
  },
};
